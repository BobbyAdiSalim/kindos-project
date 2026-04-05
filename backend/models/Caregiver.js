import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Caregiver = sequelize.define(
  'Caregiver',
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
    time_zone: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: 'America/New_York',
    },
  },
  {
    tableName: 'caregivers',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default Caregiver;
