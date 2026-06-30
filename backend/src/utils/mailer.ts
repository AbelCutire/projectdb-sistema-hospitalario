import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER || process.env.FROM_EMAIL;
const SMTP_PASS = process.env.SMTP_PASS;
const FROM_EMAIL = process.env.FROM_EMAIL || SMTP_USER;
const USE_SECURE = SMTP_PORT === 465;

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: USE_SECURE,
  requireTLS: !USE_SECURE,
  auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  tls: { rejectUnauthorized: false },
  connectionTimeout: 4000, // Falla rápido (4s) si Railway bloquea el puerto
  greetingTimeout: 4000,
  socketTimeout: 4000,
});
// Verificar conexión al transporte y loguear el estado
transporter.verify().then(() => {
  console.log('Mailer: transporter is ready');
}).catch((err) => {
  console.error('Mailer: transporter verify failed', err);
  console.error('Mailer: verifica si el puerto SMTP y las credenciales son correctas en Railway.');
});

export const sendResetEmail = async (to: string, token: string) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const resetUrl = `${frontendUrl}/auth/reset?token=${token}`;

  const info = await transporter.sendMail({
    from: FROM_EMAIL,
    to,
    subject: 'Restablecer contraseña',
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; text-align: center;">
        <div style="margin-bottom: 24px;">
          <h2 style="color: #0f172a; margin: 0; font-size: 24px;">Restablecer tu contraseña</h2>
        </div>
        <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
          Hola,<br/><br/>
          Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en MedicDB. 
          Haz clic en el botón de abajo para asignar una nueva contraseña.
        </p>
        <a href="${resetUrl}" style="display: inline-block; background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px; letter-spacing: 0.5px; margin-bottom: 24px;">
          Restablecer Contraseña
        </a>
        <p style="color: #64748b; font-size: 14px; margin-bottom: 8px;">Este enlace es válido por 15 minutos.</p>
        <p style="color: #94a3b8; font-size: 12px; margin-bottom: 0;">Si no solicitaste este cambio, puedes ignorar este correo de forma segura. Tu cuenta está protegida.</p>
      </div>
    `,
  });

  return info;
};

export const sendOtpEmail = async (to: string, otp: string) => {
  const info = await transporter.sendMail({
    from: FROM_EMAIL,
    to,
    subject: 'Código de Verificación - Registro',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center;">
        <h2 style="color: #3b82f6;">Verifica tu correo electrónico</h2>
        <p>Hola,</p>
        <p>Has solicitado crear una cuenta en el sistema hospitalario. Para confirmar tu registro, ingresa el siguiente código de seguridad en la aplicación:</p>
        <div style="background-color: #f1f5f9; padding: 15px; margin: 20px 0; border-radius: 8px;">
          <h1 style="color: #1e293b; letter-spacing: 4px; margin: 0;">${otp}</h1>
        </div>
        <p>Este código es válido por 10 minutos. Si no solicitaste este registro, ignora este correo de forma segura.</p>
      </div>
    `,
  });
  return info;
};

export default { sendResetEmail, sendOtpEmail };
