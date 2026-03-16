'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const [tableRows] = await queryInterface.sequelize.query(
        "SELECT to_regclass('public.doctors') AS table_name",
        { transaction }
      );
      const tableExists = Boolean(tableRows?.[0]?.table_name);
      if (!tableExists) {
        await transaction.commit();
        return;
      }

      const [columnRows] = await queryInterface.sequelize.query(
        `
          SELECT column_name
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'doctors'
        `,
        { transaction }
      );
      const existingColumns = new Set(columnRows.map((row) => row.column_name));

      if (!existingColumns.has('time_zone')) {
        await queryInterface.addColumn(
          'doctors',
          'time_zone',
          {
            type: Sequelize.STRING(64),
            allowNull: true,
            comment: 'IANA time zone identifier (e.g., America/Toronto)',
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
      const [tableRows] = await queryInterface.sequelize.query(
        "SELECT to_regclass('public.doctors') AS table_name",
        { transaction }
      );
      const tableExists = Boolean(tableRows?.[0]?.table_name);
      if (!tableExists) {
        await transaction.commit();
        return;
      }

      const [columnRows] = await queryInterface.sequelize.query(
        `
          SELECT column_name
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'doctors'
        `,
        { transaction }
      );
      const existingColumns = new Set(columnRows.map((row) => row.column_name));

      if (existingColumns.has('time_zone')) {
        await queryInterface.removeColumn('doctors', 'time_zone', { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
