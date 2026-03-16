import { createMockReq, createMockRes } from '../helpers/mockReqRes.js';

const appointmentFindAll = vi.fn();

vi.mock('../../models/index.js', () => ({
  AdminLog: {},
  Appointment: {
    findAll: appointmentFindAll,
  },
  Doctor: {},
  Patient: {},
  User: {},
}));

describe('getAppointmentRejectionAnalytics', () => {
  beforeEach(() => {
    vi.resetModules();
    appointmentFindAll.mockReset();
  });

  it('groups declined appointments by reason code', async () => {
    appointmentFindAll.mockResolvedValue([
      { doctor_rejection_reason_code: 'schedule_conflict' },
      { doctor_rejection_reason_code: 'schedule_conflict' },
      { doctor_rejection_reason_code: 'other' },
    ]);

    const { getAppointmentRejectionAnalytics } = await import('../../controllers/roles/adminController.js');
    const req = createMockReq({
      query: { timeframe: '30d' },
    });
    const res = createMockRes();

    await getAppointmentRejectionAnalytics(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        timeframe: '30d',
        summary: expect.objectContaining({
          total_declined_appointments: 3,
          unique_reason_count: 2,
          top_reason: expect.objectContaining({
            code: 'schedule_conflict',
            count: 2,
          }),
        }),
        reasons: expect.arrayContaining([
          expect.objectContaining({ code: 'schedule_conflict', count: 2 }),
          expect.objectContaining({ code: 'other', count: 1 }),
        ]),
      })
    );
  });
});
