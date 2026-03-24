import { sequelize, Appointment, Connection, Doctor, Patient } from '../../models/index.js';
import waitlistService from '../../services/WaitlistService.js';
import {
  sendDoctorApprovalEmail,
  sendDoctorCancellationEmail,
  sendPatientCancellationEmailToDoctor,
} from '../../utils/appointmentEmail.js';
import {
  HttpError,
  appointmentInclude,
  serializeAppointment,
  getPatientForUser,
  clearPendingReschedule,
  hasPendingReschedule,
  CANCELLED_BY_PATIENT_REASON_PREFIX,
  DECLINED_BY_DOCTOR_REASON_PREFIX,
  DOCTOR_REJECTION_REASON_CODES,
  getDoctorRejectionReasonLabel,
} from './bookingShared.js';

/* Strategy for sending Cancellation Email.
More details on email-strategy/email-strategy-factory.js.
*/
export const cancelAppointmentByPatient = async (req, res) => {
  try {
    const appointmentId = Number(req.params.appointmentId);
    const patientUserId = req.auth.userId;
    const cancellationReason = String(req.body?.reason || '').trim();

    if (!Number.isInteger(appointmentId) || appointmentId <= 0) {
      return res.status(400).json({ message: 'Invalid appointment ID.' });
    }

    const { updatedAppointment, waitlistAssignment } = await sequelize.transaction(async (transaction) => {
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
        throw new HttpError(409, 'Only pending or confirmed appointments can be cancelled.');
      }

      appointment.status = 'cancelled';
      appointment.cancelled_at = new Date();
      appointment.cancelled_by = patientUserId;
      appointment.cancellation_reason = cancellationReason
        ? `${CANCELLED_BY_PATIENT_REASON_PREFIX}: ${cancellationReason}`
        : CANCELLED_BY_PATIENT_REASON_PREFIX;
      appointment.doctor_rejection_reason_code = null;
      appointment.doctor_rejection_reason_note = null;
      clearPendingReschedule(appointment);

      await appointment.save({ transaction });

      const waitlistAssignment = await waitlistService.fulfillWaitlistForCancelledAppointment({
        cancelledAppointment: appointment,
        cancelledByUserId: patientUserId,
        transaction,
      });

      const updatedAppointment = await Appointment.findByPk(appointment.id, {
        include: appointmentInclude,
        transaction,
      });

      return { updatedAppointment, waitlistAssignment };
    });

    res.json({
      message: 'Appointment cancelled successfully.',
      appointment: serializeAppointment(updatedAppointment),
      waitlist_assignment: waitlistAssignment,
    });

    const doctorEmail = updatedAppointment?.doctor?.user?.email;
    if (doctorEmail) {
      const doctorName = updatedAppointment.doctor?.full_name || updatedAppointment.doctor?.user?.username || 'Doctor';
      const patientName = updatedAppointment.patient?.full_name || updatedAppointment.patient?.user?.username || 'Patient';

      void sendPatientCancellationEmailToDoctor({
        to: doctorEmail,
        doctorName,
        patientName,
        appointmentDate: updatedAppointment.appointment_date,
        appointmentTime: updatedAppointment.start_time,
        appointmentType: updatedAppointment.appointment_type,
      }).catch((emailError) => {
        console.error('Failed to send patient cancellation email to doctor:', emailError);
      });
    }
  } catch (error) {
    const statusCode = error instanceof HttpError ? error.status : 500;
    const message = error instanceof HttpError
      ? error.message
      : 'Failed to cancel appointment.';

    if (!(error instanceof HttpError)) {
      console.error('Error cancelling appointment:', error);
    }

    res.status(statusCode).json({ message });
  }
};

