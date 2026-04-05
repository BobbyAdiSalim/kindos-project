import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { AppointmentCard } from '@/app/components/appointment-card';
import { Bell, Plus, Calendar as CalendarIcon, MessageSquare, UserCheck, UserX } from 'lucide-react';
import { useAuth } from '@/app/lib/auth-context';
import { formatTime24to12 } from '@/app/lib/availability-api';
import { getMyAppointments, type AppointmentRecord } from '@/app/lib/appointment-api';
import { formatZonedDateTime, getDefaultPreferredTimeZone, resolveTimeZone } from '@/app/lib/timezone';
import { usePreferredTimeZone } from '@/app/lib/use-preferred-timezone';
import { getCaregiverRequests, respondToCaregiverRequest, type CaregiverRequest } from '@/app/lib/caregiver-api';
import { toast } from 'sonner';

const mapAppointmentStatus = (appointment: AppointmentRecord) => {
  if (appointment.status === 'cancelled' && appointment.declined_by_doctor) {
    return 'declined';
  }

  return appointment.status;
};

export function PatientDashboard() {
  const { token } = useAuth();
  const { timeZone, timeZoneOptions, systemTimeZone } = usePreferredTimeZone();
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [caregiverRequests, setCaregiverRequests] = useState<CaregiverRequest[]>([]);
  const displayTimeZone = resolveTimeZone(timeZone, systemTimeZone);
  const displayTimeZoneLabel = timeZoneOptions.find((option) => option.value === displayTimeZone)?.label || displayTimeZone;

  useEffect(() => {
    const loadAppointments = async () => {
      if (!token) {
        setLoading(false);
        setAppointments([]);
        return;
      }

      try {
        setLoading(true);
        setError('');
        const data = await getMyAppointments(token);
        setAppointments(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load appointments.');
        setAppointments([]);
      } finally {
        setLoading(false);
      }
    };

    loadAppointments();

    getCaregiverRequests()
      .then(setCaregiverRequests)
      .catch(() => {});
  }, [token]);

  const handleCaregiverResponse = async (requestId: number, status: 'approved' | 'rejected') => {
    try {
      await respondToCaregiverRequest(requestId, status);
      setCaregiverRequests((prev) => prev.filter((r) => r.id !== requestId));
      toast.success(`Caregiver request ${status}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to respond.');
    }
  };

  const { upcomingAppointments, pastAppointments } = useMemo(() => {
    const toAppointmentCardData = (appointment: AppointmentRecord) => {
      const sourceTimeZone = resolveTimeZone(
        appointment.doctor?.time_zone,
        getDefaultPreferredTimeZone()
      );
      const targetTimeZone = resolveTimeZone(timeZone, systemTimeZone);
      const dateLabel = formatZonedDateTime(
        appointment.appointment_date,
        appointment.start_time,
        sourceTimeZone,
        targetTimeZone,
        { month: 'long', day: 'numeric', year: 'numeric' },
        appointment.appointment_date
      );
      const timeLabel = formatZonedDateTime(
        appointment.appointment_date,
        appointment.start_time,
        sourceTimeZone,
        targetTimeZone,
        { hour: 'numeric', minute: '2-digit', hour12: true, timeZoneName: 'short' },
        formatTime24to12(appointment.start_time)
      );

      return {
        id: String(appointment.id),
        doctorName: appointment.doctor?.full_name || 'Doctor',
        patientName: appointment.patient?.full_name || undefined,
        date: appointment.appointment_date,
        time: timeLabel,
        dateLabel,
        timeLabel,
        type: appointment.appointment_type,
        status: mapAppointmentStatus(appointment),
        reason: appointment.reason,
        declineReason: appointment.declined_by_doctor
          ? (
              appointment.doctor_rejection_reason_note
                ? `${appointment.doctor_rejection_reason_label || 'Other'}: ${appointment.doctor_rejection_reason_note}`
                : appointment.doctor_rejection_reason_label
            )
          : null,
        hasReview: Boolean(appointment.review),
      };
    };

    const upcoming = appointments
      .filter((appointment) => appointment.status === 'scheduled' || appointment.status === 'confirmed')
      .map(toAppointmentCardData);
    const past = appointments
      .filter((appointment) => !['scheduled', 'confirmed'].includes(appointment.status))
      .sort((a, b) => {
        const dateCompare = new Date(`${b.appointment_date}T00:00:00`).getTime() - 
                          new Date(`${a.appointment_date}T00:00:00`).getTime();
        if (dateCompare !== 0) return dateCompare;
        return b.end_time.localeCompare(a.end_time);
      })
      .map(toAppointmentCardData);

    return { upcomingAppointments: upcoming, pastAppointments: past };
  }, [appointments, systemTimeZone, timeZone]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold mb-2">My Appointments</h1>
          <p className="text-muted-foreground">Manage your healthcare appointments</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/patient/messages">
            <Button size="lg" variant="outline">
              <MessageSquare className="h-5 w-5 mr-2" />
              Messages
            </Button>
          </Link>
          <Link to="/patient/waitlist">
            <Button size="lg" variant="outline">
              <Bell className="h-5 w-5 mr-2" />
              My Waitlist
            </Button>
          </Link>
          <Link to="/patient/providers">
            <Button size="lg">
              <Plus className="h-5 w-5 mr-2" />
              Book Appointment
            </Button>
          </Link>
        </div>
      </div>
      <p className="text-sm text-muted-foreground -mt-4 mb-6">
        Times shown in <span className="font-medium text-foreground">{displayTimeZoneLabel}</span>. Change this in{' '}
        <Link to="/patient/profile" className="underline underline-offset-4">
          Profile
        </Link>
        .
      </p>

      {caregiverRequests.length > 0 && (
        <div className="mb-6 space-y-3">
          {caregiverRequests.map((req) => (
            <div key={req.id} className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
              <div>
                <p className="text-sm font-medium">
                  {req.caregiver.full_name} wants to manage your appointments
                </p>
                <p className="text-xs text-muted-foreground">
                  {req.caregiver.user.email}
                  {req.relationship && <span> &middot; {req.relationship}</span>}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleCaregiverResponse(req.id, 'approved')}
                >
                  <UserCheck className="h-4 w-4 mr-1" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCaregiverResponse(req.id, 'rejected')}
                >
                  <UserX className="h-4 w-4 mr-1" />
                  Reject
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="w-full md:w-auto">
          <TabsTrigger value="upcoming" className="flex-1 md:flex-none">
            <CalendarIcon className="h-4 w-4 mr-2" />
            Upcoming ({upcomingAppointments.length})
          </TabsTrigger>
          <TabsTrigger value="past" className="flex-1 md:flex-none">
            Past ({pastAppointments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-6 space-y-4">
          {loading ? (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                Loading appointments...
              </CardContent>
            </Card>
          ) : error ? (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-muted-foreground mb-4">{error}</p>
                <Button variant="outline" onClick={() => window.location.reload()}>
                  Retry
                </Button>
              </CardContent>
            </Card>
          ) : upcomingAppointments.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-semibold mb-2">No upcoming appointments</h3>
                <p className="text-muted-foreground mb-6">
                  Ready to book your next appointment?
                </p>
                <Link to="/patient/providers">
                  <Button>Book Appointment</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            upcomingAppointments.map(appointment => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                userRole="patient"
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="past" className="mt-6 space-y-4">
          {loading ? (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                Loading appointments...
              </CardContent>
            </Card>
          ) : pastAppointments.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                No past appointments
              </CardContent>
            </Card>
          ) : (
            pastAppointments.map(appointment => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                userRole="patient"
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
