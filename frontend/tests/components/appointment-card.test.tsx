import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { AppointmentCard } from '@/app/components/appointment-card';

describe('AppointmentCard', () => {
  const baseAppointment = {
    id: '42',
    doctorName: 'Dr. Smith',
    patientName: 'Pat Jones',
    date: '2026-03-20',
    time: '10:00 AM',
    type: 'virtual' as const,
    status: 'scheduled' as const,
    reason: 'Follow-up',
  };

  it('renders doctor info and detail link for patient', () => {
    render(
      <MemoryRouter>
        <AppointmentCard appointment={baseAppointment} userRole="patient" />
      </MemoryRouter>
    );

    expect(screen.getByText('Dr. Smith')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view details/i })).toHaveAttribute('href', '/patient/appointment/42');
  });

  it('shows confirm/decline actions for doctor when reviewable', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onDecline = vi.fn();

    render(
      <MemoryRouter>
        <AppointmentCard
          appointment={baseAppointment}
          userRole="doctor"
          onConfirm={onConfirm}
          onDecline={onDecline}
        />
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: /confirm/i }));
    await user.click(screen.getByRole('button', { name: /decline/i }));

    expect(onConfirm).toHaveBeenCalledWith('42');
    expect(onDecline).toHaveBeenCalledWith('42');
  });

  it('shows join call for confirmed virtual appointments', () => {
    render(
      <MemoryRouter>
        <AppointmentCard
          appointment={{ ...baseAppointment, status: 'confirmed' }}
          userRole="patient"
        />
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name: /join call/i })).toBeInTheDocument();
  });

  it('shows decline reason when declined', () => {
    render(
      <MemoryRouter>
        <AppointmentCard
          appointment={{ ...baseAppointment, status: 'declined', declineReason: 'Schedule conflict' }}
          userRole="patient"
        />
      </MemoryRouter>
    );

    expect(screen.getByText(/decline reason:/i)).toBeInTheDocument();
  });
});
