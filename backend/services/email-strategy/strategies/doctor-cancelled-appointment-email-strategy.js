/* Strategy for sending Doctor Cancellation Email.
More details on email-strategy/email-strategy-factory.js.
*/

import { FRONTEND_URL, cardHtml, formatAppointmentType, toPrettyDate, toPrettyTime } from '../utils.js';

const strategy = {
  type: 'doctor-cancelled-appointment',
  getLabel: () => 'Appointment Cancellation Email',
  build: ({ patientName, doctorName, appointmentDate, appointmentTime, appointmentType }) => {
    const prettyDate = toPrettyDate(appointmentDate) || String(appointmentDate || '');
    const prettyTime = toPrettyTime(appointmentTime) || String(appointmentTime || '');
    const normalizedType = formatAppointmentType(appointmentType);
    const rebookLink = `${FRONTEND_URL}/patient/providers`;

    const subject = 'Your appointment has been cancelled';
    const text = `Hi ${patientName || 'Patient'}, your appointment with ${doctorName || 'your provider'} on ${prettyDate} at ${prettyTime} (${normalizedType}) has been cancelled. Please book a new appointment here: ${rebookLink}`;
    const html = cardHtml({
      title: 'Appointment Cancelled',
      intro: `Hi ${patientName || 'Patient'}, your appointment with ${doctorName || 'your provider'} has been cancelled.`,
      fields: [
        { label: 'Date', value: prettyDate },
        { label: 'Time', value: prettyTime },
        { label: 'Type', value: normalizedType },
      ],
      cta: { href: rebookLink, label: 'Book New Appointment' },
    });

    return { subject, text, html };
  },
};

export default strategy;
