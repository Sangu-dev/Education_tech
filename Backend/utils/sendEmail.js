import nodemailer from 'nodemailer';
import logger from './logger.js';

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || process.env.EMAIL_HOST,
    port: parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT) || 587,
    secure: (process.env.SMTP_PORT || process.env.EMAIL_PORT) === '465',
    auth: {
      user: process.env.SMTP_USER || process.env.EMAIL_USER,
      pass: process.env.SMTP_PASS || process.env.EMAIL_PASS,
    },
  });
};

export const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const transporter = createTransporter();
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"ELearnAI" <noreply@elearnaai.com>',
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''),
    };
    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent: ${info.messageId}`);
    return info;
  } catch (error) {
    logger.error(`Email sending failed: ${error.message}`);
    throw new Error('Failed to send email');
  }
};

export const sendPasswordResetEmail = async (email, name, resetUrl) => {
  const subject = 'Password Reset Request — ELearnAI';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #0f0f1a; color: #e2e8f0; border-radius: 12px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #8b5cf6; font-size: 28px; margin: 0;">ELearnAI</h1>
        <p style="color: #64748b; margin-top: 8px;">AI-Powered Learning Platform</p>
      </div>
      <h2 style="color: #e2e8f0;">Hi ${name},</h2>
      <p style="color: #94a3b8; line-height: 1.6;">
        We received a request to reset your password. Click the button below to create a new password. This link will expire in <strong>10 minutes</strong>.
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${resetUrl}" 
           style="background: linear-gradient(135deg, #8b5cf6, #6366f1); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
          Reset Password
        </a>
      </div>
      <p style="color: #64748b; font-size: 14px;">
        If you didn't request this, please ignore this email. Your password will remain unchanged.
      </p>
      <hr style="border-color: #1e293b; margin: 24px 0;" />
      <p style="color: #475569; font-size: 12px; text-align: center;">
        © ${new Date().getFullYear()} ELearnAI. All rights reserved.
      </p>
    </div>
  `;
  return sendEmail({ to: email, subject, html });
};

export const sendWelcomeEmail = async (email, name) => {
  const subject = 'Welcome to ELearnAI! 🎓';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #0f0f1a; color: #e2e8f0; border-radius: 12px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #8b5cf6; font-size: 28px;">ELearnAI 🎓</h1>
      </div>
      <h2 style="color: #e2e8f0;">Welcome, ${name}!</h2>
      <p style="color: #94a3b8; line-height: 1.6;">
        You've successfully joined ELearnAI. Upload your first PDF and let our AI transform it into a complete, interactive learning course in minutes!
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${process.env.FRONTEND_URL}/upload" 
           style="background: linear-gradient(135deg, #8b5cf6, #6366f1); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
          Upload Your First PDF
        </a>
      </div>
      <hr style="border-color: #1e293b; margin: 24px 0;" />
      <p style="color: #475569; font-size: 12px; text-align: center;">
        © ${new Date().getFullYear()} ELearnAI. All rights reserved.
      </p>
    </div>
  `;
  return sendEmail({ to: email, subject, html });
};
