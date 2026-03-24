import React, { useEffect, useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';

export const DOCTOR_REJECTION_REASONS = [
  { code: 'schedule_conflict', label: 'Schedule conflict' },
  { code: 'outside_specialty', label: 'Outside specialty' },
  { code: 'insufficient_information', label: 'Insufficient information provided' },
  { code: 'clinic_unavailable', label: 'Clinic unavailable' },
  { code: 'duplicate_booking', label: 'Duplicate booking' },
  { code: 'other', label: 'Other' },
] as const;

export type DoctorRejectionReasonCode = typeof DOCTOR_REJECTION_REASONS[number]['code'];

interface DeclineAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (payload: { reasonCode: DoctorRejectionReasonCode; reasonNote?: string }) => Promise<void> | void;
  loading?: boolean;
  patientName?: string;
}

export function DeclineAppointmentDialog({
  open,
  onOpenChange,
  onConfirm,
  loading = false,
  patientName,
}: DeclineAppointmentDialogProps) {
  const [reasonCode, setReasonCode] = useState<DoctorRejectionReasonCode | ''>('');
  const [reasonNote, setReasonNote] = useState('');

  useEffect(() => {
    if (!open) {
      setReasonCode('');
      setReasonNote('');
    }
  }, [open]);

  const needsNote = reasonCode === 'other';
  const canSubmit = reasonCode !== '' && (!needsNote || reasonNote.trim().length > 0);

  const handleConfirm = async () => {
    if (!canSubmit || !reasonCode) return;

    await onConfirm({
      reasonCode,
      ...(needsNote ? { reasonNote: reasonNote.trim() } : {}),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Decline Appointment</DialogTitle>
          <DialogDescription>
            Select a rejection reason before declining
            {patientName ? ` for ${patientName}` : ''}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="doctor-rejection-reason">Rejection reason</Label>
            <Select
              value={reasonCode}
              onValueChange={(value) => setReasonCode(value as DoctorRejectionReasonCode)}
            >
              <SelectTrigger id="doctor-rejection-reason">
                <SelectValue placeholder="Choose a reason" />
              </SelectTrigger>
              <SelectContent>
                {DOCTOR_REJECTION_REASONS.map((option) => (
                  <SelectItem key={option.code} value={option.code}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {needsNote && (
            <div className="space-y-2">
              <Label htmlFor="doctor-rejection-note">Additional details</Label>
              <Textarea
                id="doctor-rejection-note"
                value={reasonNote}
                onChange={(event) => setReasonNote(event.target.value)}
                placeholder="Provide a short explanation"
                rows={4}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={!canSubmit || loading}>
            {loading ? 'Declining...' : 'Decline Appointment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
