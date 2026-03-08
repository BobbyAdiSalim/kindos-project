import { Op } from 'sequelize';
import {
  sequelize,
  Appointment,
  Connection,
  Doctor,
  Patient,
  User,
} from '../../models/index.js';
import { getRoleStrategy } from '../../services/role-strategy/index.js';
import {
  HttpError,
  serializeAppointment,
  appointmentInclude,
  validateBookingPayload,
  ensureSlotIsBookable,
  getDoctorForBooking,
  getPatientForUser,
  ensureNoOverlappingAppointment,
} from './bookingShared.js';

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

    const doctor = await Doctor.findOne({
      where: { user_id: doctorUserId },
    });

    if (!doctor) {
      return res.status(404).json({ message: 'Doctor profile not found.' });
    }

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
        message: 'You do not have an active appointment with this patient.',
      });
    }

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
