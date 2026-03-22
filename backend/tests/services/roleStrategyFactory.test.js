const patientFindOne = vi.fn();
const doctorFindOne = vi.fn();
const adminLogFindOne = vi.fn();

vi.mock('../../models/index.js', () => ({
  Patient: { findOne: patientFindOne },
  Doctor: { findOne: doctorFindOne },
  AdminLog: { findOne: adminLogFindOne },
  User: {},
}));

describe('role strategy factory', () => {
  beforeEach(() => {
    vi.resetModules();
    patientFindOne.mockReset();
    doctorFindOne.mockReset();
    adminLogFindOne.mockReset();
  });

  it('returns patient strategy and resolves appointment scope', async () => {
    patientFindOne.mockResolvedValue({ id: 44 });
    const { getRoleStrategy } = await import('../../services/role-strategy/index.js');

    const strategy = getRoleStrategy('patient');
    const scope = await strategy.getAppointmentScope(9);

    expect(strategy.role).toBe('patient');
    expect(scope).toEqual({ patient_id: 44 });
  });

  it('returns doctor strategy and resolves connection scope', async () => {
    doctorFindOne.mockResolvedValue({ id: 77 });
    const { getRoleStrategy } = await import('../../services/role-strategy/roleStrategyFactory.js');

    const strategy = getRoleStrategy('doctor');
    const scope = await strategy.getConnectionScope(11);

    expect(strategy.role).toBe('doctor');
    expect(scope.where).toEqual({ doctor_id: 77 });
    expect(Array.isArray(scope.include)).toBe(true);
  });

  it('returns admin strategy and keeps non-profile methods restricted', async () => {
    const { getRoleStrategy } = await import('../../services/role-strategy/roleStrategyFactory.js');
    const strategy = getRoleStrategy('admin');

    expect(strategy.role).toBe('admin');
    await expect(strategy.getAppointmentScope()).rejects.toMatchObject({
      message: 'Unsupported role for appointment access.',
      status: 403,
    });
    expect(strategy.getOtherConnectionUserId({})).toBeNull();
    await expect(strategy.buildPrivateProfile()).resolves.toBeNull();
    await expect(strategy.buildPublicProfile()).resolves.toBeNull();
  });

  it('throws 403 for unsupported roles', async () => {
    const { getRoleStrategy } = await import('../../services/role-strategy/roleStrategyFactory.js');

    expect(() => getRoleStrategy('guest')).toThrow('Unsupported role.');
    expect(() => getRoleStrategy('guest')).toThrow(expect.objectContaining({ status: 403 }));
  });
});
