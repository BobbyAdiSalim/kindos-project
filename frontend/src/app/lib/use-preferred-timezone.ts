import { useEffect, useMemo, useState } from 'react';
import {
  getStoredPreferredTimeZone,
  getSystemTimeZone,
  getTimeZoneOptions,
  isValidTimeZone,
  setStoredPreferredTimeZone,
  type TimeZoneOption,
} from '@/app/lib/timezone';

interface UsePreferredTimeZoneResult {
  timeZone: string;
  systemTimeZone: string;
  timeZoneOptions: TimeZoneOption[];
  setTimeZone: (timeZone: string) => void;
}

export const usePreferredTimeZone = (): UsePreferredTimeZoneResult => {
  const [timeZone, setTimeZoneState] = useState<string>(getStoredPreferredTimeZone());
  const systemTimeZone = useMemo(() => getSystemTimeZone(), []);
  const timeZoneOptions = useMemo(() => getTimeZoneOptions(), []);

  useEffect(() => {
    setTimeZoneState(getStoredPreferredTimeZone());
  }, []);

  const setTimeZone = (nextTimeZone: string) => {
    if (!isValidTimeZone(nextTimeZone)) return;
    setTimeZoneState(nextTimeZone);
    setStoredPreferredTimeZone(nextTimeZone);
  };

  return {
    timeZone,
    systemTimeZone,
    timeZoneOptions,
    setTimeZone,
  };
};
