import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { Readable } from 'stream';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { sequelize, User, Patient, Doctor, AdminLog } from '../models/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const MIN_PASSWORD_LENGTH = 8;
const RESET_TOKEN_EXPIRES_MINUTES = Number(process.env.RESET_TOKEN_EXPIRES_MINUTES || 60);
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const REGISTRABLE_ROLES = new Set(['patient', 'doctor']);
const MAX_VERIFICATION_DOCUMENT_BYTES = 5 * 1024 * 1024;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || '';
const R2_ENDPOINT = process.env.R2_ENDPOINT || '';
const R2_REGION = process.env.R2_REGION || 'auto';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';
const R2_VERIFICATION_PREFIX = process.env.R2_VERIFICATION_PREFIX || 'verification-docs';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads', 'verification-docs');
const LEGACY_UPLOADS_PREFIX = '/api/uploads/verification-docs/';
const R2_DOCUMENT_PREFIX = 'r2:';

const isR2Configured = Boolean(
  R2_BUCKET_NAME && R2_ENDPOINT && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY
);

let r2Client = null;

const getR2Client = () => {
  if (!isR2Configured) {
    throw new Error('R2 storage is not configured.');
  }

  if (!r2Client) {
    r2Client = new S3Client({
      region: R2_REGION,
      endpoint: R2_ENDPOINT,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    });
  }

  return r2Client;
};

const hashResetToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const buildResetPasswordEmailHtml = ({ resetLink }) => {
  const safeResetLink = escapeHtml(resetLink);

  return `
  <div style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
            <tr>
              <td style="padding:24px 28px;background:#111827;color:#ffffff;">
                <h1 style="margin:0;font-size:22px;line-height:1.3;">Reset Your Password</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
                  We received a request to reset your password.
                </p>
                <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#374151;">
                  Click the button below to choose a new password. This link will expire in <strong>${RESET_TOKEN_EXPIRES_MINUTES} minutes</strong>.
                </p>
                <p style="margin:0 0 24px;">
                  <a
                    href="${safeResetLink}"
                    style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 18px;border-radius:8px;"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Reset Password
                  </a>
                </p>
                <p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:#6b7280;">
                  If the button does not work, copy and paste this URL into your browser:
                </p>
                <p style="margin:0;font-size:13px;line-height:1.5;word-break:break-all;color:#1d4ed8;">
                  ${safeResetLink}
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px;background:#f9fafb;border-top:1px solid #e5e7eb;">
                <p style="margin:0;font-size:12px;line-height:1.5;color:#6b7280;">
                  If you did not request a password reset, you can safely ignore this email.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>
  `;
};

const sendPasswordResetEmail = async ({ to, resetLink }) => {
  const mailProvider = process.env.EMAIL_PROVIDER || 'console';
  const text = `You requested a password reset. Use this link to reset your password: ${resetLink}. This link expires in ${RESET_TOKEN_EXPIRES_MINUTES} minutes.`;
  const html = buildResetPasswordEmailHtml({ resetLink });

  if (mailProvider === 'console') {
    console.log('[Password Reset Email]');
    console.log(`To: ${to}`);
    console.log(`Reset link: ${resetLink}`);
    console.log('HTML preview available for SMTP provider mode.');
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
    text,
    html,
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
        verification_documents: body.verificationDocuments || [],
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

const estimateDataUrlBytes = (value) => {
  if (typeof value !== 'string') return 0;
  const parts = value.split(',');
  if (parts.length < 2) return 0;
  const base64 = parts[1];
  const padding = (base64.match(/=+$/) || [''])[0].length;
  return Math.floor((base64.length * 3) / 4) - padding;
};

const normalizeVerificationDocuments = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => typeof item === 'string' && item.trim())
    .map((item) => item.trim());
};

const parseDataUrl = (value) => {
  if (typeof value !== 'string' || !value.startsWith('data:') || !value.includes(',')) {
    return null;
  }

  const [header, base64] = value.split(',', 2);
  const mimeMatch = header.match(/^data:([^;]+);base64$/);
  if (!mimeMatch || !base64) {
    return null;
  }

  return {
    mimeType: mimeMatch[1],
    base64,
  };
};

const mimeToExtension = (mimeType) => {
  const map = {
    'application/pdf': '.pdf',
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/webp': '.webp',
  };
  return map[mimeType] || null;
};

const isR2DocumentReference = (value) =>
  typeof value === 'string' && value.startsWith(R2_DOCUMENT_PREFIX);

