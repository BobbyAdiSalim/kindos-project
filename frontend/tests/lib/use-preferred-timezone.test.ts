import { renderHook, act } from '@testing-library/react';
import { usePreferredTimeZone } from '@/app/lib/use-preferred-timezone';

describe('usePreferredTimeZone', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('initializes with stored preferred timezone', () => {
    window.localStorage.setItem('kindos.preferred_time_zone', 'America/Chicago');

    const { result } = renderHook(() => usePreferredTimeZone());

    expect(result.current.timeZone).toBe('America/Chicago');
  });

  it('updates state and storage on valid timezone change', () => {
    const { result } = renderHook(() => usePreferredTimeZone());

    act(() => {
      result.current.setTimeZone('America/Los_Angeles');
    });

    expect(result.current.timeZone).toBe('America/Los_Angeles');
    expect(window.localStorage.getItem('kindos.preferred_time_zone')).toBe('America/Los_Angeles');
  });

  it('ignores invalid timezone values', () => {
    const { result } = renderHook(() => usePreferredTimeZone());
    const before = result.current.timeZone;

    act(() => {
      result.current.setTimeZone('Not/AZone');
    });

    expect(result.current.timeZone).toBe(before);
    expect(window.localStorage.getItem('kindos.preferred_time_zone')).not.toBe('Not/AZone');
  });
});

