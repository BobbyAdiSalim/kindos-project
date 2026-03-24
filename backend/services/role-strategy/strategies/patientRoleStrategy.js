/* Strategy for User's Role [PATIENT]

Strategy design pattern is used here because the app have multiple different roles
and in most part of our code require us to call functions based on the role.

Instead of having a big if-else statement everytime, we use Strategy and Factory 
(check roleStrategyFactory.js) to get the role and its functionalities.

The purpose of this factory and strategies are to encapsulate those role checking 
and functions call ensuring consistency throughout all codes that require role 
functionalities.

Extensibility and Maintainability:
- Adding a new role (strategy) should include the following functions (INTERFACE):
  - getAppointmentScope(userId)
  - getConnectionScope(userId)
  - getOtherConnectionUserId(connection)
  - buildPrivateProfile(userId)
  - buildPublicProfile(userId)
*/

import { Patient, Doctor, User } from '../../../models/index.js';

const buildPatientProfileResponse = (profile, includePrivateFields = false) => {
  if (!profile) return null;

  const base = {
    id: profile.id,
    full_name: profile.full_name,
    profile_complete: profile.profile_complete,
    time_zone: profile.time_zone || 'America/New_York',
  };

  if (!includePrivateFields) {
    return base;
  }

  return {
    ...base,
    date_of_birth: profile.date_of_birth,
    phone: profile.phone,
    address: profile.address,
    emergency_contact_name: profile.emergency_contact_name,
    emergency_contact_phone: profile.emergency_contact_phone,
    accessibility_preferences: profile.accessibility_preferences || [],
  };
};

const patientConnectionInclude = [
  {
    model: Doctor,
    as: 'doctor',
    attributes: ['id', 'full_name', 'specialty', 'user_id'],
    include: [{ model: User, as: 'user', attributes: ['id', 'username'] }],
  },
];

const patientRoleStrategy = {
  role: 'patient',

  async getAppointmentScope(userId) {
    const patient = await Patient.findOne({ where: { user_id: userId } });
    if (!patient) {
      const error = new Error('Patient profile not found.');
      error.status = 404;
      throw error;
    }

    return { patient_id: patient.id };
  },

  async getConnectionScope(userId) {
    const patient = await Patient.findOne({ where: { user_id: userId } });
    if (!patient) {
      const error = new Error('Patient profile not found.');
      error.status = 404;
      throw error;
    }

    return {
      where: { patient_id: patient.id },
      include: patientConnectionInclude,
    };
  },

  getOtherConnectionUserId(connection) {
    return connection.doctor?.user_id || null;
  },

  async buildPrivateProfile(userId) {
    const patient = await Patient.findOne({ where: { user_id: userId } });
    return buildPatientProfileResponse(patient, true);
  },

  async buildPublicProfile(userId) {
    const patient = await Patient.findOne({ where: { user_id: userId } });
    return buildPatientProfileResponse(patient, false);
  },
};

export default patientRoleStrategy;
