/**
 * AdminLog Model
 * Represents administrative action logs for auditing
 */

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const AdminLog = sequelize.define(
  'AdminLog',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    admin_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    action_type: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'e.g., doctor_verified, doctor_denied',
    },
    target_doctor_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'doctors',
        key: 'id',
      },
    },
    details: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Flexible JSON for additional metadata',
    },
  },
  {
    tableName: 'admin_logs',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: false,
  }
);

export default AdminLog;
