import { render, screen } from '@testing-library/react';
import { AppointmentTypeBadge, StatusBadge } from '@/app/components/status-badges';

describe('status-badges', () => {
  it('renders label for scheduled status', () => {
    render(<StatusBadge status="scheduled" />);
    expect(screen.getByText('Pending Confirmation')).toBeInTheDocument();
  });

  it('renders label for completed status', () => {
    render(<StatusBadge status="completed" />);
    expect(screen.getByText('Done')).toBeInTheDocument();
  });

  it('renders appointment type badge text', () => {
    const { rerender } = render(<AppointmentTypeBadge type="virtual" />);
    expect(screen.getByText('Virtual')).toBeInTheDocument();

    rerender(<AppointmentTypeBadge type="in-person" />);
    expect(screen.getByText('In-Person')).toBeInTheDocument();
  });
});
