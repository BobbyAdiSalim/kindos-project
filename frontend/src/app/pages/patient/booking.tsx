import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Calendar } from '@/app/components/ui/calendar';
import { Label } from '@/app/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/app/components/ui/radio-group';
import { Textarea } from '@/app/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Badge } from '@/app/components/ui/badge';
import { mockDoctors } from '@/app/lib/mock-data';
import { getPublicProfile, type DoctorProfile } from '@/app/lib/profile-api';
import { getBookableSlots, formatTime24to12, type TimeSlot } from '@/app/lib/availability-api';
import { cn } from '@/app/components/ui/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Clock, Video, MapPin, Loader2, CalendarIcon, ArrowLeft } from 'lucide-react';

export function Booking() {
  const { doctorId } = useParams();
  const navigate = useNavigate();

  const [doctor, setDoctor] = useState<any>(null);
  const [doctorLoading, setDoctorLoading] = useState(true);

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState('');
  const [appointmentType, setAppointmentType] = useState<'virtual' | 'in-person'>('virtual');
  const [duration, setDuration] = useState('30');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [accessibility, setAccessibility] = useState<string[]>([]);

  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState('');

  // Fetch doctor profile from API with mock fallback
  useEffect(() => {
    const loadDoctor = async () => {
      if (!doctorId) { setDoctorLoading(false); return; }

      try {
        const data = await getPublicProfile(doctorId);
        if (data.user.role === 'doctor' && data.profile) {
          const p = data.profile as DoctorProfile;
          setDoctor({
            id: doctorId,
            name: p.full_name || data.user.username,
            specialty: p.specialty || '',
            virtualAvailable: p.virtual_available ?? true,
            inPersonAvailable: p.in_person_available ?? true,
            clinicLocation: p.clinic_location || '',
          });
          setDoctorLoading(false);
          return;
        }
      } catch { /* fall through to mock */ }

      const mock = mockDoctors.find(d => d.id === doctorId);
      if (mock) setDoctor(mock);
      setDoctorLoading(false);
    };
    loadDoctor();
  }, [doctorId]);

  useEffect(() => {
    if (!doctor) return;

    if (!doctor.virtualAvailable && doctor.inPersonAvailable) {
      setAppointmentType('in-person');
      return;
    }

    if (doctor.virtualAvailable && !doctor.inPersonAvailable) {
      setAppointmentType('virtual');
    }
  }, [doctor]);

  // Fetch available time slots when date changes
  useEffect(() => {
    if (!selectedDate || !doctorId) {
      setAvailableSlots([]);
      return;
    }

    const fetchSlots = async () => {
      setSlotsLoading(true);
      setSlotsError('');
      setSelectedTime('');

      try {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const data = await getBookableSlots(doctorId, dateStr);
        setAvailableSlots(data.slots);
      } catch (err: any) {
        console.error('Failed to load time slots:', err);
        setSlotsError(err.message || 'Could not load available times');
        setAvailableSlots([]);
      } finally {
        setSlotsLoading(false);
      }
    };

    fetchSlots();
  }, [selectedDate, doctorId]);

  const virtualUnavailable = !doctor?.virtualAvailable;
  const inPersonUnavailable = !doctor?.inPersonAvailable;
  const appointmentTypeLocked = !selectedTime;
  const selectedSlot = availableSlots.find((slot) => slot.start_time === selectedTime);
  const slotSupportsType = (slot: TimeSlot, type: 'virtual' | 'in-person') =>
    Array.isArray(slot.appointment_types) && slot.appointment_types.includes(type);
  const virtualAvailableForSelection =
    Boolean(doctor) && !virtualUnavailable && (!selectedSlot || slotSupportsType(selectedSlot, 'virtual'));
  const inPersonAvailableForSelection =
    Boolean(doctor) && !inPersonUnavailable && (!selectedSlot || slotSupportsType(selectedSlot, 'in-person'));
  const virtualDisabled = appointmentTypeLocked;
  const inPersonDisabled = appointmentTypeLocked;

  useEffect(() => {
    if (!doctor || !selectedSlot) return;

    if (appointmentType === 'virtual' && !virtualAvailableForSelection && inPersonAvailableForSelection) {
      setAppointmentType('in-person');
      return;
    }

    if (appointmentType === 'in-person' && !inPersonAvailableForSelection && virtualAvailableForSelection) {
      setAppointmentType('virtual');
    }
  }, [
    doctor,
    selectedSlot,
    appointmentType,
    virtualAvailableForSelection,
    inPersonAvailableForSelection,
  ]);

  if (doctorLoading) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="mt-3 text-muted-foreground">Loading doctor information...</p>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="font-semibold mb-2">Doctor not found</h3>
        <p className="text-muted-foreground mb-6">We couldn't find the doctor you're looking for.</p>
        <Button onClick={() => navigate('/patient/providers')}>Browse Providers</Button>
      </div>
    );
  }

  const handleBooking = () => {
    if (!selectedDate || !selectedTime || !reason) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (
      (appointmentType === 'virtual' && !virtualAvailableForSelection) ||
      (appointmentType === 'in-person' && !inPersonAvailableForSelection)
    ) {
      toast.error('Selected time slot does not support this appointment type');
      return;
    }

    toast.success('Appointment booked successfully!');
    navigate('/patient/booking/confirmation');
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      {/* Doctor Summary Header */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold">Book Appointment</h1>
              <p className="text-muted-foreground mt-1">with <span className="font-medium text-foreground">{doctor.name}</span></p>
              {doctor.specialty && (
                <p className="text-sm text-muted-foreground mt-1">{doctor.specialty}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {doctor.virtualAvailable && (
                <Badge variant="outline" className="border-blue-500 text-blue-700">
                  <Video className="h-3 w-3 mr-1" />
                  Virtual
                </Badge>
              )}
              {doctor.inPersonAvailable && (
                <Badge variant="outline" className="border-green-600 text-green-700">
                  <MapPin className="h-3 w-3 mr-1" />
                  In-Person
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Calendar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Select Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={(date) => date < new Date()}
              className="rounded-md border"
            />
            {selectedDate && (
              <p className="text-sm text-muted-foreground mt-3 text-center">
                Selected: <span className="font-medium text-foreground">{format(selectedDate, 'EEEE, MMMM d, yyyy')}</span>
              </p>
            )}
          </CardContent>
        </Card>

        {/* Time Slots */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Select Time
              </CardTitle>
              {!slotsLoading && !slotsError && availableSlots.length > 0 && (
                <Badge variant="secondary">
                  {availableSlots.length} slot{availableSlots.length !== 1 ? 's' : ''} available
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {slotsLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="mt-3 text-sm text-muted-foreground">Loading available times...</p>
              </div>
            ) : slotsError ? (
              <div className="flex flex-col items-center justify-center py-12">
                <CalendarIcon className="h-12 w-12 mb-4 text-muted-foreground" />
                <p className="font-semibold mb-1">Unable to load times</p>
                <p className="text-sm text-muted-foreground">{slotsError}</p>
              </div>
            ) : availableSlots.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Clock className="h-12 w-12 mb-4 text-muted-foreground" />
                <p className="font-semibold mb-1">No available times</p>
                <p className="text-sm text-muted-foreground">No slots available for this date.</p>
                <p className="text-sm text-muted-foreground">Try selecting a different date.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
                {availableSlots.map((slot) => (
                  <Button
                    key={slot.start_time}
                    variant={selectedTime === slot.start_time ? 'default' : 'outline'}
                    className="justify-start"
                    onClick={() => setSelectedTime(slot.start_time)}
                  >
                    <div className="flex items-center justify-between w-full gap-2">
                      <span className="inline-flex items-center min-w-0">
                        <Clock className="h-4 w-4 mr-2 shrink-0" />
                        {formatTime24to12(slot.start_time)}
                      </span>

                      <span className="inline-flex items-center gap-1 shrink-0">
                        {slotSupportsType(slot, 'virtual') && (
                          <span
                            className="inline-flex h-5 w-5 items-center justify-center rounded border border-blue-500 bg-blue-100 text-[10px] font-semibold text-blue-700"
                            title="Virtual available"
                            aria-label="Virtual available"
                          >
                            V
                          </span>
                        )}
                        {slotSupportsType(slot, 'in-person') && (
                          <span
                            className="inline-flex h-5 w-5 items-center justify-center rounded border border-green-600 bg-green-100 text-[10px] font-semibold text-green-700"
                            title="In-person available"
                            aria-label="In-person available"
                          >
                            I
                          </span>
                        )}
                      </span>
                    </div>
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Appointment Details */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Appointment Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Appointment Type</Label>
            {appointmentTypeLocked && (
              <p className="text-sm text-muted-foreground">Select a time slot first to choose appointment type.</p>
            )}
            {!appointmentTypeLocked && !virtualAvailableForSelection && !inPersonAvailableForSelection && (
              <p className="text-sm text-muted-foreground">Selected slot has no supported appointment types.</p>
            )}
            <RadioGroup value={appointmentType} onValueChange={(v) => setAppointmentType(v as any)}>
              {virtualAvailableForSelection && (
                <div
                  className={cn(
                    'flex items-center space-x-3 border rounded-lg p-4 transition-colors',
                    virtualDisabled
                      ? 'bg-muted/70 border-muted opacity-70 cursor-not-allowed'
                      : 'hover:bg-muted/50 cursor-pointer'
                  )}
                >
                  <RadioGroupItem value="virtual" id="book-virtual" disabled={virtualDisabled} />
                  <Label
                    htmlFor="book-virtual"
                    className={cn('flex-1', virtualDisabled ? 'cursor-not-allowed text-muted-foreground' : 'cursor-pointer')}
                  >
                    <div className="flex items-center gap-2">
                      <Video className={cn('h-4 w-4', virtualDisabled ? 'text-muted-foreground' : 'text-blue-600')} />
                      <span className="font-medium">Virtual (Video Call)</span>
                      <Badge
                        variant="outline"
                        className={cn(
                          'ml-auto',
                          virtualDisabled ? 'border-muted text-muted-foreground' : 'border-blue-500 text-blue-700'
                        )}
                      >
                        Virtual
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {appointmentTypeLocked ? 'Select a time slot first' : 'Meet from anywhere via video call'}
                    </p>
                  </Label>
                </div>
              )}

              {inPersonAvailableForSelection && (
                <div
                  className={cn(
                    'flex items-center space-x-3 border rounded-lg p-4 transition-colors',
                    inPersonDisabled
                      ? 'bg-muted/70 border-muted opacity-70 cursor-not-allowed'
                      : 'hover:bg-muted/50 cursor-pointer'
                  )}
                >
                  <RadioGroupItem value="in-person" id="book-in-person" disabled={inPersonDisabled} />
                  <Label
                    htmlFor="book-in-person"
                    className={cn('flex-1', inPersonDisabled ? 'cursor-not-allowed text-muted-foreground' : 'cursor-pointer')}
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className={cn('h-4 w-4', inPersonDisabled ? 'text-muted-foreground' : 'text-green-600')} />
                      <span className="font-medium">In-Person</span>
                      <Badge
                        variant="outline"
                        className={cn(
                          'ml-auto',
                          inPersonDisabled ? 'border-muted text-muted-foreground' : 'border-green-600 text-green-700'
                        )}
                      >
                        In-Person
                      </Badge>
                    </div>
                    {doctor.clinicLocation && !inPersonDisabled && (
                      <p className="text-sm text-muted-foreground mt-1">{doctor.clinicLocation}</p>
                    )}
                    {appointmentTypeLocked && (
                      <p className="text-sm text-muted-foreground mt-1">Select a time slot first</p>
                    )}
                  </Label>
                </div>
              )}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Duration</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger id="duration">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="45">45 minutes</SelectItem>
                <SelectItem value="60">60 minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Visit *</Label>
            <Textarea
              id="reason"
              placeholder="Briefly describe the reason for your appointment"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any other information the provider should know"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Accessibility Preferences (Optional)</Label>
            <div className="space-y-2">
              {[
                { id: 'asl', label: 'ASL interpreter needed' },
                { id: 'captions', label: 'Closed captions (virtual)' },
                { id: 'interpreter', label: 'Language interpreter' },
              ].map(option => (
                <div key={option.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`access-${option.id}`}
                    checked={accessibility.includes(option.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setAccessibility([...accessibility, option.id]);
                      } else {
                        setAccessibility(accessibility.filter(a => a !== option.id));
                      }
                    }}
                    className="h-4 w-4 rounded border-input"
                  />
                  <Label htmlFor={`access-${option.id}`} className="font-normal cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Booking Summary & Actions */}
      <Card className="mt-6">
        <CardContent className="p-6 bg-muted/30 rounded-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="text-sm space-y-1">
              {selectedDate && selectedTime ? (
                <>
                  <p className="font-medium">Booking Summary</p>
                  <div className="flex flex-wrap gap-4 text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CalendarIcon className="h-4 w-4" />
                      {format(selectedDate, 'MMM d, yyyy')}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {formatTime24to12(selectedTime)}
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">Select a date and time to continue</p>
              )}
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
              <Button variant="outline" onClick={() => navigate(-1)} className="flex-1 sm:flex-none">
                Cancel
              </Button>
              <Button onClick={handleBooking} size="lg" className="flex-1 sm:flex-none">
                Confirm Booking
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
