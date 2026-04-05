import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockReq, createMockRes } from '../helpers/mockReqRes.js';

const patientCount = vi.fn();
const doctorCount = vi.fn();
const appointmentCount = vi.fn();
const appointmentFindAll = vi.fn();

vi.mock('../../models/index.js', () => ({
  AdminLog: {},
  Appointment: {
    findAll: appointmentFindAll,
    count: (...args) => appointmentCount(...args),
  },
  Doctor: {
    count: (...args) => doctorCount(...args),
  },
  Patient: {
    count: (...args) => patientCount(...args),
  },
  User: {},
}));

vi.mock('../../services/email-strategy/index.js', () => ({
  sendEmailByType: vi.fn().mockResolvedValue({}),
}));

describe('getDashboardStats', () => {
  let getDashboardStats;

  beforeEach(async () => {
    patientCount.mockReset();
    doctorCount.mockReset();
    appointmentCount.mockReset();
    const mod = await import('../../controllers/roles/adminController.js');
    getDashboardStats = mod.getDashboardStats;
  });

  it('returns all four stats', async () => {
    patientCount.mockResolvedValue(50);
    doctorCount.mockResolvedValueOnce(10); // verified (approved)
    doctorCount.mockResolvedValueOnce(3);  // pending
    appointmentCount.mockResolvedValue(200);

    const req = createMockReq();
    const res = createMockRes();

    await getDashboardStats(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      total_patients: 50,
      verified_doctors: 10,
      pending_doctors: 3,
      total_bookings: 200,
    });
  });

  it('returns zeroes when no data exists', async () => {
    patientCount.mockResolvedValue(0);
    doctorCount.mockResolvedValue(0);
    appointmentCount.mockResolvedValue(0);

    const req = createMockReq();
    const res = createMockRes();

    await getDashboardStats(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const body = res.json.mock.calls[0][0];
    expect(body.total_patients).toBe(0);
    expect(body.verified_doctors).toBe(0);
    expect(body.pending_doctors).toBe(0);
    expect(body.total_bookings).toBe(0);
  });

  it('returns 500 on database error', async () => {
    patientCount.mockRejectedValue(new Error('DB down'));

    const req = createMockReq();
    const res = createMockRes();

    await getDashboardStats(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'DB down' });
  });
});

