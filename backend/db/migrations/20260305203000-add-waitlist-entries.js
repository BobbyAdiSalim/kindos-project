'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const [tableRows] = await queryInterface.sequelize.query(
        "SELECT to_regclass('public.waitlist_entries') AS table_name",
        { transaction }
      );
      const tableExists = Boolean(tableRows?.[0]?.table_name);

      if (!tableExists) {
        await queryInterface.createTable(
          'waitlist_entries',
          {
            id: {
              type: Sequelize.INTEGER,
              allowNull: false,
              primaryKey: true,
              autoIncrement: true,
            },
            patient_id: {
              type: Sequelize.INTEGER,
              allowNull: false,
              references: {
                model: 'patients',
                key: 'id',
              },
              onDelete: 'CASCADE',
              onUpdate: 'CASCADE',
            },
            doctor_id: {
              type: Sequelize.INTEGER,
              allowNull: false,
              references: {
                model: 'doctors',
                key: 'id',
              },
              onDelete: 'CASCADE',
              onUpdate: 'CASCADE',
            },
            desired_date: {
              type: Sequelize.DATEONLY,
              allowNull: false,
            },
            desired_start_time: {
              type: Sequelize.TIME,
              allowNull: false,
            },
            desired_end_time: {
              type: Sequelize.TIME,
              allowNull: false,
            },
            appointment_type: {
              type: Sequelize.ENUM('virtual', 'in-person'),
              allowNull: false,
            },
            notification_preference: {
              type: Sequelize.ENUM('email', 'sms', 'both', 'in-app'),
              allowNull: false,
              defaultValue: 'in-app',
            },
            status: {
              type: Sequelize.ENUM('active', 'notified', 'booked', 'removed'),
              allowNull: false,
              defaultValue: 'active',
            },
            last_notified_at: {
              type: Sequelize.DATE,
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
      } else {
        const [columnRows] = await queryInterface.sequelize.query(
          `
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'waitlist_entries'
          `,
          { transaction }
        );

        const existingColumns = new Set(columnRows.map((row) => row.column_name));

        if (!existingColumns.has('desired_start_time')) {
          await queryInterface.addColumn(
            'waitlist_entries',
            'desired_start_time',
            {
              type: Sequelize.TIME,
              allowNull: false,
              defaultValue: '00:00:00',
            },
            { transaction }
          );
        }

        if (!existingColumns.has('desired_end_time')) {
          await queryInterface.addColumn(
            'waitlist_entries',
            'desired_end_time',
            {
              type: Sequelize.TIME,
              allowNull: false,
              defaultValue: '00:30:00',
            },
            { transaction }
          );
        }

        await queryInterface.sequelize.query(
          `
            UPDATE public.waitlist_entries
            SET
              desired_start_time = COALESCE(desired_start_time, '00:00:00'::time),
              desired_end_time = COALESCE(desired_end_time, '00:30:00'::time)
            WHERE desired_start_time IS NULL OR desired_end_time IS NULL
          `,
          { transaction }
        );
      }

      await queryInterface.sequelize.query(
        `
          CREATE INDEX IF NOT EXISTS waitlist_entries_slot_status_idx
          ON public.waitlist_entries (
            doctor_id,
            desired_date,
            desired_start_time,
            appointment_type,
            status
          )
        `,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `
          CREATE UNIQUE INDEX IF NOT EXISTS waitlist_entries_unique_patient_doctor_date_type
          ON public.waitlist_entries (
            patient_id,
            doctor_id,
            desired_date,
            desired_start_time,
            desired_end_time,
            appointment_type
          )
        `,
        { transaction }
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
      await queryInterface.dropTable('waitlist_entries', { transaction });
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_waitlist_entries_status";',
        { transaction }
      );
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_waitlist_entries_notification_preference";',
        { transaction }
      );
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_waitlist_entries_appointment_type";',
        { transaction }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
