import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { format } from 'date-fns';
import { FileText } from 'lucide-react';
import { useAuth } from '@/app/lib/auth-context';
import { getPatientHistory, type PatientHistoryResponse } from '@/app/lib/appointment-api';

export function PatientHistory() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [data, setData] = useState<PatientHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPatientHistory = async () => {
      if (!patientId || !token) {
        setLoading(false);
        setError('Patient ID or authentication missing.');
        return;
      }

      try {
        setLoading(true);
        const result = await getPatientHistory(token, Number(patientId));
        setData(result);
        setError('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load patient history.');
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPatientHistory();
  }, [patientId, token]);

  if (loading) {
    return <div className="container mx-auto px-4 py-12 text-center">Loading patient history...</div>;
  }

  if (error || !data) {
    return <div className="container mx-auto px-4 py-12 text-center">{error || 'Patient not found.'}</div>;
  }

  const { patient, appointments } = data;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
        ← Back
      </Button>

      <h1 className="text-2xl md:text-3xl font-semibold mb-6">Patient History</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Patient Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <p className="text-sm text-muted-foreground">Name</p>
            <p className="text-lg font-medium">{patient.full_name}</p>
          </div>
          {patient.email && (
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="text-base">{patient.email}</p>
            </div>
          )}
          {patient.phone && (
            <div>
              <p className="text-sm text-muted-foreground">Phone</p>
              <p className="text-base">{patient.phone}</p>
            </div>
          )}
          {patient.date_of_birth && (
            <div>
              <p className="text-sm text-muted-foreground">Date of Birth</p>
              <p className="text-base">{format(new Date(`${patient.date_of_birth}T00:00:00`), 'MMMM d, yyyy')}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="font-semibold text-lg">Appointment History</h2>
        {appointments.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              No previous appointments
            </CardContent>
          </Card>
        ) : (
          [...appointments].sort((a, b) => {
            const dateCompare = new Date(`${b.appointment_date}T00:00:00`).getTime() - 
                              new Date(`${a.appointment_date}T00:00:00`).getTime();
            if (dateCompare !== 0) return dateCompare;
            return b.end_time.localeCompare(a.end_time);
          }).map((appointment) => (
            <Card key={appointment.id}>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-lg">
                        {format(new Date(`${appointment.appointment_date}T00:00:00`), 'MMMM d, yyyy')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {appointment.doctor?.full_name || 'Unknown Doctor'}
                        {appointment.doctor?.specialty && ` - ${appointment.doctor.specialty}`}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/doctor/appointment/${appointment.id}`)}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Reason for Visit</p>
                    <p className="text-sm mt-1">{appointment.reason}</p>
                  </div>
                  {appointment.summary && (
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="text-sm font-medium text-muted-foreground mb-1">Visit Summary</p>
                      <p className="text-sm">{appointment.summary}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

