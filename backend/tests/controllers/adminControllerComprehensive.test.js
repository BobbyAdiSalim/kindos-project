import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockReq, createMockRes } from '../helpers/mockReqRes.js';

const doctorFindAll = vi.fn();
const doctorFindByPk = vi.fn();
const doctorUpdate = vi.fn();
const userFindByPk = vi.fn();
const adminLogCreate = vi.fn();
const appointmentFindAll = vi.fn();

vi.mock('../../models/index.js', () => ({
  AdminLog: {
    create: adminLogCreate,
  },
  Appointment: {
    findAll: appointmentFindAll,
  },
  Doctor: {
    findAll: doctorFindAll,
    findByPk: doctorFindByPk,
  },
  Patient: {},
  User: {
    findByPk: userFindByPk,
  },
}));

vi.mock('../../services/email-strategy/index.js', () => ({
  sendEmailByType: vi.fn().mockResolvedValue({}),
}));

describe('adminController - comprehensive', () => {
  beforeEach(() => {
    vi.resetModules();
    doctorFindAll.mockReset();
    doctorFindByPk.mockReset();
    adminLogCreate.mockReset();
    userFindByPk.mockReset();
    appointmentFindAll.mockReset();
  });

  describe('getUnverifiedDoctors', () => {
    it('returns pending doctors', async () => {
      const { getUnverifiedDoctors } = await import('../../controllers/roles/adminController.js');

      doctorFindAll.mockResolvedValue([
        {
          id: 1,
          user_id: 10,
          full_name: 'Dr. Alice',
          specialty: 'Cardiology',
          license_number: 'LIC001',
          verification_status: 'pending',
          verification_documents: [],
          updated_at: new Date(),
          user: { email: 'alice@example.com' },
        },
      ]);

      const req = createMockReq({ query: { status: 'pending' } });
      const res = createMockRes();

      await getUnverifiedDoctors(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          doctors: expect.arrayContaining([
            expect.objectContaining({
              verification_status: 'pending',
            }),
          ]),
        })
      );
    });

    it('returns all non-approved doctors when status not specified', async () => {
      const { getUnverifiedDoctors } = await import('../../controllers/roles/adminController.js');

      doctorFindAll.mockResolvedValue([
        {
          id: 1,
          verification_status: 'denied',
          user: { email: 'test@example.com' },
        },
        {
          id: 2,
          verification_status: 'pending',
          user: { email: 'test2@example.com' },
        },
      ]);

      const req = createMockReq({ query: {} });
      const res = createMockRes();

      await getUnverifiedDoctors(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json.mock.calls[0][0].doctors.length).toBe(2);
    });

    it('handles database errors', async () => {
      const { getUnverifiedDoctors } = await import('../../controllers/roles/adminController.js');

      doctorFindAll.mockRejectedValue(new Error('Database down'));

      const req = createMockReq({ query: {} });
      const res = createMockRes();

      await getUnverifiedDoctors(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('updateDoctorVerificationStatus', () => {
    it('approves doctor successfully', async () => {
      const { updateDoctorVerificationStatus } = await import('../../controllers/roles/adminController.js');

      const mockUpdate = vi.fn().mockResolvedValue({});
      doctorFindByPk.mockResolvedValue({
        id: 1,
        user_id: 10,
        update: mockUpdate,
      });
      adminLogCreate.mockResolvedValue({});
      userFindByPk.mockResolvedValue({ email: 'doctor@example.com' });

      const req = createMockReq({
        params: { doctorId: '1' },
        body: { status: 'approved' },
        auth: { userId: 100 },
      });
      const res = createMockRes();

      await updateDoctorVerificationStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(adminLogCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          action_type: 'doctor_verified',
        })
      );
    });

    it('denies doctor with reason', async () => {
      const { updateDoctorVerificationStatus } = await import('../../controllers/roles/adminController.js');

      const mockUpdate = vi.fn().mockResolvedValue({});
      doctorFindByPk.mockResolvedValue({
        id: 2,
        user_id: 20,
        update: mockUpdate,
      });
      adminLogCreate.mockResolvedValue({});
      userFindByPk.mockResolvedValue({ email: 'doctor2@example.com' });

      const req = createMockReq({
        params: { doctorId: '2' },
        body: { status: 'denied', reason: 'Invalid credentials' },
        auth: { userId: 100 },
      });
      const res = createMockRes();

      await updateDoctorVerificationStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(adminLogCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          action_type: 'doctor_denied',
          details: expect.objectContaining({
            reason: 'Invalid credentials',
          }),
        })
      );
    });

    it('returns 400 for invalid doctor id', async () => {
      const { updateDoctorVerificationStatus } = await import('../../controllers/roles/adminController.js');

      const req = createMockReq({
        params: { doctorId: 'not-a-number' },
        body: { status: 'approved' },
        auth: { userId: 100 },
      });
      const res = createMockRes();

      await updateDoctorVerificationStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Invalid doctor id'),
        })
      );
    });

    it('returns 400 for invalid status', async () => {
      const { updateDoctorVerificationStatus } = await import('../../controllers/roles/adminController.js');

      const req = createMockReq({
        params: { doctorId: '1' },
        body: { status: 'unknown' },
        auth: { userId: 100 },
      });
      const res = createMockRes();

      await updateDoctorVerificationStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('requires reason when denying', async () => {
      const { updateDoctorVerificationStatus } = await import('../../controllers/roles/adminController.js');

      const req = createMockReq({
        params: { doctorId: '1' },
        body: { status: 'denied' },
        auth: { userId: 100 },
      });
      const res = createMockRes();

      await updateDoctorVerificationStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('reason'),
        })
      );
    });

    it('returns 404 when doctor not found', async () => {
      const { updateDoctorVerificationStatus } = await import('../../controllers/roles/adminController.js');

      doctorFindByPk.mockResolvedValue(null);

      const req = createMockReq({
        params: { doctorId: '999' },
        body: { status: 'approved' },
        auth: { userId: 100 },
      });
      const res = createMockRes();

      await updateDoctorVerificationStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('handles email sending failure gracefully', async () => {
      const { updateDoctorVerificationStatus } = await import('../../controllers/roles/adminController.js');

      const mockUpdate = vi.fn().mockResolvedValue({});
      doctorFindByPk.mockResolvedValue({
        id: 3,
        user_id: 30,
        update: mockUpdate,
      });
      adminLogCreate.mockResolvedValue({});
      userFindByPk.mockRejectedValue(new Error('User not found'));

      const req = createMockReq({
        params: { doctorId: '3' },
        body: { status: 'approved' },
        auth: { userId: 100 },
      });
      const res = createMockRes();

      await updateDoctorVerificationStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getAppointmentRejectionAnalytics', () => {
    it('returns analytics for default timeframe', async () => {
      const { getAppointmentRejectionAnalytics } = await import('../../controllers/roles/adminController.js');

      appointmentFindAll.mockResolvedValue([
        { doctor_rejection_reason_code: 'schedule_conflict' },
        { doctor_rejection_reason_code: 'schedule_conflict' },
        { doctor_rejection_reason_code: 'other' },
      ]);

      const req = createMockReq({ query: { timeframe: '30d' } });
      const res = createMockRes();

      await getAppointmentRejectionAnalytics(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          timeframe: '30d',
          summary: expect.objectContaining({
            total_declined_appointments: 3,
            unique_reason_count: 2,
          }),
        })
      );
    });

    it('handles empty appointment list', async () => {
      const { getAppointmentRejectionAnalytics } = await import('../../controllers/roles/adminController.js');

      appointmentFindAll.mockResolvedValue([]);

      const req = createMockReq({ query: { timeframe: '7d' } });
      const res = createMockRes();

      await getAppointmentRejectionAnalytics(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          summary: expect.objectContaining({
            total_declined_appointments: 0,
          }),
        })
      );
    });

    it('defaults to 30d for invalid timeframe', async () => {
      const { getAppointmentRejectionAnalytics } = await import('../../controllers/roles/adminController.js');

      appointmentFindAll.mockResolvedValue([]);

      const req = createMockReq({ query: { timeframe: 'invalid' } });
      const res = createMockRes();

      await getAppointmentRejectionAnalytics(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          timeframe: '30d',
        })
      );
    });

    it('handles all timeframe without date limit', async () => {
      const { getAppointmentRejectionAnalytics } = await import('../../controllers/roles/adminController.js');

      appointmentFindAll.mockResolvedValue([
        { doctor_rejection_reason_code: 'schedule_conflict' },
      ]);

      const req = createMockReq({ query: { timeframe: 'all' } });
      const res = createMockRes();

      await getAppointmentRejectionAnalytics(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          timeframe: 'all',
          date_range: null,
        })
      );
    });

    it('supports all timeframe options', async () => {
      const { getAppointmentRejectionAnalytics } = await import('../../controllers/roles/adminController.js');

      for (const timeframe of ['7d', '30d', '90d', '365d']) {
        appointmentFindAll.mockResolvedValue([]);

        const req = createMockReq({ query: { timeframe } });
        const res = createMockRes();

        await getAppointmentRejectionAnalytics(req, res);

        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            timeframe,
            date_range: expect.objectContaining({
              start: expect.any(String),
              end: expect.any(String),
            }),
          })
        );
      }
    });

    it('sorts reasons by count descending', async () => {
      const { getAppointmentRejectionAnalytics } = await import('../../controllers/roles/adminController.js');

      appointmentFindAll.mockResolvedValue([
        { doctor_rejection_reason_code: 'schedule_conflict' },
        { doctor_rejection_reason_code: 'schedule_conflict' },
        { doctor_rejection_reason_code: 'schedule_conflict' },
        { doctor_rejection_reason_code: 'other' },
        { doctor_rejection_reason_code: 'other' },
      ]);

      const req = createMockReq({ query: {} });
      const res = createMockRes();

      await getAppointmentRejectionAnalytics(req, res);

      const response = res.json.mock.calls[0][0];
      expect(response.reasons[0].count).toBeGreaterThanOrEqual(
        response.reasons[1]?.count || 0
      );
    });

    it('filters to include only reasons with count > 0', async () => {
      const { getAppointmentRejectionAnalytics } = await import('../../controllers/roles/adminController.js');

      appointmentFindAll.mockResolvedValue([
        { doctor_rejection_reason_code: 'schedule_conflict' },
      ]);

      const req = createMockReq({ query: {} });
      const res = createMockRes();

      await getAppointmentRejectionAnalytics(req, res);

      const response = res.json.mock.calls[0][0];
      expect(response.reasons.every((r) => r.count > 0)).toBe(true);
    });

    it('handles database errors', async () => {
      const { getAppointmentRejectionAnalytics } = await import('../../controllers/roles/adminController.js');

      appointmentFindAll.mockRejectedValue(new Error('DB connection lost'));

      const req = createMockReq({ query: {} });
      const res = createMockRes();

      await getAppointmentRejectionAnalytics(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
