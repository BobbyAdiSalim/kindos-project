'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Add 'caregiver' to the users role ENUM
      await queryInterface.sequelize.query(
        `ALTER TYPE "enum_users_role" ADD VALUE IF NOT EXISTS 'caregiver'`,
        { transaction }
      );

      // Create caregivers table
      await queryInterface.createTable(
        'caregivers',
        {
          id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true,
          },
          user_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            unique: true,
            references: {
              model: 'users',
              key: 'id',
            },
            onDelete: 'CASCADE',
          },
          full_name: {
            type: Sequelize.STRING(255),
            allowNull: false,
          },
          phone: {
            type: Sequelize.STRING(20),
            allowNull: true,
          },
          time_zone: {
            type: Sequelize.STRING(100),
            allowNull: false,
            defaultValue: 'America/New_York',
          },
          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
          updated_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
        },
        { transaction }
      );

      // Create caregiver_patients join table
      await queryInterface.createTable(
        'caregiver_patients',
        {
          id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true,
          },
          caregiver_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: 'caregivers',
              key: 'id',
            },
            onDelete: 'CASCADE',
          },
          patient_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: 'patients',
              key: 'id',
            },
            onDelete: 'CASCADE',
          },
          status: {
            type: Sequelize.ENUM('pending', 'approved', 'rejected'),
            allowNull: false,
            defaultValue: 'pending',
          },
          relationship: {
            type: Sequelize.STRING(100),
            allowNull: true,
          },
          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
          updated_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
        },
        { transaction }
      );

      // Add unique index on caregiver_id + patient_id
      await queryInterface.addIndex(
        'caregiver_patients',
        ['caregiver_id', 'patient_id'],
        {
          unique: true,
          name: 'caregiver_patients_caregiver_id_patient_id_unique',
          transaction,
        }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.dropTable('caregiver_patients', { transaction });
      await queryInterface.dropTable('caregivers', { transaction });

      // Note: PostgreSQL does not support removing values from ENUMs directly.
      // To fully revert, you'd need to recreate the type. Leaving 'caregiver' in the ENUM is safe.

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
