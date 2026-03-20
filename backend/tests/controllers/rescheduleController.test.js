import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockReq, createMockRes } from '../helpers/mockReqRes.js';

const txMock = vi.fn();
const appointmentFindOneMock = vi.fn();
const appointmentFindByPkMock = vi.fn();
const doctorFindByPkMock = vi.fn();
const doctorFindOneMock = vi.fn();

const sendDoctorRescheduleEmailToPatientMock = vi.fn();
const sendPatientRescheduleEmailToDoctorMock = vi.fn();

const validateSlotSelectionPayloadMock = vi.fn();
const serializeAppointmentMock = vi.fn((a) => a);
const ensureSlotIsBookableMock = vi.fn();
const ensureNoOverlappingAppointmentMock = vi.fn();
const getPatientForUserMock = vi.fn();
const hasPendingRescheduleMock = vi.fn();
const clearPendingRescheduleMock = vi.fn();

vi.mock('../../models/index.js', () => ({
  sequelize: { transaction: txMock },
  Appointment: { findOne: appointmentFindOneMock, findByPk: appointmentFindByPkMock },
  Doctor: { findByPk: doctorFindByPkMock, findOne: doctorFindOneMock },
}));

vi.mock('../../utils/appointmentEmail.js', () => ({
  sendDoctorRescheduleEmailToPatient: sendDoctorRescheduleEmailToPatientMock,
  sendPatientRescheduleEmailToDoctor: sendPatientRescheduleEmailToDoctorMock,
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
    APPOINTMENT_TYPES: new Set(['virtual', 'in-person']),
    normalizeTime: vi.fn((v) => v),
    appointmentInclude: [],
    serializeAppointment: serializeAppointmentMock,
    validateSlotSelectionPayload: validateSlotSelectionPayloadMock,
    ensureSlotIsBookable: ensureSlotIsBookableMock,
    ensureNoOverlappingAppointment: ensureNoOverlappingAppointmentMock,
    getPatientForUser: getPatientForUserMock,
    hasPendingReschedule: hasPendingRescheduleMock,
    clearPendingReschedule: clearPendingRescheduleMock,
  };
});

describe('rescheduleController', () => {
  beforeEach(() => {
    vi.resetModules();
    txMock.mockReset();
    appointmentFindOneMock.mockReset();
    appointmentFindByPkMock.mockReset();
    doctorFindByPkMock.mockReset();
    doctorFindOneMock.mockReset();
    sendDoctorRescheduleEmailToPatientMock.mockReset();
    sendPatientRescheduleEmailToDoctorMock.mockReset();
    validateSlotSelectionPayloadMock.mockReset();
    serializeAppointmentMock.mockClear();
    ensureSlotIsBookableMock.mockReset();
    ensureNoOverlappingAppointmentMock.mockReset();
    getPatientForUserMock.mockReset();
    hasPendingRescheduleMock.mockReset();
    clearPendingRescheduleMock.mockReset();

    validateSlotSelectionPayloadMock.mockReturnValue({
      appointmentDate: '2026-12-25',
      startTime: '10:00:00',
      endTime: '10:30:00',
      appointmentType: 'virtual',
      duration: 30,
    });

    txMock.mockImplementation(async (cb) => cb({ LOCK: { UPDATE: 'UPDATE' } }));
  });

  it('rescheduleAppointment routes unauthorized roles to 403', async () => {
    const { rescheduleAppointment } = await import('../../controllers/booking/rescheduleController.js');

    const req = createMockReq({ auth: { role: 'admin' } });
    const res = createMockRes();

    await rescheduleAppointment(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('rescheduleAppointmentByPatient validates appointment id', async () => {
    const { rescheduleAppointmentByPatient } = await import('../../controllers/booking/rescheduleController.js');

    const req = createMockReq({ auth: { userId: 1 }, params: { appointmentId: 'abc' }, body: {} });
    const res = createMockRes();

    await rescheduleAppointmentByPatient(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('rescheduleAppointmentByDoctor validates appointment id', async () => {
    const { rescheduleAppointmentByDoctor } = await import('../../controllers/booking/rescheduleController.js');

    const req = createMockReq({ auth: { userId: 2 }, params: { appointmentId: 'abc' }, body: {} });
    const res = createMockRes();

    await rescheduleAppointmentByDoctor(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('respondToDoctorReschedule validates action', async () => {
    const { respondToDoctorReschedule } = await import('../../controllers/booking/rescheduleController.js');

    const req = createMockReq({
      auth: { userId: 1 },
      params: { appointmentId: '5' },
      body: { action: 'maybe' },
    });
    const res = createMockRes();

    await respondToDoctorReschedule(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('rescheduleAppointment routes patient role to patient flow', async () => {
    const { rescheduleAppointment } = await import('../../controllers/booking/rescheduleController.js');

    const req = createMockReq({ auth: { role: 'patient', userId: 1 }, params: { appointmentId: 'bad' }, body: {} });
    const res = createMockRes();

    await rescheduleAppointment(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('rescheduleAppointmentByPatient completes scheduling update flow', async () => {
    const { rescheduleAppointmentByPatient } = await import('../../controllers/booking/rescheduleController.js');

    getPatientForUserMock.mockResolvedValue({ id: 10 });

    const saveMock = vi.fn().mockResolvedValue(undefined);
    appointmentFindOneMock.mockResolvedValue({
      id: 25,
      patient_id: 10,
      doctor_id: 20,
      status: 'confirmed',
      save: saveMock,
    });

    doctorFindByPkMock.mockResolvedValue({ id: 20, verification_status: 'approved' });
    ensureSlotIsBookableMock.mockResolvedValue(999);
    ensureNoOverlappingAppointmentMock.mockResolvedValue(undefined);
    appointmentFindByPkMock.mockResolvedValue({
      id: 25,
      appointment_date: '2026-12-25',
      start_time: '10:00:00',
      appointment_type: 'virtual',
      doctor: { user: {} },
      patient: { user: {} },
    });

    const req = createMockReq({ auth: { userId: 1 }, params: { appointmentId: '25' }, body: {} });
    const res = createMockRes();

    await rescheduleAppointmentByPatient(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Appointment rescheduled. Waiting for doctor reconfirmation.' }));
    expect(saveMock).toHaveBeenCalled();
  });

  it('rescheduleAppointmentByDoctor returns 404 when doctor profile missing', async () => {
    const { rescheduleAppointmentByDoctor } = await import('../../controllers/booking/rescheduleController.js');

    doctorFindOneMock.mockResolvedValue(null);

    const req = createMockReq({ auth: { userId: 9 }, params: { appointmentId: '4' }, body: {} });
    const res = createMockRes();

    await rescheduleAppointmentByDoctor(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('respondToDoctorReschedule validates appointment id', async () => {
    const { respondToDoctorReschedule } = await import('../../controllers/booking/rescheduleController.js');

    const req = createMockReq({ auth: { userId: 1 }, params: { appointmentId: 'bad' }, body: { action: 'accept' } });
    const res = createMockRes();

    await respondToDoctorReschedule(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});
