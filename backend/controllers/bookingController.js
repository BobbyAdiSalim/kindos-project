import { Op } from 'sequelize';
import {
  sequelize,
  Appointment,
  Connection,
  Doctor,
  Patient,
  User,
  AvailabilityPattern,
  AvailabilitySlot,
} from '../models/index.js';
import waitlistService from '../services/WaitlistService.js';
import {
  sendDoctorApprovalEmail,
  sendDoctorCancellationEmail,
  sendDoctorRescheduleEmailToPatient,
  sendPatientCancellationEmailToDoctor,
  sendPatientRescheduleEmailToDoctor,
} from '../utils/appointmentEmail.js';
import { getRoleStrategy } from '../services/role-strategy/index.js';

const ACTIVE_APPOINTMENT_STATUSES = ['scheduled', 'confirmed'];
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/;
const APPOINTMENT_TYPES = new Set(['virtual', 'in-person']);
const DECLINED_BY_DOCTOR_REASON_PREFIX = 'Declined by doctor';
const CANCELLED_BY_PATIENT_REASON_PREFIX = 'Cancelled by patient';

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const normalizeTime = (time) => {
  if (typeof time !== 'string') return '';
  const trimmed = time.trim();
  if (!TIME_REGEX.test(trimmed)) return '';
  if (trimmed.length === 5) return `${trimmed}:00`;
  return trimmed;
};

const timeToMinutes = (timeStr) => {
  const [hour, minute] = timeStr.split(':').map((part) => parseInt(part, 10));
  return (hour * 60) + minute;
};

const isFutureDateTime = (dateStr, timeStr) => {
  const dateTime = new Date(`${dateStr}T${timeStr}`);
  if (Number.isNaN(dateTime.getTime())) return false;
  return dateTime.getTime() > Date.now();
};

const minutesToTime = (minutes) => {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
};

const generateTimeSlotsFromPattern = (startTime, endTime, durationMinutes, appointmentTypes) => {
  const slots = [];
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  const slotDuration = Number(durationMinutes) || 30;

  let current = startMinutes;
  while (current + slotDuration <= endMinutes) {
    slots.push({
      start_time: `${minutesToTime(current)}:00`,
      end_time: `${minutesToTime(current + slotDuration)}:00`,
      appointment_types: appointmentTypes || ['virtual', 'in-person'],
    });
    current += slotDuration;
  }
  return slots;
};

const applySlotOverrides = (generatedSlots, specificSlots) => {
  const unavailableRanges = specificSlots
    .filter((slot) => !slot.is_available)
    .map((slot) => ({
      start: timeToMinutes(slot.start_time),
      end: timeToMinutes(slot.end_time),
    }));

  const filteredSlots = generatedSlots.filter((slot) => {
    const slotStart = timeToMinutes(slot.start_time);
    const slotEnd = timeToMinutes(slot.end_time);
    return !unavailableRanges.some(
      (range) => slotStart < range.end && slotEnd > range.start
    );
  });

  const extraSlots = specificSlots
    .filter((slot) => slot.is_available)
    .map((slot) => ({
      start_time: slot.start_time,
      end_time: slot.end_time,
      appointment_types: slot.appointment_type || ['virtual', 'in-person'],
      slot_id: slot.id,
    }));

  const dedupeMap = new Map();
  for (const slot of [...filteredSlots, ...extraSlots]) {
    const key = `${slot.start_time}-${slot.end_time}`;
    const existing = dedupeMap.get(key);
    if (!existing) {
      dedupeMap.set(key, slot);
      continue;
    }

    const mergedTypes = Array.from(new Set([
      ...(Array.isArray(existing.appointment_types) ? existing.appointment_types : []),
      ...(Array.isArray(slot.appointment_types) ? slot.appointment_types : []),
    ]));

    dedupeMap.set(key, {
      ...existing,
      appointment_types: mergedTypes,
      slot_id: existing.slot_id || slot.slot_id || null,
    });
  }

  return Array.from(dedupeMap.values());
};

const isDeclinedByDoctor = (appointment) => {
  if (appointment.status !== 'cancelled') return false;
  if (typeof appointment.cancellation_reason !== 'string') return false;
  return appointment.cancellation_reason.startsWith(DECLINED_BY_DOCTOR_REASON_PREFIX);
};

const hasPendingReschedule = (appointment) =>
  Boolean(
    appointment.pending_reschedule_date
    && appointment.pending_reschedule_start_time
    && appointment.pending_reschedule_end_time
    && appointment.pending_reschedule_type
    && appointment.pending_reschedule_duration
    && appointment.pending_reschedule_requested_by_role
  );

