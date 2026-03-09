import { sendEmailByType } from '../services/email-strategy/index.js';

export const sendWaitlistAutoBookedEmail = async ({
  to,
  patientName,
  doctorName,
  appointmentDate,
  appointmentStartTime,
  appointmentEndTime,
  appointmentType,
}) => {
  await sendEmailByType({
    type: 'waitlist-auto-booked',
    to,
    data: {
      patientName,
      doctorName,
      appointmentDate,
      appointmentStartTime,
      appointmentEndTime,
      appointmentType,
    },
  });
};

export const sendWaitlistSlotOpenedEmail = async ({
  to,
  patientName,
  doctorName,
  appointmentDate,
  appointmentStartTime,
  appointmentEndTime,
  appointmentType,
}) => {
  await sendEmailByType({
    type: 'waitlist-slot-opened',
    to,
    data: {
      patientName,
      doctorName,
      appointmentDate,
      appointmentStartTime,
      appointmentEndTime,
      appointmentType,
    },
  });
};
