const PREFERRED_TIME_ZONE_STORAGE_KEY = 'kindos.preferred_time_zone';
const DEFAULT_TIME_ZONE = 'America/New_York';
const DATE_ONLY_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_ONLY_REGEX = /^(\d{2}):(\d{2})(?::(\d{2}))?$/;

export interface TimeZoneOption {
  value: string;
  label: string;
}

const COMMON_TIME_ZONE_OPTIONS: TimeZoneOption[] = [
  { value: 'America/New_York', label: 'EST/EDT (UTC-05:00 / UTC-04:00) - Eastern Time' },
  { value: 'America/Chicago', label: 'CST/CDT (UTC-06:00 / UTC-05:00) - Central Time' },
  { value: 'America/Denver', label: 'MST/MDT (UTC-07:00 / UTC-06:00) - Mountain Time' },
  { value: 'America/Phoenix', label: 'MST (UTC-07:00) - Arizona' },
  { value: 'America/Los_Angeles', label: 'PST/PDT (UTC-08:00 / UTC-07:00) - Pacific Time' },
  { value: 'America/Anchorage', label: 'AKST/AKDT (UTC-09:00 / UTC-08:00) - Alaska Time' },
  { value: 'Pacific/Honolulu', label: 'HST (UTC-10:00) - Hawaii Time' },
  { value: 'UTC', label: 'UTC (UTC+00:00)' },
  { value: 'Europe/London', label: 'GMT/BST (UTC+00:00 / UTC+01:00) - London' },
  { value: 'Europe/Berlin', label: 'CET/CEST (UTC+01:00 / UTC+02:00) - Central Europe' },
  { value: 'Asia/Tokyo', label: 'JST (UTC+09:00) - Tokyo' },
  { value: 'Australia/Sydney', label: 'AEST/AEDT (UTC+10:00 / UTC+11:00) - Sydney' },
];

export const isValidTimeZone = (timeZone: string | null | undefined): timeZone is string => {
  if (!timeZone || typeof timeZone !== 'string') return false;

  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
};

export const getSystemTimeZone = (): string => {
  const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return isValidTimeZone(detected) ? detected : 'UTC';
};

export const getDefaultPreferredTimeZone = (): string => DEFAULT_TIME_ZONE;

export const getStoredPreferredTimeZone = (): string => {
  if (typeof window === 'undefined') return DEFAULT_TIME_ZONE;

  const stored = window.localStorage.getItem(PREFERRED_TIME_ZONE_STORAGE_KEY);
  if (isValidTimeZone(stored)) return stored;

  return DEFAULT_TIME_ZONE;
};

export const setStoredPreferredTimeZone = (timeZone: string) => {
  if (typeof window === 'undefined') return;
  if (!isValidTimeZone(timeZone)) return;
  window.localStorage.setItem(PREFERRED_TIME_ZONE_STORAGE_KEY, timeZone);
};

export const resolveTimeZone = (timeZone: string | null | undefined, fallback: string): string => {
  if (isValidTimeZone(timeZone)) return timeZone;
  if (isValidTimeZone(fallback)) return fallback;
  return 'UTC';
};

export const getTimeZoneOptions = (): TimeZoneOption[] => {
  const systemTimeZone = getSystemTimeZone();
  const validCommon = COMMON_TIME_ZONE_OPTIONS.filter((option) => isValidTimeZone(option.value));
  const hasLocal = validCommon.some((option) => option.value === systemTimeZone);

  if (hasLocal) {
    return validCommon.map((option) => ({
      ...option,
      label: option.value === systemTimeZone ? `${option.label} (Local)` : option.label,
    }));
  }

  return [
    { value: systemTimeZone, label: `${systemTimeZone} (Local)` },
    ...validCommon,
  ];
};

const parseDateOnly = (value: string) => {
  const match = DATE_ONLY_REGEX.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  return { year, month, day };
};

const parseTimeOnly = (value: string) => {
  const match = TIME_ONLY_REGEX.exec(value);
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = match[3] ? Number(match[3]) : 0;

  if (!Number.isInteger(hour) || !Number.isInteger(minute) || !Number.isInteger(second)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59 || second < 0 || second > 59) return null;

  return { hour, minute, second };
};

const getPartNumber = (parts: Intl.DateTimeFormatPart[], partType: Intl.DateTimeFormatPartTypes): number => {
  const match = parts.find((part) => part.type === partType)?.value;
  const parsed = Number(match);
  return Number.isFinite(parsed) ? parsed : NaN;
};

const getTimeZoneOffsetMs = (timeZone: string, utcTimestampMs: number): number | null => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });

  const parts = formatter.formatToParts(new Date(utcTimestampMs));
  const year = getPartNumber(parts, 'year');
  const month = getPartNumber(parts, 'month');
  const day = getPartNumber(parts, 'day');
  const hour = getPartNumber(parts, 'hour');
  const minute = getPartNumber(parts, 'minute');
  const second = getPartNumber(parts, 'second');

  if ([year, month, day, hour, minute, second].some((value) => Number.isNaN(value))) {
    return null;
  }

  const interpretedAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  return interpretedAsUtc - utcTimestampMs;
};

export const zonedDateTimeToUtcDate = (
  date: string,
  time: string,
  sourceTimeZone: string | null | undefined
): Date | null => {
  const parsedDate = parseDateOnly(date);
  const parsedTime = parseTimeOnly(time);
  if (!parsedDate || !parsedTime) return null;

  const resolvedSourceTimeZone = resolveTimeZone(sourceTimeZone, getSystemTimeZone());
  const utcGuess = Date.UTC(
    parsedDate.year,
    parsedDate.month - 1,
    parsedDate.day,
    parsedTime.hour,
    parsedTime.minute,
    parsedTime.second
  );

  const firstOffset = getTimeZoneOffsetMs(resolvedSourceTimeZone, utcGuess);
  if (firstOffset === null) return null;

  let resolvedUtc = utcGuess - firstOffset;
  const secondOffset = getTimeZoneOffsetMs(resolvedSourceTimeZone, resolvedUtc);
  if (secondOffset !== null && secondOffset !== firstOffset) {
    resolvedUtc = utcGuess - secondOffset;
  }

  return new Date(resolvedUtc);
};

export const formatZonedDateTime = (
  date: string,
  time: string,
  sourceTimeZone: string | null | undefined,
  targetTimeZone: string | null | undefined,
  options: Intl.DateTimeFormatOptions,
  fallback = ''
): string => {
  const utcDate = zonedDateTimeToUtcDate(date, time, sourceTimeZone);
  if (!utcDate) return fallback;

  const resolvedTargetTimeZone = resolveTimeZone(targetTimeZone, getSystemTimeZone());
  return new Intl.DateTimeFormat('en-US', {
    ...options,
    timeZone: resolvedTargetTimeZone,
  }).format(utcDate);
};

export const isFutureZonedDateTime = (
  date: string,
  time: string,
  sourceTimeZone: string | null | undefined
): boolean => {
  const utcDate = zonedDateTimeToUtcDate(date, time, sourceTimeZone);
  if (!utcDate) return false;
  return utcDate.getTime() > Date.now();
};
