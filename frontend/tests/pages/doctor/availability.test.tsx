import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { AvailabilitySetup } from '@/app/pages/doctor/availability';

const toastSuccess = vi.fn();
const toastError = vi.fn();

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}));

describe('AvailabilitySetup timezone UI', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem('kindos.preferred_time_zone', 'America/Chicago');
    toastSuccess.mockReset();
    toastError.mockReset();
    fetchMock.mockImplementation(async (input, init) => {
      const url = String(input);

      if (url.includes('/availability/patterns') && init?.method === 'POST') {
        return {
          ok: true,
          json: async () => ({ message: 'saved' }),
        };
      }

      if (url.includes('/availability/slots/1') && init?.method === 'DELETE') {
        return {
          ok: true,
          json: async () => ({ message: 'deleted' }),
        };
      }

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

  it('saves weekly schedule and posts patterns to the backend', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <AvailabilitySetup />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    await user.click(screen.getByRole('button', { name: /save weekly schedule/i }));

    await waitFor(() => {
      const postCall = fetchMock.mock.calls.find(
        ([url, options]) =>
          String(url).includes('/availability/patterns')
          && (options as RequestInit | undefined)?.method === 'POST'
      );
      expect(postCall).toBeTruthy();
    });

    expect(toastSuccess).toHaveBeenCalledWith('Weekly schedule updated successfully');
  });

  it('shows an error toast when weekly schedule save fails', async () => {
    const user = userEvent.setup();

    fetchMock.mockImplementation(async (input, init) => {
      const url = String(input);

      if (url.includes('/availability/patterns') && init?.method === 'POST') {
        return {
          ok: false,
          json: async () => ({ message: 'Cannot save now' }),
        };
      }

      if (url.includes('/availability/patterns')) {
        return {
          ok: true,
          json: async () => ({ patterns: [] }),
        };
      }

      if (url.includes('/availability/slots')) {
        return {
          ok: true,
          json: async () => ({ slots: [] }),
        };
      }

      throw new Error(`Unexpected fetch call: ${url}`);
    });

    render(
      <MemoryRouter>
        <AvailabilitySetup />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    await user.click(screen.getByRole('button', { name: /save weekly schedule/i }));

    const postCall = fetchMock.mock.calls.find(
      ([url, options]) =>
        String(url).includes('/availability/patterns')
        && (options as RequestInit | undefined)?.method === 'POST'
    );
    expect(postCall).toBeTruthy();
    expect(toastError).toHaveBeenCalledWith('Cannot save now');
  });
});