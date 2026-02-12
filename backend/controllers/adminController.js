import { Op } from 'sequelize';
import { AdminLog, Doctor, User } from '../models/index.js';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const sendVerificationStatusUpdatedEmail = async ({ to }) => {
  const mailProvider = process.env.EMAIL_PROVIDER || 'console';
  const dashboardLink = `${FRONTEND_URL}/doctor/dashboard`;
  const subject = 'Your verification status has been updated';
  const text = `Hello, your verification status has been updated. Please sign in and check your dashboard for details: ${dashboardLink}`;
  const html = `
    <div style="margin:0;padding:0;background:#f6f8fb;font-family:Arial,Helvetica,sans-serif;color:#102a43;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:28px 12px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border:1px solid #e4e7eb;border-radius:14px;overflow:hidden;">
              <tr>
                <td style="padding:24px 28px;background:linear-gradient(135deg,#0f4c81,#3f92d2);color:#ffffff;">
                  <p style="margin:0;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.9;">UTLWA</p>
                  <h1 style="margin:10px 0 0;font-size:24px;line-height:1.2;font-weight:700;">Verification Update</h1>
                </td>
              </tr>
              <tr>
                <td style="padding:26px 28px;">
                  <p style="margin:0 0 14px;font-size:16px;line-height:1.6;">Hello,</p>
                  <p style="margin:0 0 20px;font-size:16px;line-height:1.6;">
                    Your verification status has been updated. Please sign in and check your dashboard for the latest details.
                  </p>
                  <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 20px;">
                    <tr>
                      <td style="border-radius:8px;background:#1366d6;">
                        <a href="${dashboardLink}" style="display:inline-block;padding:12px 20px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">
                          Open Doctor Dashboard
                        </a>
                      </td>
                    </tr>
                  </table>
                  <p style="margin:0;font-size:13px;line-height:1.6;color:#52606d;">
                    If the button does not work, use this link:<br />
                    <a href="${dashboardLink}" style="color:#1366d6;text-decoration:none;">${dashboardLink}</a>
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding:16px 28px;background:#f0f4f8;color:#627d98;font-size:12px;line-height:1.6;">
                  This is an automated message from UTLWA. Please do not reply to this email.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;

  if (mailProvider === 'console') {
    console.log('[Doctor Verification Status Updated Email]');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Message: ${text}`);
    return;
  }

  const { default: nodemailer } = await import('nodemailer');
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || 'false') === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
    html,
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
