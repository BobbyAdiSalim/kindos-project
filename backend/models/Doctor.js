/**
 * Doctor Model
 * Represents doctor profiles with professional information and verification status
 */

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Doctor = sequelize.define(
  'Doctor',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    full_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    specialty: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    license_number: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    bio: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    languages: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: [],
      comment: 'e.g., [English, ASL, Spanish]',
    },
    clinic_location: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true,
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true,
    },
    virtual_available: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    in_person_available: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    verification_status: {
      type: DataTypes.ENUM('pending', 'approved', 'denied'),
      defaultValue: 'pending',
    },
    verification_documents: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: true,
      defaultValue: [],
      comment: 'URLs or file paths to uploaded documents',
    },
    verified_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    verified_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    profile_complete: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    tableName: 'doctors',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default Doctor;
