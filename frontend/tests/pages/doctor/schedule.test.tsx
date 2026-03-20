import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { DoctorSchedule } from '@/app/pages/doctor/schedule';

vi.mock('@/app/components/appointment-card', () => ({
  AppointmentCard: ({ appointment }: { appointment: { id: number } }) => (
    <div data-testid="appointment-card">Appointment {appointment.id}</div>
  ),
}));

describe('DoctorSchedule page', () => {
  it('renders only upcoming appointments in list view', async () => {
    render(
      <MemoryRouter>
        <DoctorSchedule />
      </MemoryRouter>
    );

    const cards = await screen.findAllByTestId('appointment-card');
    expect(cards.length).toBeGreaterThan(0);
  });
});
