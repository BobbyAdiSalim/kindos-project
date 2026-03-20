const patientFindOne = vi.fn();
const doctorFindOne = vi.fn();
const adminLogFindOne = vi.fn();

vi.mock('../../models/index.js', () => ({
  Patient: { findOne: patientFindOne },
  Doctor: { findOne: doctorFindOne },
  AdminLog: { findOne: adminLogFindOne },
  User: {},
}));

describe('patient and doctor role strategies', () => {
  beforeEach(() => {
    vi.resetModules();
    patientFindOne.mockReset();
    doctorFindOne.mockReset();
    adminLogFindOne.mockReset();
  });

  it('throws not found errors for missing patient/doctor profiles', async () => {
    patientFindOne.mockResolvedValue(null);
    doctorFindOne.mockResolvedValue(null);

    const { default: patientRoleStrategy } = await import('../../services/role-strategy/strategies/patientRoleStrategy.js');
    const { default: doctorRoleStrategy } = await import('../../services/role-strategy/strategies/doctorRoleStrategy.js');

    await expect(patientRoleStrategy.getAppointmentScope(1)).rejects.toMatchObject({
      message: 'Patient profile not found.',
      status: 404,
    });
    await expect(doctorRoleStrategy.getConnectionScope(1)).rejects.toMatchObject({
      message: 'Doctor profile not found.',
      status: 404,
    });
  });

  it('builds private and public patient profiles with defaults', async () => {
    patientFindOne
      .mockResolvedValueOnce({
        id: 5,
        full_name: 'Patient One',
        profile_complete: false,
        time_zone: null,
        date_of_birth: '2000-01-01',
        phone: '123',
        address: 'Main',
        emergency_contact_name: 'EC',
        emergency_contact_phone: '456',
        accessibility_preferences: null,
      })
      .mockResolvedValueOnce({
        id: 5,
        full_name: 'Patient One',
        profile_complete: false,
        time_zone: null,
      });

    const { default: patientRoleStrategy } = await import('../../services/role-strategy/strategies/patientRoleStrategy.js');

    const privateProfile = await patientRoleStrategy.buildPrivateProfile(3);
    const publicProfile = await patientRoleStrategy.buildPublicProfile(3);

    expect(privateProfile).toEqual(
      expect.objectContaining({
        time_zone: 'America/New_York',
        accessibility_preferences: [],
      })
    );
    expect(publicProfile).toEqual(
      expect.objectContaining({
        full_name: 'Patient One',
        time_zone: 'America/New_York',
      })
    );
  });

  it('builds doctor denied profile with rejection reason and resolves other user ids', async () => {
    doctorFindOne
      .mockResolvedValueOnce({
        id: 10,
        full_name: 'Doctor One',
        specialty: 'Cardiology',
        verification_status: 'denied',
        profile_complete: true,
        time_zone: 'America/Chicago',
        phone: null,
        license_number: 'ABCD',
        bio: null,
        languages: null,
        clinic_location: null,
        latitude: null,
        longitude: null,
        virtual_available: true,
        in_person_available: true,
        verification_documents: null,
        verified_at: null,
        verified_by: null,
      })
      .mockResolvedValueOnce({
        id: 10,
        full_name: 'Doctor One',
        specialty: 'Cardiology',
        verification_status: 'approved',
        profile_complete: true,
        time_zone: 'America/Chicago',
        bio: 'Bio',
        languages: ['en'],
        clinic_location: 'Clinic',
        virtual_available: true,
        in_person_available: true,
      });
    adminLogFindOne.mockResolvedValue({ details: { reason: 'Missing docs' } });

    const { default: doctorRoleStrategy } = await import('../../services/role-strategy/strategies/doctorRoleStrategy.js');

    const privateProfile = await doctorRoleStrategy.buildPrivateProfile(8);
    const publicProfile = await doctorRoleStrategy.buildPublicProfile(8);

    expect(privateProfile).toEqual(
      expect.objectContaining({
        rejection_reason: 'Missing docs',
        verification_documents: [],
      })
    );
    expect(publicProfile).toEqual(
      expect.objectContaining({
        bio: 'Bio',
      })
    );

    expect(doctorRoleStrategy.getOtherConnectionUserId({ patient: { user_id: 20 } })).toBe(20);
    expect(doctorRoleStrategy.getOtherConnectionUserId({})).toBeNull();
  });
});
