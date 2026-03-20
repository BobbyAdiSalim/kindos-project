import { createMockReq, createMockRes } from '../helpers/mockReqRes.js';

const userFindOne = vi.fn();
const userFindByPk = vi.fn();
const userUpdate = vi.fn();
const userCreate = vi.fn();
const sequelizeTransaction = vi.fn();

const patientFindOne = vi.fn();
const doctorFindOne = vi.fn();
const doctorFindAndCountAll = vi.fn();

const reviewFindAll = vi.fn();
const reviewFindOne = vi.fn();

const getRoleStrategyMock = vi.fn();

const bcryptCompare = vi.fn();
const bcryptHash = vi.fn();
const jwtSign = vi.fn();
const randomBytes = vi.fn();
const sendEmailByType = vi.fn();

vi.mock('../../models/index.js', () => ({
  sequelize: {
    transaction: sequelizeTransaction,
    fn: vi.fn(),
    col: vi.fn(),
  },
  User: {
    findOne: userFindOne,
    findByPk: userFindByPk,
    update: userUpdate,
    create: userCreate,
  },
  Patient: {
    findOne: patientFindOne,
  },
  Doctor: {
    findOne: doctorFindOne,
    findAndCountAll: doctorFindAndCountAll,
  },
  Review: {
    findAll: reviewFindAll,
    findOne: reviewFindOne,
  },
  AdminLog: {},
}));

vi.mock('bcrypt', () => ({
  default: {
    compare: bcryptCompare,
    hash: bcryptHash,
  },
}));

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: jwtSign,
  },
}));

vi.mock('crypto', () => ({
  default: {
    createHash: () => ({
      update: () => ({
        digest: () => 'hashed-token',
      }),
    }),
    randomBytes,
  },
}));

vi.mock('../../services/role-strategy/index.js', () => ({
  getRoleStrategy: getRoleStrategyMock,
}));

const defaultRoleStrategy = () => ({
    buildPrivateProfile: vi.fn(async () => null),
    buildPublicProfile: vi.fn(async () => null),
  });

vi.mock('../../services/email-strategy/index.js', () => ({
  sendEmailByType,
}));

