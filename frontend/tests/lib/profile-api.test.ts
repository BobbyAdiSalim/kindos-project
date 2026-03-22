import { getMyProfile, getPublicProfile, updateMyProfile } from '@/app/lib/profile-api';

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

describe('profile-api', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it('requires auth token for private profile endpoints', async () => {
    await expect(getMyProfile(null)).rejects.toThrow('Authentication required.');
    await expect(updateMyProfile(null, {})).rejects.toThrow('Authentication required.');
  });

  it('loads my profile', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        user: { id: 1, username: 'pat', role: 'patient' },
        profile: { id: 11, full_name: 'Patient One', profile_complete: true },
      })
    );

    const result = await getMyProfile('cookie-session');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/profile/me',
      expect.objectContaining({ credentials: 'include' })
    );
    expect(result.user.username).toBe('pat');
  });

  it('updates my profile', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        user: { id: 2, username: 'doc', role: 'doctor' },
        profile: { id: 22, full_name: 'Doctor One', profile_complete: true },
      })
    );

    const result = await updateMyProfile('cookie-session', { fullName: 'Doctor One' });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/profile/me',
      expect.objectContaining({ method: 'PUT', credentials: 'include' })
    );
    expect(result.user.role).toBe('doctor');
  });

  it('loads public profile without auth', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        user: { id: 3, username: 'public-doc', role: 'doctor' },
        profile: { id: 33, full_name: 'Public Doctor', profile_complete: true },
      })
    );

    const result = await getPublicProfile('3');

    expect(fetchMock).toHaveBeenCalledWith('/api/profile/3');
    expect(result.user.id).toBe(3);
  });

  it('throws server error messages on failure', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: 'Profile not found' }, 404));

    await expect(getPublicProfile('999')).rejects.toThrow('Profile not found');
  });
});
