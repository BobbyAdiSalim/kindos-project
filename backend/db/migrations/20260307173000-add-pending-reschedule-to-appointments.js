'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const definition = await queryInterface.describeTable('appointments', { transaction });

      if (!definition.pending_reschedule_date) {
        await queryInterface.addColumn(
          'appointments',
          'pending_reschedule_date',
          { type: Sequelize.DATEONLY, allowNull: true },
          { transaction }
        );
      }

      if (!definition.pending_reschedule_start_time) {
        await queryInterface.addColumn(
          'appointments',
          'pending_reschedule_start_time',
          { type: Sequelize.TIME, allowNull: true },
          { transaction }
        );
      }

      if (!definition.pending_reschedule_end_time) {
        await queryInterface.addColumn(
          'appointments',
          'pending_reschedule_end_time',
          { type: Sequelize.TIME, allowNull: true },
          { transaction }
        );
      }

      if (!definition.pending_reschedule_type) {
        await queryInterface.addColumn(
          'appointments',
          'pending_reschedule_type',
          { type: Sequelize.STRING, allowNull: true },
          { transaction }
        );
      }

      if (!definition.pending_reschedule_duration) {
        await queryInterface.addColumn(
          'appointments',
          'pending_reschedule_duration',
          { type: Sequelize.INTEGER, allowNull: true },
          { transaction }
        );
      }

      if (!definition.pending_reschedule_requested_by_role) {
        await queryInterface.addColumn(
          'appointments',
          'pending_reschedule_requested_by_role',
          { type: Sequelize.STRING, allowNull: true },
          { transaction }
        );
      }

      if (!definition.pending_reschedule_previous_status) {
        await queryInterface.addColumn(
          'appointments',
          'pending_reschedule_previous_status',
          { type: Sequelize.STRING, allowNull: true },
          { transaction }
        );
      }

      if (!definition.pending_reschedule_requested_at) {
        await queryInterface.addColumn(
          'appointments',
          'pending_reschedule_requested_at',
          { type: Sequelize.DATE, allowNull: true },
          { transaction }
        );
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const definition = await queryInterface.describeTable('appointments', { transaction });

      if (definition.pending_reschedule_requested_at) {
        await queryInterface.removeColumn('appointments', 'pending_reschedule_requested_at', { transaction });
      }
      if (definition.pending_reschedule_previous_status) {
        await queryInterface.removeColumn('appointments', 'pending_reschedule_previous_status', { transaction });
      }
      if (definition.pending_reschedule_requested_by_role) {
        await queryInterface.removeColumn('appointments', 'pending_reschedule_requested_by_role', { transaction });
      }
      if (definition.pending_reschedule_duration) {
        await queryInterface.removeColumn('appointments', 'pending_reschedule_duration', { transaction });
      }
      if (definition.pending_reschedule_type) {
        await queryInterface.removeColumn('appointments', 'pending_reschedule_type', { transaction });
      }
      if (definition.pending_reschedule_end_time) {
        await queryInterface.removeColumn('appointments', 'pending_reschedule_end_time', { transaction });
      }
      if (definition.pending_reschedule_start_time) {
        await queryInterface.removeColumn('appointments', 'pending_reschedule_start_time', { transaction });
      }
      if (definition.pending_reschedule_date) {
        await queryInterface.removeColumn('appointments', 'pending_reschedule_date', { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
