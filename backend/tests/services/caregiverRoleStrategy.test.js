import { describe, it, expect, beforeEach, vi } from 'vitest';

const caregiverFindOne = vi.fn();
const caregiverPatientFindAll = vi.fn();

vi.mock('../../models/index.js', () => ({
  Caregiver: { findOne: (...args) => caregiverFindOne(...args) },
  CaregiverPatient: { findAll: (...args) => caregiverPatientFindAll(...args) },
}));

describe('caregiverRoleStrategy', () => {
  let strategy;

  beforeEach(async () => {
    caregiverFindOne.mockReset();
    caregiverPatientFindAll.mockReset();
    const mod = await import('../../services/role-strategy/strategies/caregiverRoleStrategy.js');
    strategy = mod.default;
  });

  it('has role set to caregiver', () => {
    expect(strategy.role).toBe('caregiver');
  });

  describe('getAppointmentScope', () => {
    it('returns patient_id array from approved links', async () => {
      caregiverFindOne.mockResolvedValue({ id: 10 });
      caregiverPatientFindAll.mockResolvedValue([
        { patient_id: 20 },
        { patient_id: 21 },
      ]);

      const scope = await strategy.getAppointmentScope(1);

      expect(scope).toEqual({ patient_id: [20, 21] });
      expect(caregiverPatientFindAll).toHaveBeenCalledWith({
        where: { caregiver_id: 10, status: 'approved' },
        attributes: ['patient_id'],
      });
    });

    it('returns empty array when no linked patients', async () => {
      caregiverFindOne.mockResolvedValue({ id: 10 });
      caregiverPatientFindAll.mockResolvedValue([]);

      const scope = await strategy.getAppointmentScope(1);

      expect(scope).toEqual({ patient_id: [] });
    });

    it('throws 404 when caregiver profile not found', async () => {
      caregiverFindOne.mockResolvedValue(null);

      await expect(strategy.getAppointmentScope(1)).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('getConnectionScope', () => {
    it('returns scope that matches nothing', async () => {
      const scope = await strategy.getConnectionScope();

      expect(scope.where).toEqual({ id: null });
    });
  });

  describe('getOtherConnectionUserId', () => {
    it('returns null', () => {
      expect(strategy.getOtherConnectionUserId()).toBeNull();
    });
  });

  describe('buildPrivateProfile', () => {
    it('returns profile with phone', async () => {
      caregiverFindOne.mockResolvedValue({
        id: 10,
        full_name: 'Jane Doe',
        time_zone: 'America/Chicago',
        phone: '555-1234',
      });

      const profile = await strategy.buildPrivateProfile(1);

      expect(profile).toEqual({
        id: 10,
        full_name: 'Jane Doe',
        time_zone: 'America/Chicago',
        phone: '555-1234',
      });
    });

    it('returns null when caregiver not found', async () => {
      caregiverFindOne.mockResolvedValue(null);

      const profile = await strategy.buildPrivateProfile(1);

      expect(profile).toBeNull();
    });
  });

  describe('buildPublicProfile', () => {
    it('returns profile without phone', async () => {
      caregiverFindOne.mockResolvedValue({
        id: 10,
        full_name: 'Jane Doe',
        time_zone: 'America/Chicago',
        phone: '555-1234',
      });

      const profile = await strategy.buildPublicProfile(1);

      expect(profile).toEqual({
        id: 10,
        full_name: 'Jane Doe',
        time_zone: 'America/Chicago',
      });
      expect(profile).not.toHaveProperty('phone');
    });

    it('defaults time_zone to America/New_York', async () => {
      caregiverFindOne.mockResolvedValue({
        id: 10,
        full_name: 'Jane Doe',
        time_zone: null,
      });

      const profile = await strategy.buildPublicProfile(1);

      expect(profile.time_zone).toBe('America/New_York');
    });
  });
});
