import { createMockReq, createMockRes } from '../helpers/mockReqRes.js';

const appointmentFindAll = vi.fn();

vi.mock('../../models/index.js', () => ({
  sequelize: {},
  Appointment: {
    findAll: appointmentFindAll,
    findOne: vi.fn(),
    findByPk: vi.fn(),
  },
  Connection: {},
  Doctor: {},
  Patient: {},
  User: {},
}));

vi.mock('../../services/role-strategy/index.js', () => ({
  getRoleStrategy: vi.fn(() => ({
    getAppointmentScope: vi.fn(async () => ({})),
  })),
}));

describe('booking timezone serialization', () => {
  beforeEach(() => {
    vi.resetModules();
    appointmentFindAll.mockReset();
  });

  it('includes doctor.time_zone in my appointments response', async () => {
    appointmentFindAll.mockResolvedValue([
      {
        id: 12,
        appointment_date: '2026-03-20',
        start_time: '09:00:00',
        end_time: '09:30:00',
        appointment_type: 'virtual',
        status: 'confirmed',
        duration: 30,
        reason: 'Checkup',
        notes: null,
        accessibility_needs: [],
        summary: null,
        summary_written_at: null,
        cancelled_at: null,
        cancelled_by: null,
        cancellation_reason: null,
        doctor_rejection_reason_code: null,
        doctor_rejection_reason_note: null,
        notify_on_doctor_approval: true,
        pending_reschedule_date: null,
        pending_reschedule_start_time: null,
        pending_reschedule_end_time: null,
        pending_reschedule_type: null,
        pending_reschedule_duration: null,
        pending_reschedule_requested_by_role: null,
        pending_reschedule_previous_status: null,
        pending_reschedule_requested_at: null,
        doctor: {
          id: 3,
          user_id: 99,
          full_name: 'Dr. Time',
          specialty: 'General',
          clinic_location: 'Clinic',
          time_zone: 'America/Los_Angeles',
          virtual_available: true,
          in_person_available: true,
          user: { username: 'drtime' },
        },
        patient: null,
        created_at: '2026-03-15T00:00:00.000Z',
        updated_at: '2026-03-15T00:00:00.000Z',
      },
    ]);

    const { getMyAppointments } = await import('../../controllers/booking/bookingController.js');
    const req = createMockReq({
      auth: { userId: 1, role: 'patient' },
    });
    const res = createMockRes();

    await getMyAppointments(req, res);

    expect(res.json).toHaveBeenCalledWith({
      appointments: [
        expect.objectContaining({
          doctor: expect.objectContaining({
            time_zone: 'America/Los_Angeles',
          }),
        }),
      ],
    });
  });
});

