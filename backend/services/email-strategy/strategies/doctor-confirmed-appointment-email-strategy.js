/* Strategy for sending Doctor Confirmation Email.
More details on email-strategy/email-strategy-factory.js.
*/

import { FRONTEND_URL, cardHtml, formatAppointmentType, toPrettyDate, toPrettyTime } from '../utils.js';

const strategy = {
  type: 'doctor-confirmed-appointment',
  getLabel: () => 'Appointment Approval Email',
  build: ({ patientName, doctorName, appointmentDate, appointmentTime, appointmentType }) => {
    const prettyDate = toPrettyDate(appointmentDate) || String(appointmentDate || '');
    const prettyTime = toPrettyTime(appointmentTime) || String(appointmentTime || '');
    const normalizedType = formatAppointmentType(appointmentType);
    const appointmentsLink = `${FRONTEND_URL}/patient/dashboard`;

    const subject = 'Your appointment has been confirmed';
    const text = `Hi ${patientName || 'Patient'}, your appointment with ${doctorName || 'your provider'} on ${prettyDate} at ${prettyTime} (${normalizedType}) has been confirmed. View details: ${appointmentsLink}`;
    const html = cardHtml({
      title: 'Appointment Confirmed',
      intro: `Hi ${patientName || 'Patient'}, your appointment with ${doctorName || 'your provider'} has been confirmed.`,
      fields: [
        { label: 'Date', value: prettyDate },
        { label: 'Time', value: prettyTime },
        { label: 'Type', value: normalizedType },
      ],
      cta: { href: appointmentsLink, label: 'View Appointment' },
    });

    return { subject, text, html };
  },
};

export default strategy;
