import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockReq, createMockRes } from '../helpers/mockReqRes.js';

// ── mock fns ──

const caregiverFindOne = vi.fn();
const caregiverPatientFindOne = vi.fn();
const caregiverPatientFindAll = vi.fn();
const caregiverPatientCreate = vi.fn();
const patientFindOne = vi.fn();
const patientFindByPk = vi.fn();
const userFindOne = vi.fn();
const appointmentFindAll = vi.fn();
const appointmentFindOne = vi.fn();
const appointmentCreate = vi.fn();
const appointmentFindByPk = vi.fn();
const sequelizeTransaction = vi.fn();

vi.mock('../../models/index.js', () => ({
  sequelize: { transaction: (...args) => sequelizeTransaction(...args) },
  Appointment: {
    findAll: (...args) => appointmentFindAll(...args),
    findOne: (...args) => appointmentFindOne(...args),
    create: (...args) => appointmentCreate(...args),
    findByPk: (...args) => appointmentFindByPk(...args),
  },
  Caregiver: { findOne: (...args) => caregiverFindOne(...args) },
  CaregiverPatient: {
    findOne: (...args) => caregiverPatientFindOne(...args),
    findAll: (...args) => caregiverPatientFindAll(...args),
    create: (...args) => caregiverPatientCreate(...args),
  },
  Patient: {
    findOne: (...args) => patientFindOne(...args),
    findByPk: (...args) => patientFindByPk(...args),
  },
  User: { findOne: (...args) => userFindOne(...args) },
  Doctor: {},
  Review: {},
}));

vi.mock('../../controllers/booking/bookingShared.js', async () => {
  const actual = await vi.importActual('../../controllers/booking/bookingShared.js');
  return {
    ...actual,
    appointmentInclude: [],
    serializeAppointment: (a) => a,
  };
});

function resetAll() {
  caregiverFindOne.mockReset();
  caregiverPatientFindOne.mockReset();
  caregiverPatientFindAll.mockReset();
  caregiverPatientCreate.mockReset();
  patientFindOne.mockReset();
  patientFindByPk.mockReset();
  userFindOne.mockReset();
  appointmentFindAll.mockReset();
  appointmentFindOne.mockReset();
  appointmentCreate.mockReset();
  appointmentFindByPk.mockReset();
  sequelizeTransaction.mockReset();
}

// ── tests ──

