import { act, renderHook, waitFor } from '@testing-library/react';
import { type PropsWithChildren } from 'react';
import { AuthProvider, getDashboardPath, useAuth } from '@/app/lib/auth-context';

const disconnectSocketMock = vi.fn();

vi.mock('@/app/lib/socket', () => ({
  disconnectSocket: () => disconnectSocketMock(),
}));

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

const wrapper = ({ children }: PropsWithChildren) => <AuthProvider>{children}</AuthProvider>;

describe('auth-context', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    window.localStorage.clear();
    disconnectSocketMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it('maps dashboard paths by role', () => {
    expect(getDashboardPath('patient')).toBe('/patient/dashboard');
    expect(getDashboardPath('doctor')).toBe('/doctor/dashboard');
    expect(getDashboardPath('admin')).toBe('/admin/dashboard');
  });

  it('throws when useAuth is used outside provider', () => {
    expect(() => renderHook(() => useAuth())).toThrow('useAuth must be used within an AuthProvider');
  });

  it('restores an existing session on mount', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        user: {
          id: 1,
          username: 'pat',
          email: 'pat@example.com',
          role: 'patient',
          profile: { full_name: 'Patient One', profile_complete: true },
        },
      })
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.name).toBe('Patient One');
    expect(result.current.token).toBe('cookie-session');
  });

  it('handles login and registration flows', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ user: { id: 1, username: 'pat', email: 'pat@example.com', role: 'patient', profile: null } }))
      .mockResolvedValueOnce(jsonResponse({ user: { id: 2, username: 'doc', email: 'doc@example.com', role: 'doctor', profile: { full_name: 'Doc', verification_status: 'approved' } } }))
      .mockResolvedValueOnce(jsonResponse({ user: { id: 3, username: 'newpat', email: 'new@example.com', role: 'patient', profile: { full_name: 'New Patient' } } }));

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.login('doc@example.com', 'pw', 'doctor');
    });

    expect(result.current.user?.role).toBe('doctor');
    expect(result.current.user?.verified).toBe(true);

    await act(async () => {
      await result.current.register('new@example.com', 'password123', 'New Patient', 'patient');
    });

    expect(result.current.user?.email).toBe('new@example.com');
  });

  it('surfaces api login errors', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ user: { id: 1, username: 'pat', email: 'pat@example.com', role: 'patient', profile: null } }))
      .mockResolvedValueOnce(jsonResponse({ error: 'Invalid credentials' }, 401));

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await expect(result.current.login('pat@example.com', 'bad', 'patient')).rejects.toThrow('Invalid credentials');
  });

  it('updates user and logs out even when logout request fails', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ user: { id: 1, username: 'pat', email: 'pat@example.com', role: 'patient', profile: { full_name: 'Patient One' } } }))
      .mockRejectedValueOnce(new Error('network')); 

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.updateUser({ name: 'Updated Name' });
    });
    expect(result.current.user?.name).toBe('Updated Name');

    await act(async () => {
      await result.current.logout();
    });

    expect(disconnectSocketMock).toHaveBeenCalled();
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });
});
