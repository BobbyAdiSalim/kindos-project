/**
 * Connection Model
 * Represents a chat connection between a patient and a doctor.
 * Connections are created automatically when an appointment is booked.
 */

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Connection = sequelize.define(
  'Connection',
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
    },
    doctor_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'doctors',
        key: 'id',
      },
    },
  },
  {
    tableName: 'connections',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['patient_id', 'doctor_id'],
      },
    ],
  }
);

export default Connection;
