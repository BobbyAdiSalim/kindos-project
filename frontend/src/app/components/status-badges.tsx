import React from 'react';
import { Badge } from '@/app/components/ui/badge';

type StatusType =
  | 'verified'
  | 'pending'
  | 'scheduled'
  | 'confirmed'
  | 'declined'
  | 'cancelled'
  | 'completed'
  | 'no-show'
  | 'upcoming';

interface StatusBadgeProps {
  status: StatusType;
}

const statusConfig = {
  verified: { label: 'Verified', className: 'bg-green-100 text-green-800 hover:bg-green-100' },
  pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100' },
  scheduled: { label: 'Pending Confirmation', className: 'bg-amber-100 text-amber-800 hover:bg-amber-100' },
  confirmed: { label: 'Confirmed', className: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' },
  declined: { label: 'Declined', className: 'bg-rose-100 text-rose-800 hover:bg-rose-100' },
  cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-800 hover:bg-red-100' },
  completed: { label: 'Completed', className: 'bg-blue-100 text-blue-800 hover:bg-blue-100' },
  'no-show': { label: 'No Show', className: 'bg-slate-200 text-slate-800 hover:bg-slate-200' },
  upcoming: { label: 'Upcoming', className: 'bg-primary/20 text-primary-foreground hover:bg-primary/20' },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <Badge variant="secondary" className={config.className}>
      {config.label}
    </Badge>
  );
}

type AppointmentType = 'virtual' | 'in-person';

interface AppointmentTypeBadgeProps {
  type: AppointmentType;
}

export function AppointmentTypeBadge({ type }: AppointmentTypeBadgeProps) {
  const isVirtual = type === 'virtual';
  return (
    <Badge
      variant="outline"
      className={isVirtual ? 'border-blue-500 text-blue-700' : 'border-green-600 text-green-700'}
    >
      {isVirtual ? 'Virtual' : 'In-Person'}
    </Badge>
  );
}
