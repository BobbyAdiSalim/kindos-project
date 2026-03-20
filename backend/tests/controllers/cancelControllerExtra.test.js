import { createMockReq, createMockRes } from '../helpers/mockReqRes.js';

const sequelizeTransaction = vi.fn();
const appointmentFindOne = vi.fn();
const appointmentFindByPk = vi.fn();
const doctorFindOne = vi.fn();

const waitlistFulfill = vi.fn();
const sendDoctorApprovalEmail = vi.fn();
const sendDoctorCancellationEmail = vi.fn();
const sendPatientCancellationEmailToDoctor = vi.fn();

const getPatientForUser = vi.fn();
const serializeAppointment = vi.fn((appointment) => ({ id: appointment?.id || 0 }));
const clearPendingReschedule = vi.fn((appointment) => {
  appointment.pending_reschedule_date = null;
  appointment.pending_reschedule_start_time = null;
  appointment.pending_reschedule_end_time = null;
  appointment.pending_reschedule_type = null;
  appointment.pending_reschedule_duration = null;
  appointment.pending_reschedule_requested_by_role = null;
  appointment.pending_reschedule_previous_status = null;
  appointment.pending_reschedule_requested_at = null;
});
const hasPendingReschedule = vi.fn((appointment) =>
  Boolean(
    appointment.pending_reschedule_date
    && appointment.pending_reschedule_start_time
    && appointment.pending_reschedule_end_time
    && appointment.pending_reschedule_type
    && appointment.pending_reschedule_duration
    && appointment.pending_reschedule_requested_by_role
  )
);

vi.mock('../../models/index.js', () => ({
  sequelize: { transaction: sequelizeTransaction },
  Appointment: {
    findOne: appointmentFindOne,
    findByPk: appointmentFindByPk,
  },
  Doctor: {
    findOne: doctorFindOne,
  },
  Patient: {},
  User: {},
}));

vi.mock('../../services/WaitlistService.js', () => ({
  default: {
    fulfillWaitlistForCancelledAppointment: waitlistFulfill,
  },
}));

vi.mock('../../utils/appointmentEmail.js', () => ({
  sendDoctorApprovalEmail,
  sendDoctorCancellationEmail,
  sendPatientCancellationEmailToDoctor,
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
    appointmentInclude: [],
    serializeAppointment,
    getPatientForUser,
    clearPendingReschedule,
    hasPendingReschedule,
    CANCELLED_BY_PATIENT_REASON_PREFIX: 'Cancelled by patient',
    DECLINED_BY_DOCTOR_REASON_PREFIX: 'Declined by doctor',
    DOCTOR_REJECTION_REASON_CODES: new Set([
      'schedule_conflict',
      'outside_specialty',
      'insufficient_information',
      'clinic_unavailable',
      'duplicate_booking',
      'other',
    ]),
    getDoctorRejectionReasonLabel: (code) => ({
      schedule_conflict: 'Schedule conflict',
      outside_specialty: 'Outside specialty',
      insufficient_information: 'Insufficient information provided',
      clinic_unavailable: 'Clinic unavailable',
      duplicate_booking: 'Duplicate booking',
      other: 'Other',
    })[code] || null,
  };
});

const tx = { LOCK: { UPDATE: 'update' } };

const createAppointmentStub = (overrides = {}) => ({
  id: 10,
  status: 'scheduled',
  appointment_date: '2026-03-21',
  start_time: '10:00:00',
  appointment_type: 'virtual',
  notify_on_doctor_approval: true,
  doctor_rejection_reason_code: null,
  doctor_rejection_reason_note: null,
  cancelled_at: null,
  cancelled_by: null,
  cancellation_reason: null,
  pending_reschedule_date: null,
  pending_reschedule_start_time: null,
  pending_reschedule_end_time: null,
  pending_reschedule_type: null,
  pending_reschedule_duration: null,
  pending_reschedule_requested_by_role: null,
  pending_reschedule_previous_status: null,
  pending_reschedule_requested_at: null,
  save: vi.fn(async () => undefined),
  ...overrides,
});