const toR2DocumentReference = (objectKey) => `${R2_DOCUMENT_PREFIX}${objectKey}`;

const getR2KeyFromReference = (reference) =>
  isR2DocumentReference(reference) ? reference.slice(R2_DOCUMENT_PREFIX.length) : null;

const isLegacyLocalDocumentReference = (value) =>
  typeof value === 'string' && value.startsWith(LEGACY_UPLOADS_PREFIX);

const removePersistedVerificationDocuments = async (documentReferences) => {
  if (!Array.isArray(documentReferences) || documentReferences.length === 0) return;

  await Promise.allSettled(
    documentReferences.map(async (reference) => {
      if (isR2DocumentReference(reference)) {
        if (!isR2Configured) return;

        const objectKey = getR2KeyFromReference(reference);
        if (!objectKey) return;

        await getR2Client().send(
          new DeleteObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: objectKey,
          })
        );
        return;
      }

      if (isLegacyLocalDocumentReference(reference)) {
        const fileName = path.basename(reference);
        if (!fileName) return;
        await fs.unlink(path.join(UPLOADS_DIR, fileName));
      }
    })
  );
};

const persistVerificationDocuments = async (documents, userId) => {
  if (!documents.length) return [];

  if (!isR2Configured) {
    throw new Error('R2 storage is not configured.');
  }

  const persistedReferences = [];
  const client = getR2Client();

  for (let i = 0; i < documents.length; i += 1) {
    const parsed = parseDataUrl(documents[i]);
    if (!parsed) {
      throw new Error('Invalid verification document format.');
    }

    const extension = mimeToExtension(parsed.mimeType);
    if (!extension) {
      throw new Error('Unsupported verification document type.');
    }

    const fileName = `doctor-${userId}-${Date.now()}-${i}-${crypto.randomUUID()}${extension}`;
    const objectKey = `${R2_VERIFICATION_PREFIX}/doctor-${userId}/${fileName}`;
    const fileBuffer = Buffer.from(parsed.base64, 'base64');

    await client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: objectKey,
        Body: fileBuffer,
        ContentType: parsed.mimeType,
      })
    );
    persistedReferences.push(toR2DocumentReference(objectKey));
  }

  return persistedReferences;
};

const streamR2Object = async (res, objectKey) => {
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: objectKey,
  });
  const result = await getR2Client().send(command);
  const fileName = path.basename(objectKey);

  res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
  if (result.ContentType) {
    res.setHeader('Content-Type', result.ContentType);
  }
  if (result.ContentLength) {
    res.setHeader('Content-Length', String(result.ContentLength));
  }

  const body = result.Body;
  if (!body) {
    throw new Error('Document body is empty.');
  }

  if (typeof body.pipe === 'function') {
    body.pipe(res);
    return;
  }

  if (typeof body.transformToWebStream === 'function') {
    Readable.fromWeb(body.transformToWebStream()).pipe(res);
    return;
  }

  if (typeof body.transformToByteArray === 'function') {
    const bytes = await body.transformToByteArray();
    res.end(Buffer.from(bytes));
    return;
  }

  throw new Error('Unsupported document stream type.');
};

const parseStringArray = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return undefined;
};

const normalizeBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
};

const buildPatientProfileResponse = (profile, includePrivateFields = false) => {
  if (!profile) return null;

  const base = {
    id: profile.id,
    full_name: profile.full_name,
    profile_complete: profile.profile_complete,
  };

  if (!includePrivateFields) {
    return base;
  }

  return {
    ...base,
    date_of_birth: profile.date_of_birth,
    phone: profile.phone,
    address: profile.address,
    emergency_contact_name: profile.emergency_contact_name,
    emergency_contact_phone: profile.emergency_contact_phone,
    accessibility_preferences: profile.accessibility_preferences || [],
  };
};

const buildDoctorProfileResponse = (profile, includePrivateFields = false) => {
  if (!profile) return null;

  const base = {
    id: profile.id,
    full_name: profile.full_name,
    specialty: profile.specialty,
    verification_status: profile.verification_status,
    profile_complete: profile.profile_complete,
  };

  if (!includePrivateFields) {
    return {
      ...base,
      bio: profile.bio,
      languages: profile.languages || [],
      clinic_location: profile.clinic_location,
      virtual_available: profile.virtual_available,
      in_person_available: profile.in_person_available,
    };
  }

  return {
    ...base,
    phone: profile.phone,
    license_number: profile.license_number,
    bio: profile.bio,
    languages: profile.languages || [],
    clinic_location: profile.clinic_location,
    latitude: profile.latitude,
    longitude: profile.longitude,
    virtual_available: profile.virtual_available,
    in_person_available: profile.in_person_available,
    verification_documents: profile.verification_documents || [],
    verified_at: profile.verified_at,
    verified_by: profile.verified_by,
  };
};

