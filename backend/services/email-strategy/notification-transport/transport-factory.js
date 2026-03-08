import consoleTransport from './console-transport.js';
import smtpTransport from './smtp-transport.js';

const cleanEnv = (value, fallback = '') => {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value).replace(/\r/g, '').trim();
};

const TRANSPORTS = {
  console: consoleTransport,
  smtp: smtpTransport,
};

export const getNotificationTransport = () => {
  const provider = cleanEnv(process.env.EMAIL_PROVIDER, 'console').toLowerCase();
  return TRANSPORTS[provider] || consoleTransport;
};
