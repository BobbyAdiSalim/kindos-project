import React from 'react';
import { Label } from '@/app/components/ui/label';
import type { TimeZoneOption } from '@/app/lib/timezone';

interface TimeZoneSelectorProps {
  value: string;
  options: TimeZoneOption[];
  onChange: (value: string) => void;
  label?: string;
}

export function TimeZoneSelector({
  value,
  options,
  onChange,
  label = 'Time Zone',
}: TimeZoneSelectorProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="time-zone-selector">{label}</Label>
      <select
        id="time-zone-selector"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