export const registerUser = async (req, res) => {
  const transaction = await sequelize.transaction();
  let persistedVerificationDocuments = [];

  try {
    const { email, password, role, name, username, specialty, licenseNumber } = req.body;
    const verificationDocuments = normalizeVerificationDocuments(req.body.verificationDocuments);

    if (!email || !password || !role || !name) {
      await transaction.rollback();
      return res.status(400).json({
        error: 'name, email, password, and role are required.',
      });
    }

    if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
      await transaction.rollback();
      return res.status(400).json({
        error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      });
    }

    if (!REGISTRABLE_ROLES.has(role)) {
      await transaction.rollback();
      return res.status(400).json({ error: "Role must be either 'patient' or 'doctor'." });
    }

    if (role === 'doctor' && (!specialty || !licenseNumber)) {
      await transaction.rollback();
      return res.status(400).json({
        error: 'Doctors must provide specialty and license number.',
      });
    }

    if (role === 'doctor' && verificationDocuments.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        error: 'Doctors must upload at least one verification document.',
      });
    }

    if (role === 'doctor') {
      const tooLargeDocument = verificationDocuments.find(
        (document) => estimateDataUrlBytes(document) > MAX_VERIFICATION_DOCUMENT_BYTES
      );

      if (tooLargeDocument) {
        await transaction.rollback();
        return res.status(400).json({
          error: 'Each verification document must be 5MB or smaller.',
        });
      }
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

    persistedVerificationDocuments =
      role === 'doctor' ? await persistVerificationDocuments(verificationDocuments, user.id) : [];

    const profile = await createRoleProfile(transaction, user, {
      ...req.body,
      verificationDocuments: persistedVerificationDocuments,
    });

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

    if (persistedVerificationDocuments.length > 0) {
      await removePersistedVerificationDocuments(persistedVerificationDocuments);
    }

    if (
      error?.message === 'Invalid verification document format.' ||
      error?.message === 'Unsupported verification document type.' ||
      error?.message === 'R2 storage is not configured.'
    ) {
      return res.status(400).json({ error: error.message });
    }

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

  if (typeof newPassword !== 'string' || newPassword.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
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

export const getMyProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.auth.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    let profile = null;

    if (user.role === 'patient') {
      const patient = await Patient.findOne({ where: { user_id: user.id } });
      profile = buildPatientProfileResponse(patient, true);
    } else if (user.role === 'doctor') {
      const doctor = await Doctor.findOne({ where: { user_id: user.id } });
      profile = buildDoctorProfileResponse(doctor, true);

      if (doctor && doctor.verification_status === 'denied') {
        const latestDenial = await AdminLog.findOne({
          where: {
            action_type: 'doctor_denied',
            target_doctor_id: doctor.id,
          },
          order: [['created_at', 'DESC']],
        });

        profile = {
          ...(profile || {}),
          rejection_reason: latestDenial?.details?.reason || null,
        };
      }
    }

    return res.status(200).json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      profile,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const updateMyProfile = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const user = await User.findByPk(req.auth.userId, { transaction });
    if (!user) {
      await transaction.rollback();
      return res.status(404).json({ error: 'User not found.' });
    }

    const userUpdates = {};
    if (typeof req.body.username === 'string' && req.body.username.trim()) {
      userUpdates.username = req.body.username.trim();
    }
    if (typeof req.body.email === 'string' && req.body.email.trim()) {
      userUpdates.email = req.body.email.trim().toLowerCase();
    }

    if (Object.keys(userUpdates).length > 0) {
      await user.update(userUpdates, { transaction });
    }

    if (user.role === 'patient') {
      const patient = await Patient.findOne({ where: { user_id: user.id }, transaction });

      if (!patient) {
        await transaction.rollback();
        return res.status(404).json({ error: 'Patient profile not found.' });
      }

      const patientUpdates = {};
      if (typeof req.body.fullName === 'string') patientUpdates.full_name = req.body.fullName.trim();
      if (typeof req.body.dateOfBirth === 'string') patientUpdates.date_of_birth = req.body.dateOfBirth || null;
      if (typeof req.body.phone === 'string') patientUpdates.phone = req.body.phone.trim() || null;
      if (typeof req.body.address === 'string') patientUpdates.address = req.body.address.trim() || null;
      if (typeof req.body.emergencyContactName === 'string') {
        patientUpdates.emergency_contact_name = req.body.emergencyContactName.trim() || null;
      }
      if (typeof req.body.emergencyContactPhone === 'string') {
        patientUpdates.emergency_contact_phone = req.body.emergencyContactPhone.trim() || null;
      }

      const parsedAccessibility = parseStringArray(req.body.accessibilityPreferences);
      if (parsedAccessibility !== undefined) {
        patientUpdates.accessibility_preferences = parsedAccessibility;
      }

      if (Object.prototype.hasOwnProperty.call(req.body, 'profileComplete')) {
        const normalizedProfileComplete = normalizeBoolean(req.body.profileComplete);
        if (normalizedProfileComplete !== undefined) {
          patientUpdates.profile_complete = normalizedProfileComplete;
        }
      }

      if (Object.keys(patientUpdates).length > 0) {
        await patient.update(patientUpdates, { transaction });
      }
    } else if (user.role === 'doctor') {
      const doctor = await Doctor.findOne({ where: { user_id: user.id }, transaction });

      if (!doctor) {
        await transaction.rollback();
        return res.status(404).json({ error: 'Doctor profile not found.' });
      }

      const doctorUpdates = {};
      if (typeof req.body.fullName === 'string') doctorUpdates.full_name = req.body.fullName.trim();
      if (typeof req.body.phone === 'string') doctorUpdates.phone = req.body.phone.trim() || null;
      if (typeof req.body.specialty === 'string') doctorUpdates.specialty = req.body.specialty.trim();
      if (typeof req.body.licenseNumber === 'string') {
        doctorUpdates.license_number = req.body.licenseNumber.trim();
      }
      if (typeof req.body.bio === 'string') doctorUpdates.bio = req.body.bio.trim() || null;
      if (typeof req.body.clinicLocation === 'string') {
        doctorUpdates.clinic_location = req.body.clinicLocation.trim() || null;
      }

      const parsedLanguages = parseStringArray(req.body.languages);
      if (parsedLanguages !== undefined) {
        doctorUpdates.languages = parsedLanguages;
      }

      if (Object.prototype.hasOwnProperty.call(req.body, 'virtualAvailable')) {
        const normalizedVirtualAvailable = normalizeBoolean(req.body.virtualAvailable);
        if (normalizedVirtualAvailable !== undefined) {
          doctorUpdates.virtual_available = normalizedVirtualAvailable;
        }
      }

      if (Object.prototype.hasOwnProperty.call(req.body, 'inPersonAvailable')) {
        const normalizedInPersonAvailable = normalizeBoolean(req.body.inPersonAvailable);
        if (normalizedInPersonAvailable !== undefined) {
          doctorUpdates.in_person_available = normalizedInPersonAvailable;
        }
      }

      if (Object.prototype.hasOwnProperty.call(req.body, 'profileComplete')) {
        const normalizedProfileComplete = normalizeBoolean(req.body.profileComplete);
        if (normalizedProfileComplete !== undefined) {
          doctorUpdates.profile_complete = normalizedProfileComplete;
        }
      }

      if (Object.keys(doctorUpdates).length > 0) {
        await doctor.update(doctorUpdates, { transaction });
      }
    }

    await transaction.commit();

    const refreshedUser = await User.findByPk(user.id);
    let refreshedProfile = null;

    if (refreshedUser.role === 'patient') {
      const patient = await Patient.findOne({ where: { user_id: refreshedUser.id } });
      refreshedProfile = buildPatientProfileResponse(patient, true);
    } else if (refreshedUser.role === 'doctor') {
      const doctor = await Doctor.findOne({ where: { user_id: refreshedUser.id } });
      refreshedProfile = buildDoctorProfileResponse(doctor, true);
    }

    return res.status(200).json({
      message: 'Profile updated successfully.',
      user: {
        id: refreshedUser.id,
        username: refreshedUser.username,
        email: refreshedUser.email,
        role: refreshedUser.role,
      },
      profile: refreshedProfile,
    });
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }

    if (error?.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Username, email, or license number is already in use.' });
    }

    return res.status(500).json({ error: error.message });
  }
};

