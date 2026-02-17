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
import Connection from './Connection.js';

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

// Patient <-> Connection (One-to-Many)
Patient.hasMany(Connection, { foreignKey: 'patient_id', as: 'connections' });
Connection.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });

// Doctor <-> Connection (One-to-Many)
Doctor.hasMany(Connection, { foreignKey: 'doctor_id', as: 'connections' });
Connection.belongsTo(Doctor, { foreignKey: 'doctor_id', as: 'doctor' });

/**
 * Sync database (create tables)
 * WARNING: Use migrations in production instead of sync()
 * @param {boolean} force - Drop existing tables (DANGER: will delete all data)
 */
export async function syncDatabase(force = false) {
  try {
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
  Connection,
};
