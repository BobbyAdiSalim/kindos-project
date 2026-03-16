import { createMockReq, createMockRes } from '../helpers/mockReqRes.js';

const appointmentFindOne = vi.fn();
const doctorFindOne = vi.fn();
const findByPk = vi.fn();
const sequelizeTransaction = vi.fn();

vi.mock('../../models/index.js', () => ({
  sequelize: {
    transaction: sequelizeTransaction,
  },
  Appointment: {
    findOne: appointmentFindOne,
    findByPk,
  },
  Doctor: {
    findOne: doctorFindOne,
  },
  Patient: {},
  User: {},
}));

vi.mock('../../services/WaitlistService.js', () => ({
  default: {
    fulfillWaitlistForCancelledAppointment: vi.fn(async () => ({ assigned: false })),
  },
}));

vi.mock('../../utils/appointmentEmail.js', () => ({
  sendDoctorApprovalEmail: vi.fn(),
  sendDoctorCancellationEmail: vi.fn(),
  sendPatientCancellationEmailToDoctor: vi.fn(),
}));

describe('updateAppointmentDecision', () => {
  beforeEach(() => {
    vi.resetModules();
    appointmentFindOne.mockReset();
    doctorFindOne.mockReset();
    findByPk.mockReset();
    sequelizeTransaction.mockReset();
  });

  it('returns 400 when decline is missing reasonCode', async () => {
    const { updateAppointmentDecision } = await import('../../controllers/booking/cancelController.js');
    const req = createMockReq({
      params: { appointmentId: '1' },
      auth: { userId: 7 },
      body: { action: 'decline' },
    });
    const res = createMockRes();

    await updateAppointmentDecision(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'reasonCode is required when declining an appointment.',
    });
  });

  it('returns 400 for an invalid doctor rejection reason', async () => {
    const { updateAppointmentDecision } = await import('../../controllers/booking/cancelController.js');
    const req = createMockReq({
      params: { appointmentId: '1' },
      auth: { userId: 7 },
      body: { action: 'decline', reasonCode: 'not-real' },
    });
    const res = createMockRes();

    await updateAppointmentDecision(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Invalid doctor rejection reason.',
    });
  });
});
