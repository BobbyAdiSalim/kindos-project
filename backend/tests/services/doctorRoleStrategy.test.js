import { beforeEach, describe, expect, it, vi } from 'vitest';

const doctorFindOne = vi.fn();
const adminLogFindOne = vi.fn();

vi.mock('../../models/index.js', () => ({
  Doctor: { findOne: doctorFindOne },
  AdminLog: { findOne: adminLogFindOne },
  Patient: {},
  User: {},
}));

describe('doctor role strategy', () => {
  beforeEach(() => {
    vi.resetModules();
    doctorFindOne.mockReset();
    adminLogFindOne.mockReset();
  });

  it('throws not found errors for missing doctor profile', async () => {
    doctorFindOne.mockResolvedValue(null);

    const { default: doctorRoleStrategy } = await import('../../services/role-strategy/strategies/doctorRoleStrategy.js');

    await expect(doctorRoleStrategy.getAppointmentScope(1)).rejects.toMatchObject({
      message: 'Doctor profile not found.',
      status: 404,
    });
    await expect(doctorRoleStrategy.getConnectionScope(1)).rejects.toMatchObject({
      message: 'Doctor profile not found.',
      status: 404,
    });
  });

  it('builds denied doctor profile with rejection reason and public profile fields', async () => {
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
  });

  it('returns appointment and connection scopes for existing doctor', async () => {
    doctorFindOne
      .mockResolvedValueOnce({ id: 42 })
      .mockResolvedValueOnce({ id: 42 });

    const { default: doctorRoleStrategy } = await import('../../services/role-strategy/strategies/doctorRoleStrategy.js');

    const doctorAppointmentScope = await doctorRoleStrategy.getAppointmentScope(2002);
    const doctorConnectionScope = await doctorRoleStrategy.getConnectionScope(2002);

    expect(doctorAppointmentScope).toEqual({ doctor_id: 42 });
    expect(doctorConnectionScope.where).toEqual({ doctor_id: 42 });
    expect(doctorConnectionScope.include[0]).toEqual(
      expect.objectContaining({ as: 'patient' })
    );
  });

  it('resolves connection counterpart user id branches', async () => {
    const { default: doctorRoleStrategy } = await import('../../services/role-strategy/strategies/doctorRoleStrategy.js');

    expect(doctorRoleStrategy.getOtherConnectionUserId({ patient: { user_id: 20 } })).toBe(20);
    expect(doctorRoleStrategy.getOtherConnectionUserId({})).toBeNull();
  });
});
