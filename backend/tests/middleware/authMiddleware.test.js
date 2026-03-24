import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockReq, createMockRes } from '../helpers/mockReqRes.js';

const verifyMock = vi.fn();
const findByPkMock = vi.fn();

vi.mock('jsonwebtoken', () => ({
  default: {
    verify: verifyMock,
  },
}));

vi.mock('../../models/index.js', () => ({
  User: {
    findByPk: findByPkMock,
  },
}));

describe('auth middleware', () => {
  beforeEach(() => {
    verifyMock.mockReset();
    findByPkMock.mockReset();
  });

  it('requireAuth accepts bearer token and sets req.auth', async () => {
    const { requireAuth } = await import('../../middleware/auth.js');
    const req = createMockReq({ headers: { authorization: 'Bearer token-123' } });
    const res = createMockRes();
    const next = vi.fn();

    verifyMock.mockReturnValue({ userId: 11 });
    findByPkMock.mockResolvedValue({ id: 11, role: 'patient' });

    await requireAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.auth).toEqual({ userId: 11, role: 'patient' });
  });

  it('requireAuth accepts cookie token when authorization header is absent', async () => {
    const { requireAuth } = await import('../../middleware/auth.js');
    const req = createMockReq({ headers: { cookie: 'foo=bar; utlwa_auth=cookie-token' } });
    const res = createMockRes();
    const next = vi.fn();

    verifyMock.mockReturnValue({ userId: 21 });
    findByPkMock.mockResolvedValue({ id: 21, role: 'doctor' });

    await requireAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.auth.role).toBe('doctor');
  });

  it('requireAuth returns 401 for missing token, unknown user, and invalid token', async () => {
    const { requireAuth } = await import('../../middleware/auth.js');

    const noTokenRes = createMockRes();
    await requireAuth(createMockReq({ headers: {} }), noTokenRes, vi.fn());
    expect(noTokenRes.status).toHaveBeenCalledWith(401);

    verifyMock.mockReturnValue({ userId: 55 });
    findByPkMock.mockResolvedValue(null);
    const noUserRes = createMockRes();
    await requireAuth(createMockReq({ headers: { authorization: 'Bearer nope' } }), noUserRes, vi.fn());
    expect(noUserRes.status).toHaveBeenCalledWith(401);

    verifyMock.mockImplementation(() => {
      throw new Error('bad token');
    });
    const invalidRes = createMockRes();
    await requireAuth(createMockReq({ headers: { authorization: 'Bearer bad' } }), invalidRes, vi.fn());
    expect(invalidRes.status).toHaveBeenCalledWith(401);
  });

  it('requireRole validates auth and role membership', async () => {
    const { requireRole } = await import('../../middleware/auth.js');

    const roleGuard = requireRole('admin', 'doctor');

    const noAuthRes = createMockRes();
    roleGuard(createMockReq({ auth: null }), noAuthRes, vi.fn());
    expect(noAuthRes.status).toHaveBeenCalledWith(401);

    const forbiddenRes = createMockRes();
    roleGuard(createMockReq({ auth: { role: 'patient' } }), forbiddenRes, vi.fn());
    expect(forbiddenRes.status).toHaveBeenCalledWith(403);

    const next = vi.fn();
    roleGuard(createMockReq({ auth: { role: 'doctor' } }), createMockRes(), next);
    expect(next).toHaveBeenCalled();
  });
});