const clearPendingReschedule = (appointment) => {
  appointment.pending_reschedule_date = null;
  appointment.pending_reschedule_start_time = null;
  appointment.pending_reschedule_end_time = null;
  appointment.pending_reschedule_type = null;
  appointment.pending_reschedule_duration = null;
  appointment.pending_reschedule_requested_by_role = null;
  appointment.pending_reschedule_previous_status = null;
  appointment.pending_reschedule_requested_at = null;
};

const serializeAppointment = (appointment) => {
  const doctorProfile = appointment.doctor || null;
  const patientProfile = appointment.patient || null;

  return {
    id: appointment.id,
    appointment_date: appointment.appointment_date,
    start_time: appointment.start_time,
    end_time: appointment.end_time,
    appointment_type: appointment.appointment_type,
    status: appointment.status,
    duration: appointment.duration,
    reason: appointment.reason,
    notes: appointment.notes,
    accessibility_needs: appointment.accessibility_needs || [],
    summary: appointment.summary,
    summary_written_at: appointment.summary_written_at,
    cancelled_at: appointment.cancelled_at,
    cancelled_by: appointment.cancelled_by,
    cancellation_reason: appointment.cancellation_reason,
    notify_on_doctor_approval: appointment.notify_on_doctor_approval,
    declined_by_doctor: isDeclinedByDoctor(appointment),
    pending_reschedule: hasPendingReschedule(appointment)
      ? {
          appointment_date: appointment.pending_reschedule_date,
          start_time: appointment.pending_reschedule_start_time,
          end_time: appointment.pending_reschedule_end_time,
          appointment_type: appointment.pending_reschedule_type,
          duration: appointment.pending_reschedule_duration,
          requested_by_role: appointment.pending_reschedule_requested_by_role,
          previous_status: appointment.pending_reschedule_previous_status,
          requested_at: appointment.pending_reschedule_requested_at,
        }
      : null,
    doctor: doctorProfile
      ? {
          id: doctorProfile.id,
          user_id: doctorProfile.user_id,
          full_name: doctorProfile.full_name,
          specialty: doctorProfile.specialty,
          clinic_location: doctorProfile.clinic_location,
          virtual_available: doctorProfile.virtual_available,
          in_person_available: doctorProfile.in_person_available,
          username: doctorProfile.user?.username || null,
        }
      : null,
    patient: patientProfile
      ? {
          id: patientProfile.id,
          user_id: patientProfile.user_id,
          full_name: patientProfile.full_name,
          username: patientProfile.user?.username || null,
        }
      : null,
    created_at: appointment.created_at,
    updated_at: appointment.updated_at,
  };
};

const appointmentInclude = [
  {
    model: Doctor,
    as: 'doctor',
    include: [{ model: User, as: 'user', attributes: ['id', 'username', 'email'] }],
  },
  {
    model: Patient,
    as: 'patient',
    include: [{ model: User, as: 'user', attributes: ['id', 'username', 'email'] }],
  },

];

const validateBookingPayload = (payload) => {
  const doctorUserId = Number(payload.doctor_user_id);
  const appointmentDate = String(payload.appointment_date || '').trim();
  const startTime = normalizeTime(payload.start_time);
  const endTime = normalizeTime(payload.end_time);
  const appointmentType = String(payload.appointment_type || '').trim();
  const reason = String(payload.reason || '').trim();
  const notes = payload.notes ? String(payload.notes).trim() : null;
  const notifyOnDoctorApproval = payload.notify_on_doctor_approval === undefined
    ? true
    : payload.notify_on_doctor_approval;

  if (!Number.isInteger(doctorUserId) || doctorUserId <= 0) {
    throw new HttpError(400, 'Valid doctor_user_id is required.');
  }

  if (!DATE_REGEX.test(appointmentDate)) {
    throw new HttpError(400, 'Valid appointment_date is required (YYYY-MM-DD).');
  }

  if (!startTime || !endTime) {
    throw new HttpError(400, 'Valid start_time and end_time are required (HH:MM or HH:MM:SS).');
  }

  if (timeToMinutes(startTime) >= timeToMinutes(endTime)) {
    throw new HttpError(400, 'start_time must be earlier than end_time.');
  }

  if (!APPOINTMENT_TYPES.has(appointmentType)) {
    throw new HttpError(400, 'appointment_type must be either "virtual" or "in-person".');
  }

  if (!reason) {
    throw new HttpError(400, 'reason is required.');
  }

  if (typeof notifyOnDoctorApproval !== 'boolean') {
    throw new HttpError(400, 'notify_on_doctor_approval must be a boolean.');
  }

  const rawAccessibility = Array.isArray(payload.accessibility_needs)
    ? payload.accessibility_needs
    : [];
  const accessibilityNeeds = rawAccessibility
    .filter((item) => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);

  const duration = timeToMinutes(endTime) - timeToMinutes(startTime);

  if (!isFutureDateTime(appointmentDate, startTime)) {
    throw new HttpError(400, 'Appointment time must be in the future.');
  }

  return {
    doctorUserId,
    appointmentDate,
    startTime,
    endTime,
    appointmentType,
    reason,
    notes,
    accessibilityNeeds,
    duration,
    notifyOnDoctorApproval,
  };
};

