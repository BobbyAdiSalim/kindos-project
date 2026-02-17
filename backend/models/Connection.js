/**
 * Connection Model
 * Represents connection requests between patients and doctors.
 * A patient must send a connect request that the doctor accepts
 * before messages can be exchanged.
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
    status: {
      type: DataTypes.ENUM('pending', 'accepted', 'rejected'),
      allowNull: false,
      defaultValue: 'pending',
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
      {
        fields: ['doctor_id', 'status'],
      },
    ],
  }
);

export default Connection;
