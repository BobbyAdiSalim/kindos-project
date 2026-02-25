import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { AppointmentTypeBadge, StatusBadge } from '@/app/components/status-badges';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Clock, MapPin, Video, Loader2 } from 'lucide-react';
import { useAuth } from '@/app/lib/auth-context';
import { formatTime24to12, getBookableSlots, type TimeSlot } from '@/app/lib/availability-api';
import {
  ApiError,
  cancelAppointment,
  getAppointmentById,
  rescheduleAppointment,
  type AppointmentRecord,
} from '@/app/lib/appointment-api';
import { toast } from 'sonner';
import { Calendar } from '@/app/components/ui/calendar';
import { Label } from '@/app/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/app/components/ui/radio-group';
import { cn } from '@/app/components/ui/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/app/components/ui/alert-dialog';

const mapAppointmentStatus = (appointment: AppointmentRecord) => {
  if (appointment.status === 'cancelled' && appointment.declined_by_doctor) {
    return 'declined';
  }
  return appointment.status;
};

const parseDateOnlyLocal = (value: string) => new Date(`${value}T00:00:00`);

export function AppointmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [appointment, setAppointment] = useState<AppointmentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rescheduleMode, setRescheduleMode] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState<Date | undefined>();
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleType, setRescheduleType] = useState<'virtual' | 'in-person'>('virtual');
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState('');
  const [rescheduleSubmitting, setRescheduleSubmitting] = useState(false);
  const [cancelSubmitting, setCancelSubmitting] = useState(false);

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

  const status = useMemo(
    () => (appointment ? mapAppointmentStatus(appointment) : 'pending'),
    [appointment]
  );

  const selectedSlot = availableSlots.find((slot) => slot.start_time === rescheduleTime);
  const slotSupportsType = (slot: TimeSlot, type: 'virtual' | 'in-person') =>
    Array.isArray(slot.appointment_types) && slot.appointment_types.includes(type);
  const canRescheduleOrCancel = appointment
    ? ['scheduled', 'confirmed'].includes(appointment.status)
    : false;

  const loadSlots = async (date: Date, doctorUserId: number) => {
    setSlotsLoading(true);
    setSlotsError('');
    setRescheduleTime('');

    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      const data = await getBookableSlots(String(doctorUserId), dateStr);
      setAvailableSlots(data.slots);
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

  if (loading) {
    return <div className="container mx-auto px-4 py-12 text-center">Loading appointment details...</div>;
  }

  if (!appointment) {
    return <div className="container mx-auto px-4 py-12 text-center">{error || 'Appointment not found.'}</div>;
  }

  const appointmentDate = parseDateOnlyLocal(appointment.appointment_date);
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
      toast.success('Appointment rescheduled. Waiting for doctor reconfirmation.');
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

  const handleCancelAppointment = async () => {
    if (!token || !id) return;

    try {
      setCancelSubmitting(true);
      const updated = await cancelAppointment(token, id);
      setAppointment(updated);
      toast.success('Appointment cancelled.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel appointment.');
    } finally {
      setCancelSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
        ← Back
      </Button>

      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold mb-2">
              Appointment Details
            </h1>
            <div className="flex flex-wrap gap-2">
              <AppointmentTypeBadge type={appointment.appointment_type} />
              <StatusBadge status={status} />
            </div>
          </div>
        </div>

        <Card>
          <CardContent className="p-6 space-y-6">
            <div>
              <h3 className="font-semibold mb-3">Provider</h3>
              <p className="text-lg">{appointment.doctor?.full_name || 'Doctor'}</p>
              {appointment.doctor?.specialty && (
                <p className="text-muted-foreground">{appointment.doctor.specialty}</p>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <CalendarIcon className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Date</p>
                  <p className="text-muted-foreground">
                    {format(appointmentDate, 'MMMM d, yyyy')}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Time</p>
                  <p className="text-muted-foreground">
                    {formatTime24to12(appointment.start_time)} ({appointment.duration} minutes)
                  </p>
                </div>
              </div>
            </div>

            {appointment.appointment_type === 'virtual' ? (
              <div className="flex items-start gap-3">
                <Video className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Virtual Appointment</p>
                  <p className="text-sm text-muted-foreground">
                    Video call details are shared after confirmation.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">In-Person Appointment</p>
                  <p className="text-sm text-muted-foreground">
                    {appointment.doctor?.clinic_location || 'Clinic location will be shared by provider.'}
                  </p>
                </div>
              </div>
            )}

            <div>
              <h3 className="font-semibold mb-2">Reason for Visit</h3>
              <p className="text-muted-foreground">{appointment.reason}</p>
            </div>

            {appointment.notes && (
              <div>
                <h3 className="font-semibold mb-2">Notes</h3>
                <p className="text-muted-foreground">{appointment.notes}</p>
              </div>
            )}

            {status === 'scheduled' && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm">
                <p className="text-amber-900">
                  Waiting for doctor confirmation.
                </p>
              </div>
            )}

            {status === 'declined' && (
              <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 text-sm">
                <p className="text-rose-900">
                  This booking was declined by the provider.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {canRescheduleOrCancel && (
          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="outline" size="lg" className="flex-1" onClick={openReschedule}>
              Reschedule
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="lg" className="flex-1" disabled={cancelSubmitting}>
                  {cancelSubmitting ? 'Cancelling...' : 'Cancel Appointment'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel Appointment?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will cancel your appointment. You can book again later if needed.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep Appointment</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleCancelAppointment}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Confirm Cancel
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        {rescheduleMode && (
          <Card>
            <CardHeader>
              <CardTitle>Reschedule Appointment</CardTitle>
              <p className="text-sm text-muted-foreground">
                Choose an available slot. Your doctor must reconfirm the new booking.
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
                    disabled={(date) => date < new Date()}
                    className="rounded-md border mt-2"
                  />
                </div>

                <div>
                  <Label>Select Time</Label>
                  <div className="mt-2 min-h-48 border rounded-lg p-3">
                    {slotsLoading ? (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        Loading slots...
                      </div>
                    ) : slotsError ? (
                      <p className="text-sm text-destructive">{slotsError}</p>
                    ) : availableSlots.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No available slots for this date.</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                        {availableSlots.map((slot) => (
                          <Button
                            key={`${slot.start_time}-${slot.end_time}`}
                            variant={rescheduleTime === slot.start_time ? 'default' : 'outline'}
                            className="justify-start"
                            onClick={() => setRescheduleTime(slot.start_time)}
                          >
                            {formatTime24to12(slot.start_time)}
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
                        <RadioGroupItem value={type} id={`reschedule-${type}`} disabled={disabled} />
                        <Label htmlFor={`reschedule-${type}`} className={cn(disabled && 'cursor-not-allowed')}>
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
