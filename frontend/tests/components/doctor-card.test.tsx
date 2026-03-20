import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { DoctorCard } from '@/app/components/doctor-card';

describe('DoctorCard', () => {
  const doctor = {
    id: '5',
    name: 'Dr. Rivera',
    specialty: 'Audiology',
    photo: 'https://example.com/doctor.png',
    languages: ['English', 'Spanish'],
    rating: 4.8,
    reviewCount: 12,
    clinicLocation: 'Toronto Clinic',
    virtualAvailable: true,
    inPersonAvailable: true,
    nextAvailable: '2026-03-21T13:30:00.000Z',
    verified: true,
  };

  it('renders doctor details and book/profile links', () => {
    render(
      <MemoryRouter>
        <DoctorCard doctor={doctor} />
      </MemoryRouter>
    );

    expect(screen.getByText('Dr. Rivera')).toBeInTheDocument();
    expect(screen.getByText(/12 reviews/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view profile/i })).toHaveAttribute('href', '/patient/doctor/5');
    expect(screen.getByRole('link', { name: /book/i })).toHaveAttribute('href', '/patient/booking/5');
  });

  it('renders perfect match badge when score is 100', () => {
    render(
      <MemoryRouter>
        <DoctorCard doctor={doctor} matchScore={100} />
      </MemoryRouter>
    );

    expect(screen.getByText(/perfect match/i)).toBeInTheDocument();
  });

  it('hides booking actions when showBookButton is false', () => {
    render(
      <MemoryRouter>
        <DoctorCard doctor={{ ...doctor, nextAvailable: null }} showBookButton={false} matchScore={70} />
      </MemoryRouter>
    );

    expect(screen.queryByRole('link', { name: /book/i })).not.toBeInTheDocument();
    expect(screen.getByText(/no available dates/i)).toBeInTheDocument();
    expect(screen.getByText(/70% match/i)).toBeInTheDocument();
  });
});
