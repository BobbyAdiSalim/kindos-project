import nodemailer from 'nodemailer';

const cleanEnv = (value, fallback = '') => {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value).replace(/\r/g, '').trim();
};

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: cleanEnv(process.env.SMTP_HOST),
    port: Number(cleanEnv(process.env.SMTP_PORT, '587')),
    secure: cleanEnv(process.env.SMTP_SECURE, 'false') === 'true',
    auth: {
      user: cleanEnv(process.env.SMTP_USER),
      pass: cleanEnv(process.env.SMTP_PASS),
    },
  });

  return transporter;
};

const smtpTransport = {
  async send({ to, subject, text, html }) {
    if (!to) return;

    await getTransporter().sendMail({
      from: cleanEnv(process.env.EMAIL_FROM) || cleanEnv(process.env.SMTP_USER),
      to,
      subject,
      text,
      html,
    });
  },
};

export default smtpTransport;
