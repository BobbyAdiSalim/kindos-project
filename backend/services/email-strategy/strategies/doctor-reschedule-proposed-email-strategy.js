/* Strategy for sending Doctor Reschedule Email.
More details on email-strategy/email-strategy-factory.js.
*/

import { FRONTEND_URL, cardHtml, formatAppointmentType, toPrettyDate, toPrettyTime } from '../utils.js';

const strategy = {
  type: 'doctor-reschedule-proposed',
  getLabel: () => 'Doctor Reschedule Email To Patient',
  build: ({ patientName, doctorName, appointmentId, appointmentDate, appointmentTime, appointmentType }) => {
    const prettyDate = toPrettyDate(appointmentDate) || String(appointmentDate || '');
    const prettyTime = toPrettyTime(appointmentTime) || String(appointmentTime || '');
    const normalizedType = formatAppointmentType(appointmentType);
    const confirmLink = Number.isInteger(Number(appointmentId))
      ? `${FRONTEND_URL}/patient/appointment/${appointmentId}?reschedule=confirm`
      : `${FRONTEND_URL}/patient/dashboard`;

    const subject = 'Your appointment was rescheduled';
    const text = `Hi ${patientName || 'Patient'}, ${doctorName || 'your provider'} proposed a new appointment time: ${prettyDate} at ${prettyTime} (${normalizedType}). Review and confirm here: ${confirmLink}`;
    const html = cardHtml({
      title: 'Appointment Reschedule Proposal',
      intro: `Hi ${patientName || 'Patient'}, ${doctorName || 'your provider'} proposed a new appointment time.`,
      fields: [
        { label: 'Date', value: prettyDate },
        { label: 'Time', value: prettyTime },
        { label: 'Type', value: normalizedType },
      ],
      cta: { href: confirmLink, label: 'Review & Confirm' },
    });

    return { subject, text, html };
  },
};

export default strategy;
