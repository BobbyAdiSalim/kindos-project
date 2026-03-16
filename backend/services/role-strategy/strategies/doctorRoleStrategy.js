import { AdminLog, Doctor, Patient, User } from '../../../models/index.js';

const buildDoctorProfileResponse = (profile, includePrivateFields = false) => {
  if (!profile) return null;

  const base = {
    id: profile.id,
    full_name: profile.full_name,
    specialty: profile.specialty,
    verification_status: profile.verification_status,
    profile_complete: profile.profile_complete,
    time_zone: profile.time_zone || 'America/New_York',
  };

  if (!includePrivateFields) {
    return {
      ...base,
      bio: profile.bio,
      languages: profile.languages || [],
      clinic_location: profile.clinic_location,
      virtual_available: profile.virtual_available,
      in_person_available: profile.in_person_available,
    };
  }

  return {
    ...base,
    phone: profile.phone,
    license_number: profile.license_number,
    bio: profile.bio,
    languages: profile.languages || [],
    clinic_location: profile.clinic_location,
    latitude: profile.latitude,
    longitude: profile.longitude,
    virtual_available: profile.virtual_available,
    in_person_available: profile.in_person_available,
    verification_documents: profile.verification_documents || [],
    verified_at: profile.verified_at,
    verified_by: profile.verified_by,
  };
};

const doctorConnectionInclude = [
  {
    model: Patient,
    as: 'patient',
    attributes: ['id', 'full_name', 'user_id'],
    include: [{ model: User, as: 'user', attributes: ['id', 'username'] }],
  },
];

const doctorRoleStrategy = {
  role: 'doctor',

  async getAppointmentScope(userId) {
    const doctor = await Doctor.findOne({ where: { user_id: userId } });
    if (!doctor) {
      const error = new Error('Doctor profile not found.');
      error.status = 404;
      throw error;
    }

    return { doctor_id: doctor.id };
  },

  async getConnectionScope(userId) {
    const doctor = await Doctor.findOne({ where: { user_id: userId } });
    if (!doctor) {
      const error = new Error('Doctor profile not found.');
      error.status = 404;
      throw error;
    }

    return {
      where: { doctor_id: doctor.id },
      include: doctorConnectionInclude,
    };
  },

  getOtherConnectionUserId(connection) {
    return connection.patient?.user_id || null;
  },

  async buildPrivateProfile(userId) {
    const doctor = await Doctor.findOne({ where: { user_id: userId } });
    let profile = buildDoctorProfileResponse(doctor, true);

    if (doctor && doctor.verification_status === 'denied') {
      const latestDenial = await AdminLog.findOne({
        where: {
          action_type: 'doctor_denied',
          target_doctor_id: doctor.id,
        },
        order: [['created_at', 'DESC']],
      });

      profile = {
        ...(profile || {}),
        rejection_reason: latestDenial?.details?.reason || null,
      };
    }

    return profile;
  },

  async buildPublicProfile(userId) {
    const doctor = await Doctor.findOne({ where: { user_id: userId } });
    return buildDoctorProfileResponse(doctor, false);
  },
};

export default doctorRoleStrategy;
