import {
  WaitlistApiError,
  getMyWaitlistEntries,
  joinWaitlist,
  removeMyWaitlistEntry,
} from '@/app/lib/waitlist-api';

describe('waitlist-api', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it('requires authentication token', async () => {
    await expect(getMyWaitlistEntries(null)).rejects.toThrow('Authentication required.');
  });

  it('joins waitlist and returns entry payload', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          waitlist_entry: {
            id: 10,
            patient_id: 1,
            doctor_id: 2,
            desired_date: '2026-03-25',
            desired_start_time: '10:00:00',
            desired_end_time: '10:30:00',
            appointment_type: 'virtual',
            status: 'active',
            queue_position: 1,
            queue_count: 3,
            last_notified_at: null,
            created_at: '2026-03-01T00:00:00.000Z',
            updated_at: '2026-03-01T00:00:00.000Z',
            doctor: null,
          },
        }),
        { status: 201, headers: { 'content-type': 'application/json' } }
      )
    );

    const entry = await joinWaitlist('cookie-session', {
      doctor_user_id: 2,
      desired_date: '2026-03-25',
      desired_start_time: '10:00:00',
      desired_end_time: '10:30:00',
      appointment_type: 'virtual',
    });

    expect(entry.id).toBe(10);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/waitlist',
      expect.objectContaining({ method: 'POST', credentials: 'include' })
    );
  });

  it('throws WaitlistApiError with status on non-json response', async () => {
    fetchMock.mockResolvedValue(
      new Response('Gateway timeout', { status: 504, headers: { 'content-type': 'text/plain' } })
    );

    await expect(getMyWaitlistEntries('cookie-session')).rejects.toMatchObject({
      message: 'Gateway timeout',
      status: 504,
    } satisfies Partial<WaitlistApiError>);
  });

  it('removes a waitlist entry', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ message: 'ok' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );

    await expect(removeMyWaitlistEntry('cookie-session', 4)).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/waitlist/4',
      expect.objectContaining({ method: 'DELETE', credentials: 'include' })
    );
  });
});
