import { Op } from 'sequelize';
import {
  WaitlistEntry,
  Patient,
  Doctor,
  User,
  Message,
  Appointment,
} from '../models/index.js';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/;
const APPOINTMENT_TYPES = new Set(['virtual', 'in-person']);
const NOTIFICATION_PREFERENCES = new Set(['email', 'sms', 'both', 'in-app']);
const OCCUPIED_SLOT_STATUSES = ['scheduled', 'confirmed'];
const WAITLIST_AUTO_BOOK_REASON = 'Auto-booked from waitlist after slot cancellation.';

const normalizeTime = (time) => {
  if (typeof time !== 'string') return '';
  const trimmed = time.trim();
  if (!TIME_REGEX.test(trimmed)) return '';
  if (trimmed.length === 5) return `${trimmed}:00`;
  return trimmed;
};

const timeToMinutes = (timeStr) => {
  const [hour, minute] = String(timeStr).split(':').map((part) => parseInt(part, 10));
  return (hour * 60) + minute;
};

class WaitlistService {
  async getPatientByUserId(userId, transaction) {
    const patient = await Patient.findOne({
      where: { user_id: userId },
      transaction,
    });

    if (!patient) {
      const error = new Error('Patient profile not found.');
      error.status = 404;
      throw error;
    }

    return patient;
  }

  async getDoctorByUserId(doctorUserId, transaction) {
    const doctor = await Doctor.findOne({
      where: {
        user_id: doctorUserId,
        verification_status: 'approved',
      },
      transaction,
    });

    if (!doctor) {
      const error = new Error('Doctor not found or not verified.');
      error.status = 404;
      throw error;
    }

    return doctor;
  }

