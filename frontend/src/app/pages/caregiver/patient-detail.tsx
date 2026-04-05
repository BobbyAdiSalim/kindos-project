/**
 * Patient Detail page — shows a specific linked patient's appointments
 * and allows the caregiver to cancel appointments on their behalf.
 * Accessible at /caregiver/patients/:id.
 */
import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { ArrowLeft, Plus, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import {
  getLinkedPatients,
  getPatientAppointments,
  cancelForPatient,
  type LinkedPatient,
} from '@/app/lib/caregiver-api';
import type { AppointmentRecord } from '@/app/lib/appointment-api';

export function CaregiverPatientDetail() {
  const { patientId } = useParams<{ patientId: string }>();
  const numericPatientId = Number(patientId);
  const [link, setLink] = useState<LinkedPatient | null>(null);
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [links, appts] = await Promise.all([
          getLinkedPatients(),
          getPatientAppointments(numericPatientId),
        ]);
        const found = links.find((l) => l.patient_id === numericPatientId && l.status === 'approved');
        setLink(found || null);
        setAppointments(appts);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to load data.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [numericPatientId]);

  const handleCancel = async (appointmentId: number) => {
    try {
      await cancelForPatient(numericPatientId, appointmentId);
      toast.success('Appointment cancelled.');
      setAppointments((prev) =>
        prev.map((a) => (a.id === appointmentId ? { ...a, status: 'cancelled' as const } : a))
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel.');
    }
  };

  const upcoming = appointments.filter((a) => a.status === 'scheduled' || a.status === 'confirmed');
  const past = appointments.filter((a) => !['scheduled', 'confirmed'].includes(a.status));

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!link) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <p className="text-destructive">Patient not found or link not approved.</p>
        <Link to="/caregiver/dashboard">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  const renderAppointmentRow = (appt: AppointmentRecord, showCancel: boolean) => (
    <div
      key={appt.id}
      className="flex items-center justify-between rounded-md border px-4 py-3"
    >
      <div className="flex items-center gap-3">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">Dr. {appt.doctor?.full_name || 'Unknown'}</p>
          <p className="text-xs text-muted-foreground">
            {appt.appointment_date} &middot; {appt.start_time.slice(0, 5)} -{' '}
            {appt.end_time.slice(0, 5)} &middot;{' '}
            <span className="capitalize">{appt.appointment_type}</span>
          </p>
          {appt.reason && (
            <p className="text-xs text-muted-foreground mt-0.5">Reason: {appt.reason}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs capitalize px-2 py-1 rounded-full bg-muted">{appt.status}</span>
        {showCancel && (
          <Button variant="destructive" size="sm" onClick={() => handleCancel(appt.id)}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <Link to="/caregiver/dashboard" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Dashboard
      </Link>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold mb-1">{link.patient.full_name}</h1>
          <p className="text-muted-foreground">
            {link.relationship && <span className="capitalize">{link.relationship} &middot; </span>}
            {link.patient.user.email}
          </p>
        </div>
        <Link to={`/caregiver/patient/${numericPatientId}/book`}>
          <Button size="lg">
            <Plus className="h-5 w-5 mr-2" />
            Book Appointment
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="w-full md:w-auto">
          <TabsTrigger value="upcoming">
            Upcoming ({upcoming.length})
          </TabsTrigger>
          <TabsTrigger value="past">
            Past ({past.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-4 space-y-3">
          {upcoming.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No upcoming appointments.
              </CardContent>
            </Card>
          ) : (
            upcoming.map((appt) => renderAppointmentRow(appt, true))
          )}
        </TabsContent>

        <TabsContent value="past" className="mt-4 space-y-3">
          {past.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No past appointments.
              </CardContent>
            </Card>
          ) : (
            past.map((appt) => renderAppointmentRow(appt, false))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
