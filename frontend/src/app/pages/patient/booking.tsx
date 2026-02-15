import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Calendar } from '@/app/components/ui/calendar';
import { Label } from '@/app/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/app/components/ui/radio-group';
import { Textarea } from '@/app/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { mockDoctors } from '@/app/lib/mock-data';
import { getPublicProfile, type DoctorProfile } from '@/app/lib/profile-api';
import { getBookableSlots, formatTime24to12, type TimeSlot } from '@/app/lib/availability-api';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Clock, Video, Loader2 } from 'lucide-react';

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

  if (doctorLoading) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
        <p className="mt-2 text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!doctor) return <div>Doctor not found</div>;

  const handleBooking = () => {
    if (!selectedDate || !selectedTime || !reason) {
      toast.error('Please fill in all required fields');
      return;
    }

    toast.success('Appointment booked successfully!');
    navigate('/patient/booking/confirmation');
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
        ← Back
      </Button>

      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold mb-2">Book Appointment</h1>
        <p className="text-muted-foreground">with {doctor.name}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Calendar */}
        <Card>
          <CardHeader>
            <CardTitle>Select Date</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={(date) => date < new Date()}
              className="rounded-md border"
            />
          </CardContent>
        </Card>

        {/* Time Slots */}
        <Card>
          <CardHeader>
            <CardTitle>Select Time</CardTitle>
          </CardHeader>
          <CardContent>
            {slotsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Loading available times...</span>
              </div>
            ) : slotsError ? (
              <div className="text-center py-12 text-destructive">
                <p>{slotsError}</p>
              </div>
            ) : availableSlots.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No available time slots for this date.</p>
                <p className="text-sm mt-1">Try selecting a different date.</p>
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
                    <Clock className="h-4 w-4 mr-2" />
                    {formatTime24to12(slot.start_time)}
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
            <RadioGroup value={appointmentType} onValueChange={(v) => setAppointmentType(v as any)}>
              {doctor.virtualAvailable && (
                <div className="flex items-center space-x-3 border rounded-lg p-4 hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="virtual" id="book-virtual" />
                  <Label htmlFor="book-virtual" className="cursor-pointer flex-1">
                    <div className="flex items-center gap-2">
                      <Video className="h-4 w-4" />
                      <span className="font-medium">Virtual (Video Call)</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Meet from anywhere</p>
                  </Label>
                </div>
              )}
              {doctor.inPersonAvailable && (
                <div className="flex items-center space-x-3 border rounded-lg p-4 hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="in-person" id="book-in-person" />
                  <Label htmlFor="book-in-person" className="cursor-pointer flex-1">
                    <span className="font-medium">In-Person</span>
                    <p className="text-sm text-muted-foreground">{doctor.clinicLocation}</p>
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

      <div className="flex justify-end gap-3 mt-6">
        <Button variant="outline" onClick={() => navigate(-1)}>
          Cancel
        </Button>
        <Button onClick={handleBooking} size="lg">
          Confirm Booking
        </Button>
      </div>
    </div>
  );
}
