import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { VerificationQueue } from '@/app/pages/admin/verification-queue';

const useAuthMock = vi.fn();
const toastError = vi.fn();
const toastSuccess = vi.fn();
const mockFetch = vi.fn();

vi.mock('@/app/lib/auth-context', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]) => toastError(...args),
    success: (...args: unknown[]) => toastSuccess(...args),
    info: vi.fn(),
  },
}));

vi.mock('@/app/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children }: any) => <div>{children}</div>,
  AlertDialogTrigger: ({ children }: any) => <>{children}</>,
  AlertDialogContent: ({ children }: any) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: any) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: any) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: any) => <div>{children}</div>,
  AlertDialogFooter: ({ children }: any) => <div>{children}</div>,
  AlertDialogCancel: ({ children }: any) => <button>{children}</button>,
  AlertDialogAction: ({ children, onClick, className }: any) => (
    <button onClick={onClick} className={className}>{children}</button>
  ),
}));

describe('VerificationQueue page', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    useAuthMock.mockReset();
    toastError.mockReset();
    toastSuccess.mockReset();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('requires authentication token', async () => {
    useAuthMock.mockReturnValue({ token: null });

    render(
      <MemoryRouter>
        <VerificationQueue />
      </MemoryRouter>
    );

    expect(await screen.findByText(/all caught up/i)).toBeInTheDocument();
    expect(toastError).toHaveBeenCalledWith('Authentication required.');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('loads pending doctors and approves one', async () => {
    const user = userEvent.setup();
    useAuthMock.mockReturnValue({ token: 'admin-token' });
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          doctors: [
            {
              id: 3,
              user_id: 10,
              full_name: 'Dr Queue',
              specialty: 'Audiology',
              license_number: 'A-100',
              verification_status: 'pending',
              verification_documents: ['doc-1'],
              updated_at: '2026-03-10T00:00:00.000Z',
              email: 'queue@example.com',
            },
          ],
        }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ history: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ message: 'ok' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ history: [] }) });

    render(
      <MemoryRouter>
        <VerificationQueue />
      </MemoryRouter>
    );

    expect((await screen.findAllByText(/dr queue/i)).length).toBeGreaterThan(0);
    await user.click(screen.getAllByRole('button', { name: /^approve$/i })[1]);

    expect(toastSuccess).toHaveBeenCalledWith('Doctor approved successfully');
  });

  it('requires a denial reason before denying', async () => {
    const user = userEvent.setup();
    useAuthMock.mockReturnValue({ token: 'admin-token' });
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          doctors: [
            {
              id: 4,
              user_id: 11,
              full_name: 'Dr Deny',
              specialty: 'ENT',
              license_number: 'A-200',
              verification_status: 'pending',
              verification_documents: ['doc-2'],
              updated_at: '2026-03-10T00:00:00.000Z',
              email: 'deny@example.com',
            },
          ],
        }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ history: [] }) });

    render(
      <MemoryRouter>
        <VerificationQueue />
      </MemoryRouter>
    );

    expect((await screen.findAllByText(/dr deny/i)).length).toBeGreaterThan(0);
    await user.click(screen.getAllByRole('button', { name: /^deny$/i })[1]);

    expect(toastError).toHaveBeenCalledWith('Please provide a rejection reason.');
  });
});