describe('userController auth endpoints', () => {
  beforeEach(() => {
    vi.resetModules();
    userFindOne.mockReset();
    userFindByPk.mockReset();
    userUpdate.mockReset();
    userCreate.mockReset();
    sequelizeTransaction.mockReset();
    patientFindOne.mockReset();
    doctorFindOne.mockReset();
    doctorFindAndCountAll.mockReset();
    reviewFindAll.mockReset();
    reviewFindOne.mockReset();
    getRoleStrategyMock.mockReset();
    bcryptCompare.mockReset();
    bcryptHash.mockReset();
    jwtSign.mockReset();
    randomBytes.mockReset();
    sendEmailByType.mockReset();

    jwtSign.mockReturnValue('signed-token');
    randomBytes.mockReturnValue(Buffer.from('abc123'));
    bcryptHash.mockResolvedValue('hashed-password');
    getRoleStrategyMock.mockReturnValue(defaultRoleStrategy());
    sequelizeTransaction.mockResolvedValue({
      rollback: vi.fn(async () => undefined),
      commit: vi.fn(async () => undefined),
      finished: false,
    });
  });

  it('login validates required fields and auth failures', async () => {
    const { loginUser } = await import('../../controllers/roles/userController.js');

    const noFieldRes = createMockRes();
    await loginUser(createMockReq({ body: { email: '', password: '' } }), noFieldRes);
    expect(noFieldRes.status).toHaveBeenCalledWith(400);

    userFindOne.mockResolvedValue(null);
    const noUserRes = createMockRes();
    await loginUser(createMockReq({ body: { email: 'a@x.com', password: 'pwd' } }), noUserRes);
    expect(noUserRes.status).toHaveBeenCalledWith(401);

    userFindOne.mockResolvedValue({ role: 'patient' });
    const wrongRoleRes = createMockRes();
    await loginUser(createMockReq({ body: { email: 'a@x.com', password: 'pwd', role: 'doctor' } }), wrongRoleRes);
    expect(wrongRoleRes.status).toHaveBeenCalledWith(401);
  });

  it('login succeeds for patient and doctor profiles', async () => {
    const { loginUser } = await import('../../controllers/roles/userController.js');

    const patientUser = {
      id: 1,
      username: 'pat',
      email: 'pat@example.com',
      password: 'hash',
      role: 'patient',
    };
    userFindOne.mockResolvedValueOnce(patientUser);
    bcryptCompare.mockResolvedValueOnce(true);
    patientFindOne.mockResolvedValueOnce({ id: 11, full_name: 'Patient', profile_complete: true });

    const patientReq = createMockReq({ body: { email: 'pat@example.com', password: 'pwd' } });
    const patientRes = createMockRes();
    patientRes.cookie = vi.fn();
    await loginUser(patientReq, patientRes);

    expect(patientRes.cookie).toHaveBeenCalled();
    expect(patientRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'User logged in successfully.',
        user: expect.objectContaining({ role: 'patient' }),
      })
    );

    const doctorUser = {
      id: 2,
      username: 'doc',
      email: 'doc@example.com',
      password: 'hash',
      role: 'doctor',
    };
    userFindOne.mockResolvedValueOnce(doctorUser);
    bcryptCompare.mockResolvedValueOnce(true);
    doctorFindOne.mockResolvedValueOnce({
      id: 22,
      full_name: 'Doctor',
      specialty: 'ENT',
      verification_status: 'approved',
      profile_complete: true,
    });

    const doctorReq = createMockReq({ body: { email: 'doc@example.com', password: 'pwd' } });
    const doctorRes = createMockRes();
    doctorRes.cookie = vi.fn();
    await loginUser(doctorReq, doctorRes);

    expect(doctorRes.cookie).toHaveBeenCalled();
    expect(doctorRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        user: expect.objectContaining({ role: 'doctor' }),
      })
    );
  });

  it('logout clears cookie and returns 200', async () => {
    const { logoutUser } = await import('../../controllers/roles/userController.js');

    const res = createMockRes();
    res.clearCookie = vi.fn();

    await logoutUser(createMockReq(), res);

    expect(res.clearCookie).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('forgotPassword returns generic response and sends reset email when user exists', async () => {
    const { forgotPassword } = await import('../../controllers/roles/userController.js');

    const missingEmailRes = createMockRes();
    await forgotPassword(createMockReq({ body: {} }), missingEmailRes);
    expect(missingEmailRes.status).toHaveBeenCalledWith(400);

    userFindOne.mockResolvedValueOnce(null);
    const unknownRes = createMockRes();
    await forgotPassword(createMockReq({ body: { email: 'none@example.com' } }), unknownRes);
    expect(unknownRes.status).toHaveBeenCalledWith(200);

    userFindOne.mockResolvedValueOnce({ id: 7, email: 'known@example.com' });
    const knownRes = createMockRes();
    await forgotPassword(createMockReq({ body: { email: 'known@example.com' } }), knownRes);

    expect(userUpdate).toHaveBeenCalled();
    expect(sendEmailByType).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'password-reset',
        to: 'known@example.com',
      })
    );
    expect(knownRes.status).toHaveBeenCalledWith(200);
  });

  it('validateResetToken and resetPassword enforce token and password rules', async () => {
    const { validateResetToken, resetPassword } = await import('../../controllers/roles/userController.js');

    const missingTokenRes = createMockRes();
    await validateResetToken(createMockReq({ params: {} }), missingTokenRes);
    expect(missingTokenRes.status).toHaveBeenCalledWith(400);

    userFindOne.mockResolvedValueOnce({
      reset_password_expires_at: new Date(Date.now() + 60_000),
      reset_password_used_at: null,
    });
    const validRes = createMockRes();
    await validateResetToken(createMockReq({ params: { token: 'abc' } }), validRes);
    expect(validRes.json).toHaveBeenCalledWith({ valid: true });

    const missingFieldsRes = createMockRes();
    await resetPassword(createMockReq({ body: { token: '', newPassword: '' } }), missingFieldsRes);
    expect(missingFieldsRes.status).toHaveBeenCalledWith(400);

    const shortPasswordRes = createMockRes();
    await resetPassword(createMockReq({ body: { token: 'abc', newPassword: 'short' } }), shortPasswordRes);
    expect(shortPasswordRes.status).toHaveBeenCalledWith(400);

    userFindOne.mockResolvedValueOnce(null);
    const invalidTokenRes = createMockRes();
    await resetPassword(createMockReq({ body: { token: 'abc', newPassword: 'longenough' } }), invalidTokenRes);
    expect(invalidTokenRes.status).toHaveBeenCalledWith(400);

    userFindOne.mockResolvedValueOnce({
      id: 44,
      reset_password_expires_at: new Date(Date.now() + 60_000),
      reset_password_used_at: null,
    });
    const okRes = createMockRes();
    await resetPassword(createMockReq({ body: { token: 'abc', newPassword: 'longenough' } }), okRes);
    expect(userUpdate).toHaveBeenCalled();
    expect(okRes.status).toHaveBeenCalledWith(200);
  });

  it('handles profile endpoints and role strategy failures', async () => {
    const { getMyProfile, getPublicProfile } = await import('../../controllers/roles/userController.js');

    userFindByPk.mockResolvedValueOnce(null);
    const notFoundRes = createMockRes();
    await getMyProfile(createMockReq({ auth: { userId: 99 } }), notFoundRes);
    expect(notFoundRes.status).toHaveBeenCalledWith(404);

    userFindByPk.mockResolvedValueOnce({ id: 1, username: 'pat', email: 'p@example.com', role: 'patient' });
    getRoleStrategyMock.mockReturnValueOnce({
      buildPrivateProfile: vi.fn(async () => ({ full_name: 'Patient One' })),
      buildPublicProfile: vi.fn(async () => null),
    });
    const myProfileRes = createMockRes();
    await getMyProfile(createMockReq({ auth: { userId: 1 } }), myProfileRes);
    expect(myProfileRes.status).toHaveBeenCalledWith(200);

    const invalidPublicRes = createMockRes();
    await getPublicProfile(createMockReq({ params: { userId: 'bad' } }), invalidPublicRes);
    expect(invalidPublicRes.status).toHaveBeenCalledWith(400);

    userFindByPk.mockResolvedValueOnce(null);
    const missingPublicRes = createMockRes();
    await getPublicProfile(createMockReq({ params: { userId: '2' } }), missingPublicRes);
    expect(missingPublicRes.status).toHaveBeenCalledWith(404);

    userFindByPk.mockResolvedValueOnce({ id: 2, username: 'doc', role: 'doctor' });
    getRoleStrategyMock.mockReturnValueOnce({
      buildPrivateProfile: vi.fn(async () => null),
      buildPublicProfile: vi.fn(async () => ({ specialty: 'ENT' })),
    });
    const okPublicRes = createMockRes();
    await getPublicProfile(createMockReq({ params: { userId: '2' } }), okPublicRes);
    expect(okPublicRes.status).toHaveBeenCalledWith(200);
  });

  it('returns transformed doctors list and doctor detail with ratings', async () => {
    const { getDoctors, getDoctorById } = await import('../../controllers/roles/userController.js');

    doctorFindAndCountAll.mockResolvedValueOnce({
      count: 1,
      rows: [
        {
          id: 5,
          user_id: 50,
          full_name: 'Dr A',
          specialty: 'ENT',
          phone: null,
          bio: null,
          languages: ['English'],
          clinic_location: 'Clinic',
          latitude: null,
          longitude: null,
          virtual_available: true,
          in_person_available: true,
          verification_status: 'approved',
          verified_at: null,
          profile_complete: true,
          created_at: null,
          updated_at: null,
          user: { id: 50, email: 'dr@example.com', role: 'doctor' },
        },
      ],
    });
    reviewFindAll.mockResolvedValueOnce([
      { doctor_id: 5, average_rating: '4.25', review_count: '3' },
    ]);

    const doctorsRes = createMockRes();
    await getDoctors(createMockReq({ query: { search: 'dr', limit: '10', offset: '0' } }), doctorsRes);
    expect(doctorsRes.status).toHaveBeenCalledWith(200);
    expect(doctorsRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, count: 1, total: 1 })
    );

    doctorFindOne.mockResolvedValueOnce(null);
    const missingDoctorRes = createMockRes();
    await getDoctorById(createMockReq({ params: { doctorId: '22' } }), missingDoctorRes);
    expect(missingDoctorRes.status).toHaveBeenCalledWith(404);

    doctorFindOne.mockResolvedValueOnce({
      id: 5,
      user_id: 50,
      full_name: 'Dr A',
      specialty: 'ENT',
      phone: null,
      bio: null,
      languages: ['English'],
      clinic_location: 'Clinic',
      latitude: null,
      longitude: null,
      virtual_available: true,
      in_person_available: true,
      verification_status: 'approved',
      verified_at: null,
      profile_complete: true,
      created_at: null,
      updated_at: null,
      user: { id: 50, email: 'dr@example.com', role: 'doctor' },
    });
    reviewFindOne.mockResolvedValueOnce({ average_rating: '4.00', review_count: '2' });

    const doctorDetailRes = createMockRes();
    await getDoctorById(createMockReq({ params: { doctorId: '5' } }), doctorDetailRes);
    expect(doctorDetailRes.status).toHaveBeenCalledWith(200);
    expect(doctorDetailRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, doctor: expect.objectContaining({ id: 5 }) })
    );
  });

  it('registerUser and updateMyProfile enforce validation and missing-user checks', async () => {
    const { registerUser, updateMyProfile } = await import('../../controllers/roles/userController.js');

    const registerMissingRes = createMockRes();
    await registerUser(createMockReq({ body: { email: '', password: '', role: '', name: '' } }), registerMissingRes);
    expect(registerMissingRes.status).toHaveBeenCalledWith(400);

    const registerShortRes = createMockRes();
    await registerUser(
      createMockReq({ body: { email: 'a@b.com', password: 'short', role: 'patient', name: 'A' } }),
      registerShortRes
    );
    expect(registerShortRes.status).toHaveBeenCalledWith(400);

    const registerBadRoleRes = createMockRes();
    await registerUser(
      createMockReq({ body: { email: 'a@b.com', password: 'longenough', role: 'admin', name: 'A' } }),
      registerBadRoleRes
    );
    expect(registerBadRoleRes.status).toHaveBeenCalledWith(400);

    const registerDoctorMissingFieldsRes = createMockRes();
    await registerUser(
      createMockReq({
        body: { email: 'd@b.com', password: 'longenough', role: 'doctor', name: 'Dr', specialty: '', licenseNumber: '' },
      }),
      registerDoctorMissingFieldsRes
    );
    expect(registerDoctorMissingFieldsRes.status).toHaveBeenCalledWith(400);

    const registerDoctorNoDocsRes = createMockRes();
    await registerUser(
      createMockReq({
        body: {
          email: 'd@b.com',
          password: 'longenough',
          role: 'doctor',
          name: 'Dr',
          specialty: 'ENT',
          licenseNumber: 'LIC',
          verificationDocuments: [],
        },
      }),
      registerDoctorNoDocsRes
    );
    expect(registerDoctorNoDocsRes.status).toHaveBeenCalledWith(400);

    userFindByPk.mockResolvedValueOnce(null);
    const updateMissingUserRes = createMockRes();
    await updateMyProfile(createMockReq({ auth: { userId: 99 }, body: {} }), updateMissingUserRes);
    expect(updateMissingUserRes.status).toHaveBeenCalledWith(404);
  });
});
