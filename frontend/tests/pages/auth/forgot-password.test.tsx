import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { ForgotPassword } from '@/app/pages/auth/forgot-password';

const toastSuccess = vi.fn();
const toastError = vi.fn();
const mockFetch = vi.fn();

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}));

describe('ForgotPassword page', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    toastSuccess.mockReset();
    toastError.mockReset();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows validation error when submitting empty email', async () => {
    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>
    );

    const form = screen.getByRole('button', { name: /send reset link/i }).closest('form');
    expect(form).toBeTruthy();
    fireEvent.submit(form!);

    expect(toastError).toHaveBeenCalledWith('Please enter your email address');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('submits request and enables resend flow', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValue({ ok: true });

    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText(/email address/i), 'person@example.com');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/auth/forgot-password', expect.objectContaining({ method: 'POST' }));
    });

    expect(await screen.findByText(/check your email/i)).toBeInTheDocument();
    expect(toastSuccess).toHaveBeenCalledWith('If an account exists, a reset link has been sent.');

    expect(screen.getByRole('button', { name: /resend available in 60s/i })).toBeInTheDocument();
  });
});
