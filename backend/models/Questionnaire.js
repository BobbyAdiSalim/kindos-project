/**
 * Questionnaire Model
 * Represents patient needs assessment questionnaires
 */

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Questionnaire = sequelize.define(
  'Questionnaire',
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
    care_type: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'e.g., primary, mental, specialist, urgent',
    },
    urgency: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'e.g., urgent, soon, flexible',
    },
    preferred_appointment_type: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'e.g., virtual, in-person, either',
    },
    accessibility_needs: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: [],
      comment: 'e.g., [asl, interpreter, wheelchair, captions]',
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    completed_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'questionnaires',
    timestamps: false,
    underscored: true,
  }
);

export default Questionnaire;
