'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.addConstraint('reviews', {
      fields: ['patient_id', 'doctor_id'],
      type: 'unique',
      name: 'reviews_unique_patient_doctor',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint('reviews', 'reviews_unique_patient_doctor');
  },
};
