import { createMockReq, createMockRes } from '../helpers/mockReqRes.js';

const availabilityPatternFindAll = vi.fn();
const availabilityPatternDestroy = vi.fn();
const availabilityPatternCreate = vi.fn();
const availabilityPatternFindOne = vi.fn();

const availabilitySlotFindAll = vi.fn();
const availabilitySlotCreate = vi.fn();
const availabilitySlotFindOne = vi.fn();

const doctorFindOne = vi.fn();
const doctorFindByPk = vi.fn();
const doctorFindAll = vi.fn();

const appointmentFindAll = vi.fn();
const reviewFindAll = vi.fn();

const sequelizeTransaction = vi.fn();

vi.mock('../../models/Availability.js', () => ({
  AvailabilityPattern: {
    findAll: availabilityPatternFindAll,
    destroy: availabilityPatternDestroy,
    create: availabilityPatternCreate,
    findOne: availabilityPatternFindOne,
  },
  AvailabilitySlot: {
    findAll: availabilitySlotFindAll,
    create: availabilitySlotCreate,
    findOne: availabilitySlotFindOne,
  },
}));

vi.mock('../../models/Doctor.js', () => ({
  default: {
    findOne: doctorFindOne,
    findByPk: doctorFindByPk,
    findAll: doctorFindAll,
  },
}));

vi.mock('../../models/Appointment.js', () => ({
  default: {
    findAll: appointmentFindAll,
  },
}));

vi.mock('../../models/Review.js', () => ({
  default: {
    findAll: reviewFindAll,
  },
}));

vi.mock('../../config/database.js', () => ({
  default: {
    transaction: sequelizeTransaction,
    fn: vi.fn(),
    col: vi.fn(),
  },
}));

vi.mock('../../services/availability-builder/index.js', () => ({
  buildAvailabilityFilterClauses: vi.fn(() => ({
    slotWhereClause: {},
    patternWhereClause: {},
    doctorWhereClause: {},
  })),
}));

