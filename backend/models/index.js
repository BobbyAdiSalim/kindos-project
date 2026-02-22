/**
 * Models Index
 * Imports all models, sets up associations, and exports them
 */

import sequelize from '../config/database.js';
import User from './User.js';
import Patient from './Patient.js';
import Doctor from './Doctor.js';
import Appointment from './Appointment.js';
import { AvailabilityPattern, AvailabilitySlot } from './Availability.js';
import Message from './Message.js';
import Review from './Review.js';
import Questionnaire from './Questionnaire.js';
import AdminLog from './AdminLog.js';
import WaitlistEntry from './WaitlistEntry.js';

// Define associations between models

// User <-> Patient (One-to-One)
User.hasOne(Patient, { foreignKey: 'user_id', as: 'patientProfile' });
Patient.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User <-> Doctor (One-to-One)
User.hasOne(Doctor, { foreignKey: 'user_id', as: 'doctorProfile' });
Doctor.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Patient <-> Appointment (One-to-Many)
Patient.hasMany(Appointment, { foreignKey: 'patient_id', as: 'appointments' });
Appointment.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });

// Doctor <-> Appointment (One-to-Many)
Doctor.hasMany(Appointment, { foreignKey: 'doctor_id', as: 'appointments' });
Appointment.belongsTo(Doctor, { foreignKey: 'doctor_id', as: 'doctor' });

// Doctor <-> AvailabilityPattern (One-to-Many)
Doctor.hasMany(AvailabilityPattern, { foreignKey: 'doctor_id', as: 'availabilityPatterns' });
AvailabilityPattern.belongsTo(Doctor, { foreignKey: 'doctor_id', as: 'doctor' });

// Doctor <-> AvailabilitySlot (One-to-Many)
Doctor.hasMany(AvailabilitySlot, { foreignKey: 'doctor_id', as: 'availabilitySlots' });
AvailabilitySlot.belongsTo(Doctor, { foreignKey: 'doctor_id', as: 'doctor' });

// AvailabilitySlot <-> Appointment (One-to-Many)
AvailabilitySlot.hasMany(Appointment, { foreignKey: 'slot_id', as: 'appointments' });
Appointment.belongsTo(AvailabilitySlot, { foreignKey: 'slot_id', as: 'slot' });

// User <-> Message (sender/receiver relationships)
User.hasMany(Message, { foreignKey: 'sender_id', as: 'sentMessages' });
User.hasMany(Message, { foreignKey: 'receiver_id', as: 'receivedMessages' });
Message.belongsTo(User, { foreignKey: 'sender_id', as: 'sender' });
Message.belongsTo(User, { foreignKey: 'receiver_id', as: 'receiver' });

// Appointment <-> Message (Optional relationship)
Appointment.hasMany(Message, { foreignKey: 'appointment_id', as: 'messages' });
Message.belongsTo(Appointment, { foreignKey: 'appointment_id', as: 'appointment' });

// Appointment <-> Review (One-to-One)
Appointment.hasOne(Review, { foreignKey: 'appointment_id', as: 'review' });
Review.belongsTo(Appointment, { foreignKey: 'appointment_id', as: 'appointment' });

// Patient <-> Review (One-to-Many)
Patient.hasMany(Review, { foreignKey: 'patient_id', as: 'reviews' });
Review.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });

// Doctor <-> Review (One-to-Many)
Doctor.hasMany(Review, { foreignKey: 'doctor_id', as: 'reviews' });
Review.belongsTo(Doctor, { foreignKey: 'doctor_id', as: 'doctor' });

// Patient <-> Questionnaire (One-to-Many)
Patient.hasMany(Questionnaire, { foreignKey: 'patient_id', as: 'questionnaires' });
Questionnaire.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });

// User <-> AdminLog (One-to-Many)
User.hasMany(AdminLog, { foreignKey: 'admin_id', as: 'adminLogs' });
AdminLog.belongsTo(User, { foreignKey: 'admin_id', as: 'admin' });

