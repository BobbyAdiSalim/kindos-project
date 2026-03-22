'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const definition = await queryInterface.describeTable('connections', { transaction });

      if (definition.status) {
        await queryInterface.removeColumn('connections', 'status', { transaction });
      }

      // Drop the enum type created by Sequelize
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_connections_status"',
        { transaction }
      );

      // Remove the (doctor_id, status) index since status no longer exists
      try {
        await queryInterface.removeIndex('connections', ['doctor_id', 'status'], { transaction });
      } catch {
        // Index may not exist — safe to ignore
      }

      // Delete any duplicate connections (keep earliest) before the unique constraint is relied upon
      await queryInterface.sequelize.query(
        `DELETE FROM connections WHERE id NOT IN (
          SELECT MIN(id) FROM connections GROUP BY patient_id, doctor_id
        )`,
        { transaction }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const definition = await queryInterface.describeTable('connections', { transaction });

      if (!definition.status) {
        await queryInterface.addColumn(
          'connections',
          'status',
          {
            type: Sequelize.ENUM('pending', 'accepted', 'rejected'),
            allowNull: false,
            defaultValue: 'accepted',
          },
          { transaction }
        );

        await queryInterface.addIndex('connections', ['doctor_id', 'status'], { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
