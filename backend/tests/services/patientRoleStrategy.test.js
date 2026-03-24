import { beforeEach, describe, expect, it, vi } from 'vitest';

const patientFindOne = vi.fn();

vi.mock('../../models/index.js', () => ({
  Patient: { findOne: patientFindOne },
  Doctor: {},
  User: {},
}));

describe('patient role strategy', () => {
  beforeEach(() => {
    vi.resetModules();
    patientFindOne.mockReset();
  });

  it('throws not found errors for missing patient profile', async () => {
    patientFindOne.mockResolvedValue(null);

    const { default: patientRoleStrategy } = await import('../../services/role-strategy/strategies/patientRoleStrategy.js');

    await expect(patientRoleStrategy.getAppointmentScope(1)).rejects.toMatchObject({
      message: 'Patient profile not found.',
      status: 404,
    });
    await expect(patientRoleStrategy.getConnectionScope(1)).rejects.toMatchObject({
      message: 'Patient profile not found.',
      status: 404,
    });
  });

  it('builds private and public profiles with defaults', async () => {
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

  it('returns appointment and connection scopes for existing patient', async () => {
    patientFindOne
      .mockResolvedValueOnce({ id: 31 })
      .mockResolvedValueOnce({ id: 31 });

    const { default: patientRoleStrategy } = await import('../../services/role-strategy/strategies/patientRoleStrategy.js');

    const patientAppointmentScope = await patientRoleStrategy.getAppointmentScope(1001);
    const patientConnectionScope = await patientRoleStrategy.getConnectionScope(1001);

    expect(patientAppointmentScope).toEqual({ patient_id: 31 });
    expect(patientConnectionScope.where).toEqual({ patient_id: 31 });
    expect(patientConnectionScope.include[0]).toEqual(
      expect.objectContaining({ as: 'doctor' })
    );
  });

  it('resolves connection counterpart user id branches', async () => {
    const { default: patientRoleStrategy } = await import('../../services/role-strategy/strategies/patientRoleStrategy.js');

    expect(patientRoleStrategy.getOtherConnectionUserId({ doctor: { user_id: 77 } })).toBe(77);
    expect(patientRoleStrategy.getOtherConnectionUserId({})).toBeNull();
  });
});