const validateSlotSelectionPayload = (payload) => {
  const appointmentDate = String(payload.appointment_date || '').trim();
  const startTime = normalizeTime(payload.start_time);
  const endTime = normalizeTime(payload.end_time);
  const appointmentType = String(payload.appointment_type || '').trim();

  if (!DATE_REGEX.test(appointmentDate)) {
    throw new HttpError(400, 'Valid appointment_date is required (YYYY-MM-DD).');
  }

  if (!startTime || !endTime) {
    throw new HttpError(400, 'Valid start_time and end_time are required (HH:MM or HH:MM:SS).');
  }

  if (timeToMinutes(startTime) >= timeToMinutes(endTime)) {
    throw new HttpError(400, 'start_time must be earlier than end_time.');
  }

  if (!APPOINTMENT_TYPES.has(appointmentType)) {
    throw new HttpError(400, 'appointment_type must be either "virtual" or "in-person".');
  }

  const duration = timeToMinutes(endTime) - timeToMinutes(startTime);

  if (!isFutureDateTime(appointmentDate, startTime)) {
    throw new HttpError(400, 'Appointment time must be in the future.');
  }

  return {
    appointmentDate,
    startTime,
    endTime,
    appointmentType,
    duration,
  };
};

const ensureSlotIsBookable = async ({
  transaction,
  doctorId,
  doctorProfile,
  appointmentDate,
  startTime,
  endTime,
  appointmentType,
}) => {
  const requestedDate = new Date(`${appointmentDate}T00:00:00`);
  if (Number.isNaN(requestedDate.getTime())) {
    throw new HttpError(400, 'Invalid appointment_date.');
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (requestedDate < today) {
    throw new HttpError(400, 'Cannot book appointments in the past.');
  }

  if (!isFutureDateTime(appointmentDate, startTime)) {
    throw new HttpError(400, 'Appointment time must be in the future.');
  }

  if (appointmentType === 'virtual' && !doctorProfile.virtual_available) {
    throw new HttpError(400, 'Doctor is not accepting virtual appointments.');
  }

  if (appointmentType === 'in-person' && !doctorProfile.in_person_available) {
    throw new HttpError(400, 'Doctor is not accepting in-person appointments.');
  }

  const dayOfWeek = requestedDate.getDay();
  const patterns = await AvailabilityPattern.findAll({
    where: {
      doctor_id: doctorId,
      day_of_week: dayOfWeek,
      is_active: true,
    },
    transaction,
  });

  let generatedSlots = [];
  for (const pattern of patterns) {
    generatedSlots.push(
      ...generateTimeSlotsFromPattern(
        pattern.start_time,
        pattern.end_time,
        pattern.appointment_duration,
        pattern.appointment_type
      )
    );
  }

  const specificSlots = await AvailabilitySlot.findAll({
    where: {
      doctor_id: doctorId,
      slot_date: appointmentDate,
    },
    transaction,
  });

  generatedSlots = applySlotOverrides(generatedSlots, specificSlots);

  const matchingSlot = generatedSlots.find((slot) => (
    normalizeTime(slot.start_time) === startTime
      && normalizeTime(slot.end_time) === endTime
      && Array.isArray(slot.appointment_types)
      && slot.appointment_types.includes(appointmentType)
  ));

  if (!matchingSlot) {
    throw new HttpError(409, 'This time slot is no longer available for the selected appointment type.');
  }

  return matchingSlot.slot_id || null;
};

const getDoctorForBooking = async (doctorUserId, transaction) => {
  const doctor = await Doctor.findOne({
    where: {
      user_id: doctorUserId,
      verification_status: 'approved',
    },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  if (!doctor) {
    throw new HttpError(404, 'Doctor not found or not verified.');
  }

  return doctor;
};

const getPatientForUser = async (userId, transaction) => {
  const patient = await Patient.findOne({
    where: { user_id: userId },
    transaction,
  });

  if (!patient) {
    throw new HttpError(404, 'Patient profile not found.');
  }

  return patient;
};

const ensureNoOverlappingAppointment = async ({
  transaction,
  doctorId,
  appointmentDate,
  startTime,
  endTime,
  excludeAppointmentId = null,
}) => {
  const whereClause = {
    doctor_id: doctorId,
    appointment_date: appointmentDate,
    status: { [Op.in]: ACTIVE_APPOINTMENT_STATUSES },
    start_time: { [Op.lt]: endTime },
    end_time: { [Op.gt]: startTime },
  };

  if (Number.isInteger(excludeAppointmentId) && excludeAppointmentId > 0) {
    whereClause.id = { [Op.ne]: excludeAppointmentId };
  }

  const overlappingAppointment = await Appointment.findOne({
    where: whereClause,
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  if (overlappingAppointment) {
    throw new HttpError(409, 'This slot was just booked by another patient. Please choose another time.');
  }
};

export const createAppointmentBooking = async (req, res) => {
  try {
    const patientUserId = req.auth.userId;
    const booking = validateBookingPayload(req.body || {});

    const appointment = await sequelize.transaction(async (transaction) => {
      const patient = await getPatientForUser(patientUserId, transaction);

      const doctor = await getDoctorForBooking(booking.doctorUserId, transaction);

      const slotId = await ensureSlotIsBookable({
        transaction,
        doctorId: doctor.id,
        doctorProfile: doctor,
        appointmentDate: booking.appointmentDate,
        startTime: booking.startTime,
        endTime: booking.endTime,
        appointmentType: booking.appointmentType,
      });

      await ensureNoOverlappingAppointment({
        transaction,
        doctorId: doctor.id,
        appointmentDate: booking.appointmentDate,
        startTime: booking.startTime,
        endTime: booking.endTime,
      });

      const createdAppointment = await Appointment.create(
        {
          patient_id: patient.id,
          doctor_id: doctor.id,
          slot_id: slotId,
          appointment_date: booking.appointmentDate,
          start_time: booking.startTime,
          end_time: booking.endTime,
          appointment_type: booking.appointmentType,
          status: 'scheduled',
          duration: booking.duration,
          reason: booking.reason,
          notes: booking.notes,
          accessibility_needs: booking.accessibilityNeeds,
          notify_on_doctor_approval: booking.notifyOnDoctorApproval,
        },
        { transaction }
      );

      // Auto-connect patient and doctor for chat
      const existingConnection = await Connection.findOne({
        where: { patient_id: patient.id, doctor_id: doctor.id },
        transaction,
      });

      if (!existingConnection) {
        await Connection.create(
          { patient_id: patient.id, doctor_id: doctor.id, status: 'accepted' },
          { transaction }
        );
      } else if (existingConnection.status !== 'accepted') {
        existingConnection.status = 'accepted';
        await existingConnection.save({ transaction });
      }

      const hydratedAppointment = await Appointment.findByPk(createdAppointment.id, {
        include: appointmentInclude,
        transaction,
      });

      return hydratedAppointment;
    });

    res.status(201).json({
      message: 'Booking request submitted. Waiting for doctor confirmation.',
      appointment: serializeAppointment(appointment),
    });
  } catch (error) {
    const statusCode = error instanceof HttpError ? error.status : 500;
    const message = error instanceof HttpError
      ? error.message
      : 'Failed to create appointment booking.';

    if (!(error instanceof HttpError)) {
      console.error('Error creating appointment booking:', error);
    }

    res.status(statusCode).json({ message });
  }
};

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

export const getMyAppointments = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const roleStrategy = getRoleStrategy(req.auth.role);
    const whereClause = await roleStrategy.getAppointmentScope(userId);

    const appointments = await Appointment.findAll({
      where: whereClause,
      include: appointmentInclude,
      order: [['appointment_date', 'ASC'], ['start_time', 'ASC']],
    });

    res.json({
      appointments: appointments.map(serializeAppointment),
    });
  } catch (error) {
    if (error?.status) {
      return res.status(error.status).json({ message: error.message });
    }

    console.error('Error fetching my appointments:', error);
    res.status(500).json({ message: 'Failed to fetch appointments.' });
  }
};

export const getAppointmentById = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const appointmentId = Number(req.params.appointmentId);

    if (!Number.isInteger(appointmentId) || appointmentId <= 0) {
      return res.status(400).json({ message: 'Invalid appointment ID.' });
    }

    const roleStrategy = getRoleStrategy(req.auth.role);
    const roleWhere = await roleStrategy.getAppointmentScope(userId);

    const appointment = await Appointment.findOne({
      where: {
        id: appointmentId,
        ...roleWhere,
      },
      include: appointmentInclude,
    });

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found.' });
    }

    res.json({
      appointment: serializeAppointment(appointment),
    });
  } catch (error) {
    if (error?.status) {
      return res.status(error.status).json({ message: error.message });
    }

    console.error('Error fetching appointment details:', error);
    res.status(500).json({ message: 'Failed to fetch appointment details.' });
  }
};

