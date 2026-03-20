import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { AdminDashboard } from '@/app/pages/admin/dashboard';

const mockFetch = vi.fn();
const useAuthMock = vi.fn();

vi.mock('@/app/lib/auth-context', () => ({
  useAuth: () => useAuthMock(),
}));

describe('AdminDashboard page', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    useAuthMock.mockReset();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows auth error when token is missing', async () => {
    useAuthMock.mockReturnValue({ token: '' });

    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    );

    expect(await screen.findByText(/authentication required/i)).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('loads doctors and computes pending count', async () => {
    useAuthMock.mockReturnValue({ token: 'admin-token' });
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        doctors: [
          {
            id: 1,
            user_id: 10,
            full_name: 'Dr One',
            specialty: 'Audiology',
            license_number: 'A-1',
            verification_status: 'pending',
            updated_at: '2026-03-10T00:00:00.000Z',
            email: 'one@example.com',
          },
          {
            id: 2,
            user_id: 11,
            full_name: 'Dr Two',
            specialty: 'ENT',
            license_number: 'A-2',
            verification_status: 'approved',
            updated_at: '2026-03-10T00:00:00.000Z',
            email: 'two@example.com',
          },
        ],
      }),
    });

    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/admin/doctors/unverified', expect.objectContaining({ credentials: 'include' }));
    });

    expect(await screen.findByText('1')).toBeInTheDocument();
    expect(screen.getByText(/review pending \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText(/dr one/i)).toBeInTheDocument();
  });
});
