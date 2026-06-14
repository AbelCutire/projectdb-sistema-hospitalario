"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPassword = exports.showResetForm = exports.forgotPassword = exports.register = exports.me = exports.login = void 0;
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jwt = __importStar(require("jsonwebtoken"));
const mailer_1 = require("../utils/mailer");
const prisma = new client_1.PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '1h');
const login = async (req, res) => {
    try {
        const { correo_institucional, contrasena } = req.body;
        if (!correo_institucional || !contrasena) {
            return res.status(400).json({ error: 'Correo y contraseña son requeridos' });
        }
        const usuario = await prisma.usuario.findUnique({
            where: { correo_institucional },
            include: { persona: true, rol: true },
        });
        if (!usuario || !usuario.estado_activo) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }
        const validPassword = await bcryptjs_1.default.compare(contrasena, usuario.contrasena_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }
        const payload = {
            id_usuario: usuario.id_usuario,
            id_persona: usuario.id_persona,
            rol: usuario.rol.nombre_rol,
            correo_institucional: usuario.correo_institucional,
        };
        const options = { expiresIn: JWT_EXPIRES_IN };
        const token = jwt.sign(payload, JWT_SECRET, options);
        res.json({
            token,
            usuario: {
                id_usuario: usuario.id_usuario,
                correo_institucional: usuario.correo_institucional,
                estado_activo: usuario.estado_activo,
                persona: usuario.persona,
                rol: usuario.rol,
            },
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Error al iniciar sesión' });
    }
};
exports.login = login;
const me = async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ error: 'No autorizado' });
        }
        res.json(user);
    }
    catch (error) {
        res.status(500).json({ error: 'Error al obtener usuario' });
    }
};
exports.me = me;
const register = async (req, res) => {
    try {
        let { id_persona, correo_institucional, contrasena, id_rol } = req.body;
        if (!id_persona || !correo_institucional || !contrasena) {
            return res.status(400).json({ error: 'id_persona, correo y contraseña son requeridos' });
        }
        // Asegurar que id_persona sea número
        id_persona = typeof id_persona === 'string' ? parseInt(id_persona, 10) : id_persona;
        const persona = await prisma.persona.findUnique({ where: { id_persona: Number(id_persona) } });
        if (!persona) {
            return res.status(404).json({ error: 'Persona no encontrada.' });
        }
        const existingByEmail = await prisma.usuario.findUnique({ where: { correo_institucional } });
        if (existingByEmail)
            return res.status(409).json({ error: 'Ya existe un usuario con ese correo' });
        const existingByPersona = await prisma.usuario.findUnique({ where: { id_persona: Number(id_persona) } });
        if (existingByPersona)
            return res.status(409).json({ error: 'Ya existe un usuario asociado a esa persona' });
        const hash = await bcryptjs_1.default.hash(contrasena, 10);
        const nuevoUsuario = await prisma.usuario.create({
            data: {
                id_persona,
                id_rol: id_rol || 2,
                correo_institucional,
                contrasena_hash: hash,
                estado_activo: true,
            },
            include: { persona: true, rol: true },
        });
        const { contrasena_hash, ...rest } = nuevoUsuario;
        res.status(201).json(rest);
    }
    catch (error) {
        console.error('register error:', error);
        res.status(500).json({ error: 'Error al registrar usuario' });
    }
};
exports.register = register;
const forgotPassword = async (req, res) => {
    try {
        const { correo_institucional } = req.body;
        if (!correo_institucional) {
            return res.status(400).json({ error: 'El campo correo_institucional es obligatorio.' });
        }
        const usuario = await prisma.usuario.findUnique({ where: { correo_institucional } });
        if (!usuario) {
            return res.status(200).json({ message: 'Si el correo existe, se han enviado instrucciones para restablecer la contraseña.' });
        }
        const resetToken = jwt.sign({ id_usuario: usuario.id_usuario, correo: usuario.correo_institucional }, JWT_SECRET, { expiresIn: '15m' });
        try {
            await (0, mailer_1.sendResetEmail)(correo_institucional, resetToken);
        }
        catch (e) {
            console.error('sendResetEmail error:', e);
            return res.status(500).json({ error: 'No se pudo enviar el correo de restablecimiento. Verifique la configuración SMTP.' });
        }
        res.json({ message: 'Si el correo existe, se han enviado instrucciones para restablecer la contraseña.' });
    }
    catch (error) {
        console.error('forgotPassword error:', error);
        res.status(500).json({ error: 'Error interno al procesar la solicitud de recuperación de contraseña.' });
    }
};
exports.forgotPassword = forgotPassword;
const showResetForm = async (req, res) => {
    const token = String(req.query.token || '');
    if (!token) {
        return res.status(400).send('<h1>Solicitud inválida</h1><p>Falta el token de restablecimiento.</p>');
    }
    res.send(`<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Restablecer contraseña</title>
    <style>
      body { font-family: Arial, sans-serif; background: #f4f7fb; color: #333; margin: 0; padding: 0; }
      .container { max-width: 460px; margin: 80px auto; background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 10px 30px rgba(0,0,0,0.08); }
      h1 { margin-top: 0; color: #1f2937; }
      p { line-height: 1.6; }
      label { display: block; margin: 18px 0 6px; font-weight: 600; }
      input { width: 100%; padding: 12px 14px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 1rem; }
      button { width: 100%; margin-top: 24px; background: #2563eb; color: white; border: none; border-radius: 8px; padding: 14px; font-size: 1rem; cursor: pointer; }
      button:hover { background: #1d4ed8; }
      .footer { margin-top: 16px; color: #6b7280; font-size: 0.95rem; }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Restablecer contraseña</h1>
      <p>Ingrese su nueva contraseña y presione el botón para completar el proceso.</p>
      <form method="POST" action="/auth/reset">
        <input type="hidden" name="token" value="${token}" />
        <label for="newPassword">Nueva contraseña</label>
        <input id="newPassword" name="newPassword" type="password" required minlength="8" placeholder="Ingrese nueva contraseña" />
        <button type="submit">Actualizar contraseña</button>
      </form>
      <p class="footer">Si usted no solicitó este cambio, ignore este mensaje.</p>
    </div>
  </body>
</html>
`);
};
exports.showResetForm = showResetForm;
const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) {
            const errorMessage = 'Token y nueva contraseña son requeridos.';
            if (req.headers['content-type']?.includes('application/x-www-form-urlencoded')) {
                return res.status(400).send(`<h1>Restablecimiento fallido</h1><p>${errorMessage}</p>`);
            }
            return res.status(400).json({ error: errorMessage });
        }
        let payload;
        try {
            payload = jwt.verify(token, JWT_SECRET);
        }
        catch (e) {
            const errorMessage = 'Token inválido o expirado.';
            if (req.headers['content-type']?.includes('application/x-www-form-urlencoded')) {
                return res.status(400).send(`<h1>Restablecimiento fallido</h1><p>${errorMessage}</p>`);
            }
            return res.status(400).json({ error: errorMessage });
        }
        const id_usuario = payload.id_usuario;
        const hash = await bcryptjs_1.default.hash(newPassword, 10);
        await prisma.usuario.update({ where: { id_usuario }, data: { contrasena_hash: hash } });
        if (req.headers['content-type']?.includes('application/x-www-form-urlencoded')) {
            return res.send(`<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Contraseña restablecida</title>
    <style>
      body { font-family: Arial, sans-serif; background: #f4f7fb; color: #333; margin: 0; padding: 0; }
      .container { max-width: 460px; margin: 80px auto; background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 10px 30px rgba(0,0,0,0.08); }
      h1 { margin-top: 0; color: #1f2937; }
      p { line-height: 1.6; }
      a { color: #2563eb; text-decoration: none; }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Contraseña actualizada</h1>
      <p>Su contraseña ha sido restablecida con éxito. Ya puede iniciar sesión nuevamente.</p>
      <p><a href="/auth/login">Volver a iniciar sesión</a></p>
    </div>
  </body>
</html>`);
        }
        res.json({ message: 'Contraseña restablecida correctamente' });
    }
    catch (error) {
        console.error('resetPassword error:', error);
        if (req.headers['content-type']?.includes('application/x-www-form-urlencoded')) {
            return res.status(500).send('<h1>Error</h1><p>Ocurrió un error al restablecer la contraseña. Intente nuevamente más tarde.</p>');
        }
        res.status(500).json({ error: 'Error en reset password' });
    }
};
exports.resetPassword = resetPassword;
