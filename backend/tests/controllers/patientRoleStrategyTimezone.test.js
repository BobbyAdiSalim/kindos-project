const patientFindOne = vi.fn();

vi.mock('../../models/index.js', () => ({
  Patient: {
    findOne: patientFindOne,
  },
  Doctor: {},
  User: {},
}));

describe('patientRoleStrategy timezone', () => {
  beforeEach(() => {
    vi.resetModules();
    patientFindOne.mockReset();
  });

  it('returns patient private profile with time_zone', async () => {
    patientFindOne.mockResolvedValue({
      id: 10,
      full_name: 'Patient TZ',
      profile_complete: true,
      time_zone: 'Europe/Berlin',
      date_of_birth: null,
      phone: null,
      address: null,
      emergency_contact_name: null,
      emergency_contact_phone: null,
      accessibility_preferences: [],
    });

    const { default: patientRoleStrategy } = await import(
      '../../services/role-strategy/strategies/patientRoleStrategy.js'
    );

    const profile = await patientRoleStrategy.buildPrivateProfile(7);

    expect(profile).toEqual(
      expect.objectContaining({
        time_zone: 'Europe/Berlin',
      })
    );
  });

  it('falls back to ET when profile time_zone is missing', async () => {
    patientFindOne.mockResolvedValue({
      id: 11,
      full_name: 'Patient Default',
      profile_complete: false,
      time_zone: null,
      date_of_birth: null,
      phone: null,
      address: null,
      emergency_contact_name: null,
      emergency_contact_phone: null,
      accessibility_preferences: [],
    });

    const { default: patientRoleStrategy } = await import(
      '../../services/role-strategy/strategies/patientRoleStrategy.js'
    );

    const profile = await patientRoleStrategy.buildPrivateProfile(8);

    expect(profile).toEqual(
      expect.objectContaining({
        time_zone: 'America/New_York',
      })
    );
  });
});

