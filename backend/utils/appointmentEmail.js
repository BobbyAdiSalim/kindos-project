import { sendEmailByType } from '../services/email-strategy/index.js';

export const sendDoctorCancellationEmail = async ({
  to,
  patientName,
  doctorName,
  appointmentDate,
  appointmentTime,
  appointmentType,
  declineReason,
}) => {
  await sendEmailByType({
    type: 'doctor-cancelled-appointment',
    to,
    data: { patientName, doctorName, appointmentDate, appointmentTime, appointmentType, declineReason },
  });
};

export const sendDoctorApprovalEmail = async ({
  to,
  patientName,
  doctorName,
  appointmentDate,
  appointmentTime,
  appointmentType,
}) => {
  await sendEmailByType({
    type: 'doctor-confirmed-appointment',
    to,
    data: { patientName, doctorName, appointmentDate, appointmentTime, appointmentType },
  });
};

export const sendDoctorRescheduleEmailToPatient = async ({
  to,
  patientName,
  doctorName,
  appointmentId,
  appointmentDate,
  appointmentTime,
  appointmentType,
}) => {
  await sendEmailByType({
    type: 'doctor-reschedule-proposed',
    to,
    data: {
      patientName,
      doctorName,
      appointmentId,
      appointmentDate,
      appointmentTime,
      appointmentType,
    },
  });
};

export const sendPatientCancellationEmailToDoctor = async ({
  to,
  doctorName,
  patientName,
  appointmentDate,
  appointmentTime,
  appointmentType,
}) => {
  await sendEmailByType({
    type: 'patient-cancelled-appointment',
    to,
    data: { doctorName, patientName, appointmentDate, appointmentTime, appointmentType },
  });
};

export const sendPatientRescheduleEmailToDoctor = async ({
  to,
  doctorName,
  patientName,
  appointmentDate,
  appointmentTime,
  appointmentType,
}) => {
  await sendEmailByType({
    type: 'patient-rescheduled-appointment',
    to,
    data: { doctorName, patientName, appointmentDate, appointmentTime, appointmentType },
  });
};
