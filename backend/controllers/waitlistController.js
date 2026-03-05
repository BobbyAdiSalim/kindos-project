import { sequelize } from '../models/index.js';
import waitlistService from '../services/WaitlistService.js';

const serializeWaitlistEntry = (entry) => ({
  id: entry.id,
  patient_id: entry.patient_id,
  doctor_id: entry.doctor_id,
  desired_date: entry.desired_date,
  desired_start_time: entry.desired_start_time,
  desired_end_time: entry.desired_end_time,
  appointment_type: entry.appointment_type,
  notification_preference: entry.notification_preference,
  status: entry.status,
  last_notified_at: entry.last_notified_at,
  created_at: entry.created_at,
  updated_at: entry.updated_at,
  doctor: entry.doctor
    ? {
        id: entry.doctor.id,
        user_id: entry.doctor.user_id,
        full_name: entry.doctor.full_name,
        specialty: entry.doctor.specialty,
        username: entry.doctor.user?.username || null,
      }
    : null,
});

export const joinWaitlist = async (req, res) => {
  try {
    const createdEntry = await sequelize.transaction(async (transaction) => {
      return waitlistService.joinWaitlist({
        patientUserId: req.auth.userId,
        payload: req.body || {},
        transaction,
      });
    });

    res.status(201).json({
      message: 'Successfully joined waitlist.',
      waitlist_entry: serializeWaitlistEntry(createdEntry),
    });
  } catch (error) {
    const status = Number(error?.status) || 500;
    res.status(status).json({
      message: error?.message || 'Failed to join waitlist.',
    });
  }
};

export const getMyWaitlistEntries = async (req, res) => {
  try {
    const entries = await waitlistService.listMyEntries(req.auth.userId);
    res.json({
      waitlist_entries: entries.map(serializeWaitlistEntry),
    });
  } catch (error) {
    const status = Number(error?.status) || 500;
    res.status(status).json({
      message: error?.message || 'Failed to fetch waitlist entries.',
    });
  }
};

export const removeMyWaitlistEntry = async (req, res) => {
  try {
    const waitlistEntryId = Number(req.params.waitlistEntryId);
    if (!Number.isInteger(waitlistEntryId) || waitlistEntryId <= 0) {
      return res.status(400).json({ message: 'Invalid waitlist entry ID.' });
    }

    await sequelize.transaction(async (transaction) => {
      await waitlistService.removeMyEntry({
        patientUserId: req.auth.userId,
        waitlistEntryId,
        transaction,
      });
    });

    return res.json({ message: 'Waitlist entry removed successfully.' });
  } catch (error) {
    const status = Number(error?.status) || 500;
    return res.status(status).json({
      message: error?.message || 'Failed to remove waitlist entry.',
    });
  }
};
