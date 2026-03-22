import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeclineAppointmentDialog } from '@/app/components/doctor/decline-appointment-dialog';

describe('DeclineAppointmentDialog', () => {
  it('requires a reason before submit is enabled', () => {
    render(
      <DeclineAppointmentDialog
        open
        onOpenChange={() => {}}
        onConfirm={() => {}}
      />
    );

    expect(
      screen.getByRole('button', { name: /decline appointment/i })
    ).toBeDisabled();
  });

  it('requires an additional note when other is selected', async () => {
    const user = userEvent.setup();

    render(
      <DeclineAppointmentDialog
        open
        onOpenChange={() => {}}
        onConfirm={() => {}}
      />
    );

    await user.click(screen.getByRole('combobox'));
    await user.click(await screen.findByRole('option', { name: /other/i }));

    expect(screen.getByLabelText(/additional details/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /decline appointment/i })
    ).toBeDisabled();
  });

  it('submits the selected reason and note', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <DeclineAppointmentDialog
        open
        onOpenChange={() => {}}
        onConfirm={onConfirm}
      />
    );

    await user.click(screen.getByRole('combobox'));
    await user.click(await screen.findByRole('option', { name: /other/i }));
    await user.type(screen.getByLabelText(/additional details/i), 'Needs a specialist referral');
    await user.click(screen.getByRole('button', { name: /decline appointment/i }));

    expect(onConfirm).toHaveBeenCalledWith({
      reasonCode: 'other',
      reasonNote: 'Needs a specialist referral',
    });
  });

  it('submits predefined reason without note', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <DeclineAppointmentDialog
        open
        onOpenChange={() => {}}
        onConfirm={onConfirm}
      />
    );

    await user.click(screen.getByRole('combobox'));
    await user.click(await screen.findByRole('option', { name: /schedule conflict/i }));
    await user.click(screen.getByRole('button', { name: /decline appointment/i }));

    expect(onConfirm).toHaveBeenCalledWith({
      reasonCode: 'schedule_conflict',
    });
  });

  it('calls onOpenChange(false) when cancel is clicked', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(
      <DeclineAppointmentDialog
        open
        onOpenChange={onOpenChange}
        onConfirm={() => {}}
      />
    );

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('shows patient name and loading state', () => {
    render(
      <DeclineAppointmentDialog
        open
        loading
        patientName="Alex"
        onOpenChange={() => {}}
        onConfirm={() => {}}
      />
    );

    expect(screen.getByText(/for alex/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /declining\.\.\./i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
  });

  it('resets selected reason and note when dialog closes', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <DeclineAppointmentDialog
        open
        onOpenChange={() => {}}
        onConfirm={() => {}}
      />
    );

    await user.click(screen.getByRole('combobox'));
    await user.click(await screen.findByRole('option', { name: /other/i }));
    await user.type(screen.getByLabelText(/additional details/i), 'Temporary reason');

    rerender(
      <DeclineAppointmentDialog
        open={false}
        onOpenChange={() => {}}
        onConfirm={() => {}}
      />
    );

    rerender(
      <DeclineAppointmentDialog
        open
        onOpenChange={() => {}}
        onConfirm={() => {}}
      />
    );

    expect(screen.queryByLabelText(/additional details/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /decline appointment/i })).toBeDisabled();
  });
});