export const getPublicProfile = async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ error: 'Invalid user id.' });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    let profile = null;
    if (user.role === 'patient') {
      const patient = await Patient.findOne({ where: { user_id: user.id } });
      profile = buildPatientProfileResponse(patient, false);
    } else if (user.role === 'doctor') {
      const doctor = await Doctor.findOne({ where: { user_id: user.id } });
      profile = buildDoctorProfileResponse(doctor, false);
    }

    return res.status(200).json({
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
      profile,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getDoctorVerificationDocument = async (req, res) => {
  try {
    const doctorId = Number(req.params.doctorId);
    const documentIndex = Number(req.params.documentIndex);

    if (!Number.isInteger(doctorId) || doctorId <= 0) {
      return res.status(400).json({ error: 'Invalid doctor id.' });
    }

    if (!Number.isInteger(documentIndex) || documentIndex < 0) {
      return res.status(400).json({ error: 'Invalid document index.' });
    }

    const doctor = await Doctor.findByPk(doctorId, {
      attributes: ['id', 'user_id', 'verification_documents'],
    });

    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found.' });
    }

    const requesterIsAdmin = req.auth.role === 'admin';
    const requesterIsUploader = req.auth.userId === doctor.user_id;
    if (!requesterIsAdmin && !requesterIsUploader) {
      return res.status(403).json({ error: 'Forbidden.' });
    }

    const verificationDocuments = doctor.verification_documents || [];
    const documentReference = verificationDocuments[documentIndex];

    if (!documentReference) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    if (isR2DocumentReference(documentReference)) {
      if (!isR2Configured) {
        return res.status(500).json({ error: 'R2 storage is not configured.' });
      }

      const objectKey = getR2KeyFromReference(documentReference);
      if (!objectKey) {
        return res.status(404).json({ error: 'Document not found.' });
      }

      await streamR2Object(res, objectKey);
      return;
    }

    if (isLegacyLocalDocumentReference(documentReference)) {
      const fileName = path.basename(documentReference);
      if (!fileName) {
        return res.status(404).json({ error: 'Document not found.' });
      }

      const absolutePath = path.join(UPLOADS_DIR, fileName);
      await fs.access(absolutePath);
      return res.sendFile(absolutePath);
    }

    return res.status(404).json({ error: 'Document reference is invalid.' });
  } catch (error) {
    if (error?.name === 'NoSuchKey') {
      return res.status(404).json({ error: 'Document not found.' });
    }

    if (error?.code === 'ENOENT') {
      return res.status(404).json({ error: 'Document not found.' });
    }

    return res.status(500).json({ error: error.message || 'Failed to fetch verification document.' });
  }
};

export const resubmitDoctorVerification = async (req, res) => {
  const transaction = await sequelize.transaction();
  let persistedVerificationDocuments = [];

  try {
    const user = await User.findByPk(req.auth.userId, { transaction });
    if (!user || user.role !== 'doctor') {
      await transaction.rollback();
      return res.status(403).json({ error: 'Only doctors can resubmit verification.' });
    }

    const doctor = await Doctor.findOne({ where: { user_id: user.id }, transaction });
    if (!doctor) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Doctor profile not found.' });
    }

    if (doctor.verification_status !== 'denied') {
      await transaction.rollback();
      return res.status(400).json({ error: 'Only rejected applications can be resubmitted.' });
    }

    const fullName = String(req.body.fullName || '').trim();
    const specialty = String(req.body.specialty || '').trim();
    const licenseNumber = String(req.body.licenseNumber || '').trim();
    const clinicLocation = String(req.body.clinicAddress || '').trim();
    const verificationDocuments = normalizeVerificationDocuments(req.body.verificationDocuments);

    if (!fullName || !specialty || !licenseNumber || verificationDocuments.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        error: 'fullName, specialty, licenseNumber, and verificationDocuments are required.',
      });
    }

    const tooLargeDocument = verificationDocuments.find(
      (document) => estimateDataUrlBytes(document) > MAX_VERIFICATION_DOCUMENT_BYTES
    );
    if (tooLargeDocument) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Each verification document must be 5MB or smaller.' });
    }

    persistedVerificationDocuments = await persistVerificationDocuments(verificationDocuments, user.id);

    await doctor.update(
      {
        full_name: fullName,
        specialty,
        license_number: licenseNumber,
        clinic_location: clinicLocation || null,
        verification_documents: persistedVerificationDocuments,
        verification_status: 'pending',
        verified_by: null,
        verified_at: null,
      },
      { transaction }
    );

    await AdminLog.create(
      {
        admin_id: req.auth.userId,
        action_type: 'doctor_resubmitted',
        target_doctor_id: doctor.id,
        details: {
          status: 'pending',
          reason: 'Doctor resubmitted verification documents.',
        },
      },
      { transaction }
    );

    await transaction.commit();
    return res.status(200).json({
      message: 'Verification application resubmitted successfully.',
      doctor: {
        id: doctor.id,
        verification_status: 'pending',
        verification_documents: persistedVerificationDocuments,
      },
    });
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }

    if (persistedVerificationDocuments.length > 0) {
      await removePersistedVerificationDocuments(persistedVerificationDocuments);
    }

    if (
      error?.message === 'Invalid verification document format.' ||
      error?.message === 'Unsupported verification document type.' ||
      error?.message === 'R2 storage is not configured.'
    ) {
      return res.status(400).json({ error: error.message });
    }

    if (error?.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'License number is already in use.' });
    }

    return res.status(500).json({ error: error.message });
  }
};

