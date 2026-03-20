import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { BookingConfirmation } from '@/app/pages/patient/booking-confirmation';

const useLocationMock = vi.fn();

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>();
  return {
    ...actual,
    useLocation: () => useLocationMock(),
  };
});

vi.mock('@/app/lib/use-preferred-timezone', () => ({
  usePreferredTimeZone: () => ({
    timeZone: 'America/Toronto',
    timeZoneOptions: [{ value: 'America/Toronto', label: 'Toronto' }],
    setTimeZone: vi.fn(),
    systemTimeZone: 'America/Toronto',
  }),
}));

vi.mock('@/app/lib/timezone', () => ({
  formatZonedDateTime: (_date: string, _time: string, _source: string, _target: string, _options: unknown, fallback: string) => fallback,
  getDefaultPreferredTimeZone: () => 'America/Toronto',
  resolveTimeZone: (tz: string) => tz,
}));

describe('BookingConfirmation page', () => {
  beforeEach(() => {
    useLocationMock.mockReset();
  });

  it('renders fallback content when appointment state is missing', () => {
    useLocationMock.mockReturnValue({ state: null });

    render(
      <MemoryRouter>
        <BookingConfirmation />
      </MemoryRouter>
    );

    expect(screen.getByText(/appointment date at appointment time/i)).toBeInTheDocument();
    expect(screen.getByText(/assigned doctor/i)).toBeInTheDocument();
    expect(screen.getByText(/virtual appointment/i)).toBeInTheDocument();
  });

  it('renders in-person appointment details from route state', () => {
    useLocationMock.mockReturnValue({
      state: {
        appointment: {
          appointment_date: '2026-04-10',
          start_time: '14:00:00',
          duration: 45,
          appointment_type: 'in-person',
          doctor: {
            full_name: 'Dr. Jane Doe',
            specialty: 'Audiology',
            clinic_location: '123 King St',
            time_zone: 'America/Toronto',
          },
        },
      },
    });

    render(
      <MemoryRouter>
        <BookingConfirmation />
      </MemoryRouter>
    );

    expect(screen.getByText(/in-person appointment/i)).toBeInTheDocument();
    expect(screen.getByText(/123 king st/i)).toBeInTheDocument();
    expect(screen.getByText(/dr\. jane doe/i)).toBeInTheDocument();
    expect(screen.getByText(/45 minutes/i)).toBeInTheDocument();
  });
});
