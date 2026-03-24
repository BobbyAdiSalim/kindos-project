import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockReq, createMockRes } from '../helpers/mockReqRes.js';

const transactionMock = vi.fn();
const joinWaitlistMock = vi.fn();
const listMyEntriesMock = vi.fn();
const removeMyEntryMock = vi.fn();

vi.mock('../../models/index.js', () => ({
  sequelize: {
    transaction: transactionMock,
  },
}));

vi.mock('../../services/WaitlistService.js', () => ({
  default: {
    joinWaitlist: joinWaitlistMock,
    listMyEntries: listMyEntriesMock,
    removeMyEntry: removeMyEntryMock,
  },
}));

describe('waitlistController', () => {
  beforeEach(() => {
    vi.resetModules();
    transactionMock.mockReset();
    joinWaitlistMock.mockReset();
    listMyEntriesMock.mockReset();
    removeMyEntryMock.mockReset();
  });

  it('joinWaitlist creates entry and returns 201', async () => {
    const { joinWaitlist } = await import('../../controllers/booking/waitlistController.js');

    transactionMock.mockImplementation(async (cb) => cb({ id: 'tx1' }));
    joinWaitlistMock.mockResolvedValue({
      id: 1,
      patient_id: 10,
      doctor_id: 20,
      desired_date: '2026-12-25',
      desired_start_time: '10:00:00',
      desired_end_time: '10:30:00',
      appointment_type: 'virtual',
      status: 'active',
      last_notified_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      doctor: null,
      getDataValue: (key) => (key === 'queue_position' ? 1 : 3),
    });

    const req = createMockReq({
      auth: { userId: 7 },
      body: { doctor_user_id: 12 },
    });
    const res = createMockRes();

    await joinWaitlist(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(joinWaitlistMock).toHaveBeenCalledWith(
      expect.objectContaining({
        patientUserId: 7,
        payload: { doctor_user_id: 12 },
      })
    );
  });

  it('joinWaitlist returns service status/message on failure', async () => {
    const { joinWaitlist } = await import('../../controllers/booking/waitlistController.js');

    transactionMock.mockImplementation(async (cb) => cb({ id: 'tx1' }));
    const err = new Error('Doctor not found.');
    err.status = 404;
    joinWaitlistMock.mockRejectedValue(err);

    const req = createMockReq({ auth: { userId: 7 }, body: {} });
    const res = createMockRes();

    await joinWaitlist(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Doctor not found.' });
  });

  it('getMyWaitlistEntries returns serialized list', async () => {
    const { getMyWaitlistEntries } = await import('../../controllers/booking/waitlistController.js');

    listMyEntriesMock.mockResolvedValue([
      {
        id: 1,
        patient_id: 10,
        doctor_id: 20,
        desired_date: '2026-12-25',
        desired_start_time: '10:00:00',
        desired_end_time: '10:30:00',
        appointment_type: 'virtual',
        status: 'active',
        last_notified_at: null,
        created_at: new Date(),
        updated_at: new Date(),
        doctor: null,
        getDataValue: () => null,
      },
    ]);

    const req = createMockReq({ auth: { userId: 7 } });
    const res = createMockRes();

    await getMyWaitlistEntries(req, res);

    expect(listMyEntriesMock).toHaveBeenCalledWith(7);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ waitlist_entries: expect.any(Array) }));
  });

  it('removeMyWaitlistEntry validates ID', async () => {
    const { removeMyWaitlistEntry } = await import('../../controllers/booking/waitlistController.js');

    const req = createMockReq({
      auth: { userId: 7 },
      params: { waitlistEntryId: 'abc' },
    });
    const res = createMockRes();

    await removeMyWaitlistEntry(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('removeMyWaitlistEntry deletes entry successfully', async () => {
    const { removeMyWaitlistEntry } = await import('../../controllers/booking/waitlistController.js');

    transactionMock.mockImplementation(async (cb) => cb({ id: 'tx1' }));
    removeMyEntryMock.mockResolvedValue({});

    const req = createMockReq({
      auth: { userId: 7 },
      params: { waitlistEntryId: '5' },
    });
    const res = createMockRes();

    await removeMyWaitlistEntry(req, res);

    expect(removeMyEntryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        patientUserId: 7,
        waitlistEntryId: 5,
      })
    );
    expect(res.json).toHaveBeenCalledWith({ message: 'Waitlist entry removed successfully.' });
  });
});
