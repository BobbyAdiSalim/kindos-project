import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { sequelize, User, Patient, Doctor } from '../models/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const VALID_ROLES = new Set(['patient', 'doctor', 'admin']);

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
