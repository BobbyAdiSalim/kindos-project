import React, { useId } from 'react';
import { Label } from '@/app/components/ui/label';
import { cn } from '@/app/components/ui/utils';
import type { TimeZoneOption } from '@/app/lib/timezone';

interface TimeZoneSelectorProps {
  value: string;
  options: TimeZoneOption[];
  onChange: (value: string) => void;
  label?: string;
  className?: string;
}

export function TimeZoneSelector({
  value,
  options,
  onChange,
  label = 'Time zone',
  className,
}: TimeZoneSelectorProps) {
  const selectId = useId();

  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={selectId}>{label}</Label>
      <select
        id={selectId}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
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
