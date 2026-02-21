import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { AppointmentCard } from '@/app/components/appointment-card';
import { Plus, Calendar as CalendarIcon } from 'lucide-react';
import { useAuth } from '@/app/lib/auth-context';
import { formatTime24to12 } from '@/app/lib/availability-api';
import { getMyAppointments, type AppointmentRecord } from '@/app/lib/appointment-api';

const mapAppointmentStatus = (appointment: AppointmentRecord) => {
  if (appointment.status === 'cancelled' && appointment.declined_by_doctor) {
    return 'declined';
  }

  return appointment.status;
};

const toAppointmentCardData = (appointment: AppointmentRecord) => ({
  id: String(appointment.id),
  doctorName: appointment.doctor?.full_name || 'Doctor',
  patientName: appointment.patient?.full_name || undefined,
  date: appointment.appointment_date,
  time: formatTime24to12(appointment.start_time),
  type: appointment.appointment_type,
  status: mapAppointmentStatus(appointment),
  reason: appointment.reason,
});

export function PatientDashboard() {
  const { token } = useAuth();
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
  }, [token]);

  const { upcomingAppointments, pastAppointments } = useMemo(() => {
    const upcoming = appointments
      .filter((appointment) => appointment.status === 'scheduled' || appointment.status === 'confirmed')
      .map(toAppointmentCardData);
    const past = appointments
      .filter((appointment) => !['scheduled', 'confirmed'].includes(appointment.status))
      .map(toAppointmentCardData);

    return { upcomingAppointments: upcoming, pastAppointments: past };
  }, [appointments]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold mb-2">My Appointments</h1>
          <p className="text-muted-foreground">Manage your healthcare appointments</p>
        </div>
        <Link to="/patient/providers">
          <Button size="lg">
            <Plus className="h-5 w-5 mr-2" />
            Book Appointment
          </Button>
        </Link>
      </div>

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
