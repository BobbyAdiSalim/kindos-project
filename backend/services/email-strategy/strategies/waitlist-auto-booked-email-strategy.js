/* Strategy for sending Waitlist Auto-Booked Email.
More details on email-strategy/email-strategy-factory.js.
*/

import { FRONTEND_URL, cardHtml, formatAppointmentType, toPrettyDate, toPrettyTime } from '../utils.js';

const strategy = {
  type: 'waitlist-auto-booked',
  getLabel: () => 'Waitlist Auto-Booked Email',
  build: ({ patientName, doctorName, appointmentDate, appointmentStartTime, appointmentEndTime, appointmentType }) => {
    const dateLabel = toPrettyDate(appointmentDate) || String(appointmentDate || '');
    const startLabel = toPrettyTime(appointmentStartTime) || String(appointmentStartTime || '');
    const endLabel = toPrettyTime(appointmentEndTime) || String(appointmentEndTime || '');
    const typeLabel = formatAppointmentType(appointmentType);
    const appointmentsLink = `${FRONTEND_URL}/patient/appointments`;

    const subject = 'You were automatically booked from the waitlist';
    const text = `Hi ${patientName || 'Patient'}, a cancelled slot with ${doctorName || 'your provider'} was reassigned to you from the waitlist on ${dateLabel}, ${startLabel}-${endLabel} (${typeLabel}). Review your appointment: ${appointmentsLink}`;
    const html = cardHtml({
      title: 'Waitlist Update',
      intro: `Great news. A cancelled slot with ${doctorName || 'your provider'} was reassigned to you from the waitlist.`,
      fields: [
        { label: 'Date', value: dateLabel },
        { label: 'Time', value: `${startLabel} - ${endLabel}` },
        { label: 'Type', value: typeLabel },
      ],
      cta: { href: appointmentsLink, label: 'View Appointment' },
    });

    return { subject, text, html };
  },
};

export default strategy;
