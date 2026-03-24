import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Clock, FileText, Loader2, MessageSquare, User } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { AppointmentTypeBadge, StatusBadge } from '@/app/components/status-badges';
import { useAuth } from '@/app/lib/auth-context';
import { formatTime24to12, getBookableSlots, type TimeSlot } from '@/app/lib/availability-api';
import {
  ApiError,
  getAppointmentById,
  rescheduleAppointment,
  updateAppointmentDecision,
  type AppointmentRecord,
} from '@/app/lib/appointment-api';
import { toast } from 'sonner';
import { Calendar } from '@/app/components/ui/calendar';
import { Label } from '@/app/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/app/components/ui/radio-group';
import { cn } from '@/app/components/ui/utils';
import { DeclineAppointmentDialog, type DoctorRejectionReasonCode } from '@/app/components/doctor/decline-appointment-dialog';
import { TimeZoneSelector } from '@/app/components/time-zone-selector';
import {
  formatZonedDateTime,
  getDefaultPreferredTimeZone,
  getTimeZoneShortName,
  isFutureZonedDateTime,
  resolveTimeZone,
} from '@/app/lib/timezone';
import { usePreferredTimeZone } from '@/app/lib/use-preferred-timezone';
import { getMyConnections } from '@/app/lib/chat-api';

const mapAppointmentStatus = (appointment: AppointmentRecord) => {
  if (appointment.status === 'cancelled' && appointment.declined_by_doctor) {
    return 'declined';
  }
  return appointment.status;
};

const parseDateOnlyLocal = (value: string) => new Date(`${value}T00:00:00`);
const isFutureSlotForDate = (
  selectedDate: Date | undefined,
  startTime: string,
  sourceTimeZone: string
) => {
  if (!selectedDate) return false;
  const dateOnly = format(selectedDate, 'yyyy-MM-dd');
  return isFutureZonedDateTime(dateOnly, startTime, sourceTimeZone);
};

