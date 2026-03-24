import { sequelize, Appointment, Doctor } from '../../models/index.js';
import {
  sendDoctorRescheduleEmailToPatient,
  sendPatientRescheduleEmailToDoctor,
} from '../../utils/appointmentEmail.js';
import {
  HttpError,
  APPOINTMENT_TYPES,
  normalizeTime,
  appointmentInclude,
  serializeAppointment,
  validateSlotSelectionPayload,
  ensureSlotIsBookable,
  ensureNoOverlappingAppointment,
  getPatientForUser,
  hasPendingReschedule,
  clearPendingReschedule,
} from './bookingShared.js';

/* Strategy for sending Reschedule Email.
More details on email-strategy/email-strategy-factory.js.
*/
export const rescheduleAppointmentByPatient = async (req, res) => {
  try {
    const appointmentId = Number(req.params.appointmentId);
    const patientUserId = req.auth.userId;
    const schedule = validateSlotSelectionPayload(req.body || {});

    if (!Number.isInteger(appointmentId) || appointmentId <= 0) {
      return res.status(400).json({ message: 'Invalid appointment ID.' });
    }

    const updatedAppointment = await sequelize.transaction(async (transaction) => {
      const patient = await getPatientForUser(patientUserId, transaction);

      const appointment = await Appointment.findOne({
        where: {
          id: appointmentId,
          patient_id: patient.id,
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!appointment) {
        throw new HttpError(404, 'Appointment not found.');
      }

      if (!['scheduled', 'confirmed'].includes(appointment.status)) {
        throw new HttpError(409, 'Only pending or confirmed appointments can be rescheduled.');
      }

      const doctor = await Doctor.findByPk(appointment.doctor_id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!doctor || doctor.verification_status !== 'approved') {
        throw new HttpError(404, 'Doctor not found or not verified.');
      }

      const slotId = await ensureSlotIsBookable({
        transaction,
        doctorId: doctor.id,
        doctorProfile: doctor,
        appointmentDate: schedule.appointmentDate,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        appointmentType: schedule.appointmentType,
      });

      await ensureNoOverlappingAppointment({
        transaction,
        doctorId: doctor.id,
        appointmentDate: schedule.appointmentDate,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        excludeAppointmentId: appointment.id,
      });

      appointment.slot_id = slotId;
      appointment.appointment_date = schedule.appointmentDate;
      appointment.start_time = schedule.startTime;
      appointment.end_time = schedule.endTime;
      appointment.appointment_type = schedule.appointmentType;
      appointment.duration = schedule.duration;
      appointment.status = 'scheduled';
      appointment.cancelled_at = null;
      appointment.cancelled_by = null;
      appointment.cancellation_reason = null;
      appointment.doctor_rejection_reason_code = null;
      appointment.doctor_rejection_reason_note = null;
      clearPendingReschedule(appointment);

      await appointment.save({ transaction });

      return Appointment.findByPk(appointment.id, {
        include: appointmentInclude,
        transaction,
      });
    });

    res.json({
      message: 'Appointment rescheduled. Waiting for doctor reconfirmation.',
      appointment: serializeAppointment(updatedAppointment),
    });

    const doctorEmail = updatedAppointment?.doctor?.user?.email;
    if (doctorEmail) {
      const doctorName = updatedAppointment.doctor?.full_name || updatedAppointment.doctor?.user?.username || 'Doctor';
      const patientName = updatedAppointment.patient?.full_name || updatedAppointment.patient?.user?.username || 'Patient';

      void sendPatientRescheduleEmailToDoctor({
        to: doctorEmail,
        doctorName,
        patientName,
        appointmentDate: updatedAppointment.appointment_date,
        appointmentTime: updatedAppointment.start_time,
        appointmentType: updatedAppointment.appointment_type,
      }).catch((emailError) => {
        console.error('Failed to send patient reschedule email to doctor:', emailError);
      });
    }
  } catch (error) {
    const statusCode = error instanceof HttpError ? error.status : 500;
    const message = error instanceof HttpError
      ? error.message
      : 'Failed to reschedule appointment.';

    if (!(error instanceof HttpError)) {
      console.error('Error rescheduling appointment:', error);
    }

    res.status(statusCode).json({ message });
  }
};

export const rescheduleAppointmentByDoctor = async (req, res) => {
  try {
    const appointmentId = Number(req.params.appointmentId);
    const doctorUserId = req.auth.userId;
    const schedule = validateSlotSelectionPayload(req.body || {});

    if (!Number.isInteger(appointmentId) || appointmentId <= 0) {
      return res.status(400).json({ message: 'Invalid appointment ID.' });
    }

    const updatedAppointment = await sequelize.transaction(async (transaction) => {
      const doctor = await Doctor.findOne({
        where: { user_id: doctorUserId },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!doctor) {
        throw new HttpError(404, 'Doctor profile not found.');
      }

      const appointment = await Appointment.findOne({
        where: {
          id: appointmentId,
          doctor_id: doctor.id,
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!appointment) {
        throw new HttpError(404, 'Appointment not found.');
      }

      if (!['scheduled', 'confirmed'].includes(appointment.status)) {
        throw new HttpError(409, 'Only pending or confirmed appointments can be rescheduled.');
      }

      if (appointment.pending_reschedule_requested_by_role === 'doctor') {
        throw new HttpError(409, 'A reschedule proposal is already waiting for patient response.');
      }

      await ensureSlotIsBookable({
        transaction,
        doctorId: doctor.id,
        doctorProfile: doctor,
        appointmentDate: schedule.appointmentDate,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        appointmentType: schedule.appointmentType,
      });

      await ensureNoOverlappingAppointment({
        transaction,
        doctorId: doctor.id,
        appointmentDate: schedule.appointmentDate,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        excludeAppointmentId: appointment.id,
      });

      appointment.pending_reschedule_date = schedule.appointmentDate;
      appointment.pending_reschedule_start_time = schedule.startTime;
      appointment.pending_reschedule_end_time = schedule.endTime;
      appointment.pending_reschedule_type = schedule.appointmentType;
      appointment.pending_reschedule_duration = schedule.duration;
      appointment.pending_reschedule_requested_by_role = 'doctor';
      appointment.pending_reschedule_previous_status = appointment.status;
      appointment.pending_reschedule_requested_at = new Date();
      appointment.status = 'scheduled';

      await appointment.save({ transaction });

      return Appointment.findByPk(appointment.id, {
        include: appointmentInclude,
        transaction,
      });
    });

    res.json({
      message: 'Reschedule proposal sent to patient for confirmation.',
      appointment: serializeAppointment(updatedAppointment),
    });

    const patientEmail = updatedAppointment?.patient?.user?.email;
    if (patientEmail) {
      const patientName = updatedAppointment.patient?.full_name || updatedAppointment.patient?.user?.username || 'Patient';
      const doctorName = updatedAppointment.doctor?.full_name || updatedAppointment.doctor?.user?.username || 'Doctor';

      void sendDoctorRescheduleEmailToPatient({
        to: patientEmail,
        patientName,
        doctorName,
        appointmentId: updatedAppointment.id,
        appointmentDate: updatedAppointment.pending_reschedule_date,
        appointmentTime: updatedAppointment.pending_reschedule_start_time,
        appointmentType: updatedAppointment.pending_reschedule_type,
      }).catch((emailError) => {
        console.error('Failed to send doctor reschedule email to patient:', emailError);
      });
    }
  } catch (error) {
    const statusCode = error instanceof HttpError ? error.status : 500;
    const message = error instanceof HttpError
      ? error.message
      : 'Failed to reschedule appointment.';

    if (!(error instanceof HttpError)) {
      console.error('Error rescheduling appointment by doctor:', error);
    }

    res.status(statusCode).json({ message });
  }
};

export const respondToDoctorReschedule = async (req, res) => {
  try {
    const appointmentId = Number(req.params.appointmentId);
    const patientUserId = req.auth.userId;
    const action = String(req.body?.action || '').trim().toLowerCase();

    if (!Number.isInteger(appointmentId) || appointmentId <= 0) {
      return res.status(400).json({ message: 'Invalid appointment ID.' });
    }

    if (!['accept', 'decline'].includes(action)) {
      return res.status(400).json({ message: 'action must be either "accept" or "decline".' });
    }

    const updatedAppointment = await sequelize.transaction(async (transaction) => {
      const patient = await getPatientForUser(patientUserId, transaction);

      const appointment = await Appointment.findOne({
        where: {
          id: appointmentId,
          patient_id: patient.id,
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!appointment) {
        throw new HttpError(404, 'Appointment not found.');
      }

      if (!['scheduled', 'confirmed'].includes(appointment.status)) {
        throw new HttpError(409, 'Only pending or confirmed appointments can be updated.');
      }

      if (appointment.pending_reschedule_requested_by_role !== 'doctor' || !hasPendingReschedule(appointment)) {
        throw new HttpError(409, 'There is no doctor reschedule proposal to respond to.');
      }

      if (action === 'decline') {
        appointment.status = appointment.pending_reschedule_previous_status || appointment.status;
        clearPendingReschedule(appointment);
        await appointment.save({ transaction });
      } else {
        const doctor = await Doctor.findByPk(appointment.doctor_id, {
          transaction,
          lock: transaction.LOCK.UPDATE,
        });

        if (!doctor || doctor.verification_status !== 'approved') {
          throw new HttpError(404, 'Doctor not found or not verified.');
        }

        const proposal = {
          appointmentDate: String(appointment.pending_reschedule_date || ''),
          startTime: normalizeTime(String(appointment.pending_reschedule_start_time || '')),
          endTime: normalizeTime(String(appointment.pending_reschedule_end_time || '')),
          appointmentType: String(appointment.pending_reschedule_type || ''),
          duration: Number(appointment.pending_reschedule_duration),
        };

        if (
          !proposal.appointmentDate
          || !proposal.startTime
          || !proposal.endTime
          || !APPOINTMENT_TYPES.has(proposal.appointmentType)
          || !Number.isFinite(proposal.duration)
        ) {
          throw new HttpError(409, 'Stored reschedule proposal is invalid.');
        }

        const slotId = await ensureSlotIsBookable({
          transaction,
          doctorId: doctor.id,
          doctorProfile: doctor,
          appointmentDate: proposal.appointmentDate,
          startTime: proposal.startTime,
          endTime: proposal.endTime,
          appointmentType: proposal.appointmentType,
        });

        await ensureNoOverlappingAppointment({
          transaction,
          doctorId: doctor.id,
          appointmentDate: proposal.appointmentDate,
          startTime: proposal.startTime,
          endTime: proposal.endTime,
          excludeAppointmentId: appointment.id,
        });

        appointment.slot_id = slotId;
        appointment.appointment_date = proposal.appointmentDate;
        appointment.start_time = proposal.startTime;
        appointment.end_time = proposal.endTime;
        appointment.appointment_type = proposal.appointmentType;
        appointment.duration = proposal.duration;
        appointment.status = appointment.pending_reschedule_previous_status || 'scheduled';
        appointment.cancelled_at = null;
        appointment.cancelled_by = null;
        appointment.cancellation_reason = null;
        appointment.doctor_rejection_reason_code = null;
        appointment.doctor_rejection_reason_note = null;
        clearPendingReschedule(appointment);

        await appointment.save({ transaction });
      }

      return Appointment.findByPk(appointment.id, {
        include: appointmentInclude,
        transaction,
      });
    });

    res.json({
      message:
        action === 'accept'
          ? 'Reschedule accepted successfully.'
          : 'Reschedule proposal declined. Appointment schedule unchanged.',
      appointment: serializeAppointment(updatedAppointment),
    });

    if (action === 'accept' && updatedAppointment?.status === 'scheduled') {
      const doctorEmail = updatedAppointment?.doctor?.user?.email;
      if (doctorEmail) {
        const doctorName = updatedAppointment.doctor?.full_name || updatedAppointment.doctor?.user?.username || 'Doctor';
        const patientName = updatedAppointment.patient?.full_name || updatedAppointment.patient?.user?.username || 'Patient';

        void sendPatientRescheduleEmailToDoctor({
          to: doctorEmail,
          doctorName,
          patientName,
          appointmentDate: updatedAppointment.appointment_date,
          appointmentTime: updatedAppointment.start_time,
          appointmentType: updatedAppointment.appointment_type,
        }).catch((emailError) => {
          console.error('Failed to send accepted reschedule email to doctor:', emailError);
        });
      }
    }
  } catch (error) {
    const statusCode = error instanceof HttpError ? error.status : 500;
    const message = error instanceof HttpError
      ? error.message
      : 'Failed to respond to reschedule proposal.';

    if (!(error instanceof HttpError)) {
      console.error('Error responding to doctor reschedule:', error);
    }

    res.status(statusCode).json({ message });
  }
};

export const rescheduleAppointment = async (req, res) => {
  const role = req.auth?.role;
  if (role === 'patient') {
    return rescheduleAppointmentByPatient(req, res);
  }
  if (role === 'doctor') {
    return rescheduleAppointmentByDoctor(req, res);
  }
  return res.status(403).json({ message: 'Only patients or doctors can reschedule appointments.' });
};
