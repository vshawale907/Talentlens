import nodemailer from 'nodemailer';
import { config } from '../config/env';
import { logger } from '../config/logger';

const createTransporter = () => {
    logger.debug(`[Email] SMTP config → host: ${config.SMTP_HOST}, port: ${config.SMTP_PORT}, user: "${config.SMTP_USER}"`);
    return nodemailer.createTransport({
        host: config.SMTP_HOST,
        port: config.SMTP_PORT,
        secure: config.SMTP_PORT === 465,
        auth: {
            user: config.SMTP_USER,
            pass: config.SMTP_PASS,
        },
    });
};

export const emailService = {
    sendPasswordResetEmail: async (toEmail: string, resetToken: string): Promise<void> => {
        const resetUrl = `${config.FRONTEND_URL}/reset-password/${resetToken}`;
        const transporter = createTransporter();

        const mailOptions = {
            from: `"AI Resume Analyzer" <${config.SMTP_USER}>`,
            to: toEmail,
            subject: 'Reset Your Password – AI Resume Analyzer',
            text: `Reset your password by visiting: ${resetUrl}\n\nThis link expires in 15 minutes. If you didn't request this, ignore this email.`,
            html: `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Password Reset</title>
                    <style>
                        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0d1117; color: #e6edf3; margin: 0; padding: 0; }
                        .container { max-width: 520px; margin: 40px auto; background: #161b22; border-radius: 16px; border: 1px solid #30363d; overflow: hidden; }
                        .header { background: linear-gradient(135deg, #1a237e 0%, #0d47a1 100%); padding: 32px; text-align: center; }
                        .header h1 { margin: 0; font-size: 24px; color: #fff; font-weight: 700; }
                        .header p { margin: 8px 0 0; color: rgba(255,255,255,0.7); font-size: 14px; }
                        .body { padding: 32px; }
                        .body p { color: #8b949e; font-size: 14px; line-height: 1.7; margin: 0 0 16px; }
                        .btn { display: block; width: fit-content; margin: 24px auto; background: linear-gradient(135deg, #1565c0, #1976d2); color: #fff !important; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 15px; }
                        .notice { background: #21262d; border-radius: 8px; padding: 12px 16px; font-size: 12px; color: #8b949e; margin-top: 24px; border-left: 3px solid #3b82f6; }
                        .footer { text-align: center; padding: 20px 32px; border-top: 1px solid #21262d; font-size: 12px; color: #484f58; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>⚡ Reset Your Password</h1>
                            <p>AI Resume Analyzer</p>
                        </div>
                        <div class="body">
                            <p>Hi there,</p>
                            <p>We received a request to reset the password for your account associated with <strong style="color:#58a6ff">${toEmail}</strong>. Click the button below to set a new password.</p>
                            <a href="${resetUrl}" class="btn">Reset My Password</a>
                            <div class="notice">
                                ⏰ This link expires in <strong>15 minutes</strong>. If you didn't request a password reset, you can safely ignore this email.
                            </div>
                        </div>
                        <div class="footer">
                            <p>© 2025 AI Resume Analyzer. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `,
        };

        try {
            const info = await transporter.sendMail(mailOptions);
            logger.info(`[Email] ✅ Password reset email sent to: ${toEmail} | MessageID: ${info.messageId}`);
        } catch (err: unknown) {
            const error = err as Error;
            logger.error(`[Email] ❌ Failed to send reset email to ${toEmail}: ${error.message}`);
            throw new Error(`Email delivery failed: ${error.message}`);
        }
    },
};
