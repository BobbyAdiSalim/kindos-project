import { Op } from 'sequelize';
import {
  Appointment,
  Doctor,
  Patient,
  User,
  AvailabilityPattern,
  AvailabilitySlot,
} from '../../models/index.js';

const ACTIVE_APPOINTMENT_STATUSES = ['scheduled', 'confirmed'];
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/;
export const APPOINTMENT_TYPES = new Set(['virtual', 'in-person']);
export const DECLINED_BY_DOCTOR_REASON_PREFIX = 'Declined by doctor';
export const CANCELLED_BY_PATIENT_REASON_PREFIX = 'Cancelled by patient';
export const DOCTOR_REJECTION_REASON_OPTIONS = [
  { code: 'schedule_conflict', label: 'Schedule conflict' },
  { code: 'outside_specialty', label: 'Outside specialty' },
  { code: 'insufficient_information', label: 'Insufficient information provided' },
  { code: 'clinic_unavailable', label: 'Clinic unavailable' },
  { code: 'duplicate_booking', label: 'Duplicate booking' },
  { code: 'other', label: 'Other' },
];
export const DOCTOR_REJECTION_REASON_CODES = new Set(
  DOCTOR_REJECTION_REASON_OPTIONS.map((option) => option.code)
);

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const normalizeTime = (time) => {
  if (typeof time !== 'string') return '';
  const trimmed = time.trim();
  if (!TIME_REGEX.test(trimmed)) return '';
  if (trimmed.length === 5) return `${trimmed}:00`;
  return trimmed;
};

export const timeToMinutes = (timeStr) => {
  const [hour, minute] = timeStr.split(':').map((part) => parseInt(part, 10));
  return (hour * 60) + minute;
};

export const isFutureDateTime = (dateStr, timeStr) => {
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

export const getDoctorRejectionReasonLabel = (code) =>
  DOCTOR_REJECTION_REASON_OPTIONS.find((option) => option.code === code)?.label || null;

export const hasPendingReschedule = (appointment) =>
  Boolean(
    appointment.pending_reschedule_date
    && appointment.pending_reschedule_start_time
    && appointment.pending_reschedule_end_time
    && appointment.pending_reschedule_type
    && appointment.pending_reschedule_duration
    && appointment.pending_reschedule_requested_by_role
  );

export const clearPendingReschedule = (appointment) => {
  appointment.pending_reschedule_date = null;
  appointment.pending_reschedule_start_time = null;
  appointment.pending_reschedule_end_time = null;
  appointment.pending_reschedule_type = null;
  appointment.pending_reschedule_duration = null;
  appointment.pending_reschedule_requested_by_role = null;
  appointment.pending_reschedule_previous_status = null;
  appointment.pending_reschedule_requested_at = null;
};

export const serializeAppointment = (appointment) => {
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
    doctor_rejection_reason_code: appointment.doctor_rejection_reason_code,
    doctor_rejection_reason_note: appointment.doctor_rejection_reason_note,
    doctor_rejection_reason_label: getDoctorRejectionReasonLabel(appointment.doctor_rejection_reason_code),
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
          time_zone: doctorProfile.time_zone,
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

export const appointmentInclude = [
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

export const validateBookingPayload = (payload) => {
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

export const validateSlotSelectionPayload = (payload) => {
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

export const ensureSlotIsBookable = async ({
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

export const getDoctorForBooking = async (doctorUserId, transaction) => {
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

export const getPatientForUser = async (userId, transaction) => {
  const patient = await Patient.findOne({
    where: { user_id: userId },
    transaction,
  });

  if (!patient) {
    throw new HttpError(404, 'Patient profile not found.');
  }

  return patient;
};

export const ensureNoOverlappingAppointment = async ({
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