export const updateAppointmentDecision = async (req, res) => {
  try {
    const appointmentId = Number(req.params.appointmentId);
    const doctorUserId = req.auth.userId;
    const action = String(req.body?.action || '').trim().toLowerCase();
    const declineReason = String(req.body?.reason || '').trim();

    if (!Number.isInteger(appointmentId) || appointmentId <= 0) {
      return res.status(400).json({ message: 'Invalid appointment ID.' });
    }

    if (!['confirm', 'decline'].includes(action)) {
      return res.status(400).json({ message: 'action must be either "confirm" or "decline".' });
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
        clearPendingReschedule(appointment);
      } else {
        appointment.status = 'cancelled';
        appointment.cancelled_at = new Date();
        appointment.cancelled_by = doctorUserId;
        appointment.cancellation_reason = declineReason
          ? `${DECLINED_BY_DOCTOR_REASON_PREFIX}: ${declineReason}`
          : DECLINED_BY_DOCTOR_REASON_PREFIX;
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
      void sendDoctorCancellationEmail({
        to: patientEmail,
        patientName,
        doctorName,
        appointmentDate: updatedAppointment.appointment_date,
        appointmentTime: updatedAppointment.start_time,
        appointmentType: updatedAppointment.appointment_type,
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

/**
 * Get patient information and appointment history for doctor view
 * @route GET /api/patients/:patientId/history
 * @access Private (Doctor only)
 */
export const getPatientHistory = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { userId: doctorUserId, role } = req.auth || {};

    if (!doctorUserId || role !== 'doctor') {
      return res.status(403).json({ message: 'Only doctors can access patient history.' });
    }

    const patientIdNum = Number(patientId);
    if (!Number.isInteger(patientIdNum) || patientIdNum <= 0) {
      return res.status(400).json({ message: 'Invalid patient ID.' });
    }

    console.log(`Doctor (user_id: ${doctorUserId}) is requesting history for patient_id: ${patientIdNum}`);

    // Get patient information
    const patient = await Patient.findOne({
      where: { id: patientIdNum },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email'],
        },
      ],
    });

    console.log('Fetched patient info:', patient ? {
      id: patient.id,
      user_id: patient.user_id,
      full_name: patient.full_name,
      email: patient.user?.email || null,
      phone: patient.phone,
      date_of_birth: patient.date_of_birth,
    } : null);

    if (!patient) {
      return res.status(404).json({ message: 'Patient not found.' });
    }

    // Get doctor's profile
    const doctor = await Doctor.findOne({
      where: { user_id: doctorUserId },
    });

    if (!doctor) {
      return res.status(404).json({ message: 'Doctor profile not found.' });
    }

    // Check if doctor has an active (scheduled or confirmed) appointment with this patient
    const activeAppointment = await Appointment.findOne({
      where: {
        patient_id: patientIdNum,
        doctor_id: doctor.id,
        status: {
          [Op.in]: ['scheduled', 'confirmed'],
        },
      },
    });

    if (!activeAppointment) {
      return res.status(403).json({ 
        message: 'You do not have an active appointment with this patient.' 
      });
    }

    // Get all completed appointments for this patient
    const appointments = await Appointment.findAll({
      where: {
        patient_id: patientIdNum,
        status: 'completed',
      },
      include: [
        {
          model: Doctor,
          as: 'doctor',
          include: [{ model: User, as: 'user', attributes: ['id', 'username'] }],
        },
      ],
      order: [['appointment_date', 'DESC'], ['start_time', 'DESC']],
    });

    console.log(`Fetched ${appointments.length} completed appointments for patient_id: ${patientIdNum}`);

    // Serialize appointments
    const serializedAppointments = appointments.map((apt) => ({
      id: apt.id,
      appointment_date: apt.appointment_date,
      start_time: apt.start_time,
      end_time: apt.end_time,
      appointment_type: apt.appointment_type,
      status: apt.status,
      duration: apt.duration,
      reason: apt.reason,
      summary: apt.summary,
      summary_written_at: apt.summary_written_at,
      doctor: apt.doctor
        ? {
            id: apt.doctor.id,
            user_id: apt.doctor.user_id,
            full_name: apt.doctor.full_name,
            specialty: apt.doctor.specialty,
            clinic_location: apt.doctor.clinic_location,
            username: apt.doctor.user?.username || null,
          }
        : null,
      created_at: apt.created_at,
      updated_at: apt.updated_at,
    }));

    console.log('Serialized appointments for response:', serializedAppointments);

    res.json({
      patient: {
        id: patient.id,
        user_id: patient.user_id,
        full_name: patient.full_name,
        email: patient.user?.email || null,
        phone: patient.phone,
        date_of_birth: patient.date_of_birth,
      },
      appointments: serializedAppointments,
    });
  } catch (error) {
    console.error('Error fetching patient history:', error);
    res.status(500).json({ message: 'Failed to fetch patient history.' });
  }
};

/**
 * Save appointment summary (doctor only)
 * @route PATCH /api/appointments/:appointmentId/summary
 * @access Private (Doctor)
 */
export const saveSummary = async (req, res) => {
  try {
    const appointmentId = Number(req.params.appointmentId);
    const doctorUserId = req.auth.userId;
    const summary = String(req.body?.summary || '').trim();

    if (!Number.isInteger(appointmentId) || appointmentId <= 0) {
      return res.status(400).json({ message: 'Invalid appointment ID.' });
    }

    if (!summary || summary.length === 0) {
      return res.status(400).json({ message: 'Summary cannot be empty.' });
    }

    if (summary.length > 5000) {
      return res.status(400).json({ message: 'Summary is too long (max 5000 characters).' });
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

      if (!['confirmed', 'no-show'].includes(appointment.status)) {
        throw new HttpError(
          409,
          'Summary can only be added for confirmed or no-show appointments.'
        );
      }

      appointment.summary = summary;
      appointment.summary_written_at = new Date();

      await appointment.save({ transaction });

      const hydratedAppointment = await Appointment.findByPk(appointment.id, {
        include: appointmentInclude,
        transaction,
      });

      return hydratedAppointment;
    });

    res.json({
      message: 'Summary saved successfully.',
      appointment: serializeAppointment(updatedAppointment),
    });
  } catch (error) {
    const statusCode = error instanceof HttpError ? error.status : 500;
    const message = error instanceof HttpError ? error.message : 'Failed to save summary.';

    if (!(error instanceof HttpError)) {
      console.error('Error saving appointment summary:', error);
    }

    res.status(statusCode).json({ message });
  }
};

