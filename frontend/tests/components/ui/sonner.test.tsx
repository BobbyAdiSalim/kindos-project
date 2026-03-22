import { render, screen } from '@testing-library/react';
import { Toaster } from '@/app/components/ui/sonner';

const sonnerSpy = vi.fn();

vi.mock('sonner', () => ({
  Toaster: (props: Record<string, unknown>) => {
    sonnerSpy(props);
    return <div data-testid="mock-sonner" />;
  },
}));

describe('Toaster wrapper', () => {
  beforeEach(() => {
    sonnerSpy.mockReset();
  });

  it('forwards default theme and custom style tokens', () => {
    render(<Toaster richColors closeButton />);

    expect(screen.getByTestId('mock-sonner')).toBeInTheDocument();
    expect(sonnerSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        theme: 'light',
        className: 'toaster group',
        richColors: true,
        closeButton: true,
        style: expect.objectContaining({
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
        }),
      })
    );
  });
});
