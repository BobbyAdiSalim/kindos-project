import { createMockReq, createMockRes } from '../helpers/mockReqRes.js';

const sequelizeTransaction = vi.fn();
const appointmentCreate = vi.fn();
const appointmentFindByPk = vi.fn();
const appointmentFindAll = vi.fn();
const appointmentFindOne = vi.fn();
const doctorFindOne = vi.fn();
const patientFindOne = vi.fn();

const getRoleStrategyMock = vi.fn();
const validateBookingPayloadMock = vi.fn();
const ensureSlotIsBookableMock = vi.fn();
const getDoctorForBookingMock = vi.fn();
const getPatientForUserMock = vi.fn();
const ensureNoOverlappingAppointmentMock = vi.fn();
const serializeAppointmentMock = vi.fn((value) => ({ id: value?.id || 0 }));

vi.mock('../../models/index.js', () => ({
  sequelize: {
    transaction: sequelizeTransaction,
  },
  Appointment: {
    create: appointmentCreate,
    findByPk: appointmentFindByPk,
    findAll: appointmentFindAll,
    findOne: appointmentFindOne,
  },
  Doctor: {
    findOne: doctorFindOne,
  },
  Patient: {
    findOne: patientFindOne,
  },
  User: {},
}));

vi.mock('../../services/role-strategy/index.js', () => ({
  getRoleStrategy: getRoleStrategyMock,
}));

vi.mock('../../controllers/booking/bookingShared.js', () => {
  class HttpError extends Error {
    constructor(status, message) {
      super(message);
      this.status = status;
    }
  }

  return {
    HttpError,
    serializeAppointment: serializeAppointmentMock,
    appointmentInclude: [],
    validateBookingPayload: validateBookingPayloadMock,
    ensureSlotIsBookable: ensureSlotIsBookableMock,
    getDoctorForBooking: getDoctorForBookingMock,
    getPatientForUser: getPatientForUserMock,
    ensureNoOverlappingAppointment: ensureNoOverlappingAppointmentMock,
  };
});

