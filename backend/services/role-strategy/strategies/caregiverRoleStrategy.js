import { Caregiver, CaregiverPatient } from '../../../models/index.js';

const buildCaregiverProfileResponse = (profile, includePrivateFields = false) => {
  if (!profile) return null;

  const base = {
    id: profile.id,
    full_name: profile.full_name,
    time_zone: profile.time_zone || 'America/New_York',
  };

  if (!includePrivateFields) {
    return base;
  }

  return {
    ...base,
    phone: profile.phone,
  };
};

const caregiverRoleStrategy = {
  role: 'caregiver',

  async getAppointmentScope(userId) {
    const caregiver = await Caregiver.findOne({ where: { user_id: userId } });
    if (!caregiver) {
      const error = new Error('Caregiver profile not found.');
      error.status = 404;
      throw error;
    }

    const links = await CaregiverPatient.findAll({
      where: { caregiver_id: caregiver.id, status: 'approved' },
      attributes: ['patient_id'],
    });

    const patientIds = links.map((l) => l.patient_id);
    return { patient_id: patientIds };
  },

  async getConnectionScope() {
    return { where: { id: null }, include: [] };
  },

  getOtherConnectionUserId() {
    return null;
  },

  async buildPrivateProfile(userId) {
    const caregiver = await Caregiver.findOne({ where: { user_id: userId } });
    return buildCaregiverProfileResponse(caregiver, true);
  },

  async buildPublicProfile(userId) {
    const caregiver = await Caregiver.findOne({ where: { user_id: userId } });
    return buildCaregiverProfileResponse(caregiver, false);
  },
};

export default caregiverRoleStrategy;