// Doctor <-> AdminLog (One-to-Many)
Doctor.hasMany(AdminLog, { foreignKey: 'target_doctor_id', as: 'verificationLogs' });
AdminLog.belongsTo(Doctor, { foreignKey: 'target_doctor_id', as: 'targetDoctor' });

// Patient <-> WaitlistEntry (One-to-Many)
Patient.hasMany(WaitlistEntry, { foreignKey: 'patient_id', as: 'waitlistEntries' });
WaitlistEntry.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });

// Doctor <-> WaitlistEntry (One-to-Many)
Doctor.hasMany(WaitlistEntry, { foreignKey: 'doctor_id', as: 'waitlistEntries' });
WaitlistEntry.belongsTo(Doctor, { foreignKey: 'doctor_id', as: 'doctor' });

const repairLegacyWaitlistSchema = async () => {
  const [tableRows] = await sequelize.query(
    "SELECT to_regclass('public.waitlist_entries') AS table_name"
  );
  const tableName = tableRows?.[0]?.table_name || null;
  if (!tableName) {
    return;
  }

  const [columnRows] = await sequelize.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'waitlist_entries'
  `);
  const existingColumns = new Set(columnRows.map((row) => row.column_name));
  const missingDesiredTimeColumns = (
    !existingColumns.has('desired_start_time')
    || !existingColumns.has('desired_end_time')
  );

  if (!missingDesiredTimeColumns) {
    return;
  }

  console.warn('[db] Repairing legacy waitlist_entries schema (adding desired_start_time/desired_end_time).');

  await sequelize.transaction(async (transaction) => {
    await sequelize.query(`
      ALTER TABLE public.waitlist_entries
      ADD COLUMN IF NOT EXISTS desired_start_time TIME DEFAULT '00:00:00'::time,
      ADD COLUMN IF NOT EXISTS desired_end_time TIME DEFAULT '00:30:00'::time;
    `, { transaction });

    await sequelize.query(`
      UPDATE public.waitlist_entries
      SET
        desired_start_time = COALESCE(desired_start_time, '00:00:00'::time),
        desired_end_time = COALESCE(desired_end_time, '00:30:00'::time)
      WHERE desired_start_time IS NULL OR desired_end_time IS NULL;
    `, { transaction });

    await sequelize.query(`
      ALTER TABLE public.waitlist_entries
      ALTER COLUMN desired_start_time SET NOT NULL,
      ALTER COLUMN desired_end_time SET NOT NULL,
      ALTER COLUMN desired_start_time DROP DEFAULT,
      ALTER COLUMN desired_end_time DROP DEFAULT;
    `, { transaction });

    await sequelize.query(
      'DROP INDEX IF EXISTS public.waitlist_entries_doctor_id_desired_date_appointment_type_status;',
      { transaction }
    );
    await sequelize.query(
      'DROP INDEX IF EXISTS public.waitlist_entries_unique_patient_doctor_date_type;',
      { transaction }
    );

    await sequelize.query(
      'DROP INDEX IF EXISTS public.waitlist_entries_doctor_id_desired_date_desired_start_time_appo;',
      { transaction }
    );

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS waitlist_entries_slot_status_idx
      ON public.waitlist_entries (doctor_id, desired_date, desired_start_time, appointment_type, status);
    `, { transaction });

    await sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS waitlist_entries_unique_patient_doctor_date_type
      ON public.waitlist_entries (patient_id, doctor_id, desired_date, desired_start_time, desired_end_time, appointment_type);
    `, { transaction });
  });
};

/**
 * Sync database (create tables)
 * WARNING: Use migrations in production instead of sync()
 * @param {boolean} force - Drop existing tables (DANGER: will delete all data)
 */
export async function syncDatabase(force = false) {
  try {
    await repairLegacyWaitlistSchema();
    await sequelize.sync({ force, alter: !force });
    console.log('Database synchronized successfully');
  } catch (error) {
    console.error('Error synchronizing database:', error);
    throw error;
  }
}

// Export all models
export {
  sequelize,
  User,
  Patient,
  Doctor,
  Appointment,
  AvailabilityPattern,
  AvailabilitySlot,
  Message,
  Review,
  Questionnaire,
  AdminLog,
  WaitlistEntry,
};
