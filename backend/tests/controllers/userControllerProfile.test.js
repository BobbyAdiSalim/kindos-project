import { createMockReq, createMockRes } from '../helpers/mockReqRes.js';

const transactionMock = vi.fn();

const userFindByPk = vi.fn();
const userFindOne = vi.fn();
const userUpdate = vi.fn();

const patientFindOne = vi.fn();
const patientCreate = vi.fn();

const doctorFindOne = vi.fn();
const doctorFindByPk = vi.fn();
const doctorFindAndCountAll = vi.fn();
const doctorCreate = vi.fn();

const reviewFindAll = vi.fn();
const reviewFindOne = vi.fn();
const adminLogCreate = vi.fn();

const roleStrategyMock = vi.fn();

vi.mock('fs/promises', () => ({
  default: {
    access: vi.fn(async () => undefined),
    unlink: vi.fn(async () => undefined),
  },
}));

vi.mock('../../models/index.js', () => ({
  sequelize: {
    transaction: transactionMock,
    fn: vi.fn(),
    col: vi.fn(),
  },
  User: {
    findByPk: userFindByPk,
    findOne: userFindOne,
    update: userUpdate,
  },
  Patient: {
    findOne: patientFindOne,
    create: patientCreate,
  },
  Doctor: {
    findOne: doctorFindOne,
    findByPk: doctorFindByPk,
    findAndCountAll: doctorFindAndCountAll,
    create: doctorCreate,
  },
  Review: {
    findAll: reviewFindAll,
    findOne: reviewFindOne,
  },
  AdminLog: {
    create: adminLogCreate,
  },
}));

vi.mock('../../services/role-strategy/index.js', () => ({
  getRoleStrategy: roleStrategyMock,
}));

vi.mock('../../services/email-strategy/index.js', () => ({
  sendEmailByType: vi.fn(),
}));

const makeTx = () => ({
  rollback: vi.fn(async () => undefined),
  commit: vi.fn(async () => undefined),
  finished: false,
});