describe('availabilityController CRUD and validation', () => {
  beforeEach(() => {
    vi.resetModules();
    availabilityPatternFindAll.mockReset();
    availabilityPatternDestroy.mockReset();
    availabilityPatternCreate.mockReset();
    availabilityPatternFindOne.mockReset();
    availabilitySlotFindAll.mockReset();
    availabilitySlotCreate.mockReset();
    availabilitySlotFindOne.mockReset();
    doctorFindOne.mockReset();
    doctorFindByPk.mockReset();
    doctorFindAll.mockReset();
    appointmentFindAll.mockReset();
    reviewFindAll.mockReset();
    sequelizeTransaction.mockReset();

    sequelizeTransaction.mockImplementation(async (callback) => callback({}));
  });

  it('gets patterns and handles missing doctor', async () => {
    const { getAvailabilityPatterns } = await import('../../controllers/other/availabilityController.js');

    doctorFindOne.mockResolvedValueOnce(null);
    const missingRes = createMockRes();
    await getAvailabilityPatterns(createMockReq({ auth: { userId: 1 } }), missingRes);
    expect(missingRes.status).toHaveBeenCalledWith(404);

    doctorFindOne.mockResolvedValueOnce({ id: 8 });
    availabilityPatternFindAll.mockResolvedValueOnce([{ id: 1 }]);
    const okRes = createMockRes();
    await getAvailabilityPatterns(createMockReq({ auth: { userId: 1 } }), okRes);
    expect(okRes.json).toHaveBeenCalledWith({ patterns: [{ id: 1 }] });
  });

  it('validates and sets patterns', async () => {
    const { setAvailabilityPatterns } = await import('../../controllers/other/availabilityController.js');

    const invalidBodyRes = createMockRes();
    await setAvailabilityPatterns(createMockReq({ auth: { userId: 1 }, body: {} }), invalidBodyRes);
    expect(invalidBodyRes.status).toHaveBeenCalledWith(400);

    const badDowRes = createMockRes();
    await setAvailabilityPatterns(
      createMockReq({ auth: { userId: 1 }, body: { patterns: [{ day_of_week: 9, start_time: '09:00', end_time: '10:00' }] } }),
      badDowRes
    );
    expect(badDowRes.status).toHaveBeenCalledWith(400);

    doctorFindOne.mockResolvedValueOnce({ id: 22 });
    availabilityPatternCreate.mockResolvedValue({ id: 5 });
    const okRes = createMockRes();
    await setAvailabilityPatterns(
      createMockReq({
        auth: { userId: 1 },
        body: {
          patterns: [{ day_of_week: 1, start_time: '09:00', end_time: '10:00', appointment_duration: 30 }],
        },
      }),
      okRes
    );

    expect(availabilityPatternDestroy).toHaveBeenCalled();
    expect(okRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Availability patterns updated successfully' })
    );
  });

  it('gets and creates slots with validation', async () => {
    const { getAvailabilitySlots, createAvailabilitySlots } = await import('../../controllers/other/availabilityController.js');

    doctorFindOne.mockResolvedValueOnce({ id: 12 });
    availabilitySlotFindAll.mockResolvedValueOnce([{ id: 1 }]);
    const slotsRes = createMockRes();
    await getAvailabilitySlots(createMockReq({ auth: { userId: 1 }, query: { startDate: '2026-03-20' } }), slotsRes);
    expect(slotsRes.json).toHaveBeenCalledWith({ slots: [{ id: 1 }] });

    const invalidCreateRes = createMockRes();
    await createAvailabilitySlots(createMockReq({ auth: { userId: 1 }, body: { slots: [{ slot_date: 'bad' }] } }), invalidCreateRes);
    expect(invalidCreateRes.status).toHaveBeenCalledWith(400);

    doctorFindOne.mockResolvedValueOnce({ id: 12 });
    availabilitySlotCreate.mockResolvedValueOnce({ id: 2 });
    const createOkRes = createMockRes();
    await createAvailabilitySlots(
      createMockReq({
        auth: { userId: 1 },
        body: {
          slots: [{ slot_date: '2026-03-20', start_time: '10:00', end_time: '10:30', appointment_duration: 30 }],
        },
      }),
      createOkRes
    );
    expect(createOkRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Availability slots created successfully' })
    );
  });

  it('updates and deletes slots with not-found branches', async () => {
    const { updateAvailabilitySlot, deleteAvailabilitySlot } = await import('../../controllers/other/availabilityController.js');

    doctorFindOne.mockResolvedValueOnce(null);
    const noDoctorRes = createMockRes();
    await updateAvailabilitySlot(createMockReq({ auth: { userId: 1 }, params: { slotId: '1' }, body: {} }), noDoctorRes);
    expect(noDoctorRes.status).toHaveBeenCalledWith(404);

    doctorFindOne.mockResolvedValueOnce({ id: 5 });
    availabilitySlotFindOne.mockResolvedValueOnce(null);
    const noSlotRes = createMockRes();
    await updateAvailabilitySlot(createMockReq({ auth: { userId: 1 }, params: { slotId: '1' }, body: {} }), noSlotRes);
    expect(noSlotRes.status).toHaveBeenCalledWith(404);

    doctorFindOne.mockResolvedValueOnce({ id: 5 });
    availabilitySlotFindOne.mockResolvedValueOnce({
      start_time: '09:00',
      end_time: '09:30',
      save: vi.fn(async () => undefined),
    });
    const badTimeRes = createMockRes();
    await updateAvailabilitySlot(
      createMockReq({ auth: { userId: 1 }, params: { slotId: '1' }, body: { start_time: '99:99' } }),
      badTimeRes
    );
    expect(badTimeRes.status).toHaveBeenCalledWith(400);

    doctorFindOne.mockResolvedValueOnce({ id: 5 });
    const slot = { destroy: vi.fn(async () => undefined) };
    availabilitySlotFindOne.mockResolvedValueOnce(slot);
    const deleteRes = createMockRes();
    await deleteAvailabilitySlot(createMockReq({ auth: { userId: 1 }, params: { slotId: '1' } }), deleteRes);
    expect(slot.destroy).toHaveBeenCalled();
    expect(deleteRes.json).toHaveBeenCalledWith({ message: 'Slot deleted successfully' });
  });

  it('handles public availability and date-specific doctor slots', async () => {
    const { getDoctorAvailability, getDoctorAvailableSlotsByDate } = await import('../../controllers/other/availabilityController.js');

    doctorFindByPk.mockResolvedValueOnce(null);
    const missingDocRes = createMockRes();
    await getDoctorAvailability(createMockReq({ params: { doctorId: '1' }, query: {} }), missingDocRes);
    expect(missingDocRes.status).toHaveBeenCalledWith(404);

    doctorFindByPk.mockResolvedValueOnce({ id: 1 });
    availabilityPatternFindAll.mockResolvedValueOnce([{ id: 'p' }]);
    availabilitySlotFindAll.mockResolvedValueOnce([{ id: 's' }]);
    const publicRes = createMockRes();
    await getDoctorAvailability(createMockReq({ params: { doctorId: '1' }, query: { startDate: '2026-03-20' } }), publicRes);
    expect(publicRes.json).toHaveBeenCalledWith({ patterns: [{ id: 'p' }], slots: [{ id: 's' }] });

    const missingDateRes = createMockRes();
    await getDoctorAvailableSlotsByDate(createMockReq({ params: { doctorId: '1' }, query: {} }), missingDateRes);
    expect(missingDateRes.status).toHaveBeenCalledWith(400);

    doctorFindByPk.mockResolvedValueOnce({ id: 1 });
    availabilitySlotFindAll.mockResolvedValueOnce([{ id: 2 }]);
    const byDateRes = createMockRes();
    await getDoctorAvailableSlotsByDate(
      createMockReq({ params: { doctorId: '1' }, query: { date: '2026-03-20' } }),
      byDateRes
    );
    expect(byDateRes.status).toHaveBeenCalledWith(200);
  });
});
