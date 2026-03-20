import { act, renderHook } from '@testing-library/react';
import { useIsMobile } from '@/app/components/ui/use-mobile';

describe('useIsMobile', () => {
  let listener: ((event: Event) => void) | null = null;

  beforeEach(() => {
    listener = null;
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        media: '(max-width: 767px)',
        onchange: null,
        addEventListener: (_: string, cb: (event: Event) => void) => {
          listener = cb;
        },
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it('returns true when viewport is mobile width', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, value: 500 });

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(true);
  });

  it('updates when media query listener fires', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, value: 900 });
    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);

    act(() => {
      Object.defineProperty(window, 'innerWidth', { writable: true, value: 600 });
      listener?.(new Event('change'));
    });

    expect(result.current).toBe(true);
  });
});
