'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const table = await queryInterface.describeTable('reviews');

      if (table.appointment_id) {
        await queryInterface.removeColumn('reviews', 'appointment_id', { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const table = await queryInterface.describeTable('reviews');

      if (!table.appointment_id) {
        await queryInterface.addColumn(
          'reviews',
          'appointment_id',
          {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
              model: 'appointments',
              key: 'id',
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
          },
          { transaction }
        );

        await queryInterface.addConstraint('reviews', {
          fields: ['appointment_id'],
          type: 'unique',
          name: 'reviews_appointment_id_key',
          transaction,
        });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