/**
 * Mark appointment as complete (doctor only)
 * @route PATCH /api/appointments/:appointmentId/complete
 * @access Private (Doctor)
 */
export const markComplete = async (req, res) => {
  try {
    const appointmentId = Number(req.params.appointmentId);
    const doctorUserId = req.auth.userId;

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

      if (!['confirmed', 'no-show'].includes(appointment.status)) {
        throw new HttpError(
          409,
          'Only confirmed or no-show appointments can be marked as complete.'
        );
      }

      if (!appointment.summary) {
        throw new HttpError(
          409,
          'Appointment must have a summary before marking as complete.'
        );
      }

      appointment.status = 'completed';

      await appointment.save({ transaction });

      const hydratedAppointment = await Appointment.findByPk(appointment.id, {
        include: appointmentInclude,
        transaction,
      });

      return hydratedAppointment;
    });

    res.json({
      message: 'Appointment marked as complete.',
      appointment: serializeAppointment(updatedAppointment),
    });
  } catch (error) {
    const statusCode = error instanceof HttpError ? error.status : 500;
    const message = error instanceof HttpError
      ? error.message
      : 'Failed to mark appointment as complete.';

    if (!(error instanceof HttpError)) {
      console.error('Error marking appointment as complete:', error);
    }

    res.status(statusCode).json({ message });
  }
};