/**
 * Get all verified doctors with optional filtering
 * @route GET /api/doctors
 * @access Public
 */
export const getDoctors = async (req, res) => {
  try {
    const { 
      search, 
      appointmentType, 
      language, 
      specialty,
      limit = 50, 
      offset = 0 
    } = req.query;

    // Build where clause - only show verified doctors
    const whereClause = {
      verification_status: "approved",
    };

    // Search by name or specialty
    if (search) {
      whereClause[Op.or] = [
        { full_name: { [Op.iLike]: `%${search}%` } },
        { specialty: { [Op.iLike]: `%${search}%` } },
        { bio: { [Op.iLike]: `%${search}%` } },
      ];
    }

    // Filter by specialty/care type
    if (specialty && specialty !== "all") {
      whereClause.specialty = { [Op.iLike]: `%${specialty}%` };
    }

    // Filter by appointment type
    if (appointmentType === "virtual") {
      whereClause.virtual_available = true;
    } else if (appointmentType === "in-person") {
      whereClause.in_person_available = true;
    }

    // Filter by language
    if (language && language !== "all") {
      whereClause.languages = { [Op.contains]: [language] };
    }

    // Fetch doctors
    const doctors = await Doctor.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "email", "role", "created_at"],
        },
      ],
      order: [["full_name", "ASC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    // Transform for frontend
    const transformedDoctors = doctors.rows.map((doctor) => ({
      id: doctor.id,
      user_id: doctor.user_id,
      full_name: doctor.full_name,
      specialty: doctor.specialty,
      phone: doctor.phone,
      bio: doctor.bio,
      languages: doctor.languages || [],
      clinic_location: doctor.clinic_location,
      latitude: doctor.latitude,
      longitude: doctor.longitude,
      virtual_available: doctor.virtual_available,
      in_person_available: doctor.in_person_available,
      verification_status: doctor.verification_status,
      verified_at: doctor.verified_at,
      profile_complete: doctor.profile_complete,
      created_at: doctor.created_at,
      updated_at: doctor.updated_at,
      user: doctor.user,
    }));

    res.status(200).json({
      success: true,
      count: transformedDoctors.length,
      total: doctors.count,
      doctors: transformedDoctors,
    });
  } catch (error) {
    console.error("Error fetching doctors:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch doctors",
      error: error.message,
    });
  }
};

