'use strict';

const bcrypt = require('bcrypt');

const PATIENT_COUNT = 10;
const DOCTOR_COUNT = 10;
const ADMIN_EMAIL = 'administrator@gmail.com';
const ADMIN_USERNAME = 'administrator';
const ADMIN_PASSWORD = 'administrator';
const DEFAULT_PATIENT_PASSWORD = process.env.SEED_PATIENT_PASSWORD || 'patient123';
const DEFAULT_DOCTOR_PASSWORD = process.env.SEED_DOCTOR_PASSWORD || 'doctor123';

const makePatientEmail = (index) => `patient${index}@gmail.com`;
const makeDoctorEmail = (index) => `doctor${index}@gmail.com`;
const makePatientUsername = (index) => `patient${index}`;
const makeDoctorUsername = (index) => `doctor${index}`;
const makeLicenseBase = (index) => `DOC-LIC-${String(index).padStart(4, '0')}`;

const findAvailableLicenseNumber = async (queryInterface, Sequelize, baseLicense, transaction) => {
  let candidate = baseLicense;
  let suffix = 1;

  while (true) {
    const existing = await queryInterface.sequelize.query(
      'SELECT id FROM doctors WHERE license_number = :license LIMIT 1',
      {
        replacements: { license: candidate },
        type: Sequelize.QueryTypes.SELECT,
        transaction,
      }
    );

    if (existing.length === 0) return candidate;

    candidate = `${baseLicense}-${suffix}`;
    suffix += 1;
  }
};

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const adminPasswordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
      const patientPasswordHash = await bcrypt.hash(DEFAULT_PATIENT_PASSWORD, 10);
      const doctorPasswordHash = await bcrypt.hash(DEFAULT_DOCTOR_PASSWORD, 10);

      const adminRows = await queryInterface.sequelize.query(
        `
          INSERT INTO users (username, email, password, role, created_at, updated_at)
          VALUES (:username, :email, :password, 'admin', NOW(), NOW())
          ON CONFLICT (email)
          DO UPDATE SET
            role = 'admin',
            password = EXCLUDED.password,
            updated_at = NOW()
          RETURNING id
        `,
        {
          replacements: {
            username: ADMIN_USERNAME,
            email: ADMIN_EMAIL,
            password: adminPasswordHash,
          },
          type: Sequelize.QueryTypes.SELECT,
          transaction,
        }
      );

      const adminId = adminRows[0].id;

      for (let i = 1; i <= PATIENT_COUNT; i += 1) {
        const email = makePatientEmail(i);
        const username = makePatientUsername(i);

        const userRows = await queryInterface.sequelize.query(
          `
            INSERT INTO users (username, email, password, role, created_at, updated_at)
            VALUES (:username, :email, :password, 'patient', NOW(), NOW())
            ON CONFLICT (email)
            DO UPDATE SET
              role = 'patient',
              password = EXCLUDED.password,
              updated_at = NOW()
            RETURNING id
          `,
          {
            replacements: {
              username,
              email,
              password: patientPasswordHash,
            },
            type: Sequelize.QueryTypes.SELECT,
            transaction,
          }
        );

        const userId = userRows[0].id;

        await queryInterface.sequelize.query(
          `
            INSERT INTO patients (user_id, full_name, profile_complete, created_at, updated_at)
            VALUES (:userId, :fullName, true, NOW(), NOW())
            ON CONFLICT (user_id) DO NOTHING
          `,
          {
            replacements: {
              userId,
              fullName: `Patient ${i}`,
            },
            transaction,
          }
        );
      }

      for (let i = 1; i <= DOCTOR_COUNT; i += 1) {
        const email = makeDoctorEmail(i);
        const username = makeDoctorUsername(i);

        const userRows = await queryInterface.sequelize.query(
          `
            INSERT INTO users (username, email, password, role, created_at, updated_at)
            VALUES (:username, :email, :password, 'doctor', NOW(), NOW())
            ON CONFLICT (email)
            DO UPDATE SET
              role = 'doctor',
              password = EXCLUDED.password,
              updated_at = NOW()
            RETURNING id
          `,
          {
            replacements: {
              username,
              email,
              password: doctorPasswordHash,
            },
            type: Sequelize.QueryTypes.SELECT,
            transaction,
          }
        );

        const userId = userRows[0].id;
        const existingProfile = await queryInterface.sequelize.query(
          'SELECT id FROM doctors WHERE user_id = :userId LIMIT 1',
          {
            replacements: { userId },
            type: Sequelize.QueryTypes.SELECT,
            transaction,
          }
        );

        if (existingProfile.length === 0) {
          const licenseNumber = await findAvailableLicenseNumber(
            queryInterface,
            Sequelize,
            makeLicenseBase(i),
            transaction
          );

          await queryInterface.sequelize.query(
            `
              INSERT INTO doctors (
                user_id,
                full_name,
                specialty,
                license_number,
                clinic_location,
                verification_status,
                verification_documents,
                verified_at,
                verified_by,
                profile_complete,
                created_at,
                updated_at
              )
              VALUES (
                :userId,
                :fullName,
                :specialty,
                :licenseNumber,
                :clinicLocation,
                'approved',
                ARRAY[]::text[],
                NOW(),
                :adminId,
                true,
                NOW(),
                NOW()
              )
            `,
            {
              replacements: {
                userId,
                fullName: `Doctor ${i}`,
                specialty: 'General Medicine',
                licenseNumber,
                clinicLocation: `Clinic Address ${i}`,
                adminId,
              },
              transaction,
            }
          );
        } else {
          await queryInterface.sequelize.query(
            `
              UPDATE doctors
              SET
                verification_status = 'approved',
                verified_at = COALESCE(verified_at, NOW()),
                verified_by = :adminId,
                updated_at = NOW()
              WHERE user_id = :userId
            `,
            {
              replacements: { adminId, userId },
              transaction,
            }
          );
        }
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const patientEmails = Array.from({ length: PATIENT_COUNT }, (_, idx) => makePatientEmail(idx + 1));
      const doctorEmails = Array.from({ length: DOCTOR_COUNT }, (_, idx) => makeDoctorEmail(idx + 1));
      const seededEmails = [ADMIN_EMAIL, ...patientEmails, ...doctorEmails];

      const seededUsers = await queryInterface.sequelize.query(
        'SELECT id, email FROM users WHERE email IN (:seededEmails)',
        {
          replacements: { seededEmails },
          type: Sequelize.QueryTypes.SELECT,
          transaction,
        }
      );

      const patientUserIds = seededUsers
        .filter((user) => user.email.startsWith('patient'))
        .map((user) => user.id);
      const doctorUserIds = seededUsers
        .filter((user) => user.email.startsWith('doctor'))
        .map((user) => user.id);

      if (doctorUserIds.length > 0) {
        await queryInterface.bulkDelete('doctors', { user_id: doctorUserIds }, { transaction });
      }

      if (patientUserIds.length > 0) {
        await queryInterface.bulkDelete('patients', { user_id: patientUserIds }, { transaction });
      }

      await queryInterface.bulkDelete('users', { email: seededEmails }, { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