describe('getBookingAnalytics', () => {
  let getBookingAnalytics;

  beforeEach(async () => {
    appointmentFindAll.mockReset();
    const mod = await import('../../controllers/roles/adminController.js');
    getBookingAnalytics = mod.getBookingAnalytics;
  });

  function makeAppointment(overrides = {}) {
    return {
      id: 1,
      status: 'completed',
      appointment_type: 'virtual',
      appointment_date: '2026-04-01',
      start_time: '10:00',
      duration: 30,
      doctor_id: 1,
      created_at: new Date('2026-04-01T10:00:00Z'),
      cancellation_reason: null,
      doctor: { id: 1, full_name: 'Dr. Smith', specialty: 'Audiology' },
      ...overrides,
    };
  }

  it('returns correct status breakdown', async () => {
    appointmentFindAll.mockResolvedValue([
      makeAppointment({ id: 1, status: 'completed' }),
      makeAppointment({ id: 2, status: 'completed' }),
      makeAppointment({ id: 3, status: 'cancelled', cancellation_reason: 'Cancelled by patient: reason' }),
      makeAppointment({ id: 4, status: 'scheduled' }),
      makeAppointment({ id: 5, status: 'no-show' }),
    ]);

    const req = createMockReq({ query: { timeframe: '30d' } });
    const res = createMockRes();

    await getBookingAnalytics(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const body = res.json.mock.calls[0][0];

    expect(body.summary.total_appointments).toBe(5);
    expect(body.summary.completion_rate).toBe(40);
    expect(body.summary.cancellation_rate).toBe(20);
    expect(body.summary.no_show_rate).toBe(20);
  });

  it('returns correct type breakdown', async () => {
    appointmentFindAll.mockResolvedValue([
      makeAppointment({ id: 1, appointment_type: 'virtual' }),
      makeAppointment({ id: 2, appointment_type: 'virtual' }),
      makeAppointment({ id: 3, appointment_type: 'in-person' }),
    ]);

    const req = createMockReq({ query: { timeframe: '30d' } });
    const res = createMockRes();

    await getBookingAnalytics(req, res);

    const body = res.json.mock.calls[0][0];
    expect(body.type_breakdown).toEqual(
      expect.arrayContaining([
        { type: 'virtual', count: 2 },
        { type: 'in-person', count: 1 },
      ])
    );
  });

  it('computes daily trends', async () => {
    appointmentFindAll.mockResolvedValue([
      makeAppointment({ id: 1, appointment_date: '2026-04-01', status: 'completed' }),
      makeAppointment({ id: 2, appointment_date: '2026-04-01', status: 'cancelled' }),
      makeAppointment({ id: 3, appointment_date: '2026-04-02', status: 'completed' }),
    ]);

    const req = createMockReq({ query: { timeframe: '30d' } });
    const res = createMockRes();

    await getBookingAnalytics(req, res);

    const body = res.json.mock.calls[0][0];
    expect(body.daily_trends).toEqual([
      { date: '2026-04-01', total: 2, completed: 1, cancelled: 1 },
      { date: '2026-04-02', total: 1, completed: 1, cancelled: 0 },
    ]);
  });

  it('ranks top doctors', async () => {
    appointmentFindAll.mockResolvedValue([
      makeAppointment({ id: 1, doctor_id: 2, doctor: { id: 2, full_name: 'Dr. Jones', specialty: 'ENT' } }),
      makeAppointment({ id: 2, doctor_id: 2, doctor: { id: 2, full_name: 'Dr. Jones', specialty: 'ENT' } }),
      makeAppointment({ id: 3, doctor_id: 1 }),
    ]);

    const req = createMockReq({ query: { timeframe: '30d' } });
    const res = createMockRes();

    await getBookingAnalytics(req, res);

    const body = res.json.mock.calls[0][0];
    expect(body.top_doctors[0].doctor_id).toBe(2);
    expect(body.top_doctors[0].total).toBe(2);
  });

  it('computes peak hours and days', async () => {
    appointmentFindAll.mockResolvedValue([
      makeAppointment({ id: 1, start_time: '09:00', appointment_date: '2026-04-01' }),
      makeAppointment({ id: 2, start_time: '09:30', appointment_date: '2026-04-01' }),
      makeAppointment({ id: 3, start_time: '14:00', appointment_date: '2026-04-02' }),
    ]);

    const req = createMockReq({ query: { timeframe: '30d' } });
    const res = createMockRes();

    await getBookingAnalytics(req, res);

    const body = res.json.mock.calls[0][0];
    expect(body.peak_hours.find((h) => h.hour === 9).count).toBe(2);
    expect(body.peak_hours.find((h) => h.hour === 14).count).toBe(1);
    expect(body.peak_hours).toHaveLength(24);
    expect(body.peak_days).toHaveLength(7);
  });

  it('splits cancellations by patient vs doctor', async () => {
    appointmentFindAll.mockResolvedValue([
      makeAppointment({ id: 1, status: 'cancelled', cancellation_reason: 'Cancelled by patient: no longer needed' }),
      makeAppointment({ id: 2, status: 'cancelled', cancellation_reason: 'Declined by doctor: schedule_conflict' }),
    ]);

    const req = createMockReq({ query: { timeframe: '30d' } });
    const res = createMockRes();

    await getBookingAnalytics(req, res);

    const body = res.json.mock.calls[0][0];
    expect(body.cancellation_insights.total_cancelled).toBe(2);
    expect(body.cancellation_insights.by_role).toEqual(
      expect.arrayContaining([
        { role: 'Patient', count: 1 },
        { role: 'Doctor', count: 1 },
      ])
    );
  });

  it('defaults invalid timeframe to 30d', async () => {
    appointmentFindAll.mockResolvedValue([]);

    const req = createMockReq({ query: { timeframe: 'invalid' } });
    const res = createMockRes();

    await getBookingAnalytics(req, res);

    const body = res.json.mock.calls[0][0];
    expect(body.timeframe).toBe('30d');
  });

  it('accepts "all" timeframe with null date_range', async () => {
    appointmentFindAll.mockResolvedValue([]);

    const req = createMockReq({ query: { timeframe: 'all' } });
    const res = createMockRes();

    await getBookingAnalytics(req, res);

    const body = res.json.mock.calls[0][0];
    expect(body.timeframe).toBe('all');
    expect(body.date_range).toBeNull();
  });

  it('returns empty results when no appointments', async () => {
    appointmentFindAll.mockResolvedValue([]);

    const req = createMockReq({ query: { timeframe: '30d' } });
    const res = createMockRes();

    await getBookingAnalytics(req, res);

    const body = res.json.mock.calls[0][0];
    expect(body.summary.total_appointments).toBe(0);
    expect(body.summary.completion_rate).toBe(0);
    expect(body.daily_trends).toEqual([]);
    expect(body.top_doctors).toEqual([]);
  });

  it('returns 500 on error', async () => {
    appointmentFindAll.mockRejectedValue(new Error('DB error'));

    const req = createMockReq({ query: { timeframe: '30d' } });
    const res = createMockRes();

    await getBookingAnalytics(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'DB error' });
  });
});
