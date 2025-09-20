const nodemailer = require('nodemailer');
const { wrapEmail, DEFAULT_BRAND } = require('./emailTemplate');

// Create transporter only once
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'Gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/**
 * Flexible sendEmail signature supporting legacy and new object form.
 * Legacy: sendEmail(to, subject, html)
 * New: sendEmail({ to, subject, title, preheader, bodyHtml, action, footerNote, brand, html, skipWrap })
 */
async function sendEmail(arg1, subjectLegacy, htmlLegacy) {
  let options = {};
  if (typeof arg1 === 'object' && !Array.isArray(arg1)) {
    options = { ...arg1 };
  } else {
    options = { to: arg1, subject: subjectLegacy, html: htmlLegacy };
  }

  const {
    to,
    subject,
    title = options.title || subject || DEFAULT_BRAND.name,
    preheader = options.preheader || '',
    bodyHtml = options.bodyHtml || options.html || '',
    action,
    footerNote,
    brand,
    skipWrap = false,
    headers = {}
  } = options;

  if (!to) throw new Error('sendEmail: `to` is required');
  if (!subject) throw new Error('sendEmail: `subject` is required');

  // Determine final HTML
  const finalHtml = skipWrap ? bodyHtml : wrapEmail({
    title,
    preheader,
    bodyHtml,
    action,
    footerNote,
    brand
  });

  console.log('[SendEmail] Prepared email', { to, subject, wrapped: !skipWrap });
  console.log('[SendEmail] From user configured:', !!process.env.EMAIL_USER);

  try {
    const info = await transporter.sendMail({
      from: `${process.env.BRAND_FROM_NAME || DEFAULT_BRAND.name} <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html: finalHtml,
      headers
    });
    console.log(`✅ [SendEmail] Email sent to ${to} - Message ID: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`❌ [SendEmail] Error sending email to ${to}:`, error);
    throw error;
  }
}

module.exports = sendEmail;
