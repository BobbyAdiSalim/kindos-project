import { Op } from 'sequelize';
import { AdminLog, Appointment, Doctor, User } from '../../models/index.js';
import {
  DOCTOR_REJECTION_REASON_OPTIONS,
  getDoctorRejectionReasonLabel,
} from '../booking/bookingShared.js';
import { sendEmailByType } from '../../services/email-strategy/index.js';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const sendVerificationStatusUpdatedEmail = async ({ to }) => {
  const dashboardLink = `${FRONTEND_URL}/doctor/dashboard`;
  await sendEmailByType({
    type: 'doctor-verification-status-updated',
    to,
    data: { dashboardLink },
  });
};

export const getUnverifiedDoctors = async (req, res) => {
  try {
    const statusParam = req.query.status;
    const where =
      statusParam === 'pending'
        ? { verification_status: 'pending' }
        : {
            verification_status: {
              [Op.ne]: 'approved',
            },
          };

    const doctors = await Doctor.findAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email'],
        },
      ],
      order: [['updated_at', 'DESC']],
    });

    const payload = doctors.map((doctor) => ({
      id: doctor.id,
      user_id: doctor.user_id,
      full_name: doctor.full_name,
      specialty: doctor.specialty,
      license_number: doctor.license_number,
      verification_status: doctor.verification_status,
      verification_documents: doctor.verification_documents || [],
      updated_at: doctor.updated_at,
      email: doctor.user?.email || null,
    }));

    return res.status(200).json({ doctors: payload });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const updateDoctorVerificationStatus = async (req, res) => {
  try {
    const doctorId = Number(req.params.doctorId);
    const { status, reason } = req.body;

    if (!Number.isInteger(doctorId) || doctorId <= 0) {
      return res.status(400).json({ error: 'Invalid doctor id.' });
    }

    if (status !== 'approved' && status !== 'denied') {
      return res.status(400).json({ error: "Status must be 'approved' or 'denied'." });
    }

    if (status === 'denied' && (!reason || !String(reason).trim())) {
      return res.status(400).json({ error: 'Rejection reason is required when denying an application.' });
    }

    const doctor = await Doctor.findByPk(doctorId);
    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found.' });
    }

    const updates = {
      verification_status: status,
      verified_by: req.auth.userId,
      verified_at: new Date(),
    };

    await doctor.update(updates);
    await AdminLog.create({
      admin_id: req.auth.userId,
      action_type: status === 'approved' ? 'doctor_verified' : 'doctor_denied',
      target_doctor_id: doctor.id,
      details: {
        status,
        doctor_user_id: doctor.user_id,
        reason: status === 'denied' ? String(reason).trim() : null,
      },
    });

    try {
      const doctorUser = await User.findByPk(doctor.user_id);
      if (doctorUser?.email) {
        await sendVerificationStatusUpdatedEmail({ to: doctorUser.email });
      }
    } catch (emailError) {
      console.error('Failed to send verification update email:', emailError);
    }

    return res.status(200).json({
      message: `Doctor ${status === 'approved' ? 'approved' : 'denied'} successfully.`,
      doctor: {
        id: doctor.id,
        verification_status: doctor.verification_status,
        verified_at: doctor.verified_at,
        verified_by: doctor.verified_by,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getDoctorVerificationHistory = async (_req, res) => {
  try {
    const logs = await AdminLog.findAll({
      where: {
        action_type: {
          [Op.in]: ['doctor_verified', 'doctor_denied', 'doctor_resubmitted'],
        },
      },
      include: [
        {
          model: User,
          as: 'admin',
          attributes: ['id', 'username', 'email'],
        },
        {
          model: Doctor,
          as: 'targetDoctor',
          attributes: ['id', 'user_id', 'full_name', 'specialty', 'license_number'],
        },
      ],
      order: [['created_at', 'DESC']],
      limit: 100,
    });

    const history = logs.map((log) => ({
      id: log.id,
      action_type: log.action_type,
      created_at: log.created_at,
      details: log.details || {},
      admin: log.admin
        ? {
            id: log.admin.id,
            username: log.admin.username,
            email: log.admin.email,
          }
        : null,
      doctor: log.targetDoctor
        ? {
            id: log.targetDoctor.id,
            user_id: log.targetDoctor.user_id,
            full_name: log.targetDoctor.full_name,
            specialty: log.targetDoctor.specialty,
            license_number: log.targetDoctor.license_number,
          }
        : null,
    }));

    return res.status(200).json({ history });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const TIMEFRAME_TO_DAYS = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '365d': 365,
  all: null,
};

const toIsoDate = (value) => value.toISOString().slice(0, 10);

export const getAppointmentRejectionAnalytics = async (req, res) => {
  try {
    const requestedTimeframe = String(req.query.timeframe || '30d').trim().toLowerCase();
    const timeframe = Object.prototype.hasOwnProperty.call(TIMEFRAME_TO_DAYS, requestedTimeframe)
      ? requestedTimeframe
      : '30d';
    const days = TIMEFRAME_TO_DAYS[timeframe];

    const where = {
      status: 'cancelled',
      doctor_rejection_reason_code: {
        [Op.not]: null,
      },
    };

    let dateRange = null;
    if (days) {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      startDate.setDate(startDate.getDate() - (days - 1));

      where.updated_at = {
        [Op.gte]: startDate,
      };

      dateRange = {
        start: toIsoDate(startDate),
        end: toIsoDate(endDate),
      };
    }

    const appointments = await Appointment.findAll({
      where,
      attributes: [
        'doctor_rejection_reason_code',
        'doctor_rejection_reason_note',
      ],
      order: [['updated_at', 'DESC']],
    });

    const countsByCode = new Map(
      DOCTOR_REJECTION_REASON_OPTIONS.map((option) => [option.code, 0])
    );

    for (const appointment of appointments) {
      const code = appointment.doctor_rejection_reason_code;
      if (!code || !countsByCode.has(code)) continue;
      countsByCode.set(code, (countsByCode.get(code) || 0) + 1);
    }

    const reasons = Array.from(countsByCode.entries())
      .map(([code, count]) => ({
        code,
        label: getDoctorRejectionReasonLabel(code) || code,
        count,
      }))
      .filter((item) => item.count > 0)
      .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));

    const totalDeclinedAppointments = reasons.reduce((sum, item) => sum + item.count, 0);
    const topReason = reasons[0] || null;

    return res.status(200).json({
      timeframe,
      date_range: dateRange,
      summary: {
        total_declined_appointments: totalDeclinedAppointments,
        unique_reason_count: reasons.length,
        top_reason: topReason,
      },
      reasons,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
