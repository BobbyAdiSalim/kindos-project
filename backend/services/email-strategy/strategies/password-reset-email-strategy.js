/* Strategy for sending Password Reset Email.
More details on email-strategy/email-strategy-factory.js.
*/

import { cardHtml } from '../utils.js';

const strategy = {
  type: 'password-reset',
  getLabel: () => 'Password Reset Email',
  build: ({ resetLink, expiresMinutes = 60 }) => {
    const subject = 'Reset your password';
    const text = `You requested a password reset. Use this link to reset your password: ${resetLink}. This link expires in ${expiresMinutes} minutes.`;
    const html = cardHtml({
      title: 'Reset Your Password',
      intro: `Use the button below to reset your password. This link expires in ${expiresMinutes} minutes.`,
      fields: [{ label: 'Reset Link', value: resetLink }],
      cta: { href: resetLink, label: 'Reset Password' },
      footer: 'If you did not request this, you can ignore this email.',
    });

    return { subject, text, html };
  },
};

export default strategy;
