import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { sequelize, User, Patient, Doctor } from '../models/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const RESET_TOKEN_EXPIRES_MINUTES = Number(process.env.RESET_TOKEN_EXPIRES_MINUTES || 60);
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const VALID_ROLES = new Set(['patient', 'doctor', 'admin']);

const hashResetToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const sendPasswordResetEmail = async ({ to, resetLink }) => {
  const mailProvider = process.env.EMAIL_PROVIDER || 'console';

  if (mailProvider === 'console') {
    console.log('[Password Reset Email]');
    console.log(`To: ${to}`);
    console.log(`Reset link: ${resetLink}`);
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
    subject: 'Reset your password',
    text: `You requested a password reset. Use this link to reset your password: ${resetLink}. This link expires in ${RESET_TOKEN_EXPIRES_MINUTES} minutes.`,
  });
};

const sanitizeUser = (user, profile = null) => ({
  id: user.id,
  username: user.username,
  email: user.email,
  role: user.role,
  profile,
});

const generateUsernameCandidates = (email) => {
  const localPart = (email || '').split('@')[0] || 'user';
  const base = localPart.toLowerCase().replace(/[^a-z0-9_.-]/g, '').slice(0, 32) || 'user';
  const suffix = Date.now().toString(36).slice(-6);

  return [base, `${base}_${suffix}`, `${base}_${Math.floor(Math.random() * 100000)}`];
};

const findAvailableUsername = async (requestedUsername, email) => {
  const candidates = [requestedUsername, ...generateUsernameCandidates(email)].filter(Boolean);

  for (const candidate of candidates) {
    const existing = await User.findOne({ where: { username: candidate } });
    if (!existing) return candidate;
  }

  return `user_${Date.now()}`;
};

const createRoleProfile = async (transaction, user, body) => {
  if (user.role === 'patient') {
    const profile = await Patient.create(
      {
        user_id: user.id,
        full_name: body.name,
      },
      { transaction }
    );
    return {
      id: profile.id,
      full_name: profile.full_name,
      profile_complete: profile.profile_complete,
    };
  }

  if (user.role === 'doctor') {
    const profile = await Doctor.create(
      {
        user_id: user.id,
        full_name: body.name,
        specialty: body.specialty,
        license_number: body.licenseNumber,
        clinic_location: body.clinicAddress || null,
      },
      { transaction }
    );
    return {
      id: profile.id,
      full_name: profile.full_name,
      specialty: profile.specialty,
      verification_status: profile.verification_status,
      profile_complete: profile.profile_complete,
    };
  }

  return null;
};

export const registerUser = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { email, password, role, name, username, specialty, licenseNumber } = req.body;

    if (!email || !password || !role || !name) {
      await transaction.rollback();
      return res.status(400).json({
        error: 'name, email, password, and role are required.',
      });
    }

    if (!VALID_ROLES.has(role)) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Invalid role provided.' });
    }

    if (role === 'doctor' && (!specialty || !licenseNumber)) {
      await transaction.rollback();
      return res.status(400).json({
        error: 'Doctors must provide specialty and license number.',
      });
    }

    const existingEmail = await User.findOne({ where: { email } });
    if (existingEmail) {
      await transaction.rollback();
      return res.status(409).json({ error: 'Email is already in use.' });
    }

    const resolvedUsername = await findAvailableUsername(username, email);
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create(
      {
        username: resolvedUsername,
        email,
        password: hashedPassword,
        role,
      },
      { transaction }
    );

    const profile = await createRoleProfile(transaction, user, req.body);

    await transaction.commit();

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    return res.status(201).json({
      message: 'User registered successfully.',
      token,
      user: sanitizeUser(user, profile),
    });
  } catch (error) {
    await transaction.rollback();
    return res.status(500).json({ error: error.message });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(401).json({ error: 'Authentication failed.' });
    }

    if (role && user.role !== role) {
      return res.status(401).json({ error: 'Authentication failed for selected role.' });
    }

    const passwordIsValid = await bcrypt.compare(password, user.password);
    if (!passwordIsValid) {
      return res.status(401).json({ error: 'Authentication failed.' });
    }

    let profile = null;
    if (user.role === 'patient') {
      const patient = await Patient.findOne({ where: { user_id: user.id } });
      profile = patient
        ? {
            id: patient.id,
            full_name: patient.full_name,
            profile_complete: patient.profile_complete,
          }
        : null;
    }

    if (user.role === 'doctor') {
      const doctor = await Doctor.findOne({ where: { user_id: user.id } });
      profile = doctor
        ? {
            id: doctor.id,
            full_name: doctor.full_name,
            specialty: doctor.specialty,
            verification_status: doctor.verification_status,
            profile_complete: doctor.profile_complete,
          }
        : null;
    }

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    return res.json({
      message: 'User logged in successfully.',
      token,
      user: sanitizeUser(user, profile),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const logoutUser = async (_req, res) => {
  return res.status(200).json({ message: 'User logged out successfully.' });
};

export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  const genericResponse = {
    message: 'If an account exists for this email, a password reset link has been sent.',
  };

  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(200).json(genericResponse);
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashResetToken(rawToken);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRES_MINUTES * 60 * 1000);

    await User.update(
      {
        reset_password_token_hash: tokenHash,
        reset_password_expires_at: expiresAt,
        reset_password_used_at: null,
      },
      { where: { id: user.id } }
    );

    const resetLink = `${FRONTEND_URL}/reset-password/${rawToken}`;
    await sendPasswordResetEmail({ to: user.email, resetLink });

    return res.status(200).json(genericResponse);
  } catch (error) {
    return res.status(200).json(genericResponse);
  }
};

export const validateResetToken = async (req, res) => {
  const { token } = req.params;
  if (!token) {
    return res.status(400).json({ error: 'Token is required.' });
  }

  try {
    const tokenHash = hashResetToken(token);
    const user = await User.findOne({ where: { reset_password_token_hash: tokenHash } });

    const isValid = Boolean(
      user &&
        user.reset_password_expires_at &&
        user.reset_password_expires_at > new Date() &&
        !user.reset_password_used_at
    );

    return res.status(200).json({ valid: isValid });
  } catch {
    return res.status(200).json({ valid: false });
  }
};

export const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token and newPassword are required.' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  try {
    const tokenHash = hashResetToken(token);
    const user = await User.findOne({ where: { reset_password_token_hash: tokenHash } });

    if (
      !user ||
      !user.reset_password_expires_at ||
      user.reset_password_expires_at <= new Date() ||
      user.reset_password_used_at
    ) {
      return res.status(400).json({ error: 'Invalid or expired reset token.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await User.update(
      {
        password: hashedPassword,
        reset_password_used_at: new Date(),
        reset_password_token_hash: null,
        reset_password_expires_at: null,
      },
      { where: { id: user.id } }
    );

    return res.status(200).json({ message: 'Password reset successful.' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
