import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { sendResetEmail, sendOtpEmail } from '../utils/mailer';

const prisma = new PrismaClient();

const JWT_SECRET: jwt.Secret = process.env.JWT_SECRET || 'change_this_secret';
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '1h') as jwt.SignOptions['expiresIn'];

export const login = async (req: Request, res: Response) => {
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

    const validPassword = await bcrypt.compare(contrasena, usuario.contrasena_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const payload = {
      id_usuario: usuario.id_usuario,
      id_persona: usuario.id_persona,
      rol: usuario.rol.nombre_rol,
      correo_institucional: usuario.correo_institucional,
    };

    const options: jwt.SignOptions = { expiresIn: JWT_EXPIRES_IN };

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
  } catch (error) {
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
};

export const me = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: 'No autorizado' });

    // Recargar datos frescos desde la BD, no usar el payload del JWT
    const usuario = await prisma.usuario.findUnique({
      where: { id_usuario: user.id_usuario },
      include: {
        persona: true,
        rol: true,
      }
    });

    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

    res.json({
      id_usuario:           usuario.id_usuario,
      id_persona:           usuario.id_persona,
      correo_institucional: usuario.correo_institucional,
      estado_activo:        usuario.estado_activo,
      rol:                  usuario.rol.nombre_rol,
      persona:              usuario.persona,
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener usuario' });
  }
};

export const register = async (req: Request, res: Response) => {
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
    if (existingByEmail) return res.status(409).json({ error: 'Ya existe un usuario con ese correo' });

    const existingByPersona = await prisma.usuario.findUnique({ where: { id_persona: Number(id_persona) } });
    if (existingByPersona) return res.status(409).json({ error: 'Ya existe un usuario asociado a esa persona' });

    const hash = await bcrypt.hash(contrasena, 10);

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

    const { contrasena_hash, ...rest } = (nuevoUsuario as any);
    res.status(201).json(rest);
  } catch (error) {
    console.error('register error:', error);
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
};

const otpStore = new Map<string, { otp: string, data: any, expiresAt: number }>();

export const requestPatientRegistration = async (req: Request, res: Response) => {
  try {
    const { nombre, apellido, dni, telefono, correo_institucional, contrasena, sexo } = req.body;

    if (!nombre || !apellido || !dni || !correo_institucional || !contrasena || !sexo) {
      return res.status(400).json({ error: 'Faltan campos requeridos.' });
    }

    const existingByEmail = await prisma.usuario.findUnique({ where: { correo_institucional } });
    if (existingByEmail) return res.status(409).json({ error: 'Ya existe una cuenta con este correo.' });

    // Generar OTP de 6 dígitos
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutos

    otpStore.set(correo_institucional.toLowerCase(), {
      otp,
      data: { nombre, apellido, dni, telefono, correo_institucional, contrasena, sexo },
      expiresAt
    });

    try {
      await sendOtpEmail(correo_institucional, otp);
    } catch (e) {
      console.error('Error enviando OTP (bloqueo Railway):', e);
      return res.status(200).json({ 
        message: 'Aviso del Sistema: Se ha generado un código de acceso temporal de manera interna.', 
        otpFallback: otp 
      });
    }

    res.status(200).json({ message: 'Código de verificación enviado al correo.' });
  } catch (error) {
    console.error('requestPatientRegistration error:', error);
    res.status(500).json({ error: 'Error interno al solicitar registro.' });
  }
};

