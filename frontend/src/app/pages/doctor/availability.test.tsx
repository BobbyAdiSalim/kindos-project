import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { AvailabilitySetup } from './availability';

describe('AvailabilitySetup timezone UI', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem('kindos.preferred_time_zone', 'America/Chicago');
    fetchMock.mockImplementation(async (input) => {
      const url = String(input);

      if (url.includes('/availability/patterns')) {
        return {
          ok: true,
          json: async () => ({ patterns: [] }),
        };
      }

      if (url.includes('/availability/slots')) {
        return {
          ok: true,
          json: async () => ({
            slots: [
              {
                id: 1,
                slot_date: '2026-03-20',
                start_time: '09:00:00',
                end_time: '10:00:00',
                appointment_type: ['virtual'],
                is_available: true,
                appointment_duration: 30,
              },
            ],
          }),
        };
      }

      throw new Error(`Unexpected fetch call: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the timezone notice from the preferred timezone', async () => {
    render(
      <MemoryRouter>
        <AvailabilitySetup />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    expect(screen.getByText(/Times are shown in/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /profile/i })).toHaveAttribute('href', '/doctor/profile');
    expect(screen.getByText(/Central Time/i)).toBeInTheDocument();
    expect(screen.getByText(/Times use (CST|CDT)/i)).toBeInTheDocument();
  });

  it('shows the timezone abbreviation next to specific slot times', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <AvailabilitySetup />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    await user.click(screen.getByRole('tab', { name: /specific dates/i }));

    const matches = await screen.findAllByText(/\((CST|CDT)\)/i);
    expect(matches.length).toBeGreaterThan(1);
  });
});