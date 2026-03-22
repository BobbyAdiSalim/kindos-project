'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const definition = await queryInterface.describeTable('messages', { transaction });

      // Allow content to be null (for file-only messages)
      if (definition.content && !definition.content.allowNull) {
        await queryInterface.changeColumn(
          'messages',
          'content',
          { type: Sequelize.TEXT, allowNull: true },
          { transaction }
        );
      }

      if (!definition.file_url) {
        await queryInterface.addColumn(
          'messages',
          'file_url',
          { type: Sequelize.STRING, allowNull: true },
          { transaction }
        );
      }

      if (!definition.file_name) {
        await queryInterface.addColumn(
          'messages',
          'file_name',
          { type: Sequelize.STRING, allowNull: true },
          { transaction }
        );
      }

      if (!definition.file_size) {
        await queryInterface.addColumn(
          'messages',
          'file_size',
          { type: Sequelize.INTEGER, allowNull: true },
          { transaction }
        );
      }

      if (!definition.file_type) {
        await queryInterface.addColumn(
          'messages',
          'file_type',
          { type: Sequelize.STRING, allowNull: true },
          { transaction }
        );
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
      const definition = await queryInterface.describeTable('messages', { transaction });

      if (definition.file_type) {
        await queryInterface.removeColumn('messages', 'file_type', { transaction });
      }
      if (definition.file_size) {
        await queryInterface.removeColumn('messages', 'file_size', { transaction });
      }
      if (definition.file_name) {
        await queryInterface.removeColumn('messages', 'file_name', { transaction });
      }
      if (definition.file_url) {
        await queryInterface.removeColumn('messages', 'file_url', { transaction });
      }

      // Revert content back to NOT NULL
      await queryInterface.changeColumn(
        'messages',
        'content',
        { type: Sequelize.TEXT, allowNull: false },
        { transaction }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
