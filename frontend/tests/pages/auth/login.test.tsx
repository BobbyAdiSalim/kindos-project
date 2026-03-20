import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { Login } from '@/app/pages/auth/login';

const loginMock = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();

const navigateMock = vi.fn();
const locationMock = { search: '' };

vi.mock('@/app/lib/auth-context', () => ({
  useAuth: () => ({
    login: loginMock,
    user: null,
  }),
  getDashboardPath: (role: string) => `/${role}/dashboard`,
}));

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>();
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useLocation: () => locationMock,
  };
});

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}));

describe('Login page', () => {
  beforeEach(() => {
    loginMock.mockReset();
    navigateMock.mockReset();
    toastSuccess.mockReset();
    toastError.mockReset();
    locationMock.search = '';
  });

  it('shows validation error when required fields are missing', async () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    fireEvent.submit(screen.getByRole('button', { name: /log in/i }).closest('form')!);

    expect(toastError).toHaveBeenCalledWith('Please fill in all fields');
    expect(loginMock).not.toHaveBeenCalled();
  });

  it('submits login and redirects to role dashboard by default', async () => {
    const user = userEvent.setup();
    loginMock.mockResolvedValue(undefined);

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText(/email address/i), 'patient@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'password123');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith('patient@example.com', 'password123', 'patient');
      expect(navigateMock).toHaveBeenCalledWith('/patient/dashboard');
    });

    expect(toastSuccess).toHaveBeenCalledWith('Logged in successfully');
  });

  it('uses safe redirect query parameter after successful login', async () => {
    const user = userEvent.setup();
    loginMock.mockResolvedValue(undefined);
    locationMock.search = '?redirect=/doctor/appointments';

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    await user.click(screen.getByLabelText(/healthcare provider/i));
    await user.type(screen.getByLabelText(/email address/i), 'doc@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'password123');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith('doc@example.com', 'password123', 'doctor');
      expect(navigateMock).toHaveBeenCalledWith('/doctor/appointments');
    });
  });
});
