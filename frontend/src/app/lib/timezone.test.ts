import {
  formatZonedDateTime,
  getDefaultPreferredTimeZone,
  getStoredPreferredTimeZone,
  getTimeZoneShortName,
  isFutureZonedDateTime,
  isValidTimeZone,
  resolveTimeZone,
  setStoredPreferredTimeZone,
} from '@/app/lib/timezone';

describe('timezone utils', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('defaults preferred timezone to ET', () => {
    expect(getDefaultPreferredTimeZone()).toBe('America/New_York');
    expect(getStoredPreferredTimeZone()).toBe('America/New_York');
  });

  it('validates and stores timezone values', () => {
    expect(isValidTimeZone('America/Chicago')).toBe(true);
    expect(isValidTimeZone('Not/AZone')).toBe(false);

    setStoredPreferredTimeZone('America/Chicago');
    expect(getStoredPreferredTimeZone()).toBe('America/Chicago');

    setStoredPreferredTimeZone('Not/AZone');
    expect(getStoredPreferredTimeZone()).toBe('America/Chicago');
  });

  it('resolves timezone with fallback', () => {
    expect(resolveTimeZone('America/Los_Angeles', 'UTC')).toBe('America/Los_Angeles');
    expect(resolveTimeZone('Invalid/Zone', 'UTC')).toBe('UTC');
  });

  it('formats zoned date time from source to target timezone', () => {
    const formatted = formatZonedDateTime(
      '2026-01-15',
      '15:00:00',
      'America/New_York',
      'UTC',
      { hour: 'numeric', minute: '2-digit', hour12: true },
      'fallback'
    );

    expect(formatted).toBe('8:00 PM');
  });

  it('returns short timezone names', () => {
    const shortName = getTimeZoneShortName('America/Los_Angeles', 'UTC', new Date('2026-01-15T12:00:00.000Z'));
    expect(shortName).toMatch(/PT|PST|PDT/);
  });

  it('checks future zoned datetime', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

    expect(isFutureZonedDateTime('2026-01-02', '10:00:00', 'UTC')).toBe(true);
    expect(isFutureZonedDateTime('2025-12-31', '10:00:00', 'UTC')).toBe(false);

    vi.useRealTimers();
  });
});

