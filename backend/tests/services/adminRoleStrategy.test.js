import { describe, expect, it } from 'vitest';
import adminRoleStrategy from '../../services/role-strategy/strategies/adminRoleStrategy.js';

describe('admin role strategy', () => {
  it('returns null for non-applicable helpers', async () => {
    expect(adminRoleStrategy.getOtherConnectionUserId()).toBeNull();
    await expect(adminRoleStrategy.buildPrivateProfile()).resolves.toBeNull();
    await expect(adminRoleStrategy.buildPublicProfile()).resolves.toBeNull();
  });

  it('throws 403 for unsupported admin operations', async () => {
    await expect(adminRoleStrategy.getAppointmentScope()).rejects.toMatchObject({ status: 403 });
    await expect(adminRoleStrategy.getConnectionScope()).rejects.toMatchObject({ status: 403 });
  });
});
