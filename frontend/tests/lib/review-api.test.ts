import { getDoctorReviews, getMyReviewForDoctor, upsertReview } from '@/app/lib/review-api';

describe('review-api', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it('fetches doctor reviews', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          doctor_id: 7,
          doctor_name: 'Dr. A',
          average_rating: 4.8,
          review_count: 1,
          reviews: [],
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }
      )
    );

    const result = await getDoctorReviews(7);

    expect(fetchMock).toHaveBeenCalledWith('/api/reviews/doctor/7');
    expect(result.doctor_id).toBe(7);
    expect(result.review_count).toBe(1);
  });

  it('requires auth token for fetching my review', async () => {
    await expect(getMyReviewForDoctor(null, 7)).rejects.toThrow('Authentication required.');
  });

  it('returns server message when upsert fails', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ message: 'Cannot submit review yet' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      })
    );

    await expect(
      upsertReview('cookie-session', {
        appointment_id: 4,
        rating: 3,
      })
    ).rejects.toThrow('Cannot submit review yet');
  });

  it('throws text body when server does not return JSON', async () => {
    fetchMock.mockResolvedValue(
      new Response('Gateway error', {
        status: 502,
        headers: { 'content-type': 'text/plain' },
      })
    );

    await expect(getDoctorReviews(9)).rejects.toThrow('Gateway error');
  });
});