describe('bookingController additional coverage', () => {
  beforeEach(() => {
    vi.resetModules();
    sequelizeTransaction.mockReset();
    appointmentCreate.mockReset();
    appointmentFindByPk.mockReset();
    appointmentFindAll.mockReset();
    appointmentFindOne.mockReset();
    doctorFindOne.mockReset();
    patientFindOne.mockReset();

    getRoleStrategyMock.mockReset();
    validateBookingPayloadMock.mockReset();
    ensureSlotIsBookableMock.mockReset();
    getDoctorForBookingMock.mockReset();
    getPatientForUserMock.mockReset();
    ensureNoOverlappingAppointmentMock.mockReset();
    serializeAppointmentMock.mockClear();

    sequelizeTransaction.mockImplementation(async (callback) => callback({ LOCK: { UPDATE: 'update' } }));
  });

  it('creates a booking successfully', async () => {
    const { createAppointmentBooking } = await import('../../controllers/booking/bookingController.js');

    validateBookingPayloadMock.mockReturnValue({
      doctorUserId: 2,
      appointmentDate: '2026-03-20',
      startTime: '10:00:00',
      endTime: '10:30:00',
      appointmentType: 'virtual',
      duration: 30,
      reason: 'Reason',
      notes: null,
      accessibilityNeeds: [],
      notifyOnDoctorApproval: true,
    });
    getPatientForUserMock.mockResolvedValue({ id: 7 });
    getDoctorForBookingMock.mockResolvedValue({ id: 8 });
    ensureSlotIsBookableMock.mockResolvedValue(55);
    ensureNoOverlappingAppointmentMock.mockResolvedValue(undefined);
    appointmentCreate.mockResolvedValue({ id: 42 });
    appointmentFindByPk.mockResolvedValue({ id: 42 });

    const req = createMockReq({ auth: { userId: 5 }, body: {} });
    const res = createMockRes();

    await createAppointmentBooking(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('Booking request submitted') })
    );
  });

  it('returns 400 on booking HttpError', async () => {
    const { createAppointmentBooking } = await import('../../controllers/booking/bookingController.js');
    const { HttpError } = await import('../../controllers/booking/bookingShared.js');

    const error = new HttpError(400, 'bad payload');
    validateBookingPayloadMock.mockImplementation(() => {
      throw error;
    });

    const req = createMockReq({ auth: { userId: 5 }, body: {} });
    const res = createMockRes();

    await createAppointmentBooking(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'bad payload' });
  });

  it('fetches appointments for current role scope', async () => {
    const { getMyAppointments } = await import('../../controllers/booking/bookingController.js');
    getRoleStrategyMock.mockReturnValue({
      getAppointmentScope: vi.fn().mockResolvedValue({ patient_id: 7 }),
    });
    appointmentFindAll.mockResolvedValue([{ id: 1 }, { id: 2 }]);

    const req = createMockReq({ auth: { userId: 5, role: 'patient' } });
    const res = createMockRes();

    await getMyAppointments(req, res);

    expect(res.json).toHaveBeenCalledWith({
      appointments: [{ id: 1 }, { id: 2 }],
    });
  });

  it('validates and fetches appointment by id', async () => {
    const { getAppointmentById } = await import('../../controllers/booking/bookingController.js');
    const res = createMockRes();

    await getAppointmentById(createMockReq({ auth: { userId: 1, role: 'patient' }, params: { appointmentId: 'abc' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);

    getRoleStrategyMock.mockReturnValue({
      getAppointmentScope: vi.fn().mockResolvedValue({ patient_id: 7 }),
    });
    appointmentFindOne.mockResolvedValue(null);
    const res2 = createMockRes();
    await getAppointmentById(createMockReq({ auth: { userId: 1, role: 'patient' }, params: { appointmentId: '9' } }), res2);
    expect(res2.status).toHaveBeenCalledWith(404);
  });

  it('guards patient history access and handles patient-not-found', async () => {
    const { getPatientHistory } = await import('../../controllers/booking/bookingController.js');

    const deniedRes = createMockRes();
    await getPatientHistory(createMockReq({ auth: { userId: 1, role: 'patient' }, params: { patientId: '2' } }), deniedRes);
    expect(deniedRes.status).toHaveBeenCalledWith(403);

    const invalidRes = createMockRes();
    await getPatientHistory(createMockReq({ auth: { userId: 1, role: 'doctor' }, params: { patientId: 'bad' } }), invalidRes);
    expect(invalidRes.status).toHaveBeenCalledWith(400);

    patientFindOne.mockResolvedValue(null);
    const notFoundRes = createMockRes();
    await getPatientHistory(createMockReq({ auth: { userId: 1, role: 'doctor' }, params: { patientId: '2' } }), notFoundRes);
    expect(notFoundRes.status).toHaveBeenCalledWith(404);
  });

  it('validates saveSummary and markComplete input', async () => {
    const { saveSummary, markComplete } = await import('../../controllers/booking/bookingController.js');

    const badSummaryRes = createMockRes();
    await saveSummary(createMockReq({ auth: { userId: 1 }, params: { appointmentId: '0' }, body: { summary: 'x' } }), badSummaryRes);
    expect(badSummaryRes.status).toHaveBeenCalledWith(400);

    const emptySummaryRes = createMockRes();
    await saveSummary(createMockReq({ auth: { userId: 1 }, params: { appointmentId: '2' }, body: { summary: ' ' } }), emptySummaryRes);
    expect(emptySummaryRes.status).toHaveBeenCalledWith(400);

    const badCompleteRes = createMockRes();
    await markComplete(createMockReq({ auth: { userId: 1 }, params: { appointmentId: 'x' } }), badCompleteRes);
    expect(badCompleteRes.status).toHaveBeenCalledWith(400);
  });

  it('handles saveSummary transaction paths and success', async () => {
    const { saveSummary } = await import('../../controllers/booking/bookingController.js');

    doctorFindOne.mockResolvedValueOnce(null);
    const noDoctorRes = createMockRes();
    await saveSummary(
      createMockReq({ auth: { userId: 1 }, params: { appointmentId: '2' }, body: { summary: 'Good' } }),
      noDoctorRes
    );
    expect(noDoctorRes.status).toHaveBeenCalledWith(404);

    doctorFindOne.mockResolvedValueOnce({ id: 77 });
    appointmentFindOne.mockResolvedValueOnce(null);
    const noAptRes = createMockRes();
    await saveSummary(
      createMockReq({ auth: { userId: 1 }, params: { appointmentId: '2' }, body: { summary: 'Good' } }),
      noAptRes
    );
    expect(noAptRes.status).toHaveBeenCalledWith(404);

    doctorFindOne.mockResolvedValueOnce({ id: 77 });
    appointmentFindOne.mockResolvedValueOnce({ status: 'scheduled' });
    const wrongStatusRes = createMockRes();
    await saveSummary(
      createMockReq({ auth: { userId: 1 }, params: { appointmentId: '2' }, body: { summary: 'Good' } }),
      wrongStatusRes
    );
    expect(wrongStatusRes.status).toHaveBeenCalledWith(409);

    const save = vi.fn(async () => undefined);
    doctorFindOne.mockResolvedValueOnce({ id: 77 });
    appointmentFindOne.mockResolvedValueOnce({ id: 2, status: 'confirmed', save });
    appointmentFindByPk.mockResolvedValueOnce({ id: 2 });
    const okRes = createMockRes();
    await saveSummary(
      createMockReq({ auth: { userId: 1 }, params: { appointmentId: '2' }, body: { summary: 'Final summary' } }),
      okRes
    );
    expect(save).toHaveBeenCalled();
    expect(okRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Summary saved successfully.' })
    );
  });

  it('handles markComplete transaction paths and success', async () => {
    const { markComplete } = await import('../../controllers/booking/bookingController.js');

    doctorFindOne.mockResolvedValueOnce(null);
    const noDoctorRes = createMockRes();
    await markComplete(createMockReq({ auth: { userId: 1 }, params: { appointmentId: '2' } }), noDoctorRes);
    expect(noDoctorRes.status).toHaveBeenCalledWith(404);

    doctorFindOne.mockResolvedValueOnce({ id: 77 });
    appointmentFindOne.mockResolvedValueOnce(null);
    const noAptRes = createMockRes();
    await markComplete(createMockReq({ auth: { userId: 1 }, params: { appointmentId: '2' } }), noAptRes);
    expect(noAptRes.status).toHaveBeenCalledWith(404);

    doctorFindOne.mockResolvedValueOnce({ id: 77 });
    appointmentFindOne.mockResolvedValueOnce({ status: 'scheduled' });
    const wrongStatusRes = createMockRes();
    await markComplete(createMockReq({ auth: { userId: 1 }, params: { appointmentId: '2' } }), wrongStatusRes);
    expect(wrongStatusRes.status).toHaveBeenCalledWith(409);

    doctorFindOne.mockResolvedValueOnce({ id: 77 });
    appointmentFindOne.mockResolvedValueOnce({ status: 'confirmed', summary: '' });
    const missingSummaryRes = createMockRes();
    await markComplete(createMockReq({ auth: { userId: 1 }, params: { appointmentId: '2' } }), missingSummaryRes);
    expect(missingSummaryRes.status).toHaveBeenCalledWith(409);

    const save = vi.fn(async () => undefined);
    doctorFindOne.mockResolvedValueOnce({ id: 77 });
    appointmentFindOne.mockResolvedValueOnce({ id: 2, status: 'confirmed', summary: 'Done', save });
    appointmentFindByPk.mockResolvedValueOnce({ id: 2 });
    const okRes = createMockRes();
    await markComplete(createMockReq({ auth: { userId: 1 }, params: { appointmentId: '2' } }), okRes);
    expect(save).toHaveBeenCalled();
    expect(okRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Appointment marked as complete.' })
    );
  });
});
