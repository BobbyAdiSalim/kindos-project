import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Calendar } from '@/app/components/ui/calendar';
import { Label } from '@/app/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/app/components/ui/radio-group';
import { Textarea } from '@/app/components/ui/textarea';
import { getPublicProfile, type DoctorProfile } from '@/app/lib/profile-api';
import {
  getBookableSlots,
  formatTime24to12,
  type TimeSlot,
} from '@/app/lib/availability-api';
import { bookForPatient, getLinkedPatients, type LinkedPatient } from '@/app/lib/caregiver-api';
import { useAuth } from '@/app/lib/auth-context';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { ArrowLeft, Clock, Loader2 } from 'lucide-react';

export function CaregiverBooking() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const numericPatientId = Number(patientId);

  const [patient, setPatient] = useState<LinkedPatient | null>(null);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null);
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState('');
  const [appointmentType, setAppointmentType] = useState<'virtual' | 'in-person'>('virtual');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [doctorsLoading, setDoctorsLoading] = useState(true);

  // Load patient info and doctor list
  useEffect(() => {
    const load = async () => {
      try {
        const links = await getLinkedPatients();
        const found = links.find((l) => l.patient_id === numericPatientId && l.status === 'approved');
        setPatient(found || null);

        const res = await fetch('/api/doctors', { credentials: 'include' });
        const data = await res.json();
        if (res.ok) {
          setDoctors(data.doctors || []);
        }
      } catch {
        toast.error('Failed to load data.');
      } finally {
        setDoctorsLoading(false);
      }
    };
    load();
  }, [numericPatientId]);

  // Load doctor profile when selected
  useEffect(() => {
    if (!selectedDoctorId) { setDoctor(null); return; }
    const load = async () => {
      try {
        const profile = await getPublicProfile(selectedDoctorId);
        setDoctor(profile);
      } catch {
        toast.error('Failed to load doctor profile.');
      }
    };
    load();
  }, [selectedDoctorId]);

  // Load slots when doctor and date change
  useEffect(() => {
    if (!selectedDoctorId || !selectedDate) { setAvailableSlots([]); return; }
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const load = async () => {
      try {
        setSlotsLoading(true);
        const data = await getBookableSlots(selectedDoctorId, dateStr);
        setAvailableSlots(data.slots || []);
      } catch {
        setAvailableSlots([]);
      } finally {
        setSlotsLoading(false);
      }
    };
    load();
  }, [selectedDoctorId, selectedDate]);

  const handleSubmit = async () => {
    if (!selectedDoctorId || !selectedDate || !selectedTime || !reason.trim()) {
      toast.error('Please fill in all required fields.');
      return;
    }

    const slot = availableSlots.find((s) => s.start_time === selectedTime);
    if (!slot) {
      toast.error('Selected time slot is no longer available.');
      return;
    }

    try {
      setSubmitting(true);
      await bookForPatient(numericPatientId, {
        doctor_user_id: selectedDoctorId,
        appointment_date: format(selectedDate, 'yyyy-MM-dd'),
        start_time: slot.start_time,
        end_time: slot.end_time,
        appointment_type: appointmentType,
        reason: reason.trim(),
        notes: notes.trim() || undefined,
      });
      toast.success('Appointment booked successfully!');
      navigate(`/caregiver/patient/${numericPatientId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to book.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!patient && !doctorsLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <p className="text-destructive">Patient not found or link not approved.</p>
      </div>
    );
  }

  const filteredSlots = availableSlots.filter((slot) =>
    Array.isArray(slot.appointment_types)
      ? slot.appointment_types.includes(appointmentType)
      : true
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <button
        onClick={() => navigate(`/caregiver/patient/${numericPatientId}`)}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Patient
      </button>

      <h1 className="text-2xl font-semibold mb-1">
        Book Appointment for {patient?.patient.full_name || 'Patient'}
      </h1>
      <p className="text-muted-foreground mb-8">Select a doctor, date, and time.</p>

      {/* Step 1: Select Doctor */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">1. Select Doctor</CardTitle>
        </CardHeader>
        <CardContent>
          {doctorsLoading ? (
            <p className="text-muted-foreground">Loading doctors...</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {doctors.map((d: any) => (
                <button
                  key={d.user_id}
                  type="button"
                  onClick={() => { setSelectedDoctorId(d.user_id); setSelectedTime(''); }}
                  className={`w-full text-left px-4 py-3 rounded-md border transition-colors ${
                    selectedDoctorId === d.user_id
                      ? 'border-primary bg-primary/5'
                      : 'border-input hover:border-primary/50'
                  }`}
                >
                  <p className="font-medium text-sm">Dr. {d.full_name}</p>
                  <p className="text-xs text-muted-foreground">{d.specialty}</p>
                </button>
              ))}
              {doctors.length === 0 && (
                <p className="text-muted-foreground text-sm">No doctors available.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Date & Time */}
      {selectedDoctorId && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">2. Select Date & Time</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Appointment Type</Label>
              <RadioGroup
                value={appointmentType}
                onValueChange={(v: string) => { setAppointmentType(v as 'virtual' | 'in-person'); setSelectedTime(''); }}
              >
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="virtual" id="type-virtual" />
                  <Label htmlFor="type-virtual" className="font-normal cursor-pointer">Virtual</Label>
                </div>
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="in-person" id="type-inperson" />
                  <Label htmlFor="type-inperson" className="font-normal cursor-pointer">In-Person</Label>
                </div>
              </RadioGroup>
            </div>

            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(d) => { setSelectedDate(d); setSelectedTime(''); }}
              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              className="rounded-md border w-fit"
            />

            {slotsLoading && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading available times...
              </div>
            )}

            {!slotsLoading && filteredSlots.length > 0 && (
              <div>
                <Label className="mb-2 block">Available Times</Label>
                <div className="flex flex-wrap gap-2">
                  {filteredSlots.map((slot) => (
                    <button
                      key={slot.start_time}
                      type="button"
                      onClick={() => setSelectedTime(slot.start_time)}
                      className={`flex items-center gap-1 px-3 py-2 rounded-md border text-sm transition-colors ${
                        selectedTime === slot.start_time
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-input hover:border-primary/50'
                      }`}
                    >
                      <Clock className="h-3 w-3" />
                      {formatTime24to12(slot.start_time)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!slotsLoading && selectedDate && filteredSlots.length === 0 && (
              <p className="text-sm text-muted-foreground">No available slots for this date and type.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Details */}
      {selectedTime && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">3. Appointment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Visit *</Label>
              <Textarea
                id="reason"
                placeholder="Describe the reason for this appointment"
                value={reason}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReason(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any additional information for the doctor"
                value={notes}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
            <Button onClick={handleSubmit} disabled={submitting} className="w-full h-12">
              {submitting ? 'Booking...' : 'Book Appointment'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
