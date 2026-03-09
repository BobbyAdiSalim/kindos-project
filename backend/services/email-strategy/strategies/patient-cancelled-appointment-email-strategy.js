/* Strategy for sending Patient Cancellation Email.
More details on email-strategy/email-strategy-factory.js.
*/

import { cardHtml, formatAppointmentType, toPrettyDate, toPrettyTime } from '../utils.js';

const strategy = {
  type: 'patient-cancelled-appointment',
  getLabel: () => 'Patient Cancellation Email To Doctor',
  build: ({ doctorName, patientName, appointmentDate, appointmentTime, appointmentType }) => {
    const prettyDate = toPrettyDate(appointmentDate) || String(appointmentDate || '');
    const prettyTime = toPrettyTime(appointmentTime) || String(appointmentTime || '');
    const normalizedType = formatAppointmentType(appointmentType);

    const subject = 'Patient cancelled an appointment';
    const text = `Hi ${doctorName || 'Doctor'}, ${patientName || 'a patient'} cancelled their ${normalizedType} appointment on ${prettyDate} at ${prettyTime}.`;
    const html = cardHtml({
      title: 'Patient Cancelled Appointment',
      intro: `${patientName || 'A patient'} cancelled their appointment.`,
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