describe('cancelController additional coverage', () => {
  beforeEach(() => {
    vi.resetModules();
    sequelizeTransaction.mockReset();
    appointmentFindOne.mockReset();
    appointmentFindByPk.mockReset();
    doctorFindOne.mockReset();
    waitlistFulfill.mockReset();
    sendDoctorApprovalEmail.mockReset();
    sendDoctorCancellationEmail.mockReset();
    sendPatientCancellationEmailToDoctor.mockReset();
    getPatientForUser.mockReset();
    serializeAppointment.mockClear();
    clearPendingReschedule.mockClear();
    hasPendingReschedule.mockClear();

    sequelizeTransaction.mockImplementation(async (callback) => callback(tx));
    waitlistFulfill.mockResolvedValue({ assigned: false });
    sendDoctorApprovalEmail.mockResolvedValue(undefined);
    sendDoctorCancellationEmail.mockResolvedValue(undefined);
    sendPatientCancellationEmailToDoctor.mockResolvedValue(undefined);
  });

  it('cancels an appointment by patient and triggers doctor email flow', async () => {
    const { cancelAppointmentByPatient } = await import('../../controllers/booking/cancelController.js');

    getPatientForUser.mockResolvedValue({ id: 3 });
    const appointment = createAppointmentStub({ status: 'confirmed' });
    appointmentFindOne.mockResolvedValue(appointment);
    appointmentFindByPk.mockResolvedValue({
      id: 10,
      doctor: { full_name: 'Dr A', user: { email: 'doctor@example.com', username: 'doc' } },
      patient: { full_name: 'Patient A', user: { username: 'pat' } },
      appointment_date: '2026-03-21',
      start_time: '10:00:00',
      appointment_type: 'virtual',
    });

    const req = createMockReq({
      params: { appointmentId: '10' },
      auth: { userId: 7 },
      body: { reason: 'Need to reschedule' },
    });
    const res = createMockRes();

    await cancelAppointmentByPatient(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Appointment cancelled successfully.' })
    );
    expect(appointment.status).toBe('cancelled');
    expect(appointment.cancellation_reason).toContain('Cancelled by patient: Need to reschedule');
    expect(waitlistFulfill).toHaveBeenCalled();
    expect(sendPatientCancellationEmailToDoctor).toHaveBeenCalled();
  });

  it('returns 400 for invalid appointment id on patient cancel', async () => {
    const { cancelAppointmentByPatient } = await import('../../controllers/booking/cancelController.js');

    const req = createMockReq({ params: { appointmentId: 'bad' }, auth: { userId: 7 } });
    const res = createMockRes();

    await cancelAppointmentByPatient(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid appointment ID.' });
  });

  it('returns 404/409 paths on patient cancel transaction failures', async () => {
    const { cancelAppointmentByPatient } = await import('../../controllers/booking/cancelController.js');

    getPatientForUser.mockResolvedValue({ id: 3 });
    appointmentFindOne.mockResolvedValue(null);

    const res404 = createMockRes();
    await cancelAppointmentByPatient(createMockReq({ params: { appointmentId: '10' }, auth: { userId: 7 } }), res404);
    expect(res404.status).toHaveBeenCalledWith(404);

    const notCancellable = createAppointmentStub({ status: 'completed' });
    appointmentFindOne.mockResolvedValue(notCancellable);

    const res409 = createMockRes();
    await cancelAppointmentByPatient(createMockReq({ params: { appointmentId: '10' }, auth: { userId: 7 } }), res409);
    expect(res409.status).toHaveBeenCalledWith(409);
  });

  it('confirms scheduled booking and sends approval email when opted in', async () => {
    const { updateAppointmentDecision } = await import('../../controllers/booking/cancelController.js');

    doctorFindOne.mockResolvedValue({ id: 11 });
    const appointment = createAppointmentStub({ status: 'scheduled', notify_on_doctor_approval: true });
    appointmentFindOne.mockResolvedValue(appointment);
    appointmentFindByPk.mockResolvedValue({
      id: 10,
      patient: { full_name: 'Patient A', user: { email: 'patient@example.com', username: 'pat' } },
      doctor: { full_name: 'Dr A', user: { username: 'doc' } },
      appointment_date: '2026-03-21',
      start_time: '10:00:00',
      appointment_type: 'virtual',
      notify_on_doctor_approval: true,
    });

    const req = createMockReq({
      params: { appointmentId: '10' },
      auth: { userId: 21 },
      body: { action: 'confirm' },
    });
    const res = createMockRes();

    await updateAppointmentDecision(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Booking confirmed successfully.' })
    );
    expect(appointment.status).toBe('confirmed');
    expect(sendDoctorApprovalEmail).toHaveBeenCalled();
  });

  it('declines booking with reason and assigns waitlist + cancellation email', async () => {
    const { updateAppointmentDecision } = await import('../../controllers/booking/cancelController.js');

    doctorFindOne.mockResolvedValue({ id: 11 });
    const appointment = createAppointmentStub({ status: 'scheduled' });
    appointmentFindOne.mockResolvedValue(appointment);
    appointmentFindByPk.mockResolvedValue({
      id: 10,
      patient: { full_name: 'Patient A', user: { email: 'patient@example.com' } },
      doctor: { full_name: 'Dr A', user: { username: 'doc' } },
      appointment_date: '2026-03-21',
      start_time: '10:00:00',
      appointment_type: 'virtual',
      doctor_rejection_reason_code: 'schedule_conflict',
      doctor_rejection_reason_note: null,
    });

    const req = createMockReq({
      params: { appointmentId: '10' },
      auth: { userId: 21 },
      body: { action: 'decline', reasonCode: 'schedule_conflict' },
    });
    const res = createMockRes();

    await updateAppointmentDecision(req, res);

    expect(appointment.status).toBe('cancelled');
    expect(appointment.cancellation_reason).toContain('Declined by doctor: Schedule conflict');
    expect(waitlistFulfill).toHaveBeenCalled();
    expect(sendDoctorCancellationEmail).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Booking declined successfully.' })
    );
  });

  it('returns expected validation and conflict errors for doctor decision', async () => {
    const { updateAppointmentDecision } = await import('../../controllers/booking/cancelController.js');

    const badActionRes = createMockRes();
    await updateAppointmentDecision(
      createMockReq({ params: { appointmentId: '10' }, auth: { userId: 21 }, body: { action: 'nope' } }),
      badActionRes
    );
    expect(badActionRes.status).toHaveBeenCalledWith(400);

    const missingReasonNoteRes = createMockRes();
    await updateAppointmentDecision(
      createMockReq({
        params: { appointmentId: '10' },
        auth: { userId: 21 },
        body: { action: 'decline', reasonCode: 'other' },
      }),
      missingReasonNoteRes
    );
    expect(missingReasonNoteRes.status).toHaveBeenCalledWith(400);

    doctorFindOne.mockResolvedValue({ id: 11 });
    appointmentFindOne.mockResolvedValue(createAppointmentStub({ status: 'confirmed' }));
    const statusConflictRes = createMockRes();
    await updateAppointmentDecision(
      createMockReq({ params: { appointmentId: '10' }, auth: { userId: 21 }, body: { action: 'confirm' } }),
      statusConflictRes
    );
    expect(statusConflictRes.status).toHaveBeenCalledWith(409);

    appointmentFindOne.mockResolvedValue(
      createAppointmentStub({
        status: 'scheduled',
        pending_reschedule_requested_by_role: 'doctor',
        pending_reschedule_date: '2026-03-30',
        pending_reschedule_start_time: '09:00:00',
        pending_reschedule_end_time: '09:30:00',
        pending_reschedule_type: 'virtual',
        pending_reschedule_duration: 30,
      })
    );
    const pendingConflictRes = createMockRes();
    await updateAppointmentDecision(
      createMockReq({ params: { appointmentId: '10' }, auth: { userId: 21 }, body: { action: 'confirm' } }),
      pendingConflictRes
    );
    expect(pendingConflictRes.status).toHaveBeenCalledWith(409);
  });
});
