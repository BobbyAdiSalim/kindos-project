'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const definition = await queryInterface.describeTable('appointments', { transaction });
      if (!definition.notify_on_doctor_approval) {
        await queryInterface.addColumn(
          'appointments',
          'notify_on_doctor_approval',
          {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true,
            comment: 'Whether patient should receive an email when doctor confirms appointment',
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
      const definition = await queryInterface.describeTable('appointments', { transaction });
      if (definition.notify_on_doctor_approval) {
        await queryInterface.removeColumn('appointments', 'notify_on_doctor_approval', { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
