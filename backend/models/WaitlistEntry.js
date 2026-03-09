/**
 * WaitlistEntry Model
 * Represents a patient's request to be notified when an earlier slot opens.
 */

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const WaitlistEntry = sequelize.define(
  'WaitlistEntry',
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
    desired_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    desired_start_time: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    desired_end_time: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    appointment_type: {
      type: DataTypes.ENUM('virtual', 'in-person'),
      allowNull: false,
    },
    notification_preference: {
      type: DataTypes.ENUM('email', 'sms', 'both', 'in-app'),
      allowNull: false,
      defaultValue: 'in-app',
    },
    status: {
      type: DataTypes.ENUM('active', 'notified', 'booked', 'removed'),
      allowNull: false,
      defaultValue: 'active',
    },
    last_notified_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: 'waitlist_entries',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        name: 'waitlist_entries_slot_status_idx',
        fields: ['doctor_id', 'desired_date', 'desired_start_time', 'appointment_type', 'status'],
      },
      {
        unique: true,
        fields: [
          'patient_id',
          'doctor_id',
          'desired_date',
          'desired_start_time',
          'desired_end_time',
          'appointment_type',
        ],
        name: 'waitlist_entries_unique_patient_doctor_date_type',
      },
    ],
  }
);

export default WaitlistEntry;
