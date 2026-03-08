/* Strategy for sending Doctor Verification Update Email.
More details on email-strategy/email-strategy-factory.js.
*/

import { FRONTEND_URL, cardHtml } from '../utils.js';

const strategy = {
  type: 'doctor-verification-status-updated',
  getLabel: () => 'Doctor Verification Status Updated Email',
  build: ({ dashboardLink = `${FRONTEND_URL}/doctor/dashboard` } = {}) => {
    const subject = 'Your verification status has been updated';
    const text = `Hello, your verification status has been updated. Please sign in and check your dashboard for details: ${dashboardLink}`;
    const html = cardHtml({
      title: 'Verification Update',
      intro: 'Your verification status has been updated. Please sign in and check your dashboard for details.',
      fields: [{ label: 'Dashboard', value: dashboardLink }],
      cta: { href: dashboardLink, label: 'Open Doctor Dashboard' },
      footer: 'This is an automated message from UTLWA.',
    });

    return { subject, text, html };
  },
};

export default strategy;