export function DoctorAppointmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const { timeZone, timeZoneOptions, setTimeZone, systemTimeZone } = usePreferredTimeZone();
  const [appointment, setAppointment] = useState<AppointmentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
  const [error, setError] = useState('');
  const [rescheduleMode, setRescheduleMode] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState<Date | undefined>();
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleType, setRescheduleType] = useState<'virtual' | 'in-person'>('virtual');
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [slotSourceTimeZone, setSlotSourceTimeZone] = useState<string | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState('');
  const [rescheduleSubmitting, setRescheduleSubmitting] = useState(false);
  const [connectionId, setConnectionId] = useState<number | null>(null);

  useEffect(() => {
    const loadAppointment = async () => {
      if (!id || !token) {
        setLoading(false);
        setError('Appointment not found.');
        return;
      }

      try {
        setLoading(true);
        const data = await getAppointmentById(token, id);
        setAppointment(data);
        setError('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load appointment.');
        setAppointment(null);
      } finally {
        setLoading(false);
      }
    };

    loadAppointment();
  }, [id, token]);

  useEffect(() => {
    if (!token || !appointment?.patient?.id) return;
    const findConnection = async () => {
      try {
        const { connections } = await getMyConnections(token);
        const match = connections.find((c) => c.patient_id === appointment.patient!.id);
        if (match) setConnectionId(match.id);
      } catch {
        // Connection may not exist yet
      }
    };
    findConnection();
  }, [token, appointment?.patient?.id]);

  const status = useMemo(
    () => (appointment ? mapAppointmentStatus(appointment) : 'pending'),
    [appointment]
  );
  const sourceTimeZone = resolveTimeZone(
    slotSourceTimeZone || getDefaultPreferredTimeZone(),
    getDefaultPreferredTimeZone()
  );
  const targetTimeZone = resolveTimeZone(timeZone, systemTimeZone);
  const targetTimeZoneShort = getTimeZoneShortName(targetTimeZone, systemTimeZone);

  const visibleAvailableSlots = availableSlots.filter(
    (slot) => isFutureSlotForDate(rescheduleDate, slot.start_time, sourceTimeZone)
  );
  const selectedSlot = visibleAvailableSlots.find((slot) => slot.start_time === rescheduleTime);
  const slotSupportsType = (slot: TimeSlot, type: 'virtual' | 'in-person') =>
    Array.isArray(slot.appointment_types) && slot.appointment_types.includes(type);
  const pendingDoctorProposal = appointment?.pending_reschedule?.requested_by_role === 'doctor'
    ? appointment.pending_reschedule
    : null;
  const canReschedule = appointment
    ? ['scheduled', 'confirmed'].includes(appointment.status) && !pendingDoctorProposal
    : false;

  const loadSlots = async (date: Date, doctorUserId: number) => {
    setSlotsLoading(true);
    setSlotsError('');
    setRescheduleTime('');

    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      const data = await getBookableSlots(String(doctorUserId), dateStr);
      setAvailableSlots(data.slots);
      setSlotSourceTimeZone(data.doctor_time_zone || null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load available slots.';
      setSlotsError(message);
      setAvailableSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  };

  useEffect(() => {
    const doctorUserId = appointment?.doctor?.user_id;
    if (!rescheduleMode || !doctorUserId || !rescheduleDate) return;
    loadSlots(rescheduleDate, doctorUserId);
  }, [rescheduleMode, appointment?.doctor?.user_id, rescheduleDate]);

  useEffect(() => {
    if (rescheduleTime && !visibleAvailableSlots.some((slot) => slot.start_time === rescheduleTime)) {
      setRescheduleTime('');
    }
  }, [rescheduleTime, visibleAvailableSlots]);

  const handleDecision = async (action: 'confirm' | 'decline') => {
    if (!token || !id) return;

    try {
      setActionLoading(true);
      const updated = await updateAppointmentDecision(token, id, action);
      setAppointment(updated);
      toast.success(action === 'confirm' ? 'Booking confirmed.' : 'Booking declined.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update booking.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeclineConfirm = async ({
    reasonCode,
    reasonNote,
  }: {
    reasonCode: DoctorRejectionReasonCode;
    reasonNote?: string;
  }) => {
    if (!token || !id) return;

    try {
      setActionLoading(true);
      const updated = await updateAppointmentDecision(token, id, 'decline', {
        reasonCode,
        reasonNote,
      });
      setAppointment(updated);
      setDeclineDialogOpen(false);
      toast.success('Booking declined.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update booking.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="container mx-auto px-4 py-12 text-center">Loading appointment details...</div>;
  }

  if (!appointment) {
    return <div className="container mx-auto px-4 py-12 text-center">{error || 'Appointment not found.'}</div>;
  }

  const appointmentDateLabel = formatZonedDateTime(
    appointment.appointment_date,
    appointment.start_time,
    sourceTimeZone,
    targetTimeZone,
    { month: 'long', day: 'numeric', year: 'numeric' },
    appointment.appointment_date
  );
  const appointmentTimeLabel = formatZonedDateTime(
    appointment.appointment_date,
    appointment.start_time,
    sourceTimeZone,
    targetTimeZone,
    { hour: 'numeric', minute: '2-digit', hour12: true, timeZoneName: 'short' },
    formatTime24to12(appointment.start_time)
  );
  const formatSlotTime = (date: string, slotTime: string) =>
    formatZonedDateTime(
      date,
      slotTime,
      sourceTimeZone,
      targetTimeZone,
      { hour: 'numeric', minute: '2-digit', hour12: true },
      formatTime24to12(slotTime)
    );

  const openReschedule = () => {
    setRescheduleMode(true);
    setRescheduleDate(parseDateOnlyLocal(appointment.appointment_date));
    setRescheduleTime('');
    setRescheduleType(appointment.appointment_type);
    setAvailableSlots([]);
    setSlotsError('');
  };

  const closeReschedule = () => {
    setRescheduleMode(false);
    setRescheduleDate(undefined);
    setRescheduleTime('');
    setSlotsError('');
    setAvailableSlots([]);
  };

  const handleRescheduleSubmit = async () => {
    if (!token || !id || !rescheduleDate || !selectedSlot) {
      toast.error('Please choose a date and time slot.');
      return;
    }

    if (!slotSupportsType(selectedSlot, rescheduleType)) {
      toast.error('Selected slot does not support this appointment type.');
      return;
    }

    try {
      setRescheduleSubmitting(true);
      const updated = await rescheduleAppointment(token, id, {
        appointment_date: format(rescheduleDate, 'yyyy-MM-dd'),
        start_time: selectedSlot.start_time,
        end_time: selectedSlot.end_time,
        appointment_type: rescheduleType,
      });
      setAppointment(updated);
      closeReschedule();
      toast.success('Reschedule proposal sent. Patient has been emailed to confirm.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reschedule appointment.');

      if (
        err instanceof ApiError
        && err.status === 409
        && rescheduleDate
        && appointment.doctor?.user_id
      ) {
        await loadSlots(rescheduleDate, appointment.doctor.user_id);
      }
    } finally {
      setRescheduleSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <DeclineAppointmentDialog
        open={declineDialogOpen}
        onOpenChange={setDeclineDialogOpen}
        onConfirm={handleDeclineConfirm}
        loading={actionLoading}
        patientName={appointment.patient?.full_name || 'Patient'}
      />

      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
        ← Back
      </Button>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold mb-2">
              Appointment with {appointment.patient?.full_name || 'Patient'}
            </h1>
            <div className="flex gap-2">
              <AppointmentTypeBadge type={appointment.appointment_type} />
              <StatusBadge status={status} />
            </div>
          </div>
          <div className="flex gap-2">
            {connectionId && (
              <Button
                variant="outline"
                onClick={() => navigate(`/doctor/messages?connectionId=${connectionId}`)}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Message Patient
              </Button>
            )}
            {['scheduled', 'confirmed'].includes(appointment.status) && appointment.patient && (
              <Button
                variant="outline"
                onClick={() => navigate(`/doctor/patient/${appointment.patient!.id}/history`)}
              >
                <User className="h-4 w-4 mr-2" />
                Patient History
              </Button>
            )}
          </div>
        </div>

        <Card>
          <CardContent className="p-4">
            <TimeZoneSelector
              value={timeZone}
              options={timeZoneOptions}
              onChange={setTimeZone}
              label="Show Appointment Times In"
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <CalendarIcon className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Date</p>
                  <p className="text-muted-foreground">
                    {appointmentDateLabel}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Time</p>
                  <p className="text-muted-foreground">
                    {appointmentTimeLabel} ({appointment.duration} minutes)
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Reason for Visit</h3>
              <p className="text-muted-foreground">{appointment.reason}</p>
            </div>

            {appointment.notes && (
              <div>
                <h3 className="font-semibold mb-2">Patient Notes</h3>
                <p className="text-muted-foreground">{appointment.notes}</p>
              </div>
            )}

            {appointment.summary && (
              <div className="bg-muted/50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Visit Summary</h3>
                <p className="text-muted-foreground">{appointment.summary}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {pendingDoctorProposal && (
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">
                A reschedule proposal was sent to the patient. Waiting for patient confirmation.
              </p>
            </CardContent>
          </Card>
        )}

        {(canReschedule || appointment.status === 'no-show') && (
          <div className="space-y-3">
            {canReschedule && (
              <Button variant="outline" className="w-full" onClick={openReschedule}>
                Reschedule Appointment
              </Button>
            )}
            <div className="flex gap-3">
              {appointment.status === 'scheduled' && (
                <>
                  <Button
                    className="flex-1"
                    onClick={() => handleDecision('confirm')}
                    disabled={actionLoading}
                  >
                    Confirm
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => setDeclineDialogOpen(true)}
                    disabled={actionLoading}
                  >
                    Decline
                  </Button>
                </>
              )}
              {(appointment.status === 'confirmed' || appointment.status === 'no-show') && (
                <Button className="w-full" onClick={() => navigate(`/doctor/appointment/${appointment.id}/summary`)}>
                  <FileText className="h-4 w-4 mr-2" />
                  Mark as Complete
                </Button>
              )}
            </div>
          </div>
        )}

        {rescheduleMode && (
          <Card>
            <CardHeader>
              <CardTitle>Reschedule Appointment</CardTitle>
              <p className="text-sm text-muted-foreground">
                Choose an available slot. The patient will receive an email to confirm this new time slot.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label>Select Date</Label>
                  <Calendar
                    mode="single"
                    selected={rescheduleDate}
                    onSelect={setRescheduleDate}
                    disabled={(date) => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      return date < today;
                    }}
                    className="rounded-md border mt-2"
                  />
                </div>

                <div>
                  <Label>Select Time</Label>
                  <p className="text-xs text-muted-foreground mt-1">Times shown in {targetTimeZoneShort}.</p>
                  <div className="mt-2 min-h-48 border rounded-lg p-3">
                    {slotsLoading ? (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        Loading slots...
                      </div>
                    ) : slotsError ? (
                      <p className="text-sm text-destructive">{slotsError}</p>
                    ) : visibleAvailableSlots.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No available slots for this date.</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                        {visibleAvailableSlots.map((slot) => (
                          <Button
                            key={`${slot.start_time}-${slot.end_time}`}
                            variant={rescheduleTime === slot.start_time ? 'default' : 'outline'}
                            className="justify-start"
                            onClick={() => setRescheduleTime(slot.start_time)}
                          >
                            {rescheduleDate
                              ? formatSlotTime(format(rescheduleDate, 'yyyy-MM-dd'), slot.start_time)
                              : formatTime24to12(slot.start_time)}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Appointment Type</Label>
                <RadioGroup
                  value={rescheduleType}
                  onValueChange={(value) => setRescheduleType(value as 'virtual' | 'in-person')}
                >
                  {(['virtual', 'in-person'] as const).map((type) => {
                    const disabled = selectedSlot ? !slotSupportsType(selectedSlot, type) : false;
                    return (
                      <div
                        key={type}
                        className={cn(
                          'flex items-center space-x-2 border rounded-md p-3',
                          disabled && 'opacity-60'
                        )}
                      >
                        <RadioGroupItem value={type} id={`doctor-reschedule-${type}`} disabled={disabled} />
                        <Label htmlFor={`doctor-reschedule-${type}`} className={cn(disabled && 'cursor-not-allowed')}>
                          {type === 'virtual' ? 'Virtual' : 'In-Person'}
                        </Label>
                      </div>
                    );
                  })}
                </RadioGroup>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button variant="outline" className="flex-1" onClick={closeReschedule}>
                  Keep Current Schedule
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleRescheduleSubmit}
                  disabled={rescheduleSubmitting || !rescheduleDate || !selectedSlot}
                >
                  {rescheduleSubmitting ? 'Rescheduling...' : 'Submit Reschedule'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
