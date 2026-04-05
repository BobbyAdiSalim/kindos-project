/**
 * Caregiver Controller
 *
 * Handles all caregiver-related operations including:
 * - Link request management: caregivers can request to link with patients by email
 * - Patient-side approval: patients can approve or reject caregiver link requests
 * - Proxy actions: caregivers can view appointments, book, and cancel on behalf of linked patients
 *
 * Authorization flow:
 *   1. Caregiver sends a link request to a patient (by email)
 *   2. Patient approves or rejects the request
 *   3. Once approved, the caregiver can manage appointments for that patient
 */
import { Op } from 'sequelize';
import {
  sequelize,
  Appointment,
  Caregiver,
  CaregiverPatient,
  Patient,
  User,
} from '../models/index.js';
import {
  HttpError,
  serializeAppointment,
  appointmentInclude,
  validateBookingPayload,
  ensureSlotIsBookable,
  getDoctorForBooking,
  ensureNoOverlappingAppointment,
} from './booking/bookingShared.js';

// ── helpers ──

/**
 * Retrieves the Caregiver profile for a given user ID.
 * Throws 404 if the caregiver profile does not exist.
 */
const getCaregiverForUser = async (userId) => {
  const caregiver = await Caregiver.findOne({ where: { user_id: userId } });
  if (!caregiver) {
    throw new HttpError(404, 'Caregiver profile not found.');
  }
  return caregiver;
};

/**
 * Verifies that an approved link exists between a caregiver and patient.
 * Throws 403 if no approved link is found, preventing unauthorized access.
 */
const ensureApprovedLink = async (caregiverId, patientId) => {
  const link = await CaregiverPatient.findOne({
    where: { caregiver_id: caregiverId, patient_id: patientId, status: 'approved' },
  });
  if (!link) {
    throw new HttpError(403, 'You do not have an approved link to this patient.');
  }
  return link;
};

// ── Link request management (caregiver side) ──

/**
 * POST /api/caregiver/link-request
 * Sends a link request from the caregiver to a patient identified by email.
 * If a previously rejected link exists, it resets to 'pending' (allows re-request).
 * Returns 409 if the link is already approved or pending.
 */
export const sendLinkRequest = async (req, res) => {
  try {
    const { email, relationship } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Patient email is required.' });
    }

    const caregiver = await getCaregiverForUser(req.auth.userId);

    const patientUser = await User.findOne({ where: { email, role: 'patient' } });
    if (!patientUser) {
      return res.status(404).json({ error: 'No patient found with that email.' });
    }

    const patient = await Patient.findOne({ where: { user_id: patientUser.id } });
    if (!patient) {
      return res.status(404).json({ error: 'Patient profile not found.' });
    }

    const existing = await CaregiverPatient.findOne({
      where: { caregiver_id: caregiver.id, patient_id: patient.id },
    });

    if (existing) {
      if (existing.status === 'approved') {
        return res.status(409).json({ error: 'This patient is already linked to your account.' });
      }
      if (existing.status === 'pending') {
        return res.status(409).json({ error: 'A link request is already pending for this patient.' });
      }
      // If rejected, allow re-request
      await existing.update({ status: 'pending', relationship: relationship || existing.relationship });
      return res.status(200).json({ message: 'Link request re-sent.', linkRequest: existing });
    }

    const linkRequest = await CaregiverPatient.create({
      caregiver_id: caregiver.id,
      patient_id: patient.id,
      status: 'pending',
      relationship: relationship || null,
    });

    return res.status(201).json({ message: 'Link request sent.', linkRequest });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    return res.status(status).json({ error: error.message });
  }
};

/**
 * GET /api/caregiver/patients
 * Returns all patients linked to the authenticated caregiver (any status).
 */
export const getLinkedPatients = async (req, res) => {
  try {
    const caregiver = await getCaregiverForUser(req.auth.userId);

    const links = await CaregiverPatient.findAll({
      where: { caregiver_id: caregiver.id },
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'full_name', 'user_id'],
          include: [{ model: User, as: 'user', attributes: ['id', 'email'] }],
        },
      ],
      order: [['created_at', 'DESC']],
    });

    return res.status(200).json({ patients: links });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    return res.status(status).json({ error: error.message });
  }
};

/**
 * DELETE /api/caregiver/patients/:patientId
 * Removes the link between the caregiver and a patient (any status).
 */
export const removeLinkedPatient = async (req, res) => {
  try {
    const caregiver = await getCaregiverForUser(req.auth.userId);
    const { patientId } = req.params;

    const link = await CaregiverPatient.findOne({
      where: { caregiver_id: caregiver.id, patient_id: patientId },
    });

    if (!link) {
      return res.status(404).json({ error: 'Link not found.' });
    }

    await link.destroy();
    return res.status(200).json({ message: 'Patient link removed.' });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    return res.status(status).json({ error: error.message });
  }
};