describe('userController profile/document/resubmission', () => {
  beforeEach(() => {
    vi.resetModules();
    transactionMock.mockReset();
    userFindByPk.mockReset();
    userFindOne.mockReset();
    userUpdate.mockReset();
    patientFindOne.mockReset();
    patientCreate.mockReset();
    doctorFindOne.mockReset();
    doctorFindByPk.mockReset();
    doctorFindAndCountAll.mockReset();
    doctorCreate.mockReset();
    reviewFindAll.mockReset();
    reviewFindOne.mockReset();
    adminLogCreate.mockReset();
    roleStrategyMock.mockReset();

    roleStrategyMock.mockReturnValue({
      buildPrivateProfile: vi.fn(async () => null),
      buildPublicProfile: vi.fn(async () => null),
    });
  });

  it('getMyProfile returns 404 and success response', async () => {
    const { getMyProfile } = await import('../../controllers/roles/userController.js');

    userFindByPk.mockResolvedValueOnce(null);
    const missingRes = createMockRes();
    await getMyProfile(createMockReq({ auth: { userId: 99 } }), missingRes);
    expect(missingRes.status).toHaveBeenCalledWith(404);

    userFindByPk.mockResolvedValueOnce({ id: 1, username: 'u', email: 'e@x.com', role: 'patient' });
    roleStrategyMock.mockReturnValueOnce({
      buildPrivateProfile: vi.fn(async () => ({ full_name: 'Patient A' })),
      buildPublicProfile: vi.fn(async () => null),
    });
    const okRes = createMockRes();
    await getMyProfile(createMockReq({ auth: { userId: 1 } }), okRes);
    expect(okRes.status).toHaveBeenCalledWith(200);
    expect(okRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ profile: expect.objectContaining({ full_name: 'Patient A' }) })
    );
  });

  it('updateMyProfile handles user/profile missing and patient success', async () => {
    const { updateMyProfile } = await import('../../controllers/roles/userController.js');

    const tx1 = makeTx();
    transactionMock.mockResolvedValueOnce(tx1);
    userFindByPk.mockResolvedValueOnce(null);
    const missingUserRes = createMockRes();
    await updateMyProfile(createMockReq({ auth: { userId: 42 }, body: {} }), missingUserRes);
    expect(missingUserRes.status).toHaveBeenCalledWith(404);
    expect(tx1.rollback).toHaveBeenCalled();

    const tx2 = makeTx();
    transactionMock.mockResolvedValueOnce(tx2);
    const user = {
      id: 3,
      role: 'patient',
      username: 'old',
      email: 'old@example.com',
      update: vi.fn(async () => undefined),
    };
    const patient = { update: vi.fn(async () => undefined) };

    userFindByPk.mockResolvedValueOnce(user).mockResolvedValueOnce({
      id: 3,
      role: 'patient',
      username: 'newname',
      email: 'new@example.com',
    });
    patientFindOne.mockResolvedValueOnce(patient);
    roleStrategyMock.mockReturnValueOnce({
      buildPrivateProfile: vi.fn(async () => ({ full_name: 'Updated Name' })),
      buildPublicProfile: vi.fn(async () => null),
    });

    const successRes = createMockRes();
    await updateMyProfile(
      createMockReq({
        auth: { userId: 3 },
        body: {
          username: 'newname',
          email: 'new@example.com',
          fullName: 'Updated Name',
          phone: '123',
          address: 'addr',
          profileComplete: 'true',
          accessibilityPreferences: ['captions'],
          timeZone: 'America/Toronto',
        },
      }),
      successRes
    );

    expect(user.update).toHaveBeenCalled();
    expect(patient.update).toHaveBeenCalled();
    expect(tx2.commit).toHaveBeenCalled();
    expect(successRes.status).toHaveBeenCalledWith(200);
  });

  it('updateMyProfile handles doctor profile missing', async () => {
    const { updateMyProfile } = await import('../../controllers/roles/userController.js');

    const tx = makeTx();
    transactionMock.mockResolvedValueOnce(tx);
    userFindByPk.mockResolvedValueOnce({
      id: 7,
      role: 'doctor',
      update: vi.fn(async () => undefined),
    });
    doctorFindOne.mockResolvedValueOnce(null);

    const res = createMockRes();
    await updateMyProfile(createMockReq({ auth: { userId: 7 }, body: {} }), res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(tx.rollback).toHaveBeenCalled();
  });

  it('updateMyProfile handles doctor success and unique constraint conflicts', async () => {
    const { updateMyProfile } = await import('../../controllers/roles/userController.js');

    const tx1 = makeTx();
    transactionMock.mockResolvedValueOnce(tx1);

    const user = {
      id: 8,
      role: 'doctor',
      username: 'doctor_old',
      email: 'doctor.old@example.com',
      update: vi.fn(async () => undefined),
    };
    const doctor = { update: vi.fn(async () => undefined) };

    userFindByPk
      .mockResolvedValueOnce(user)
      .mockResolvedValueOnce({
        id: 8,
        role: 'doctor',
        username: 'doctor_new',
        email: 'doctor.new@example.com',
      });
    doctorFindOne.mockResolvedValueOnce(doctor);
    roleStrategyMock.mockReturnValueOnce({
      buildPrivateProfile: vi.fn(async () => ({ full_name: 'Dr Updated', specialty: 'Audiology' })),
      buildPublicProfile: vi.fn(async () => null),
    });

    const successRes = createMockRes();
    await updateMyProfile(
      createMockReq({
        auth: { userId: 8 },
        body: {
          username: 'doctor_new',
          email: 'doctor.new@example.com',
          fullName: 'Dr Updated',
          specialty: 'Audiology',
          licenseNumber: 'NEW-LIC',
          clinicLocation: 'Downtown Clinic',
          languages: 'English,French',
          careTypes: ['adult'],
          virtualAvailable: 'true',
          inPersonAvailable: 'false',
          latitude: 43.66,
          longitude: -79.39,
          profileComplete: 'true',
          timeZone: 'America/Toronto',
        },
      }),
      successRes
    );

    expect(user.update).toHaveBeenCalled();
    expect(doctor.update).toHaveBeenCalled();
    expect(tx1.commit).toHaveBeenCalled();
    expect(successRes.status).toHaveBeenCalledWith(200);

    const tx2 = makeTx();
    transactionMock.mockResolvedValueOnce(tx2);
    userFindByPk.mockResolvedValueOnce({
      id: 9,
      role: 'patient',
      update: vi.fn(async () => {
        const err = new Error('duplicate');
        err.name = 'SequelizeUniqueConstraintError';
        throw err;
      }),
    });

    const conflictRes = createMockRes();
    await updateMyProfile(
      createMockReq({
        auth: { userId: 9 },
        body: { username: 'taken_name' },
      }),
      conflictRes
    );

    expect(tx2.rollback).toHaveBeenCalled();
    expect(conflictRes.status).toHaveBeenCalledWith(409);
  });

  it('getPublicProfile and verification document endpoint guard paths', async () => {
    const { getPublicProfile, getDoctorVerificationDocument } = await import('../../controllers/roles/userController.js');

    const badUserIdRes = createMockRes();
    await getPublicProfile(createMockReq({ params: { userId: 'x' } }), badUserIdRes);
    expect(badUserIdRes.status).toHaveBeenCalledWith(400);

    userFindByPk.mockResolvedValueOnce(null);
    const noUserRes = createMockRes();
    await getPublicProfile(createMockReq({ params: { userId: '2' } }), noUserRes);
    expect(noUserRes.status).toHaveBeenCalledWith(404);

    userFindByPk.mockResolvedValueOnce({ id: 2, username: 'doc', role: 'doctor' });
    roleStrategyMock.mockReturnValueOnce({
      buildPrivateProfile: vi.fn(async () => null),
      buildPublicProfile: vi.fn(async () => ({ specialty: 'ENT' })),
    });
    const okProfileRes = createMockRes();
    await getPublicProfile(createMockReq({ params: { userId: '2' } }), okProfileRes);
    expect(okProfileRes.status).toHaveBeenCalledWith(200);

    const badDoctorIdRes = createMockRes();
    await getDoctorVerificationDocument(
      createMockReq({ params: { doctorId: 'bad', documentIndex: '0' }, auth: { userId: 1, role: 'admin' } }),
      badDoctorIdRes
    );
    expect(badDoctorIdRes.status).toHaveBeenCalledWith(400);

    doctorFindByPk.mockResolvedValueOnce(null);
    const noDoctorRes = createMockRes();
    await getDoctorVerificationDocument(
      createMockReq({ params: { doctorId: '3', documentIndex: '0' }, auth: { userId: 1, role: 'admin' } }),
      noDoctorRes
    );
    expect(noDoctorRes.status).toHaveBeenCalledWith(404);

    doctorFindByPk.mockResolvedValueOnce({ id: 3, user_id: 999, verification_documents: ['x'] });
    const forbiddenRes = createMockRes();
    await getDoctorVerificationDocument(
      createMockReq({ params: { doctorId: '3', documentIndex: '0' }, auth: { userId: 1, role: 'patient' } }),
      forbiddenRes
    );
    expect(forbiddenRes.status).toHaveBeenCalledWith(403);

    doctorFindByPk.mockResolvedValueOnce({ id: 3, user_id: 1, verification_documents: [] });
    const missingDocRes = createMockRes();
    await getDoctorVerificationDocument(
      createMockReq({ params: { doctorId: '3', documentIndex: '0' }, auth: { userId: 1, role: 'doctor' } }),
      missingDocRes
    );
    expect(missingDocRes.status).toHaveBeenCalledWith(404);

    doctorFindByPk.mockResolvedValueOnce({ id: 3, user_id: 1, verification_documents: ['invalid-ref'] });
    const invalidRefRes = createMockRes();
    await getDoctorVerificationDocument(
      createMockReq({ params: { doctorId: '3', documentIndex: '0' }, auth: { userId: 1, role: 'doctor' } }),
      invalidRefRes
    );
    expect(invalidRefRes.status).toHaveBeenCalledWith(404);

    const invalidDocIndexRes = createMockRes();
    await getDoctorVerificationDocument(
      createMockReq({ params: { doctorId: '3', documentIndex: '-1' }, auth: { userId: 1, role: 'doctor' } }),
      invalidDocIndexRes
    );
    expect(invalidDocIndexRes.status).toHaveBeenCalledWith(400);

    doctorFindByPk.mockResolvedValueOnce({ id: 3, user_id: 1, verification_documents: ['r2:doc/key.pdf'] });
    const r2NotConfiguredRes = createMockRes();
    await getDoctorVerificationDocument(
      createMockReq({ params: { doctorId: '3', documentIndex: '0' }, auth: { userId: 1, role: 'doctor' } }),
      r2NotConfiguredRes
    );
    expect(r2NotConfiguredRes.status).toHaveBeenCalledWith(500);

    doctorFindByPk.mockResolvedValueOnce({ id: 3, user_id: 1, verification_documents: ['/api/uploads/verification-docs/license.pdf'] });
    const legacyRes = createMockRes();
    legacyRes.sendFile = vi.fn();
    await getDoctorVerificationDocument(
      createMockReq({ params: { doctorId: '3', documentIndex: '0' }, auth: { userId: 1, role: 'doctor' } }),
      legacyRes
    );
    expect(legacyRes.sendFile).toHaveBeenCalled();
  });

  it('resubmitDoctorVerification covers key rejection branches', async () => {
    const { resubmitDoctorVerification } = await import('../../controllers/roles/userController.js');

    const tx1 = makeTx();
    transactionMock.mockResolvedValueOnce(tx1);
    userFindByPk.mockResolvedValueOnce(null);
    const notDoctorRes = createMockRes();
    await resubmitDoctorVerification(createMockReq({ auth: { userId: 1 }, body: {} }), notDoctorRes);
    expect(notDoctorRes.status).toHaveBeenCalledWith(403);

    const tx2 = makeTx();
    transactionMock.mockResolvedValueOnce(tx2);
    userFindByPk.mockResolvedValueOnce({ id: 1, role: 'doctor' });
    doctorFindOne.mockResolvedValueOnce(null);
    const missingDoctorRes = createMockRes();
    await resubmitDoctorVerification(createMockReq({ auth: { userId: 1 }, body: {} }), missingDoctorRes);
    expect(missingDoctorRes.status).toHaveBeenCalledWith(404);

    const tx3 = makeTx();
    transactionMock.mockResolvedValueOnce(tx3);
    userFindByPk.mockResolvedValueOnce({ id: 1, role: 'doctor' });
    doctorFindOne.mockResolvedValueOnce({ verification_status: 'pending' });
    const badStatusRes = createMockRes();
    await resubmitDoctorVerification(createMockReq({ auth: { userId: 1 }, body: {} }), badStatusRes);
    expect(badStatusRes.status).toHaveBeenCalledWith(400);

    const tx4 = makeTx();
    transactionMock.mockResolvedValueOnce(tx4);
    userFindByPk.mockResolvedValueOnce({ id: 1, role: 'doctor' });
    doctorFindOne.mockResolvedValueOnce({ verification_status: 'denied' });
    const missingFieldsRes = createMockRes();
    await resubmitDoctorVerification(
      createMockReq({ auth: { userId: 1 }, body: { fullName: '', specialty: '', licenseNumber: '', verificationDocuments: [] } }),
      missingFieldsRes
    );
    expect(missingFieldsRes.status).toHaveBeenCalledWith(400);

    const tx5 = makeTx();
    transactionMock.mockResolvedValueOnce(tx5);
    userFindByPk.mockResolvedValueOnce({ id: 1, role: 'doctor' });
    doctorFindOne.mockResolvedValueOnce({
      id: 10,
      user_id: 1,
      verification_status: 'denied',
      update: vi.fn(async () => undefined),
    });
    const storageErrRes = createMockRes();
    await resubmitDoctorVerification(
      createMockReq({
        auth: { userId: 1 },
        body: {
          fullName: 'Dr X',
          specialty: 'ENT',
          licenseNumber: 'LIC-1',
          verificationDocuments: ['data:application/pdf;base64,QUJD'],
        },
      }),
      storageErrRes
    );
    expect(storageErrRes.status).toHaveBeenCalledWith(400);

  });
});
