import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { RequireAdminRoute, RequirePatientRoute } from '@/app/components/auth/protected-route';

const navigateMock = vi.fn();

let authState: any;

vi.mock('@/app/lib/auth-context', () => ({
  useAuth: () => authState,
  getDashboardPath: (role: string) => `/${role}/dashboard`,
}));

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>();
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

describe('Protected routes', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    navigateMock.mockReset();
    authState = {
      isAuthenticated: false,
      isLoading: false,
      token: null,
      user: null,
      updateUser: vi.fn(),
      logout: vi.fn(async () => undefined),
    };
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it('shows loading state while checking auth', () => {
    authState.isLoading = true;

    render(
      <MemoryRouter initialEntries={['/patient']}> 
        <Routes>
          <Route path="/patient" element={<RequirePatientRoute />}>
            <Route index element={<div>Patient Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/verifying session/i)).toBeInTheDocument();
  });

  it('shows unauthenticated state and navigates to login', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/patient']}> 
        <Routes>
          <Route path="/patient" element={<RequirePatientRoute />}>
            <Route index element={<div>Patient Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText(/you must be logged in/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /go to login/i }));
    expect(navigateMock).toHaveBeenCalledWith('/login');
  });

  it('renders outlet for authorized role after session verification', async () => {
    authState = {
      isAuthenticated: true,
      isLoading: false,
      token: 'cookie-session',
      user: { id: '1', username: 'pat', email: 'p@example.com', role: 'patient', name: 'Patient', verified: undefined },
      updateUser: vi.fn(),
      logout: vi.fn(async () => undefined),
    };

    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          user: { id: 1, username: 'pat', email: 'p@example.com', role: 'patient' },
          profile: { full_name: 'Patient' },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    );

    render(
      <MemoryRouter initialEntries={['/patient']}> 
        <Routes>
          <Route path="/patient" element={<RequirePatientRoute />}>
            <Route index element={<div>Patient Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('Patient Content')).toBeInTheDocument();
  });

  it('shows forbidden state for wrong role and sends to role dashboard', async () => {
    const user = userEvent.setup();
    authState = {
      isAuthenticated: true,
      isLoading: false,
      token: 'cookie-session',
      user: { id: '1', username: 'pat', email: 'p@example.com', role: 'patient', name: 'Patient', verified: undefined },
      updateUser: vi.fn(),
      logout: vi.fn(async () => undefined),
    };

    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          user: { id: 1, username: 'pat', email: 'p@example.com', role: 'patient' },
          profile: { full_name: 'Patient' },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    );

    render(
      <MemoryRouter initialEntries={['/admin']}> 
        <Routes>
          <Route path="/admin" element={<RequireAdminRoute />}>
            <Route index element={<div>Admin Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText(/do not have permission/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /go to dashboard/i }));
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/patient/dashboard'));
  });
});
