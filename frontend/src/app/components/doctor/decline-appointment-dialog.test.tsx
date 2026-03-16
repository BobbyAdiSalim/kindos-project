import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeclineAppointmentDialog } from './decline-appointment-dialog';

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
});