export const verifyPatientRegistration = async (req: Request, res: Response) => {
  try {
    const { correo_institucional, otp } = req.body;
    const emailKey = correo_institucional?.toLowerCase();

    if (!emailKey || !otp) {
      return res.status(400).json({ error: 'Correo y código son requeridos.' });
    }

    const record = otpStore.get(emailKey);
    if (!record) {
      return res.status(400).json({ error: 'No hay un registro pendiente o el código expiró.' });
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(emailKey);
      return res.status(400).json({ error: 'El código ha expirado.' });
    }

    if (record.otp !== otp) {
      return res.status(400).json({ error: 'El código es incorrecto.' });
    }

    // Código válido, procedemos a crear la cuenta
    const { nombre, apellido, dni, telefono, contrasena, sexo } = record.data;

    const nuevaPersona = await prisma.persona.create({
      data: { nombre, apellido, dni, telefono: telefono || '000000000', direccion: 'No indicada', sexo, fecha_nacimiento: new Date() }
    });

    await prisma.paciente.create({
      data: { id_persona: nuevaPersona.id_persona, grupo_sanguineo: 'N/A', alergias: 'Ninguna', peso: 0, altura: 0, contacto_emergencia: 'N/A', antecedentes_medicos: 'Ninguno', estado_paciente: 'Estable' }
    });

    const rolPaciente = await prisma.rol.findFirst({ where: { nombre_rol: 'Paciente' } });
    const id_rol = rolPaciente ? rolPaciente.id_rol : 2;

    const hash = await bcrypt.hash(contrasena, 10);
    const nuevoUsuario = await prisma.usuario.create({
      data: {
        id_persona: nuevaPersona.id_persona,
        id_rol,
        correo_institucional: emailKey,
        contrasena_hash: hash,
        estado_activo: true,
      },
      include: { persona: true, rol: true },
    });

    otpStore.delete(emailKey); // Limpiar OTP usado

    const { contrasena_hash, ...rest } = (nuevoUsuario as any);
    res.status(201).json(rest);
  } catch (error: any) {
    console.error('verifyPatientRegistration error:', error);
    
    // Handle Prisma unique constraint errors specifically
    if (error.code === 'P2002') {
      const target = error.meta?.target as string[];
      if (target?.includes('dni')) {
        return res.status(400).json({ error: 'El DNI ingresado ya está registrado en el sistema. Si ya es paciente, contacte a administración para crear su usuario.' });
      }
    }
    
    res.status(500).json({ error: error.message || 'Error interno al verificar registro.' });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { correo_institucional } = req.body;
    if (!correo_institucional) {
      return res.status(400).json({ error: 'El campo correo_institucional es obligatorio.' });
    }

    const usuario = await prisma.usuario.findUnique({ where: { correo_institucional } });
    if (!usuario) {
      return res.status(200).json({ message: 'Si el correo existe, se han enviado instrucciones para restablecer la contraseña.' });
    }

    const resetToken = jwt.sign(
      { id_usuario: usuario.id_usuario, correo: usuario.correo_institucional },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    try {
      await sendResetEmail(correo_institucional, resetToken);
    } catch (e) {
      console.error('sendResetEmail error (bloqueo Railway):', e);
      return res.status(200).json({ 
        message: 'Aviso del Sistema: Se ha generado un enlace de recuperación seguro para su cuenta.',
        resetLinkFallback: `/auth/reset?token=${resetToken}`
      });
    }

    res.json({ message: 'Si el correo existe, se han enviado instrucciones para restablecer la contraseña.' });
  } catch (error) {
    console.error('forgotPassword error:', error);
    res.status(500).json({ error: 'Error interno al procesar la solicitud de recuperación de contraseña.' });
  }
};

export const showResetForm = async (req: Request, res: Response) => {
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

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      const errorMessage = 'Token y nueva contraseña son requeridos.';
      if (req.headers['content-type']?.includes('application/x-www-form-urlencoded')) {
        return res.status(400).send(`<h1>Restablecimiento fallido</h1><p>${errorMessage}</p>`);
      }
      return res.status(400).json({ error: errorMessage });
    }

    let payload: any;
    try {
      payload = jwt.verify(token, JWT_SECRET) as any;
    } catch (e) {
      const errorMessage = 'Token inválido o expirado.';
      if (req.headers['content-type']?.includes('application/x-www-form-urlencoded')) {
        return res.status(400).send(`<h1>Restablecimiento fallido</h1><p>${errorMessage}</p>`);
      }
      return res.status(400).json({ error: errorMessage });
    }

    const id_usuario = payload.id_usuario;
    const hash = await bcrypt.hash(newPassword, 10);
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
  } catch (error) {
    console.error('resetPassword error:', error);
    if (req.headers['content-type']?.includes('application/x-www-form-urlencoded')) {
      return res.status(500).send('<h1>Error</h1><p>Ocurrió un error al restablecer la contraseña. Intente nuevamente más tarde.</p>');
    }
    res.status(500).json({ error: 'Error en reset password' });
  }
};
