'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const tableDefinition = await queryInterface.describeTable('availability_slots', { transaction });

      if (!tableDefinition.appointment_duration) {
        await queryInterface.addColumn(
          'availability_slots',
          'appointment_duration',
          {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 30,
            comment: 'Duration in minutes for interval generation',
          },
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
      const tableDefinition = await queryInterface.describeTable('availability_slots', { transaction });
      if (tableDefinition.appointment_duration) {
        await queryInterface.removeColumn('availability_slots', 'appointment_duration', { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
