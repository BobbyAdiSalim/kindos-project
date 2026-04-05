import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const CaregiverPatient = sequelize.define(
  'CaregiverPatient',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    caregiver_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'caregivers',
        key: 'id',
      },
      onDelete: 'CASCADE',
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
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      allowNull: false,
      defaultValue: 'pending',
    },
    relationship: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'e.g., parent, spouse, child, sibling',
    },
  },
  {
    tableName: 'caregiver_patients',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['caregiver_id', 'patient_id'],
      },
    ],
  }
);

export default CaregiverPatient;
