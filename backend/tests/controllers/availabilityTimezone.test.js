import { createMockReq, createMockRes } from '../helpers/mockReqRes.js';

const availabilityPatternFindAll = vi.fn();
const availabilitySlotFindAll = vi.fn();
const doctorFindOne = vi.fn();
const appointmentFindAll = vi.fn();

vi.mock('../../models/Availability.js', () => ({
  AvailabilityPattern: {
    findAll: availabilityPatternFindAll,
  },
  AvailabilitySlot: {
    findAll: availabilitySlotFindAll,
  },
}));

vi.mock('../../models/Doctor.js', () => ({
  default: {
    findOne: doctorFindOne,
  },
}));

vi.mock('../../models/Appointment.js', () => ({
  default: {
    findAll: appointmentFindAll,
  },
}));

vi.mock('../../models/Review.js', () => ({
  default: {},
}));

vi.mock('../../config/database.js', () => ({
  default: {},
}));

vi.mock('../../services/availability-builder/index.js', () => ({
  buildAvailabilityFilterClauses: vi.fn(() => ({
    slotWhereClause: {},
    patternWhereClause: {},
    doctorWhereClause: {},
  })),
}));

describe('availability controller timezone handling', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    availabilityPatternFindAll.mockReset();
    availabilitySlotFindAll.mockReset();
    doctorFindOne.mockReset();
    appointmentFindAll.mockReset();
    availabilitySlotFindAll.mockResolvedValue([]);
    appointmentFindAll.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('filters available slots using the doctor timezone', async () => {
    vi.setSystemTime(new Date('2026-03-16T14:45:00.000Z'));

    doctorFindOne.mockResolvedValue({
      id: 7,
      user_id: 77,
      time_zone: 'America/Los_Angeles',
    });
    availabilityPatternFindAll.mockResolvedValue([
      {
        start_time: '07:00:00',
        end_time: '09:00:00',
        appointment_duration: 30,
        appointment_type: ['virtual', 'in-person'],
      },
    ]);

    const { getBookableSlots } = await import('../../controllers/other/availabilityController.js');
    const req = createMockReq({
      params: { userId: '77' },
      query: { date: '2026-03-16' },
    });
    const res = createMockRes();

    await getBookableSlots(req, res);

    expect(availabilityPatternFindAll).toHaveBeenCalledWith({
      where: expect.objectContaining({
        doctor_id: 7,
        day_of_week: 1,
        is_active: true,
      }),
    });
    expect(res.json).toHaveBeenCalledWith({
      date: '2026-03-16',
      doctor_id: 7,
      doctor_time_zone: 'America/Los_Angeles',
      slots: [
        {
          start_time: '08:00',
          end_time: '08:30',
          appointment_types: ['virtual', 'in-person'],
        },
        {
          start_time: '08:30',
          end_time: '09:00',
          appointment_types: ['virtual', 'in-person'],
        },
      ],
      booked_slots: [],
    });
  });

  it('falls back to ET and applies timezone filtering to booked slots', async () => {
    vi.setSystemTime(new Date('2026-03-16T12:15:00.000Z'));

    doctorFindOne.mockResolvedValue({
      id: 9,
      user_id: 99,
      time_zone: null,
    });
    availabilityPatternFindAll.mockResolvedValue([
      {
        start_time: '08:00:00',
        end_time: '09:30:00',
        appointment_duration: 30,
        appointment_type: ['virtual', 'in-person'],
      },
    ]);
    appointmentFindAll.mockResolvedValue([
      {
        start_time: '09:00:00',
        end_time: '09:30:00',
        appointment_type: 'virtual',
      },
    ]);

    const { getBookableSlots } = await import('../../controllers/other/availabilityController.js');
    const req = createMockReq({
      params: { userId: '99' },
      query: { date: '2026-03-16', includeBooked: 'true' },
    });
    const res = createMockRes();

    await getBookableSlots(req, res);

    expect(res.json).toHaveBeenCalledWith({
      date: '2026-03-16',
      doctor_id: 9,
      doctor_time_zone: 'America/New_York',
      slots: [
        {
          start_time: '08:30',
          end_time: '09:00',
          appointment_types: ['virtual', 'in-person'],
        },
      ],
      booked_slots: [
        {
          start_time: '09:00',
          end_time: '09:30',
          appointment_types: ['virtual', 'in-person'],
          booked_appointment_type: 'virtual',
        },
      ],
    });
  });
});