/**
 * Get a specific doctor by ID
 * @route GET /api/doctors/:doctorId
 * @access Public
 */
export const getDoctorById = async (req, res) => {
  try {
    const { doctorId } = req.params;

    const doctor = await Doctor.findOne({
      where: {
        id: doctorId,
        verification_status: "approved",
      },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "email", "role", "created_at"],
        },
      ],
    });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    // Transform for frontend
    const transformedDoctor = {
      id: doctor.id,
      user_id: doctor.user_id,
      full_name: doctor.full_name,
      specialty: doctor.specialty,
      phone: doctor.phone,
      bio: doctor.bio,
      languages: doctor.languages || [],
      clinic_location: doctor.clinic_location,
      latitude: doctor.latitude,
      longitude: doctor.longitude,
      virtual_available: doctor.virtual_available,
      in_person_available: doctor.in_person_available,
      verification_status: doctor.verification_status,
      verified_at: doctor.verified_at,
      profile_complete: doctor.profile_complete,
      created_at: doctor.created_at,
      updated_at: doctor.updated_at,
      user: doctor.user,
    };

    res.status(200).json({
      success: true,
      doctor: transformedDoctor,
    });
  } catch (error) {
    console.error("Error fetching doctor:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch doctor",
      error: error.message,
    });
  }
};