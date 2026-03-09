/* Strategy for sending Waitlist Slot Opened Email.
More details on email-strategy/email-strategy-factory.js.
*/

import { FRONTEND_URL, cardHtml, formatAppointmentType, toPrettyDate, toPrettyTime } from '../utils.js';

const strategy = {
  type: 'waitlist-slot-opened',
  getLabel: () => 'Waitlist Slot Opened Email',
  build: ({ patientName, doctorName, appointmentDate, appointmentStartTime, appointmentEndTime, appointmentType }) => {
    const dateLabel = toPrettyDate(appointmentDate) || String(appointmentDate || '');
    const startLabel = toPrettyTime(appointmentStartTime) || String(appointmentStartTime || '');
    const endLabel = toPrettyTime(appointmentEndTime) || String(appointmentEndTime || '');
    const typeLabel = formatAppointmentType(appointmentType);
    const bookingLink = `${FRONTEND_URL}/patient/providers`;

    const subject = 'A waitlisted appointment slot is now available';
    const text = `Hi ${patientName || 'Patient'}, a slot you waitlisted for with ${doctorName || 'your provider'} opened up on ${dateLabel}, ${startLabel}-${endLabel} (${typeLabel}). Book now: ${bookingLink}`;
    const html = cardHtml({
      title: 'Waitlist Slot Opened',
      intro: `A previously unavailable slot with ${doctorName || 'your provider'} is now open.`,
      fields: [
        { label: 'Date', value: dateLabel },
        { label: 'Time', value: `${startLabel} - ${endLabel}` },
        { label: 'Type', value: typeLabel },
      ],
      cta: { href: bookingLink, label: 'Book Appointment' },
    });

    return { subject, text, html };
  },
};

export default strategy;
