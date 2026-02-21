import { Op } from 'sequelize';
import {
  sequelize,
  Appointment,
  Doctor,
  Patient,
  User,
  AvailabilityPattern,
  AvailabilitySlot,
} from '../models/index.js';

const ACTIVE_APPOINTMENT_STATUSES = ['scheduled', 'confirmed', 'completed', 'no-show'];
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
    declined_by_doctor: isDeclinedByDoctor(appointment),
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
    include: [{ model: User, as: 'user', attributes: ['id', 'username'] }],
  },
  {
    model: Patient,
    as: 'patient',
    include: [{ model: User, as: 'user', attributes: ['id', 'username'] }],
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

  const rawAccessibility = Array.isArray(payload.accessibility_needs)
    ? payload.accessibility_needs
    : [];
  const accessibilityNeeds = rawAccessibility
    .filter((item) => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);

  const duration = timeToMinutes(endTime) - timeToMinutes(startTime);

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
        },
        { transaction }
      );

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
        throw new HttpError(409, 'Only pending or confirmed appointments can be cancelled.');
      }

      appointment.status = 'cancelled';
      appointment.cancelled_at = new Date();
      appointment.cancelled_by = patientUserId;
      appointment.cancellation_reason = cancellationReason
        ? `${CANCELLED_BY_PATIENT_REASON_PREFIX}: ${cancellationReason}`
        : CANCELLED_BY_PATIENT_REASON_PREFIX;

      await appointment.save({ transaction });

      return Appointment.findByPk(appointment.id, {
        include: appointmentInclude,
        transaction,
      });
    });

    res.json({
      message: 'Appointment cancelled successfully.',
      appointment: serializeAppointment(updatedAppointment),
    });
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

export const getMyAppointments = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const role = req.auth.role;

    let whereClause = {};
    if (role === 'patient') {
      const patient = await Patient.findOne({ where: { user_id: userId } });
      if (!patient) {
        return res.status(404).json({ message: 'Patient profile not found.' });
      }
      whereClause = { patient_id: patient.id };
    } else if (role === 'doctor') {
      const doctor = await Doctor.findOne({ where: { user_id: userId } });
      if (!doctor) {
        return res.status(404).json({ message: 'Doctor profile not found.' });
      }
      whereClause = { doctor_id: doctor.id };
    } else {
      return res.status(403).json({ message: 'Unsupported role for appointment listing.' });
    }

    const appointments = await Appointment.findAll({
      where: whereClause,
      include: appointmentInclude,
      order: [['appointment_date', 'ASC'], ['start_time', 'ASC']],
    });

    res.json({
      appointments: appointments.map(serializeAppointment),
    });
  } catch (error) {
    console.error('Error fetching my appointments:', error);
    res.status(500).json({ message: 'Failed to fetch appointments.' });
  }
};

export const getAppointmentById = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const role = req.auth.role;
    const appointmentId = Number(req.params.appointmentId);

    if (!Number.isInteger(appointmentId) || appointmentId <= 0) {
      return res.status(400).json({ message: 'Invalid appointment ID.' });
    }

    let roleWhere = {};
    if (role === 'patient') {
      const patient = await Patient.findOne({ where: { user_id: userId } });
      if (!patient) {
        return res.status(404).json({ message: 'Patient profile not found.' });
      }
      roleWhere = { patient_id: patient.id };
    } else if (role === 'doctor') {
      const doctor = await Doctor.findOne({ where: { user_id: userId } });
      if (!doctor) {
        return res.status(404).json({ message: 'Doctor profile not found.' });
      }
      roleWhere = { doctor_id: doctor.id };
    } else {
      return res.status(403).json({ message: 'Unsupported role for appointment details.' });
    }

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

      if (appointment.status !== 'scheduled') {
        throw new HttpError(409, 'Only pending bookings can be confirmed or declined.');
      }

      if (action === 'confirm') {
        appointment.status = 'confirmed';
      } else {
        appointment.status = 'cancelled';
        appointment.cancelled_at = new Date();
        appointment.cancelled_by = doctorUserId;
        appointment.cancellation_reason = declineReason
          ? `${DECLINED_BY_DOCTOR_REASON_PREFIX}: ${declineReason}`
          : DECLINED_BY_DOCTOR_REASON_PREFIX;
      }

      await appointment.save({ transaction });

      const hydratedAppointment = await Appointment.findByPk(appointment.id, {
        include: appointmentInclude,
        transaction,
      });

      return hydratedAppointment;
    });

    res.json({
      message: action === 'confirm' ? 'Booking confirmed successfully.' : 'Booking declined successfully.',
      appointment: serializeAppointment(updatedAppointment),
    });
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
