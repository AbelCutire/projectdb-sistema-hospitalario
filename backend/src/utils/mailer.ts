import dotenv from 'dotenv';

dotenv.config();

// Configuración de Brevo API
const BREVO_API_KEY = process.env.BREVO_API_KEY;
if (!BREVO_API_KEY) {
  console.warn('⚠️ ADVERTENCIA: BREVO_API_KEY no está definida en las variables de entorno.');
}
const FROM_EMAIL = process.env.FROM_EMAIL || 'essaludpro@gmail.com';
const FROM_NAME = 'EsSalud Premium';

const sendEmailViaBrevo = async (to: string, subject: string, htmlContent: string) => {
  const url = 'https://api.brevo.com/v3/smtp/email';
  const data = {
    sender: { name: FROM_NAME, email: FROM_EMAIL },
    to: [{ email: to }],
    subject: subject,
    htmlContent: htmlContent
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY || '',
        'content-type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Brevo API Error:', errorData);
      throw new Error(`Fallo al enviar correo por Brevo: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error en sendEmailViaBrevo:', error);
    throw error;
  }
};

export const sendResetEmail = async (to: string, token: string) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const resetUrl = `${frontendUrl}/auth/reset?token=${token}`;

  const html = `
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
  `;

  return await sendEmailViaBrevo(to, 'Restablecer contraseña', html);
};

export const sendOtpEmail = async (to: string, otp: string) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center;">
      <h2 style="color: #3b82f6;">Verifica tu correo electrónico</h2>
      <p>Hola,</p>
      <p>Has solicitado crear una cuenta en el sistema hospitalario. Para confirmar tu registro, ingresa el siguiente código de seguridad en la aplicación:</p>
      <div style="background-color: #f1f5f9; padding: 15px; margin: 20px 0; border-radius: 8px;">
        <h1 style="color: #1e293b; letter-spacing: 4px; margin: 0;">${otp}</h1>
      </div>
      <p>Este código es válido por 10 minutos. Si no solicitaste este registro, ignora este correo de forma segura.</p>
    </div>
  `;
  
  return await sendEmailViaBrevo(to, 'Código de Verificación - Registro', html);
};

export default { sendResetEmail, sendOtpEmail };
