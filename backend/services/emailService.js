const nodemailer = require('nodemailer');
const sendEmail = require('../utils/sendEmail');

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: process.env.SMTP_PORT || 587,
            secure: false,
            auth: {
                user: process.env.SMTP_USER || 'your-email@gmail.com',
                pass: process.env.SMTP_PASS || 'your-app-password'
            }
        });
    }

    async send2FACode(email, name, code) {
        try {
            await sendEmail({
                to: email,
                subject: 'Gym-Wale Admin - Security Verification Code',
                title: 'Security Verification Required',
                preheader: 'Your verification code for secure login',
                bodyHtml: `<p>Hello ${name},</p>
                  <p>Someone is attempting to sign in to your admin account. Use the verification code below to continue:</p>
                  <div style="font-size:34px;font-weight:700;letter-spacing:8px;margin:22px 0 10px;color:#38bdf8;">${code}</div>
                  <p style="margin:0 0 18px;font-size:13px;color:#94a3b8;">This code expires in <strong>5 minutes</strong>.</p>
                  <div style="background:#1e293b;border:1px solid #334155;padding:14px 18px;border-radius:14px;font-size:13px;line-height:1.5;color:#e2e8f0;">
                    <strong style="color:#fbbf24;">⚠ Security Notice:</strong><br/>
                    Requested from environment: ${process.env.NODE_ENV === 'production' ? 'Production' : 'Development'}<br/>
                    If you did not request this, ignore this email and consider changing your password.
                  </div>
                  <p style="margin-top:24px;">Never share this code with anyone.</p>`,
                action: {
                    label: 'Return to Login',
                    url: process.env.ADMIN_PORTAL_URL || (process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/frontend/public/login.html` : 'http://localhost:5000/frontend/public/login.html')
                }
            });
            console.log('2FA code sent to:', email);
        } catch (error) {
            console.error('Error sending 2FA email:', error);
            throw new Error('Failed to send verification code');
        }
    }

    async sendPasswordReset(email, name, resetToken) {
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/reset-password?token=${resetToken}`;
        
        try {
            await sendEmail({
                to: email,
                subject: 'Gym-Wale Admin - Password Reset Request',
                title: 'Password Reset Request',
                preheader: 'Reset your admin account password securely',
                bodyHtml: `<p>Hello ${name},</p>
                  <p>We received a request to reset your admin account password. Click the button below to create a new password:</p>
                  <p style="margin:16px 0;padding:12px 16px;background:#1e293b;border:1px solid #334155;border-radius:12px;font-size:13px;color:#e2e8f0;">
                    Reset link: <code style="color:#38bdf8;word-break:break-all;">${resetUrl}</code>
                  </p>
                  <div style="background:#1e293b;border:1px solid #334155;padding:14px 18px;border-radius:14px;font-size:13px;line-height:1.5;color:#e2e8f0;">
                    <strong style="color:#fbbf24;">⚠ Security Information:</strong><br/>
                    • This reset link expires in <strong>1 hour</strong><br/>
                    • If you didn't request this reset, ignore this email<br/>
                    • Your password remains unchanged until you complete the reset<br/>
                    • Use a strong, unique password when resetting
                  </div>
                  <p style="margin-top:20px;">If you continue to have problems, contact our support team.</p>`,
                action: {
                    label: 'Reset My Password',
                    url: resetUrl
                }
            });
            console.log('Password reset email sent to:', email);
        } catch (error) {
            console.error('Error sending password reset email:', error);
            throw new Error('Failed to send password reset email');
        }
    }

    async sendLoginAlert(email, name, loginDetails) {
        try {
            await sendEmail({
                to: email,
                subject: 'Gym-Wale Admin - New Login Detected',
                title: 'New Admin Login Detected',
                preheader: 'A new login occurred on your account',
                bodyHtml: `<p>Hello ${name},</p>
                  <p>We detected a new login to your admin account. Review the details below:</p>
                  <table style='width:100%;border-collapse:collapse;margin:12px 0 18px;font-size:13px;'>
                    <tr><td style='padding:6px 8px;background:#1e293b;color:#e2e8f0;width:120px;font-weight:600;'>Time</td><td style='padding:6px 8px;'>${loginDetails.timestamp}</td></tr>
                    <tr><td style='padding:6px 8px;background:#1e293b;color:#e2e8f0;font-weight:600;'>IP</td><td style='padding:6px 8px;'>${loginDetails.ip}</td></tr>
                    <tr><td style='padding:6px 8px;background:#1e293b;color:#e2e8f0;font-weight:600;'>Device</td><td style='padding:6px 8px;'>${loginDetails.device}</td></tr>
                    <tr><td style='padding:6px 8px;background:#1e293b;color:#e2e8f0;font-weight:600;'>Location</td><td style='padding:6px 8px;'>${loginDetails.location || 'Unknown'}</td></tr>
                  </table>
                  <p>If this was you, no action is required. If you don't recognize this activity:</p>
                  <ul style='margin:0 0 18px 20px;padding:0;'>
                    <li>Change your password immediately</li>
                    <li>Review recent account changes</li>
                    <li>Contact support if suspicious</li>
                  </ul>`,
                action: {
                    label: 'Secure Account',
                    url: process.env.ACCOUNT_SECURITY_URL || process.env.ADMIN_PORTAL_URL || 'http://localhost:5000/frontend/public/login.html'
                }
            });
            console.log('Login alert sent to:', email);
        } catch (error) {
            console.error('Error sending login alert:', error);
        }
    }
}

module.exports = EmailService;