  validateJoinPayload(payload) {
    const doctorUserId = Number(payload.doctor_user_id);
    const desiredDate = String(payload.desired_date || '').trim();
    const desiredStartTime = normalizeTime(payload.desired_start_time);
    const desiredEndTime = normalizeTime(payload.desired_end_time);
    const appointmentType = String(payload.appointment_type || '').trim();
    const notificationPreference = String(payload.notification_preference || 'in-app').trim();

    if (!Number.isInteger(doctorUserId) || doctorUserId <= 0) {
      const error = new Error('Valid doctor_user_id is required.');
      error.status = 400;
      throw error;
    }

    if (!DATE_REGEX.test(desiredDate)) {
      const error = new Error('Valid desired_date is required (YYYY-MM-DD).');
      error.status = 400;
      throw error;
    }

    if (!APPOINTMENT_TYPES.has(appointmentType)) {
      const error = new Error('appointment_type must be either "virtual" or "in-person".');
      error.status = 400;
      throw error;
    }

    if (!desiredStartTime || !desiredEndTime) {
      const error = new Error('Valid desired_start_time and desired_end_time are required (HH:MM or HH:MM:SS).');
      error.status = 400;
      throw error;
    }

    if (timeToMinutes(desiredStartTime) >= timeToMinutes(desiredEndTime)) {
      const error = new Error('desired_start_time must be earlier than desired_end_time.');
      error.status = 400;
      throw error;
    }

    if (!NOTIFICATION_PREFERENCES.has(notificationPreference)) {
      const error = new Error('Invalid notification_preference.');
      error.status = 400;
      throw error;
    }

    const requestedDate = new Date(`${desiredDate}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (Number.isNaN(requestedDate.getTime()) || requestedDate < today) {
      const error = new Error('desired_date must be today or in the future.');
      error.status = 400;
      throw error;
    }

    return {
      doctorUserId,
      desiredDate,
      desiredStartTime,
      desiredEndTime,
      appointmentType,
      notificationPreference,
    };
  }

  async joinWaitlist({ patientUserId, payload, transaction }) {
    const bookingIntent = this.validateJoinPayload(payload);
    const patient = await this.getPatientByUserId(patientUserId, transaction);
    const doctor = await this.getDoctorByUserId(bookingIntent.doctorUserId, transaction);

    const occupiedSlot = await Appointment.findOne({
      where: {
        doctor_id: doctor.id,
        appointment_date: bookingIntent.desiredDate,
        start_time: bookingIntent.desiredStartTime,
        end_time: bookingIntent.desiredEndTime,
        appointment_type: bookingIntent.appointmentType,
        status: { [Op.in]: OCCUPIED_SLOT_STATUSES },
      },
      transaction,
    });

    if (!occupiedSlot) {
      const error = new Error('This time slot is currently available. Please book it directly instead of joining waitlist.');
      error.status = 409;
      throw error;
    }

    if (occupiedSlot.patient_id === patient.id) {
      const error = new Error('You already hold this appointment slot.');
      error.status = 409;
      throw error;
    }

    const existing = await WaitlistEntry.findOne({
      where: {
        patient_id: patient.id,
        doctor_id: doctor.id,
        desired_date: bookingIntent.desiredDate,
        desired_start_time: bookingIntent.desiredStartTime,
        desired_end_time: bookingIntent.desiredEndTime,
        appointment_type: bookingIntent.appointmentType,
      },
      transaction,
    });

    if (existing) {
      existing.notification_preference = bookingIntent.notificationPreference;
      existing.status = 'active';
      await existing.save({ transaction });
      return existing;
    }

    return WaitlistEntry.create(
      {
        patient_id: patient.id,
        doctor_id: doctor.id,
        desired_date: bookingIntent.desiredDate,
        desired_start_time: bookingIntent.desiredStartTime,
        desired_end_time: bookingIntent.desiredEndTime,
        appointment_type: bookingIntent.appointmentType,
        notification_preference: bookingIntent.notificationPreference,
      },
      { transaction }
    );
  }

  async listMyEntries(patientUserId) {
    const patient = await this.getPatientByUserId(patientUserId);
    return WaitlistEntry.findAll({
      where: {
        patient_id: patient.id,
        status: { [Op.ne]: 'removed' },
      },
      include: [
        {
          model: Doctor,
          as: 'doctor',
          include: [{ model: User, as: 'user', attributes: ['id', 'username'] }],
        },
      ],
      order: [['desired_date', 'ASC'], ['created_at', 'DESC']],
    });
  }

  async removeMyEntry({ patientUserId, waitlistEntryId, transaction }) {
    const patient = await this.getPatientByUserId(patientUserId, transaction);

    const entry = await WaitlistEntry.findOne({
      where: {
        id: waitlistEntryId,
        patient_id: patient.id,
      },
      transaction,
    });

    if (!entry) {
      const error = new Error('Waitlist entry not found.');
      error.status = 404;
      throw error;
    }

    entry.status = 'removed';
    await entry.save({ transaction });
    return entry;
  }

  async fulfillWaitlistForCancelledAppointment({
    cancelledAppointment,
    cancelledByUserId,
    transaction,
  }) {
    const appointmentDate = String(cancelledAppointment.appointment_date || '').trim();
    const appointmentStartTime = normalizeTime(cancelledAppointment.start_time);
    const appointmentEndTime = normalizeTime(cancelledAppointment.end_time);
    const appointmentType = String(cancelledAppointment.appointment_type || '').trim();

    if (!appointmentDate || !appointmentStartTime || !appointmentEndTime || !appointmentType) {
      return { assigned: false };
    }

    const nextEntry = await WaitlistEntry.findOne({
      where: {
        doctor_id: cancelledAppointment.doctor_id,
        desired_date: appointmentDate,
        desired_start_time: appointmentStartTime,
        desired_end_time: appointmentEndTime,
        appointment_type: appointmentType,
        status: 'active',
      },
      include: [
        {
          model: Patient,
          as: 'patient',
          include: [{ model: User, as: 'user', attributes: ['id'] }],
        },
        {
          model: Doctor,
          as: 'doctor',
          include: [{ model: User, as: 'user', attributes: ['id'] }],
        },
      ],
      order: [['created_at', 'ASC'], ['id', 'ASC']],
      transaction,
      lock: transaction.LOCK.UPDATE,
      skipLocked: true,
    });

    if (!nextEntry) {
      return { assigned: false };
    }

    const slotStillOccupied = await Appointment.findOne({
      where: {
        doctor_id: cancelledAppointment.doctor_id,
        appointment_date: appointmentDate,
        start_time: appointmentStartTime,
        end_time: appointmentEndTime,
        appointment_type: appointmentType,
        status: { [Op.in]: OCCUPIED_SLOT_STATUSES },
        id: { [Op.ne]: cancelledAppointment.id },
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (slotStillOccupied) {
      return { assigned: false };
    }

    const duration = Math.max(1, timeToMinutes(appointmentEndTime) - timeToMinutes(appointmentStartTime));
    const reassignedAppointment = await Appointment.create(
      {
        patient_id: nextEntry.patient_id,
        doctor_id: cancelledAppointment.doctor_id,
        slot_id: cancelledAppointment.slot_id || null,
        appointment_date: appointmentDate,
        start_time: appointmentStartTime,
        end_time: appointmentEndTime,
        appointment_type: appointmentType,
        status: 'scheduled',
        duration,
        reason: WAITLIST_AUTO_BOOK_REASON,
        notes: null,
        accessibility_needs: [],
      },
      { transaction }
    );

    nextEntry.status = 'booked';
    nextEntry.last_notified_at = new Date();
    await nextEntry.save({ transaction });

    const senderUserId = nextEntry.doctor?.user?.id || cancelledByUserId || null;
    const receiverUserId = nextEntry.patient?.user?.id || null;

    if (senderUserId && receiverUserId) {
      await Message.create(
        {
          sender_id: senderUserId,
          receiver_id: receiverUserId,
          appointment_id: reassignedAppointment.id,
          content:
            'Great news! A cancelled slot was automatically reassigned to you from the waitlist. Please review your new appointment details.',
        },
        { transaction }
      );
    }

    return {
      assigned: true,
      waitlistEntryId: nextEntry.id,
      reassignedAppointmentId: reassignedAppointment.id,
      patientId: nextEntry.patient_id,
    };
  }

  async notifyPatientsForCancellation({
    doctorId,
    appointmentDate,
    appointmentStartTime,
    appointmentEndTime,
    appointmentType,
    cancelledAppointmentId,
    transaction,
  }) {
    const entries = await WaitlistEntry.findAll({
      where: {
        doctor_id: doctorId,
        desired_date: appointmentDate,
        desired_start_time: normalizeTime(appointmentStartTime),
        desired_end_time: normalizeTime(appointmentEndTime),
        appointment_type: appointmentType,
        status: 'active',
      },
      include: [
        {
          model: Patient,
          as: 'patient',
          include: [{ model: User, as: 'user', attributes: ['id'] }],
        },
        {
          model: Doctor,
          as: 'doctor',
          include: [{ model: User, as: 'user', attributes: ['id'] }],
        },
      ],
      transaction,
    });

    if (!entries.length) {
      return { notifiedCount: 0 };
    }

    const now = new Date();
    for (const entry of entries) {
      const senderUserId = entry.doctor?.user?.id;
      const receiverUserId = entry.patient?.user?.id;
      if (!senderUserId || !receiverUserId) {
        continue;
      }

      await Message.create(
        {
          sender_id: senderUserId,
          receiver_id: receiverUserId,
          appointment_id: cancelledAppointmentId || null,
          content:
            'A previously unavailable appointment slot has opened. You are on the waitlist and can now try booking an earlier time.',
        },
        { transaction }
      );

      entry.status = 'notified';
      entry.last_notified_at = now;
      await entry.save({ transaction });
    }

    return { notifiedCount: entries.length };
  }
}

export default new WaitlistService();
