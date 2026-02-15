import bcrypt from 'bcrypt';
import { sequelize, User, Patient, Doctor } from './models/index.js';

const PATIENT_COUNT = 10;
const DOCTOR_COUNT = 10;
const ADMIN_EMAIL = 'administrator@gmail.com';
const ADMIN_PASSWORD = 'administrator';
const DEFAULT_PATIENT_PASSWORD = process.env.SEED_PATIENT_PASSWORD || 'patient123';
const DEFAULT_DOCTOR_PASSWORD = process.env.SEED_DOCTOR_PASSWORD || 'doctor123';

const isTruthyFlag = (value) => {
  if (value === undefined || value === null) return false;
  const normalized = String(value).trim().toLowerCase();
  return normalized === '' || normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
};

export const shouldSeedDevelopmentData = (argv = process.argv, env = process.env) => {
  return argv.includes('--seed') || isTruthyFlag(env.SEED) || isTruthyFlag(env.npm_config_seed);
};

const ensureUniqueUsername = async (baseUsername, transaction) => {
  let candidate = baseUsername;
  let suffix = 1;

  while (true) {
    const existing = await User.findOne({
      where: { username: candidate },
      transaction,
    });

    if (!existing) return candidate;
    candidate = `${baseUsername}_${suffix}`;
    suffix += 1;
  }
};

const ensureUniqueLicenseNumber = async (baseLicense, transaction, doctorUserId) => {
  let candidate = baseLicense;
  let suffix = 1;

  while (true) {
    const existing = await Doctor.findOne({
      where: { license_number: candidate },
      transaction,
    });

    if (!existing || existing.user_id === doctorUserId) return candidate;
    candidate = `${baseLicense}-${suffix}`;
    suffix += 1;
  }
};

const ensurePassword = async (user, plainPassword, transaction) => {
  try {
    const matches = await bcrypt.compare(plainPassword, user.password || '');
    if (matches) return false;
  } catch {
    // Intentionally ignored: if legacy/invalid hash exists, replace it below.
  }

  const passwordHash = await bcrypt.hash(plainPassword, 10);
  await user.update({ password: passwordHash }, { transaction });
  return true;
};

export const seedDevelopmentData = async () => {
  const transaction = await sequelize.transaction();
  const summary = {
    admin: { created: 0, updated: 0, existing: 0 },
    patients: { usersCreated: 0, profilesCreated: 0, existing: 0, rolesAdjusted: 0 },
    doctors: {
      usersCreated: 0,
      profilesCreated: 0,
      profilesVerified: 0,
      existing: 0,
      rolesAdjusted: 0,
    },
  };

  try {
    let admin = await User.findOne({
      where: { email: ADMIN_EMAIL },
      transaction,
    });

    if (!admin) {
      const username = await ensureUniqueUsername('administrator', transaction);
      admin = await User.create(
        {
          username,
          email: ADMIN_EMAIL,
          password: await bcrypt.hash(ADMIN_PASSWORD, 10),
          role: 'admin',
        },
        { transaction }
      );
      summary.admin.created += 1;
    } else {
      summary.admin.existing += 1;
      const updates = {};
      if (admin.role !== 'admin') {
        updates.role = 'admin';
      }

      if (Object.keys(updates).length > 0) {
        await admin.update(updates, { transaction });
        summary.admin.updated += 1;
      }

      if (await ensurePassword(admin, ADMIN_PASSWORD, transaction)) {
        summary.admin.updated += 1;
      }
    }

    const patientPasswordHash = await bcrypt.hash(DEFAULT_PATIENT_PASSWORD, 10);
    for (let i = 1; i <= PATIENT_COUNT; i += 1) {
      const email = `patient${i}@gmail.com`;
      let user = await User.findOne({
        where: { email },
        transaction,
      });

      if (!user) {
        const username = await ensureUniqueUsername(`patient${i}`, transaction);
        user = await User.create(
          {
            username,
            email,
            password: patientPasswordHash,
            role: 'patient',
          },
          { transaction }
        );
        summary.patients.usersCreated += 1;
      } else {
        summary.patients.existing += 1;
      }

      if (user.role !== 'patient') {
        await user.update({ role: 'patient' }, { transaction });
        summary.patients.rolesAdjusted += 1;
      }

      const patientProfile = await Patient.findOne({
        where: { user_id: user.id },
        transaction,
      });

      if (!patientProfile) {
        await Patient.create(
          {
            user_id: user.id,
            full_name: `Patient ${i}`,
            profile_complete: true,
          },
          { transaction }
        );
        summary.patients.profilesCreated += 1;
      }
    }

    const doctorPasswordHash = await bcrypt.hash(DEFAULT_DOCTOR_PASSWORD, 10);
    for (let i = 1; i <= DOCTOR_COUNT; i += 1) {
      const email = `doctor${i}@gmail.com`;
      let user = await User.findOne({
        where: { email },
        transaction,
      });

      if (!user) {
        const username = await ensureUniqueUsername(`doctor${i}`, transaction);
        user = await User.create(
          {
            username,
            email,
            password: doctorPasswordHash,
            role: 'doctor',
          },
          { transaction }
        );
        summary.doctors.usersCreated += 1;
      } else {
        summary.doctors.existing += 1;
      }

      if (user.role !== 'doctor') {
        await user.update({ role: 'doctor' }, { transaction });
        summary.doctors.rolesAdjusted += 1;
      }

      const doctorProfile = await Doctor.findOne({
        where: { user_id: user.id },
        transaction,
      });

      if (!doctorProfile) {
        const licenseNumber = await ensureUniqueLicenseNumber(
          `DOC-LIC-${String(i).padStart(4, '0')}`,
          transaction,
          user.id
        );

        await Doctor.create(
          {
            user_id: user.id,
            full_name: `Doctor ${i}`,
            specialty: 'General Medicine',
            license_number: licenseNumber,
            clinic_location: `Clinic Address ${i}`,
            verification_status: 'approved',
            verification_documents: [],
            verified_at: new Date(),
            verified_by: admin.id,
            profile_complete: true,
          },
          { transaction }
        );
        summary.doctors.profilesCreated += 1;
      } else if (
        doctorProfile.verification_status !== 'approved' ||
        !doctorProfile.verified_at ||
        doctorProfile.verified_by !== admin.id
      ) {
        await doctorProfile.update(
          {
            verification_status: 'approved',
            verified_at: doctorProfile.verified_at || new Date(),
            verified_by: admin.id,
          },
          { transaction }
        );
        summary.doctors.profilesVerified += 1;
      }
    }

    await transaction.commit();

    console.log('[seed] Development data seed completed.');
    console.log('[seed] Admin:', summary.admin);
    console.log('[seed] Patients:', summary.patients);
    console.log('[seed] Doctors:', summary.doctors);

    return summary;
  } catch (error) {
    await transaction.rollback();
    console.error('[seed] Development data seed failed:', error);
    throw error;
  }
};
