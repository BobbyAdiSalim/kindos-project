import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { ResetPassword } from '@/app/pages/auth/reset-password';

const toastSuccess = vi.fn();
const toastError = vi.fn();
const navigateMock = vi.fn();
const mockFetch = vi.fn();
const useParamsMock = vi.fn();

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}));

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>();
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useParams: () => useParamsMock(),
  };
});

describe('ResetPassword page', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    toastSuccess.mockReset();
    toastError.mockReset();
    navigateMock.mockReset();
    mockFetch.mockReset();
    useParamsMock.mockReturnValue({ token: 'token-123' });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows invalid link state when token validation fails', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ valid: false }) });

    render(
      <MemoryRouter>
        <ResetPassword />
      </MemoryRouter>
    );

    expect(await screen.findByText(/invalid or expired link/i)).toBeInTheDocument();
  });

  it('resets password and redirects to login when valid', async () => {
    const user = userEvent.setup();

    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ valid: true }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) });

    render(
      <MemoryRouter>
        <ResetPassword />
      </MemoryRouter>
    );

    await screen.findByText(/set a new password/i);

    await user.type(screen.getByLabelText(/^new password$/i), 'password123');
    await user.type(screen.getByLabelText(/^confirm new password$/i), 'password123');
    await user.click(screen.getByRole('button', { name: /reset password/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/auth/reset-password', expect.objectContaining({ method: 'POST' }));
    });

    expect(toastSuccess).toHaveBeenCalledWith('Password reset successful. Please log in.');
    expect(navigateMock).toHaveBeenCalledWith('/login', { replace: true });
  });

  it('shows password mismatch error without calling submit API', async () => {
    const user = userEvent.setup();

    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ valid: true }) });

    render(
      <MemoryRouter>
        <ResetPassword />
      </MemoryRouter>
    );

    await screen.findByText(/set a new password/i);

    await user.type(screen.getByLabelText(/^new password$/i), 'password123');
    await user.type(screen.getByLabelText(/^confirm new password$/i), 'password456');
    await user.click(screen.getByRole('button', { name: /reset password/i }));

    expect(toastError).toHaveBeenCalledWith('Passwords do not match');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
