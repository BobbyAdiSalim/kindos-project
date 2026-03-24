import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TimeZoneSelector } from '@/app/components/time-zone-selector';

describe('TimeZoneSelector', () => {
  const options = [
    { value: 'America/Toronto', label: 'Toronto (ET)' },
    { value: 'America/Chicago', label: 'Chicago (CT)' },
  ];

  it('renders options and selected value', () => {
    render(
      <TimeZoneSelector
        value="America/Toronto"
        options={options}
        onChange={() => {}}
      />
    );

    expect(screen.getByLabelText('Time Zone')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Toronto (ET)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Chicago (CT)' })).toBeInTheDocument();
    expect((screen.getByLabelText('Time Zone') as HTMLSelectElement).value).toBe('America/Toronto');
  });

  it('calls onChange with selected timezone', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <TimeZoneSelector
        value="America/Toronto"
        options={options}
        onChange={onChange}
      />
    );

    await user.selectOptions(screen.getByLabelText('Time Zone'), 'America/Chicago');

    expect(onChange).toHaveBeenCalledWith('America/Chicago');
  });
});
