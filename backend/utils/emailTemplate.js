// Unified Gym-Wale branded email template utility
// Provides a single wrapper for all outgoing HTML emails.
// Supports dark-mode friendly colors and mobile responsiveness.

const { getBase64Logo } = require('./logoUtils');

const DEFAULT_BRAND = {
  name: process.env.BRAND_NAME || 'Gym-Wale',
  portalUrl: process.env.BRAND_PORTAL_URL || 'https://gym-wale.example',
  supportUrl: process.env.BRAND_SUPPORT_URL || 'https://gym-wale.example/support',
  primary: process.env.BRAND_PRIMARY_COLOR || '#0d4d89',
  accent: process.env.BRAND_ACCENT_COLOR || '#38bdf8',
  bg: '#0a0f1e',
  cardBg: '#142036',
  // Use publicly accessible logo URL - replace with your actual hosted logo
  logo: process.env.BRAND_LOGO_URL || 'https://via.placeholder.com/128x128/0d4d89/ffffff?text=GW',
  emailFromName: process.env.BRAND_FROM_NAME || 'Gym-Wale Team'
};

// Escape minimal HTML to avoid accidental injection in simple text props
const escapeHtml = (str = '') => str
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

/**
 * Wrap provided bodyHtml inside branded email layout.
 * @param {Object} opts
 * @param {String} opts.title - Heading title displayed near logo
 * @param {String} opts.preheader - Hidden preheader text for inbox preview
 * @param {String} opts.bodyHtml - Main inner HTML (already sanitized / trusted)
 * @param {Object} [opts.action] - Optional CTA button { label, url }
 * @param {String} [opts.footerNote] - Custom footer note override
 * @param {Object} [opts.brand] - Brand override object
 * @param {Boolean} [opts.minimal] - If true, reduces chrome
 */
function wrapEmail(opts = {}) {
  const {
    title = DEFAULT_BRAND.name,
    preheader = '',
    bodyHtml = '',
    action,
    footerNote,
    brand = {},
    minimal = false
  } = opts;

  const b = { ...DEFAULT_BRAND, ...brand };
  const safeTitle = escapeHtml(title);
  const safePreheader = escapeHtml(preheader).slice(0, 180);

  const actionButton = action && action.url && action.label ? `
    <div style="margin:32px 0 10px;text-align:center;">
      <a href="${action.url}" style="background:${b.accent};color:#041424;font-weight:600;text-decoration:none;padding:14px 28px;border-radius:14px;font-size:15px;display:inline-block;box-shadow:0 4px 14px -2px rgba(0,0,0,.4);letter-spacing:.3px;">
        ${escapeHtml(action.label)}
      </a>
    </div>` : '';

  const effectiveFooterNote = footerNote || `This is an automated message from the ${b.name} platform. Please do not reply to this email.`;

  // Use table-based layout for better email client compatibility.
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${safeTitle}</title>
  <style>
    @media (max-width:600px){
      .container{padding:18px !important;}
      h1{font-size:20px !important;}
      .card{padding:20px !important;}
    }
    @media (prefers-color-scheme: light){
      body{background:#f1f5f9 !important;}
      .card{background:#ffffff !important;}
      .muted{color:#475569 !important;}
    }
  </style>
</head>
<body style="margin:0;padding:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:${b.bg};color:#e2e8f0;line-height:1.55;">
  <span style="display:none !important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;mso-hide:all;">${safePreheader}</span>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
    <tr>
      <td align="center" style="padding:28px 14px;">
        <table class="container" role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;border-collapse:collapse;padding:0 10px;">
          <tr>
            <td style="text-align:center;padding:0 0 20px;">
              <div style="display:inline-flex;align-items:center;gap:14px;background:linear-gradient(135deg,${b.primary} 0%,${b.accent} 90%);padding:14px 26px 14px 18px;border-radius:22px;box-shadow:0 4px 16px -2px rgba(0,0,0,.4);">
                <img src="${b.logo}" alt="${b.name} Logo" width="56" height="56" style="display:block;border-radius:16px;object-fit:contain;background:#ffffff;padding:4px;box-shadow:0 2px 6px rgba(0,0,0,.35);" />
                <div style="text-align:left;">
                  <div style="font-size:18px;font-weight:700;letter-spacing:.5px;color:#ffffff;margin:0 0 4px;">${b.name}</div>
                  <div style="font-size:12px;font-weight:500;color:#f1f5f9;opacity:.9;">${minimal ? '' : 'Fitness Management Platform'}</div>
                </div>
              </div>
            </td>
          </tr>
          <tr>
            <td>
              <table role="presentation" width="100%" class="card" cellspacing="0" cellpadding="0" style="background:${b.cardBg};border-radius:28px;padding:36px 44px 40px;border:1px solid #1e293b;box-shadow:0 8px 28px -4px rgba(0,0,0,.55);">
                <tr>
                  <td style="padding:0 0 8px;">
                    <h1 style="margin:0 0 18px;font-size:24px;line-height:1.25;letter-spacing:.5px;font-weight:700;color:#f8fafc;">${safeTitle}</h1>
                    <div style="font-size:15px;color:#dbeafe;">
                      ${bodyHtml}
                    </div>
                    ${actionButton}
                    <div style="margin-top:40px;font-size:12px;color:#94a3b8;line-height:1.4;" class="muted">${effectiveFooterNote}</div>
                    <p style="margin:32px 0 4px;font-size:13px;color:#e2e8f0;">Regards,<br/><strong>${b.emailFromName}</strong></p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="text-align:center;padding:28px 0 0;">
              <div style="font-size:12px;color:#64748b;letter-spacing:.3px;">
                <div style="margin-bottom:6px;">© ${new Date().getFullYear()} ${b.name}. All rights reserved.</div>
                <div>
                  <a href="${b.portalUrl}" style="color:${b.accent};text-decoration:none;font-weight:500;">Platform</a>
                  &nbsp;•&nbsp;
                  <a href="${b.supportUrl}" style="color:${b.accent};text-decoration:none;font-weight:500;">Support</a>
                </div>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

module.exports = { wrapEmail, DEFAULT_BRAND };
