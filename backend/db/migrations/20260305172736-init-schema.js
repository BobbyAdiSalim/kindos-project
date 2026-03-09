'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.createTable(
        'users',
        {
          id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true,
          },
          username: {
            type: Sequelize.STRING(255),
            allowNull: false,
            unique: true,
          },
          email: {
            type: Sequelize.STRING(255),
            allowNull: false,
            unique: true,
          },
          password: {
            type: Sequelize.STRING(255),
            allowNull: false,
          },
          role: {
            type: Sequelize.ENUM('patient', 'doctor', 'admin'),
            allowNull: false,
          },
          reset_password_token_hash: {
            type: Sequelize.STRING(255),
            allowNull: true,
          },
          reset_password_expires_at: {
            type: Sequelize.DATE,
            allowNull: true,
          },
          reset_password_used_at: {
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

      await queryInterface.createTable(
        'patients',
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
            onUpdate: 'CASCADE',
          },
          full_name: {
            type: Sequelize.STRING(255),
            allowNull: false,
          },
          date_of_birth: {
            type: Sequelize.DATEONLY,
            allowNull: true,
          },
          phone: {
            type: Sequelize.STRING(20),
            allowNull: true,
          },
          address: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          emergency_contact_name: {
            type: Sequelize.STRING(255),
            allowNull: true,
          },
          emergency_contact_phone: {
            type: Sequelize.STRING(20),
            allowNull: true,
          },
          accessibility_preferences: {
            type: Sequelize.ARRAY(Sequelize.STRING),
            allowNull: true,
            defaultValue: [],
          },
          profile_complete: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
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

      await queryInterface.createTable(
        'doctors',
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
            onUpdate: 'CASCADE',
          },
          full_name: {
            type: Sequelize.STRING(255),
            allowNull: false,
          },
          phone: {
            type: Sequelize.STRING(20),
            allowNull: true,
          },
          specialty: {
            type: Sequelize.STRING(100),
            allowNull: false,
          },
          license_number: {
            type: Sequelize.STRING(100),
            allowNull: false,
            unique: true,
          },
          bio: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          languages: {
            type: Sequelize.ARRAY(Sequelize.STRING),
            allowNull: true,
            defaultValue: [],
          },
          clinic_location: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          latitude: {
            type: Sequelize.DECIMAL(10, 8),
            allowNull: true,
          },
          longitude: {
            type: Sequelize.DECIMAL(11, 8),
            allowNull: true,
          },
          virtual_available: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true,
          },
          in_person_available: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true,
          },
          verification_status: {
            type: Sequelize.ENUM('pending', 'approved', 'denied'),
            allowNull: false,
            defaultValue: 'pending',
          },
          verification_documents: {
            type: Sequelize.ARRAY(Sequelize.TEXT),
            allowNull: true,
            defaultValue: [],
          },
          verified_at: {
            type: Sequelize.DATE,
            allowNull: true,
          },
          verified_by: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
              model: 'users',
              key: 'id',
            },
            onUpdate: 'CASCADE',
          },
          profile_complete: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
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

      await queryInterface.createTable(
        'availability_patterns',
        {
          id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true,
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
          day_of_week: {
            type: Sequelize.INTEGER,
            allowNull: false,
          },
          start_time: {
            type: Sequelize.TIME,
            allowNull: false,
          },
          end_time: {
            type: Sequelize.TIME,
            allowNull: false,
          },
          appointment_duration: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 30,
          },
          appointment_type: {
            type: Sequelize.ARRAY(Sequelize.STRING),
            allowNull: true,
            defaultValue: ['virtual', 'in-person'],
          },
          is_active: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true,
          },
          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
        },
        { transaction }
      );

      await queryInterface.addIndex(
        'availability_patterns',
        ['doctor_id', 'day_of_week', 'start_time'],
        {
          unique: true,
          transaction,
        }
      );

      await queryInterface.createTable(
        'availability_slots',
        {
          id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true,
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
          slot_date: {
            type: Sequelize.DATEONLY,
            allowNull: false,
          },
          start_time: {
            type: Sequelize.TIME,
            allowNull: false,
          },
          end_time: {
            type: Sequelize.TIME,
            allowNull: false,
          },
          is_available: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true,
          },
          appointment_type: {
            type: Sequelize.ARRAY(Sequelize.STRING),
            allowNull: true,
            defaultValue: ['virtual', 'in-person'],
          },
          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
        },
        { transaction }
      );

      await queryInterface.addIndex('availability_slots', ['doctor_id', 'slot_date', 'start_time'], {
        unique: true,
        transaction,
      });
      await queryInterface.addIndex('availability_slots', ['doctor_id', 'slot_date'], { transaction });

      await queryInterface.createTable(
        'appointments',
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
          slot_id: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
              model: 'availability_slots',
              key: 'id',
            },
            onUpdate: 'CASCADE',
          },
          appointment_date: {
            type: Sequelize.DATEONLY,
            allowNull: false,
          },
          start_time: {
            type: Sequelize.TIME,
            allowNull: false,
          },
          end_time: {
            type: Sequelize.TIME,
            allowNull: false,
          },
          appointment_type: {
            type: Sequelize.ENUM('virtual', 'in-person'),
            allowNull: false,
          },
          status: {
            type: Sequelize.ENUM('scheduled', 'confirmed', 'completed', 'cancelled', 'no-show'),
            allowNull: false,
            defaultValue: 'scheduled',
          },
          duration: {
            type: Sequelize.INTEGER,
            allowNull: false,
          },
          reason: {
            type: Sequelize.TEXT,
            allowNull: false,
          },
          notes: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          accessibility_needs: {
            type: Sequelize.ARRAY(Sequelize.STRING),
            allowNull: true,
            defaultValue: [],
          },
          summary: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          summary_written_at: {
            type: Sequelize.DATE,
            allowNull: true,
          },
          cancelled_at: {
            type: Sequelize.DATE,
            allowNull: true,
          },
          cancelled_by: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
              model: 'users',
              key: 'id',
            },
            onUpdate: 'CASCADE',
          },
          cancellation_reason: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          notify_on_doctor_approval: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true,
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

      await queryInterface.createTable(
        'messages',
        {
          id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true,
          },
          sender_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: 'users',
              key: 'id',
            },
            onUpdate: 'CASCADE',
          },
          receiver_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: 'users',
              key: 'id',
            },
            onUpdate: 'CASCADE',
          },
          appointment_id: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
              model: 'appointments',
              key: 'id',
            },
            onDelete: 'SET NULL',
            onUpdate: 'CASCADE',
          },
          content: {
            type: Sequelize.TEXT,
            allowNull: false,
          },
          read: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          read_at: {
            type: Sequelize.DATE,
            allowNull: true,
          },
          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
        },
        { transaction }
      );

      await queryInterface.addIndex('messages', ['sender_id'], { transaction });
      await queryInterface.addIndex('messages', ['receiver_id'], { transaction });
      await queryInterface.addIndex('messages', ['sender_id', 'receiver_id'], { transaction });

      await queryInterface.createTable(
        'reviews',
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
          rating: {
            type: Sequelize.INTEGER,
            allowNull: false,
          },
          comment: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          is_anonymous: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
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

      await queryInterface.addIndex('reviews', ['doctor_id'], { transaction });
      await queryInterface.addIndex('reviews', ['doctor_id', 'rating'], { transaction });

      await queryInterface.createTable(
        'questionnaires',
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
          care_type: {
            type: Sequelize.STRING(50),
            allowNull: false,
          },
          urgency: {
            type: Sequelize.STRING(20),
            allowNull: true,
          },
          preferred_appointment_type: {
            type: Sequelize.STRING(20),
            allowNull: true,
          },
          accessibility_needs: {
            type: Sequelize.ARRAY(Sequelize.STRING),
            allowNull: true,
            defaultValue: [],
          },
          description: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          completed_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
        },
        { transaction }
      );

      await queryInterface.createTable(
        'admin_logs',
        {
          id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true,
          },
          admin_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: 'users',
              key: 'id',
            },
            onUpdate: 'CASCADE',
          },
          action_type: {
            type: Sequelize.STRING(50),
            allowNull: false,
          },
          target_doctor_id: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
              model: 'doctors',
              key: 'id',
            },
            onUpdate: 'CASCADE',
          },
          details: {
            type: Sequelize.JSONB,
            allowNull: true,
          },
          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
        },
        { transaction }
      );

      await queryInterface.createTable(
        'connections',
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
            onUpdate: 'CASCADE',
          },
          doctor_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: 'doctors',
              key: 'id',
            },
            onUpdate: 'CASCADE',
          },
          status: {
            type: Sequelize.ENUM('pending', 'accepted', 'rejected'),
            allowNull: false,
            defaultValue: 'pending',
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

      await queryInterface.addIndex('connections', ['patient_id', 'doctor_id'], {
        unique: true,
        transaction,
      });
      await queryInterface.addIndex('connections', ['doctor_id', 'status'], { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.dropTable('connections', { transaction });
      await queryInterface.dropTable('admin_logs', { transaction });
      await queryInterface.dropTable('questionnaires', { transaction });
      await queryInterface.dropTable('reviews', { transaction });
      await queryInterface.dropTable('messages', { transaction });
      await queryInterface.dropTable('appointments', { transaction });
      await queryInterface.dropTable('availability_slots', { transaction });
      await queryInterface.dropTable('availability_patterns', { transaction });
      await queryInterface.dropTable('doctors', { transaction });
      await queryInterface.dropTable('patients', { transaction });
      await queryInterface.dropTable('users', { transaction });

      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_connections_status";', {
        transaction,
      });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_appointments_status";', {
        transaction,
      });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_appointments_appointment_type";', {
        transaction,
      });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_doctors_verification_status";', {
        transaction,
      });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_users_role";', {
        transaction,
      });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
