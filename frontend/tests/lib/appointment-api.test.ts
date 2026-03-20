import {
  ApiError,
  cancelAppointment,
  createAppointmentBooking,
  getAppointmentById,
  getMyAppointments,
  getPatientHistory,
  markAppointmentComplete,
  respondToDoctorReschedule,
  rescheduleAppointment,
  saveSummary,
  updateAppointmentDecision,
} from '@/app/lib/appointment-api';

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

describe('appointment-api', () => {
  const fetchMock = vi.fn();
  const appointment = { id: 1, status: 'scheduled' };

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it('requires auth token', async () => {
    await expect(getMyAppointments(null)).rejects.toThrow('Authentication required.');
  });

  it('creates appointment booking', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ appointment }));

    const result = await createAppointmentBooking('cookie-session', {
      doctor_user_id: 4,
      appointment_date: '2026-03-30',
      start_time: '10:00:00',
      end_time: '10:30:00',
      appointment_type: 'virtual',
      reason: 'Checkup',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/appointments',
      expect.objectContaining({ method: 'POST', credentials: 'include' })
    );
    expect(result.id).toBe(1);
  });

  it('loads and returns appointments list', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ appointments: [appointment] }));

    const result = await getMyAppointments('cookie-session');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/appointments/my',
      expect.objectContaining({ credentials: 'include' })
    );
    expect(result).toEqual([appointment]);
  });

  it('gets single appointment and updates status with optional reason fields', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ appointment }))
      .mockResolvedValueOnce(jsonResponse({ appointment }));

    const byId = await getAppointmentById('cookie-session', '8');
    const updated = await updateAppointmentDecision('cookie-session', '8', 'decline', {
      reasonCode: 'other',
      reasonNote: 'No availability',
    });

    expect(byId.id).toBe(1);
    expect(updated.id).toBe(1);
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/appointments/8/status',
      expect.objectContaining({ method: 'PATCH' })
    );
  });

  it('handles cancel/reschedule/respond endpoints', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ appointment }))
      .mockResolvedValueOnce(jsonResponse({ appointment }))
      .mockResolvedValueOnce(jsonResponse({ appointment }));

    await cancelAppointment('cookie-session', '5', 'Need another date');
    await rescheduleAppointment('cookie-session', '5', {
      appointment_date: '2026-04-01',
      start_time: '09:00:00',
      end_time: '09:30:00',
      appointment_type: 'virtual',
    });
    await respondToDoctorReschedule('cookie-session', '5', 'accept');

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/appointments/5/cancel',
      expect.objectContaining({ method: 'PATCH' })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/appointments/5/reschedule',
      expect.objectContaining({ method: 'PATCH' })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      '/api/appointments/5/reschedule/response',
      expect.objectContaining({ method: 'PATCH' })
    );
  });

  it('handles patient history, summary save, and completion', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ patient: { id: 2 }, appointments: [] }))
      .mockResolvedValueOnce(jsonResponse({ appointment }))
      .mockResolvedValueOnce(jsonResponse({ appointment }));

    const history = await getPatientHistory('cookie-session', 2);
    const summary = await saveSummary('cookie-session', '9', 'Patient is improving');
    const completed = await markAppointmentComplete('cookie-session', '9');

    expect(history.patient.id).toBe(2);
    expect(summary.id).toBe(1);
    expect(completed.id).toBe(1);
  });

  it('throws ApiError for non-json responses', async () => {
    fetchMock.mockResolvedValue(
      new Response('Gateway down', {
        status: 502,
        headers: { 'content-type': 'text/plain' },
      })
    );

    await expect(getMyAppointments('cookie-session')).rejects.toMatchObject({
      message: 'Gateway down',
      status: 502,
    } satisfies Partial<ApiError>);
  });

  it('throws ApiError with server message for failed json responses', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'No appointment found' }, 404));

    await expect(getAppointmentById('cookie-session', '999')).rejects.toMatchObject({
      message: 'No appointment found',
      status: 404,
    } satisfies Partial<ApiError>);
  });
});
