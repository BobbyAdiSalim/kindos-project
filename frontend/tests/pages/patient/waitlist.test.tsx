import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { JoinWaitlist } from '@/app/pages/patient/waitlist';

const useAuthMock = vi.fn();
const getMyWaitlistEntriesMock = vi.fn();
const removeMyWaitlistEntryMock = vi.fn();
const toastSuccess = vi.fn();

vi.mock('@/app/lib/auth-context', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('@/app/lib/waitlist-api', () => ({
  getMyWaitlistEntries: (...args: unknown[]) => getMyWaitlistEntriesMock(...args),
  removeMyWaitlistEntry: (...args: unknown[]) => removeMyWaitlistEntryMock(...args),
}));

vi.mock('@/app/lib/use-preferred-timezone', () => ({
  usePreferredTimeZone: () => ({
    timeZone: 'America/Toronto',
    timeZoneOptions: [{ value: 'America/Toronto', label: 'Toronto (ET)' }],
    setTimeZone: vi.fn(),
    systemTimeZone: 'America/Toronto',
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('JoinWaitlist page', () => {
  beforeEach(() => {
    useAuthMock.mockReset();
    getMyWaitlistEntriesMock.mockReset();
    removeMyWaitlistEntryMock.mockReset();
    toastSuccess.mockReset();
  });

  it('shows empty waitlist state', async () => {
    useAuthMock.mockReturnValue({ token: 'cookie-session' });
    getMyWaitlistEntriesMock.mockResolvedValue([]);

    render(
      <MemoryRouter>
        <JoinWaitlist />
      </MemoryRouter>
    );

    expect(await screen.findByText(/no active waitlist entries/i)).toBeInTheDocument();
  });

  it('removes a waitlist entry', async () => {
    const user = userEvent.setup();
    useAuthMock.mockReturnValue({ token: 'cookie-session' });
    getMyWaitlistEntriesMock.mockResolvedValue([
      {
        id: 4,
        desired_date: '2026-04-10',
        desired_start_time: '14:00:00',
        desired_end_time: '14:30:00',
        appointment_type: 'virtual',
        status: 'active',
        queue_position: 1,
        queue_count: 3,
        doctor: { full_name: 'Dr One', time_zone: 'America/Toronto' },
      },
    ]);
    removeMyWaitlistEntryMock.mockResolvedValue(undefined);

    render(
      <MemoryRouter>
        <JoinWaitlist />
      </MemoryRouter>
    );

    await screen.findByText(/dr one/i);
    await user.click(screen.getByRole('button', { name: /remove/i }));

    await waitFor(() => {
      expect(removeMyWaitlistEntryMock).toHaveBeenCalledWith('cookie-session', 4);
    });

    expect(toastSuccess).toHaveBeenCalledWith('Waitlist entry removed.');
  });
});
