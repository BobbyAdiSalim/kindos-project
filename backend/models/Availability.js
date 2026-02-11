/**
 * Availability Models
 * Represents doctor availability patterns and specific time slots
 */

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

/**
 * AvailabilityPattern - Recurring weekly schedule
 */
export const AvailabilityPattern = sequelize.define(
  'AvailabilityPattern',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
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
    day_of_week: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 0,
        max: 6,
      },
      comment: '0=Sunday, 1=Monday, ..., 6=Saturday',
    },
    start_time: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    end_time: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    appointment_duration: {
      type: DataTypes.INTEGER,
      defaultValue: 30,
      comment: 'Duration in minutes',
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    tableName: 'availability_patterns',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [
      {
        unique: true,
        fields: ['doctor_id', 'day_of_week', 'start_time'],
      },
    ],
  }
);

/**
 * AvailabilitySlot - Specific date/time slots
 */
export const AvailabilitySlot = sequelize.define(
  'AvailabilitySlot',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
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
    slot_date: {
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
    is_available: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    appointment_type: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: ['virtual', 'in-person'],
      comment: 'Types allowed for this slot',
    },
  },
  {
    tableName: 'availability_slots',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [
      {
        unique: true,
        fields: ['doctor_id', 'slot_date', 'start_time'],
      },
      {
        fields: ['doctor_id', 'slot_date'],
      },
    ],
  }
);

export default { AvailabilityPattern, AvailabilitySlot };