export const updateAppointmentDecision = async (req, res) => {
  try {
    const appointmentId = Number(req.params.appointmentId);
    const doctorUserId = req.auth.userId;
    const action = String(req.body?.action || '').trim().toLowerCase();
    const declineReasonCode = String(req.body?.reasonCode || '').trim();
    const declineReasonNote = String(req.body?.reasonNote || '').trim();
    const legacyDeclineReason = String(req.body?.reason || '').trim();

    if (!Number.isInteger(appointmentId) || appointmentId <= 0) {
      return res.status(400).json({ message: 'Invalid appointment ID.' });
    }

    if (!['confirm', 'decline'].includes(action)) {
      return res.status(400).json({ message: 'action must be either "confirm" or "decline".' });
    }

    if (action === 'decline') {
      if (!declineReasonCode && !legacyDeclineReason) {
        return res.status(400).json({ message: 'reasonCode is required when declining an appointment.' });
      }

      if (declineReasonCode && !DOCTOR_REJECTION_REASON_CODES.has(declineReasonCode)) {
        return res.status(400).json({ message: 'Invalid doctor rejection reason.' });
      }

      if (declineReasonCode === 'other' && !declineReasonNote && !legacyDeclineReason) {
        return res.status(400).json({ message: 'reasonNote is required when selecting "other".' });
      }
    }

    const { updatedAppointment, waitlistAssignment } = await sequelize.transaction(async (transaction) => {
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

      if (appointment.status !== 'scheduled') {
        throw new HttpError(409, 'Only pending bookings can be confirmed or declined.');
      }

      if (appointment.pending_reschedule_requested_by_role === 'doctor' && hasPendingReschedule(appointment)) {
        throw new HttpError(409, 'Waiting for patient to confirm the reschedule proposal.');
      }

      if (action === 'confirm') {
        appointment.status = 'confirmed';
        appointment.doctor_rejection_reason_code = null;
        appointment.doctor_rejection_reason_note = null;
        clearPendingReschedule(appointment);

        // Create chat connection between doctor and patient on confirmation
        const patient = await Patient.findOne({
          where: { id: appointment.patient_id },
          transaction,
        });

        if (patient) {
          const existingConnection = await Connection.findOne({
            where: { patient_id: patient.id, doctor_id: doctor.id },
            transaction,
          });

          if (!existingConnection) {
            await Connection.create(
              { patient_id: patient.id, doctor_id: doctor.id },
              { transaction }
            );
          }
        }
      } else {
        const normalizedReasonCode = declineReasonCode || 'other';
        const normalizedReasonNote = declineReasonCode
          ? (normalizedReasonCode === 'other' ? declineReasonNote : null)
          : legacyDeclineReason;
        const reasonLabel = getDoctorRejectionReasonLabel(normalizedReasonCode) || 'Other';
        const displayReason = normalizedReasonNote
          ? `${reasonLabel}: ${normalizedReasonNote}`
          : reasonLabel;

        appointment.status = 'cancelled';
        appointment.cancelled_at = new Date();
        appointment.cancelled_by = doctorUserId;
        appointment.cancellation_reason = `${DECLINED_BY_DOCTOR_REASON_PREFIX}: ${displayReason}`;
        appointment.doctor_rejection_reason_code = normalizedReasonCode;
        appointment.doctor_rejection_reason_note = normalizedReasonNote || null;
        clearPendingReschedule(appointment);
      }

      await appointment.save({ transaction });

      let waitlistAssignment = { assigned: false };
      if (action === 'decline') {
        waitlistAssignment = await waitlistService.fulfillWaitlistForCancelledAppointment({
          cancelledAppointment: appointment,
          cancelledByUserId: doctorUserId,
          transaction,
        });
      }

      const hydratedAppointment = await Appointment.findByPk(appointment.id, {
        include: appointmentInclude,
        transaction,
      });

      return { updatedAppointment: hydratedAppointment, waitlistAssignment };
    });

    res.json({
      message: action === 'confirm' ? 'Booking confirmed successfully.' : 'Booking declined successfully.',
      appointment: serializeAppointment(updatedAppointment),
      waitlist_assignment: waitlistAssignment,
    });

    const patientEmail = updatedAppointment?.patient?.user?.email;
    const patientName =
      updatedAppointment?.patient?.full_name
      || updatedAppointment?.patient?.user?.username
      || 'Patient';
    const doctorName =
      updatedAppointment?.doctor?.full_name
      || updatedAppointment?.doctor?.user?.username
      || 'your provider';

    if (action === 'confirm' && updatedAppointment?.notify_on_doctor_approval && patientEmail) {
      void sendDoctorApprovalEmail({
        to: patientEmail,
        patientName,
        doctorName,
        appointmentDate: updatedAppointment.appointment_date,
        appointmentTime: updatedAppointment.start_time,
        appointmentType: updatedAppointment.appointment_type,
      }).catch((emailError) => {
        console.error('Failed to send doctor approval email:', emailError);
      });
    }

    if (action === 'decline' && patientEmail) {
      const patientFacingDeclineReason =
        updatedAppointment?.doctor_rejection_reason_note
          ? `${getDoctorRejectionReasonLabel(updatedAppointment.doctor_rejection_reason_code) || 'Other'}: ${updatedAppointment.doctor_rejection_reason_note}`
          : (getDoctorRejectionReasonLabel(updatedAppointment?.doctor_rejection_reason_code) || null);

      void sendDoctorCancellationEmail({
        to: patientEmail,
        patientName,
        doctorName,
        appointmentDate: updatedAppointment.appointment_date,
        appointmentTime: updatedAppointment.start_time,
        appointmentType: updatedAppointment.appointment_type,
        declineReason: patientFacingDeclineReason,
      }).catch((emailError) => {
        console.error('Failed to send doctor decline email:', emailError);
      });
    }
  } catch (error) {
    const statusCode = error instanceof HttpError ? error.status : 500;
    const message = error instanceof HttpError
      ? error.message
      : 'Failed to update booking status.';

    if (!(error instanceof HttpError)) {
      console.error('Error updating appointment decision:', error);
    }

    res.status(statusCode).json({ message });
  }
};
