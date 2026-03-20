import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { Register } from '@/app/pages/auth/register';

const registerMock = vi.fn();
const navigateMock = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();
const useAuthMock = vi.fn();

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>();
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('@/app/lib/auth-context', () => ({
  useAuth: () => useAuthMock(),
  getDashboardPath: (role: string) => `/${role}/dashboard`,
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}));

describe('Register page', () => {
  beforeEach(() => {
    registerMock.mockReset();
    navigateMock.mockReset();
    toastSuccess.mockReset();
    toastError.mockReset();
    useAuthMock.mockReset();
    useAuthMock.mockReturnValue({ user: null, register: registerMock });
  });

  it('creates a patient account and redirects to questionnaire', async () => {
    const user = userEvent.setup();
    registerMock.mockResolvedValue(undefined);

    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText(/full name/i), 'Alex Smith');
    await user.type(screen.getByLabelText(/email address/i), 'alex@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(registerMock).toHaveBeenCalledWith(
        'alex@example.com',
        'password123',
        'Alex Smith',
        'patient',
        expect.objectContaining({ verificationDocuments: [] })
      );
    });

    expect(toastSuccess).toHaveBeenCalledWith('Account created successfully!');
    expect(navigateMock).toHaveBeenCalledWith('/patient/questionnaire');
  });

  it('requires verification document for doctor role', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    await user.click(screen.getByLabelText(/healthcare provider/i));
    await user.type(screen.getByLabelText(/full name/i), 'Dr A');
    await user.type(screen.getByLabelText(/email address/i), 'doctor@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'password123');
    await user.type(screen.getByLabelText(/medical specialty/i), 'Audiology');
    await user.type(screen.getByLabelText(/medical license number/i), 'LIC-001');

    const form = screen.getByRole('button', { name: /submit for verification/i }).closest('form') as HTMLFormElement;
    form.noValidate = true;
    fireEvent.submit(form);

    expect(toastError).toHaveBeenCalledWith('Please upload a verification document (max 5MB).');
    expect(registerMock).not.toHaveBeenCalled();
  });

  it('rejects oversized verification document uploads', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    await user.click(screen.getByLabelText(/healthcare provider/i));

    const fileInput = screen.getByLabelText(/verification document/i);
    const largeFile = new File(['x'.repeat(10)], 'license.pdf', { type: 'application/pdf' });
    Object.defineProperty(largeFile, 'size', { value: 6 * 1024 * 1024 });

    await user.upload(fileInput, largeFile);

    expect(toastError).toHaveBeenCalledWith('File must be 5MB or smaller.');
  });
});
