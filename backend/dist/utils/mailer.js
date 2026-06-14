"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendResetEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER || process.env.FROM_EMAIL;
const SMTP_PASS = process.env.SMTP_PASS;
const FROM_EMAIL = process.env.FROM_EMAIL || SMTP_USER;
const USE_SECURE = SMTP_PORT === 465;
const transporter = nodemailer_1.default.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: USE_SECURE,
    requireTLS: !USE_SECURE,
    auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    tls: { rejectUnauthorized: false },
});
// Verificar conexión al transporte y loguear el estado
transporter.verify().then(() => {
    console.log('Mailer: transporter is ready');
}).catch((err) => {
    console.error('Mailer: transporter verify failed', err);
    console.error('Mailer: verifica si el puerto SMTP y las credenciales son correctas en Railway.');
});
const sendResetEmail = async (to, token) => {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/auth/reset?token=${token}`;
    const info = await transporter.sendMail({
        from: FROM_EMAIL,
        to,
        subject: 'Restablecer contraseña',
        html: `<p>Hola,</p>
      <p>Solicitaste restablecer tu contraseña. Haz clic en el siguiente enlace para crear una nueva contraseña (válido 15 minutos):</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>Si no solicitaste este cambio, ignora este correo.</p>`,
    });
    console.log('Mailer: sendMail info:', {
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected,
        response: info.response,
    });
    return info;
};
exports.sendResetEmail = sendResetEmail;
exports.default = exports.sendResetEmail;
