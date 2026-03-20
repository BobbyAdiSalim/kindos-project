import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockReq, createMockRes } from '../helpers/mockReqRes.js';

const txMock = vi.fn();
const patientFindOne = vi.fn();
const appointmentFindOne = vi.fn();
const reviewFindOne = vi.fn();
const reviewCreate = vi.fn();
const reviewFindByPk = vi.fn();
const reviewFindAll = vi.fn();
const doctorFindByPk = vi.fn();

vi.mock('../../models/index.js', () => ({
  sequelize: { transaction: txMock },
  Appointment: { findOne: appointmentFindOne },
  Doctor: { findByPk: doctorFindByPk },
  Patient: { findOne: patientFindOne },
  Review: {
    findOne: reviewFindOne,
    create: reviewCreate,
    findByPk: reviewFindByPk,
    findAll: reviewFindAll,
  },
  User: {},
}));

describe('reviewController', () => {
  beforeEach(() => {
    vi.resetModules();
    txMock.mockReset();
    patientFindOne.mockReset();
    appointmentFindOne.mockReset();
    reviewFindOne.mockReset();
    reviewCreate.mockReset();
    reviewFindByPk.mockReset();
    reviewFindAll.mockReset();
    doctorFindByPk.mockReset();
  });

  it('upsertReview validates appointment_id', async () => {
    const { upsertReview } = await import('../../controllers/other/reviewController.js');
    const req = createMockReq({ auth: { userId: 1 }, body: { appointment_id: 'x', rating: 5 } });
    const res = createMockRes();

    await upsertReview(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('upsertReview validates rating', async () => {
    const { upsertReview } = await import('../../controllers/other/reviewController.js');
    const req = createMockReq({ auth: { userId: 1 }, body: { appointment_id: 1, rating: 0 } });
    const res = createMockRes();

    await upsertReview(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('upsertReview creates a new review', async () => {
    const { upsertReview } = await import('../../controllers/other/reviewController.js');

    txMock.mockImplementation(async (cb) => cb({ LOCK: { UPDATE: 'UPDATE' } }));
    patientFindOne.mockResolvedValue({ id: 11 });
    appointmentFindOne.mockResolvedValue({ id: 31, doctor_id: 51, status: 'completed' });
    reviewFindOne.mockResolvedValue(null);
    reviewCreate.mockResolvedValue({ id: 91 });
    reviewFindByPk.mockResolvedValue({
      id: 91,
      patient_id: 11,
      doctor_id: 51,
      rating: 5,
      comment: 'Great',
      is_anonymous: false,
      patient: { full_name: 'Pat', user: { username: 'pat1' } },
      created_at: new Date(),
      updated_at: new Date(),
    });

    const req = createMockReq({
      auth: { userId: 1 },
      body: { appointment_id: 31, rating: 5, comment: 'Great', is_anonymous: false },
    });
    const res = createMockRes();

    await upsertReview(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Review submitted successfully.' }));
  });

  it('upsertReview updates existing review', async () => {
    const { upsertReview } = await import('../../controllers/other/reviewController.js');

    txMock.mockImplementation(async (cb) => cb({ LOCK: { UPDATE: 'UPDATE' } }));
    patientFindOne.mockResolvedValue({ id: 11 });
    appointmentFindOne.mockResolvedValue({ id: 31, doctor_id: 51, status: 'completed' });

    const saveMock = vi.fn().mockResolvedValue(undefined);
    reviewFindOne.mockResolvedValue({ id: 77, rating: 2, comment: 'old', is_anonymous: false, save: saveMock });
    reviewFindByPk.mockResolvedValue({
      id: 77,
      patient_id: 11,
      doctor_id: 51,
      rating: 4,
      comment: 'Updated',
      is_anonymous: true,
      patient: { full_name: 'Pat', user: { username: 'pat1' } },
      created_at: new Date(),
      updated_at: new Date(),
    });

    const req = createMockReq({
      auth: { userId: 1 },
      body: { appointment_id: 31, rating: 4, comment: 'Updated', is_anonymous: true },
    });
    const res = createMockRes();

    await upsertReview(req, res);

    expect(saveMock).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Review updated successfully.' }));
  });

  it('getMyReviewForDoctor validates doctorId', async () => {
    const { getMyReviewForDoctor } = await import('../../controllers/other/reviewController.js');
    const req = createMockReq({ auth: { userId: 1 }, params: { doctorId: 'bad' } });
    const res = createMockRes();

    await getMyReviewForDoctor(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('getDoctorReviews returns aggregate review payload', async () => {
    const { getDoctorReviews } = await import('../../controllers/other/reviewController.js');

    doctorFindByPk.mockResolvedValue({ id: 5, full_name: 'Dr X', verification_status: 'approved' });
    reviewFindAll.mockResolvedValue([
      {
        id: 1,
        patient_id: 1,
        doctor_id: 5,
        rating: 5,
        comment: 'A',
        is_anonymous: false,
        patient: { full_name: 'Pat', user: { username: 'pat1' } },
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 2,
        patient_id: 2,
        doctor_id: 5,
        rating: 3,
        comment: 'B',
        is_anonymous: true,
        patient: { full_name: 'Pat2', user: { username: 'pat2' } },
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);

    const req = createMockReq({ params: { doctorId: '5' } });
    const res = createMockRes();

    await getDoctorReviews(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      doctor_id: 5,
      review_count: 2,
      average_rating: 4,
    }));
  });
});
