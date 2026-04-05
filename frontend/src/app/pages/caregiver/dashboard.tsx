import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Users, Plus, Calendar } from 'lucide-react';
import { getLinkedPatients, getPatientAppointments, type LinkedPatient } from '@/app/lib/caregiver-api';
import type { AppointmentRecord } from '@/app/lib/appointment-api';

interface PatientWithAppointments {
  link: LinkedPatient;
  appointments: AppointmentRecord[];
}

export function CaregiverDashboard() {
  const [patientsData, setPatientsData] = useState<PatientWithAppointments[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const links = await getLinkedPatients();
        const approved = links.filter((l) => l.status === 'approved');

        const withAppointments = await Promise.all(
          approved.map(async (link) => {
            try {
              const appointments = await getPatientAppointments(link.patient_id);
              return { link, appointments };
            } catch {
              return { link, appointments: [] };
            }
          })
        );

        setPatientsData(withAppointments);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const upcomingForPatient = (appointments: AppointmentRecord[]) =>
    appointments
      .filter((a) => a.status === 'scheduled' || a.status === 'confirmed')
      .sort((a, b) => a.appointment_date.localeCompare(b.appointment_date));

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold mb-2">Linked patients appointments</h1>
          <p className="text-muted-foreground">Manage appointments for your linked patients</p>
        </div>
        <Link to="/caregiver/patients">
          <Button size="lg">
            <Users className="h-5 w-5 mr-2" />
            Manage Patients
          </Button>
        </Link>
      </div>

      {loading && <p className="text-muted-foreground">Loading...</p>}
      {error && <p className="text-destructive">{error}</p>}

      {!loading && patientsData.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-lg font-medium mb-2">No linked patients yet</h2>
            <p className="text-muted-foreground mb-4">
              Send a link request to a patient to start managing their appointments.
            </p>
            <Link to="/caregiver/patients">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Link a Patient
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="space-y-6">
        {patientsData.map(({ link, appointments }) => {
          const upcoming = upcomingForPatient(appointments);

          return (
            <Card key={link.patient_id}>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-lg">{link.patient.full_name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {link.relationship && <span className="capitalize">{link.relationship} &middot; </span>}
                    {link.patient.user.email}
                  </p>
                </div>
                <Link to={`/caregiver/patient/${link.patient_id}`}>
                  <Button variant="outline" size="sm">View Details</Button>
                </Link>
              </CardHeader>
              <CardContent>
                {upcoming.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No upcoming appointments.</p>
                ) : (
                  <div className="space-y-2">
                    {upcoming.slice(0, 3).map((appt) => (
                      <div
                        key={appt.id}
                        className="flex items-center justify-between rounded-md border px-4 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">
                              Dr. {appt.doctor?.full_name || 'Unknown'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {appt.appointment_date} &middot; {appt.start_time.slice(0, 5)} &middot;{' '}
                              <span className="capitalize">{appt.appointment_type}</span>
                            </p>
                          </div>
                        </div>
                        <span className="text-xs capitalize px-2 py-1 rounded-full bg-muted">
                          {appt.status}
                        </span>
                      </div>
                    ))}
                    {upcoming.length > 3 && (
                      <p className="text-xs text-muted-foreground text-center pt-1">
                        +{upcoming.length - 3} more upcoming
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
