/* Strategy for sending Patient Reschedule Email.
More details on email-strategy/email-strategy-factory.js.
*/

import { cardHtml, formatAppointmentType, toPrettyDate, toPrettyTime } from '../utils.js';

const strategy = {
  type: 'patient-rescheduled-appointment',
  getLabel: () => 'Patient Reschedule Email To Doctor',
  build: ({ doctorName, patientName, appointmentDate, appointmentTime, appointmentType }) => {
    const prettyDate = toPrettyDate(appointmentDate) || String(appointmentDate || '');
    const prettyTime = toPrettyTime(appointmentTime) || String(appointmentTime || '');
    const normalizedType = formatAppointmentType(appointmentType);

    const subject = 'Patient rescheduled an appointment';
    const text = `Hi ${doctorName || 'Doctor'}, ${patientName || 'a patient'} rescheduled an appointment to ${prettyDate} at ${prettyTime} (${normalizedType}).`;
    const html = cardHtml({
      title: 'Patient Rescheduled Appointment',
      intro: `${patientName || 'A patient'} rescheduled an appointment. Please review and reconfirm.`,
      fields: [
        { label: 'Patient', value: patientName || 'Patient' },
        { label: 'Date', value: prettyDate },
        { label: 'Time', value: prettyTime },
        { label: 'Type', value: normalizedType },
      ],
    });

    return { subject, text, html };
  },
};

export default strategy;
