const nodemailer = require('nodemailer');
let transporter;
if (process.env.SMTP_HOST && process.env.SMTP_USER) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === '1' || process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

const twilioClient = (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) ? require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN) : null;

async function sendEmail(to, subject, text, html) {
  if (!transporter) {
    console.log('[notify] SMTP not configured, skipping email to', to);
    return;
  }

  const mail = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
    html,
  };

  try {
    const info = await transporter.sendMail(mail);
    console.log('[notify] Email sent:', info.messageId);
  } catch (e) {
    console.error('[notify] Email error:', e.message || e);
  }
}

async function sendSms(to, body) {
  if (!twilioClient || !process.env.TWILIO_PHONE_FROM) {
    console.log('[notify] Twilio not configured, skipping SMS to', to);
    return;
  }

  try {
    const msg = await twilioClient.messages.create({
      from: process.env.TWILIO_PHONE_FROM,
      to,
      body,
    });
    console.log('[notify] SMS sent:', msg.sid);
  } catch (e) {
    console.error('[notify] SMS error:', e.message || e);
  }
}

module.exports = { sendEmail, sendSms };
