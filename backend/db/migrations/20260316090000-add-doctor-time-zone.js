'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('doctors', 'time_zone', {
      type: Sequelize.STRING(100),
      allowNull: false,
      defaultValue: 'America/New_York',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('doctors', 'time_zone');
  },
};
