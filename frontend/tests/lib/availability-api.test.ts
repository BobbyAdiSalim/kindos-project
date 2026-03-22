import { formatTime24to12, getBookableSlots } from '@/app/lib/availability-api';

describe('availability-api', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it('fetches bookable slots with appointment type and includeBooked option', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          date: '2026-03-25',
          doctor_id: 9,
          doctor_time_zone: 'America/Toronto',
          slots: [{ start_time: '09:00:00', end_time: '09:30:00', appointment_types: ['virtual'] }],
          booked_slots: [],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    );

    const result = await getBookableSlots('9', '2026-03-25', 'virtual', { includeBooked: true });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/availability/doctor/9/slots?date=2026-03-25&appointmentType=virtual&includeBooked=true'
    );
    expect(result.doctor_id).toBe(9);
    expect(result.slots.length).toBe(1);
  });

  it('falls back to safe defaults for malformed response payload', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({}), { status: 200, headers: { 'content-type': 'application/json' } })
    );

    const result = await getBookableSlots('4', '2026-03-20');

    expect(result.date).toBe('2026-03-20');
    expect(result.doctor_id).toBe(0);
    expect(result.slots).toEqual([]);
    expect(result.booked_slots).toEqual([]);
  });

  it('throws API message on non-ok response', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ message: 'Doctor not found' }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      })
    );

    await expect(getBookableSlots('55', '2026-03-25')).rejects.toThrow('Doctor not found');
  });

  it('formats 24-hour time to 12-hour display', () => {
    expect(formatTime24to12('00:05')).toBe('12:05 AM');
    expect(formatTime24to12('12:30')).toBe('12:30 PM');
    expect(formatTime24to12('21:45')).toBe('9:45 PM');
  });
});
