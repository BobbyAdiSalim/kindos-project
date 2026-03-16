import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { Analytics } from './analytics';

vi.mock('@/app/lib/auth-context', () => ({
  useAuth: () => ({
    token: 'cookie-session',
  }),
}));

const mockFetch = vi.fn();

describe('Admin analytics page', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        timeframe: '30d',
        date_range: { start: '2026-02-14', end: '2026-03-15' },
        summary: {
          total_declined_appointments: 6,
          unique_reason_count: 2,
          top_reason: {
            code: 'schedule_conflict',
            label: 'Schedule conflict',
            count: 4,
          },
        },
        reasons: [
          { code: 'schedule_conflict', label: 'Schedule conflict', count: 4 },
          { code: 'other', label: 'Other', count: 2 },
        ],
      }),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    mockFetch.mockReset();
  });

  it('loads analytics for the default timeframe', async () => {
    render(
      <MemoryRouter>
        <Analytics />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/admin/analytics/appointment-rejections?timeframe=30d',
        expect.objectContaining({ credentials: 'include' })
      );
    });

    expect(await screen.findByText(/schedule conflict/i)).toBeInTheDocument();
  });

  it('requests a new timeframe when selection changes', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Analytics />
      </MemoryRouter>
    );

    await screen.findByText(/schedule conflict/i);

    await user.click(screen.getByRole('combobox'));
    await user.click(await screen.findByRole('option', { name: /last 7 days/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/admin/analytics/appointment-rejections?timeframe=7d',
        expect.objectContaining({ credentials: 'include' })
      );
    });
  });
});
