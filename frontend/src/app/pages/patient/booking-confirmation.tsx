import React from 'react';
import { Link, useLocation } from 'react-router';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { Check, Calendar, MapPin, Video } from 'lucide-react';
import { format } from 'date-fns';
import { formatTime24to12 } from '@/app/lib/availability-api';
import { type AppointmentRecord } from '@/app/lib/appointment-api';

export function BookingConfirmation() {
  const location = useLocation();
  const appointment = (location.state as { appointment?: AppointmentRecord } | null)?.appointment;

  const appointmentDateLabel = appointment
    ? format(new Date(`${appointment.appointment_date}T00:00:00`), 'MMMM d, yyyy')
    : 'Appointment date';
  const appointmentTimeLabel = appointment
    ? formatTime24to12(appointment.start_time)
    : 'Appointment time';
  const durationLabel = appointment?.duration ? `${appointment.duration} minutes` : 'Duration not available';
  const doctorName = appointment?.doctor?.full_name || 'Assigned Doctor';
  const doctorSpecialty = appointment?.doctor?.specialty || 'Specialty not provided';
  const appointmentType = appointment?.appointment_type === 'in-person' ? 'In-Person' : 'Virtual';
  const isInPerson = appointment?.appointment_type === 'in-person';
  const locationText = appointment?.doctor?.clinic_location || 'Clinic location will be shared by provider';

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <Card>
        <CardContent className="p-8 md:p-12 text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <Check className="h-8 w-8 text-green-600" />
          </div>

          <div>
            <h1 className="text-2xl md:text-3xl font-semibold mb-2">
              Booking Request Submitted
            </h1>
            <p className="text-muted-foreground text-lg">
              Your provider will confirm or decline this request soon.
            </p>
          </div>

          <Card className="bg-muted/30 border-none">
            <CardContent className="p-6 space-y-4 text-left">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">{appointmentDateLabel} at {appointmentTimeLabel}</p>
                  <p className="text-sm text-muted-foreground">{durationLabel}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                {isInPerson ? (
                  <MapPin className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                ) : (
                  <Video className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-medium">{appointmentType} Appointment</p>
                  <p className="text-sm text-muted-foreground">
                    {isInPerson ? locationText : 'Video call details will be provided after confirmation'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">{doctorName}</p>
                  <p className="text-sm text-muted-foreground">{doctorSpecialty}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <strong>Status:</strong> Pending provider decision. You can track updates from your dashboard.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Link to="/patient/dashboard" className="flex-1">
              <Button className="w-full">View Dashboard</Button>
            </Link>
            <Link to="/patient/providers" className="flex-1">
              <Button variant="outline" className="w-full">Book Another</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
