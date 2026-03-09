/**
 * Appointment Model
 * Represents appointments between patients and doctors
 */

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Appointment = sequelize.define(
  'Appointment',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    patient_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'patients',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    doctor_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'doctors',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    slot_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'availability_slots',
        key: 'id',
      },
    },
    appointment_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    start_time: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    end_time: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    appointment_type: {
      type: DataTypes.ENUM('virtual', 'in-person'),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('scheduled', 'confirmed', 'completed', 'cancelled', 'no-show'),
      defaultValue: 'scheduled',
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Duration in minutes',
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    accessibility_needs: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: [],
    },
    summary: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Doctor\'s post-appointment summary',
    },
    summary_written_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    cancelled_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    cancelled_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    cancellation_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    notify_on_doctor_approval: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Whether patient should receive an email when doctor confirms appointment',
    },
    pending_reschedule_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    pending_reschedule_start_time: {
      type: DataTypes.TIME,
      allowNull: true,
    },
    pending_reschedule_end_time: {
      type: DataTypes.TIME,
      allowNull: true,
    },
    pending_reschedule_type: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Proposed appointment type for pending reschedule requests',
    },
    pending_reschedule_duration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Proposed duration in minutes for pending reschedule requests',
    },
    pending_reschedule_requested_by_role: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Role that initiated pending reschedule (patient or doctor)',
    },
    pending_reschedule_previous_status: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Status before pending reschedule was requested',
    },
    pending_reschedule_requested_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: 'appointments',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default Appointment;
