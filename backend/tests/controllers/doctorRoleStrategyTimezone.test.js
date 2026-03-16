const doctorFindOne = vi.fn();
const adminLogFindOne = vi.fn();

vi.mock('../../models/index.js', () => ({
  Doctor: {
    findOne: doctorFindOne,
  },
  AdminLog: {
    findOne: adminLogFindOne,
  },
  Patient: {},
  User: {},
}));

describe('doctorRoleStrategy timezone', () => {
  beforeEach(() => {
    vi.resetModules();
    doctorFindOne.mockReset();
    adminLogFindOne.mockReset();
    adminLogFindOne.mockResolvedValue(null);
  });

  it('returns doctor private profile with time_zone', async () => {
    doctorFindOne.mockResolvedValue({
      id: 3,
      full_name: 'Dr TZ',
      specialty: 'Cardiology',
      verification_status: 'approved',
      profile_complete: true,
      time_zone: 'America/Anchorage',
      phone: null,
      license_number: 'ABC',
      bio: null,
      languages: [],
      clinic_location: null,
      latitude: null,
      longitude: null,
      virtual_available: true,
      in_person_available: true,
      verification_documents: [],
      verified_at: null,
      verified_by: null,
    });

    const { default: doctorRoleStrategy } = await import(
      '../../services/role-strategy/strategies/doctorRoleStrategy.js'
    );

    const profile = await doctorRoleStrategy.buildPrivateProfile(9);

    expect(profile).toEqual(
      expect.objectContaining({
        time_zone: 'America/Anchorage',
      })
    );
  });

  it('falls back to ET when doctor time_zone is missing', async () => {
    doctorFindOne.mockResolvedValue({
      id: 4,
      full_name: 'Dr Default',
      specialty: 'Dermatology',
      verification_status: 'approved',
      profile_complete: false,
      time_zone: null,
      phone: null,
      license_number: 'DEF',
      bio: null,
      languages: [],
      clinic_location: null,
      latitude: null,
      longitude: null,
      virtual_available: true,
      in_person_available: true,
      verification_documents: [],
      verified_at: null,
      verified_by: null,
    });

    const { default: doctorRoleStrategy } = await import(
      '../../services/role-strategy/strategies/doctorRoleStrategy.js'
    );

    const profile = await doctorRoleStrategy.buildPublicProfile(10);

    expect(profile).toEqual(
      expect.objectContaining({
        time_zone: 'America/New_York',
      })
    );
  });
});