describe('sendLinkRequest', () => {
  let sendLinkRequest;

  beforeEach(async () => {
    resetAll();
    const mod = await import('../../controllers/caregiverController.js');
    sendLinkRequest = mod.sendLinkRequest;
  });

  it('returns 400 when email is missing', async () => {
    const req = createMockReq({ auth: { userId: 1 }, body: {} });
    const res = createMockRes();

    await sendLinkRequest(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Patient email is required.' });
  });

  it('returns 404 when caregiver profile not found', async () => {
    caregiverFindOne.mockResolvedValue(null);
    const req = createMockReq({ auth: { userId: 1 }, body: { email: 'patient@test.com' } });
    const res = createMockRes();

    await sendLinkRequest(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 404 when patient user not found', async () => {
    caregiverFindOne.mockResolvedValue({ id: 10 });
    userFindOne.mockResolvedValue(null);
    const req = createMockReq({ auth: { userId: 1 }, body: { email: 'nobody@test.com' } });
    const res = createMockRes();

    await sendLinkRequest(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'No patient found with that email.' });
  });

  it('returns 404 when patient profile not found', async () => {
    caregiverFindOne.mockResolvedValue({ id: 10 });
    userFindOne.mockResolvedValue({ id: 2 });
    patientFindOne.mockResolvedValue(null);
    const req = createMockReq({ auth: { userId: 1 }, body: { email: 'patient@test.com' } });
    const res = createMockRes();

    await sendLinkRequest(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Patient profile not found.' });
  });

  it('returns 409 when link is already approved', async () => {
    caregiverFindOne.mockResolvedValue({ id: 10 });
    userFindOne.mockResolvedValue({ id: 2 });
    patientFindOne.mockResolvedValue({ id: 20 });
    caregiverPatientFindOne.mockResolvedValue({ status: 'approved' });

    const req = createMockReq({ auth: { userId: 1 }, body: { email: 'patient@test.com' } });
    const res = createMockRes();

    await sendLinkRequest(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ error: 'This patient is already linked to your account.' });
  });

  it('returns 409 when link is already pending', async () => {
    caregiverFindOne.mockResolvedValue({ id: 10 });
    userFindOne.mockResolvedValue({ id: 2 });
    patientFindOne.mockResolvedValue({ id: 20 });
    caregiverPatientFindOne.mockResolvedValue({ status: 'pending' });

    const req = createMockReq({ auth: { userId: 1 }, body: { email: 'patient@test.com' } });
    const res = createMockRes();

    await sendLinkRequest(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ error: 'A link request is already pending for this patient.' });
  });

  it('re-sends request when previous was rejected', async () => {
    const existingLink = { status: 'rejected', relationship: 'parent', update: vi.fn() };
    caregiverFindOne.mockResolvedValue({ id: 10 });
    userFindOne.mockResolvedValue({ id: 2 });
    patientFindOne.mockResolvedValue({ id: 20 });
    caregiverPatientFindOne.mockResolvedValue(existingLink);

    const req = createMockReq({ auth: { userId: 1 }, body: { email: 'patient@test.com', relationship: 'spouse' } });
    const res = createMockRes();

    await sendLinkRequest(req, res);

    expect(existingLink.update).toHaveBeenCalledWith({ status: 'pending', relationship: 'spouse' });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('creates a new link request successfully', async () => {
    caregiverFindOne.mockResolvedValue({ id: 10 });
    userFindOne.mockResolvedValue({ id: 2 });
    patientFindOne.mockResolvedValue({ id: 20 });
    caregiverPatientFindOne.mockResolvedValue(null);
    caregiverPatientCreate.mockResolvedValue({ id: 1, caregiver_id: 10, patient_id: 20, status: 'pending' });

    const req = createMockReq({ auth: { userId: 1 }, body: { email: 'patient@test.com', relationship: 'parent' } });
    const res = createMockRes();

    await sendLinkRequest(req, res);

    expect(caregiverPatientCreate).toHaveBeenCalledWith({
      caregiver_id: 10,
      patient_id: 20,
      status: 'pending',
      relationship: 'parent',
    });
    expect(res.status).toHaveBeenCalledWith(201);
  });
});

describe('getLinkedPatients', () => {
  let getLinkedPatients;

  beforeEach(async () => {
    resetAll();
    const mod = await import('../../controllers/caregiverController.js');
    getLinkedPatients = mod.getLinkedPatients;
  });

  it('returns linked patients', async () => {
    caregiverFindOne.mockResolvedValue({ id: 10 });
    const links = [
      { id: 1, patient: { id: 20, full_name: 'Alice' } },
      { id: 2, patient: { id: 21, full_name: 'Bob' } },
    ];
    caregiverPatientFindAll.mockResolvedValue(links);

    const req = createMockReq({ auth: { userId: 1 } });
    const res = createMockRes();

    await getLinkedPatients(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ patients: links });
  });

  it('returns 404 when caregiver profile not found', async () => {
    caregiverFindOne.mockResolvedValue(null);

    const req = createMockReq({ auth: { userId: 1 } });
    const res = createMockRes();

    await getLinkedPatients(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe('removeLinkedPatient', () => {
  let removeLinkedPatient;

  beforeEach(async () => {
    resetAll();
    const mod = await import('../../controllers/caregiverController.js');
    removeLinkedPatient = mod.removeLinkedPatient;
  });

  it('removes an existing link', async () => {
    caregiverFindOne.mockResolvedValue({ id: 10 });
    const link = { destroy: vi.fn() };
    caregiverPatientFindOne.mockResolvedValue(link);

    const req = createMockReq({ auth: { userId: 1 }, params: { patientId: '20' } });
    const res = createMockRes();

    await removeLinkedPatient(req, res);

    expect(link.destroy).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('returns 404 when link not found', async () => {
    caregiverFindOne.mockResolvedValue({ id: 10 });
    caregiverPatientFindOne.mockResolvedValue(null);

    const req = createMockReq({ auth: { userId: 1 }, params: { patientId: '99' } });
    const res = createMockRes();

    await removeLinkedPatient(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Link not found.' });
  });
});

describe('getCaregiverRequests (patient side)', () => {
  let getCaregiverRequests;

  beforeEach(async () => {
    resetAll();
    const mod = await import('../../controllers/caregiverController.js');
    getCaregiverRequests = mod.getCaregiverRequests;
  });

  it('returns pending requests for the patient', async () => {
    patientFindOne.mockResolvedValue({ id: 20 });
    const requests = [{ id: 1, caregiver: { id: 10, full_name: 'Jane' } }];
    caregiverPatientFindAll.mockResolvedValue(requests);

    const req = createMockReq({ auth: { userId: 2 } });
    const res = createMockRes();

    await getCaregiverRequests(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ requests });
  });

  it('returns 404 when patient profile not found', async () => {
    patientFindOne.mockResolvedValue(null);

    const req = createMockReq({ auth: { userId: 2 } });
    const res = createMockRes();

    await getCaregiverRequests(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Patient profile not found.' });
  });
});

describe('respondToCaregiverRequest', () => {
  let respondToCaregiverRequest;

  beforeEach(async () => {
    resetAll();
    const mod = await import('../../controllers/caregiverController.js');
    respondToCaregiverRequest = mod.respondToCaregiverRequest;
  });

  it('returns 400 for invalid status', async () => {
    const req = createMockReq({ auth: { userId: 2 }, params: { requestId: '1' }, body: { status: 'invalid' } });
    const res = createMockRes();

    await respondToCaregiverRequest(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Status must be 'approved' or 'rejected'." });
  });

  it('returns 404 when patient profile not found', async () => {
    patientFindOne.mockResolvedValue(null);

    const req = createMockReq({ auth: { userId: 2 }, params: { requestId: '1' }, body: { status: 'approved' } });
    const res = createMockRes();

    await respondToCaregiverRequest(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Patient profile not found.' });
  });

  it('returns 404 when pending request not found', async () => {
    patientFindOne.mockResolvedValue({ id: 20 });
    caregiverPatientFindOne.mockResolvedValue(null);

    const req = createMockReq({ auth: { userId: 2 }, params: { requestId: '999' }, body: { status: 'approved' } });
    const res = createMockRes();

    await respondToCaregiverRequest(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Pending request not found.' });
  });

  it('approves a pending request', async () => {
    patientFindOne.mockResolvedValue({ id: 20 });
    const request = { update: vi.fn() };
    caregiverPatientFindOne.mockResolvedValue(request);

    const req = createMockReq({ auth: { userId: 2 }, params: { requestId: '1' }, body: { status: 'approved' } });
    const res = createMockRes();

    await respondToCaregiverRequest(req, res);

    expect(request.update).toHaveBeenCalledWith({ status: 'approved' });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('rejects a pending request', async () => {
    patientFindOne.mockResolvedValue({ id: 20 });
    const request = { update: vi.fn() };
    caregiverPatientFindOne.mockResolvedValue(request);

    const req = createMockReq({ auth: { userId: 2 }, params: { requestId: '1' }, body: { status: 'rejected' } });
    const res = createMockRes();

    await respondToCaregiverRequest(req, res);

    expect(request.update).toHaveBeenCalledWith({ status: 'rejected' });
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe('getPatientAppointments', () => {
  let getPatientAppointments;

  beforeEach(async () => {
    resetAll();
    const mod = await import('../../controllers/caregiverController.js');
    getPatientAppointments = mod.getPatientAppointments;
  });

  it('returns appointments for an approved linked patient', async () => {
    caregiverFindOne.mockResolvedValue({ id: 10 });
    caregiverPatientFindOne.mockResolvedValue({ status: 'approved' });
    const appts = [{ id: 1, status: 'scheduled' }, { id: 2, status: 'completed' }];
    appointmentFindAll.mockResolvedValue(appts);

    const req = createMockReq({ auth: { userId: 1 }, params: { patientId: '20' } });
    const res = createMockRes();

    await getPatientAppointments(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ appointments: appts });
  });

  it('returns 403 when no approved link exists', async () => {
    caregiverFindOne.mockResolvedValue({ id: 10 });
    caregiverPatientFindOne.mockResolvedValue(null);

    const req = createMockReq({ auth: { userId: 1 }, params: { patientId: '20' } });
    const res = createMockRes();

    await getPatientAppointments(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });
});

describe('cancelForPatient', () => {
  let cancelForPatient;

  beforeEach(async () => {
    resetAll();
    const mod = await import('../../controllers/caregiverController.js');
    cancelForPatient = mod.cancelForPatient;
  });

  it('cancels an active appointment with a reason', async () => {
    caregiverFindOne.mockResolvedValue({ id: 10 });
    caregiverPatientFindOne.mockResolvedValue({ status: 'approved' });
    const appointment = { id: 1, update: vi.fn() };
    appointmentFindOne.mockResolvedValue(appointment);

    const req = createMockReq({
      auth: { userId: 1 },
      params: { patientId: '20', appointmentId: '1' },
      body: { reason: 'scheduling conflict' },
    });
    const res = createMockRes();

    await cancelForPatient(req, res);

    expect(appointment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'cancelled',
        cancellation_reason: 'Cancelled by caregiver: scheduling conflict',
      })
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('cancels without reason', async () => {
    caregiverFindOne.mockResolvedValue({ id: 10 });
    caregiverPatientFindOne.mockResolvedValue({ status: 'approved' });
    const appointment = { id: 1, update: vi.fn() };
    appointmentFindOne.mockResolvedValue(appointment);

    const req = createMockReq({
      auth: { userId: 1 },
      params: { patientId: '20', appointmentId: '1' },
      body: {},
    });
    const res = createMockRes();

    await cancelForPatient(req, res);

    expect(appointment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        cancellation_reason: 'Cancelled by caregiver',
      })
    );
  });

  it('returns 404 when appointment not found', async () => {
    caregiverFindOne.mockResolvedValue({ id: 10 });
    caregiverPatientFindOne.mockResolvedValue({ status: 'approved' });
    appointmentFindOne.mockResolvedValue(null);

    const req = createMockReq({
      auth: { userId: 1 },
      params: { patientId: '20', appointmentId: '999' },
      body: {},
    });
    const res = createMockRes();

    await cancelForPatient(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Active appointment not found for this patient.' });
  });

  it('returns 403 when no approved link', async () => {
    caregiverFindOne.mockResolvedValue({ id: 10 });
    caregiverPatientFindOne.mockResolvedValue(null);

    const req = createMockReq({
      auth: { userId: 1 },
      params: { patientId: '20', appointmentId: '1' },
      body: {},
    });
    const res = createMockRes();

    await cancelForPatient(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });
});
