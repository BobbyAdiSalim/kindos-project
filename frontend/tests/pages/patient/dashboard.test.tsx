import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { PatientDashboard } from '@/app/pages/patient/dashboard';
import { vi, beforeEach, describe, it, expect } from 'vitest';

const getMyAppointmentsMock = vi.fn();
const useAuthMock = vi.fn();
const toastError = vi.fn();

vi.mock('@/app/lib/auth-context', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('@/app/lib/appointment-api', () => ({
  getMyAppointments: (...args: unknown[]) => getMyAppointmentsMock(...args),
}));

vi.mock('@/app/lib/use-preferred-timezone', () => ({
  usePreferredTimeZone: () => ({
    timeZone: 'America/Toronto',
    timeZoneOptions: [{ value: 'America/Toronto', label: 'Toronto (ET)' }],
    systemTimeZone: 'America/Toronto',
  }),
}));

vi.mock('@/app/components/appointment-card', () => ({
  AppointmentCard: ({ appointment }: { appointment: { id: string } }) => (
    <div data-testid="appointment-card">{appointment.id}</div>
  ),
}));

vi.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]) => toastError(...args),
  },
}));

describe('PatientDashboard page', () => {
  beforeEach(() => {
    getMyAppointmentsMock.mockReset();
    useAuthMock.mockReset();
    toastError.mockReset();
  });

  it('renders empty state when no token is available', async () => {
    useAuthMock.mockReturnValue({ token: null });

    render(
      <MemoryRouter>
        <PatientDashboard />
      </MemoryRouter>
    );

    expect(await screen.findByText(/no upcoming appointments/i)).toBeInTheDocument();
  });

  it('loads appointments and renders appointment cards', async () => {
    useAuthMock.mockReturnValue({ token: 'cookie-session' });
    getMyAppointmentsMock.mockResolvedValue([
      {
        id: 1,
        status: 'scheduled',
        appointment_date: '2026-04-10',
        start_time: '14:00:00',
        end_time: '14:30:00',
        appointment_type: 'virtual',
        reason: 'Follow-up',
        doctor: { full_name: 'Dr One', time_zone: 'America/Toronto' },
        patient: { full_name: 'Pat' },
      },
      {
        id: 2,
        status: 'completed',
        appointment_date: '2026-04-01',
        start_time: '09:00:00',
        end_time: '09:30:00',
        appointment_type: 'in-person',
        reason: 'Checkup',
        doctor: { full_name: 'Dr Two', time_zone: 'America/Toronto' },
        patient: { full_name: 'Pat' },
      },
    ]);

    render(
      <MemoryRouter>
        <PatientDashboard />
      </MemoryRouter>
    );

    expect(await screen.findByText(/upcoming/i)).toBeInTheDocument();
    expect(screen.getByText(/past/i)).toBeInTheDocument();
  });

  it('shows only upcoming appointments in upcoming tab', async () => {
    useAuthMock.mockReturnValue({ token: 'session-token' });
    getMyAppointmentsMock.mockResolvedValue([
      {
        id: 1,
        status: 'scheduled',
        appointment_date: '2026-06-10',
        start_time: '14:00:00',
        doctor: { full_name: 'Dr One', time_zone: 'America/Toronto' },
      },
    ]);

    render(
      <MemoryRouter>
        <PatientDashboard />
      </MemoryRouter>
    );

    await screen.findByTestId('appointment-card');
  });

  it('displays empty state when no appointments', async () => {
    useAuthMock.mockReturnValue({ token: 'session-token' });
    getMyAppointmentsMock.mockResolvedValue([]);

    render(
      <MemoryRouter>
        <PatientDashboard />
      </MemoryRouter>
    );

    await screen.findByText(/no/i);
  });
});