// ── Patient-side approval ──

/**
 * GET /api/patient/caregiver-requests
 * Returns all pending caregiver link requests for the authenticated patient.
 * Called from the patient dashboard so they can approve/reject incoming requests.
 */
export const getCaregiverRequests = async (req, res) => {
  try {
    const patient = await Patient.findOne({ where: { user_id: req.auth.userId } });
    if (!patient) {
      return res.status(404).json({ error: 'Patient profile not found.' });
    }

    const requests = await CaregiverPatient.findAll({
      where: { patient_id: patient.id, status: 'pending' },
      include: [
        {
          model: Caregiver,
          as: 'caregiver',
          attributes: ['id', 'full_name'],
          include: [{ model: User, as: 'user', attributes: ['id', 'email'] }],
        },
      ],
      order: [['created_at', 'DESC']],
    });

    return res.status(200).json({ requests });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

/**
 * PATCH /api/patient/caregiver-requests/:requestId
 * Allows a patient to approve or reject a pending caregiver link request.
 * Only 'approved' or 'rejected' are valid status values.
 */
export const respondToCaregiverRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: "Status must be 'approved' or 'rejected'." });
    }

    const patient = await Patient.findOne({ where: { user_id: req.auth.userId } });
    if (!patient) {
      return res.status(404).json({ error: 'Patient profile not found.' });
    }

    const request = await CaregiverPatient.findOne({
      where: { id: requestId, patient_id: patient.id, status: 'pending' },
    });

    if (!request) {
      return res.status(404).json({ error: 'Pending request not found.' });
    }

    await request.update({ status });
    return res.status(200).json({ message: `Caregiver request ${status}.`, request });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// ── Caregiver actions on behalf of patients ��─

/**
 * GET /api/caregiver/patients/:patientId/appointments
 * Returns all appointments for a linked patient. Requires an approved link.
 */
export const getPatientAppointments = async (req, res) => {
  try {
    const caregiver = await getCaregiverForUser(req.auth.userId);
    const { patientId } = req.params;

    await ensureApprovedLink(caregiver.id, patientId);

    const appointments = await Appointment.findAll({
      where: { patient_id: patientId },
      include: appointmentInclude,
      order: [['appointment_date', 'ASC'], ['start_time', 'ASC']],
    });

    return res.status(200).json({
      appointments: appointments.map(serializeAppointment),
    });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    return res.status(status).json({ error: error.message });
  }
};

/**
 * POST /api/caregiver/patients/:patientId/appointments
 * Books an appointment on behalf of a linked patient. Requires an approved link.
 * Uses the same booking validation and slot-checking logic as patient self-booking.
 */
export const bookForPatient = async (req, res) => {
  try {
    const caregiver = await getCaregiverForUser(req.auth.userId);
    const { patientId } = req.params;

    await ensureApprovedLink(caregiver.id, patientId);

    const patient = await Patient.findByPk(patientId);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found.' });
    }

    const booking = validateBookingPayload(req.body || {});

    const appointment = await sequelize.transaction(async (transaction) => {
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

      return Appointment.findByPk(createdAppointment.id, {
        include: appointmentInclude,
        transaction,
      });
    });

    return res.status(201).json({
      message: 'Booking request submitted on behalf of patient.',
      appointment: serializeAppointment(appointment),
    });
  } catch (error) {
    const statusCode = error instanceof HttpError ? error.status : 500;
    const message = error instanceof HttpError
      ? error.message
      : 'Failed to create appointment booking.';

    if (!(error instanceof HttpError)) {
      console.error('Error creating appointment booking on behalf:', error);
    }

    return res.status(statusCode).json({ message });
  }
};

/**
 * PATCH /api/caregiver/patients/:patientId/appointments/:appointmentId/cancel
 * Cancels an active appointment (scheduled or confirmed) on behalf of a linked patient.
 * The cancellation_reason is prefixed with "Cancelled by caregiver" for audit tracking.
 */
export const cancelForPatient = async (req, res) => {
  try {
    const caregiver = await getCaregiverForUser(req.auth.userId);
    const { patientId, appointmentId } = req.params;

    await ensureApprovedLink(caregiver.id, patientId);

    const appointment = await Appointment.findOne({
      where: {
        id: appointmentId,
        patient_id: patientId,
        status: { [Op.in]: ['scheduled', 'confirmed'] },
      },
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Active appointment not found for this patient.' });
    }

    const { reason } = req.body || {};

    await appointment.update({
      status: 'cancelled',
      cancelled_at: new Date(),
      cancelled_by: req.auth.userId,
      cancellation_reason: reason
        ? `Cancelled by caregiver: ${reason}`
        : 'Cancelled by caregiver',
    });

    return res.status(200).json({ message: 'Appointment cancelled.', appointment: serializeAppointment(appointment) });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    return res.status(status).json({ error: error.message });
  }
};
