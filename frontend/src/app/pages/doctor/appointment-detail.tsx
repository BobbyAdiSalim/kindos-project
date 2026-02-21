import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { format } from 'date-fns';
import { Calendar, Clock, FileText } from 'lucide-react';
import { AppointmentTypeBadge, StatusBadge } from '@/app/components/status-badges';
import { useAuth } from '@/app/lib/auth-context';
import { formatTime24to12 } from '@/app/lib/availability-api';
import {
  getAppointmentById,
  updateAppointmentDecision,
  type AppointmentRecord,
} from '@/app/lib/appointment-api';
import { toast } from 'sonner';

const mapAppointmentStatus = (appointment: AppointmentRecord) => {
  if (appointment.status === 'cancelled' && appointment.declined_by_doctor) {
    return 'declined';
  }
  return appointment.status;
};

export function DoctorAppointmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [appointment, setAppointment] = useState<AppointmentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

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

  const handleDecision = async (action: 'confirm' | 'decline') => {
    if (!token || !id) return;

    try {
      setActionLoading(true);
      const updated = await updateAppointmentDecision(token, id, action);
      setAppointment(updated);
      toast.success(action === 'confirm' ? 'Booking confirmed.' : 'Booking declined.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update booking.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="container mx-auto px-4 py-12 text-center">Loading appointment details...</div>;
  }

  if (!appointment) {
    return <div className="container mx-auto px-4 py-12 text-center">{error || 'Appointment not found.'}</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
        ← Back
      </Button>

      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold mb-2">
              Appointment with {appointment.patient?.full_name || 'Patient'}
            </h1>
            <div className="flex gap-2">
              <AppointmentTypeBadge type={appointment.appointment_type} />
              <StatusBadge status={status} />
            </div>
          </div>
        </div>

        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Date</p>
                  <p className="text-muted-foreground">
                    {format(new Date(`${appointment.appointment_date}T00:00:00`), 'MMMM d, yyyy')}
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

            <div>
              <h3 className="font-semibold mb-2">Reason for Visit</h3>
              <p className="text-muted-foreground">{appointment.reason}</p>
            </div>

            {appointment.notes && (
              <div>
                <h3 className="font-semibold mb-2">Patient Notes</h3>
                <p className="text-muted-foreground">{appointment.notes}</p>
              </div>
            )}

            {appointment.summary && (
              <div className="bg-muted/50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Visit Summary</h3>
                <p className="text-muted-foreground">{appointment.summary}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-3">
          {appointment.status === 'scheduled' && (
            <>
              <Button
                className="flex-1"
                onClick={() => handleDecision('confirm')}
                disabled={actionLoading}
              >
                Confirm
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => handleDecision('decline')}
                disabled={actionLoading}
              >
                Decline
              </Button>
            </>
          )}
          {appointment.status === 'completed' && (
            <Button className="w-full" onClick={() => navigate(`/doctor/appointment/${appointment.id}/summary`)}>
              <FileText className="h-4 w-4 mr-2" />
              View Summary
            </Button>
          )}
          {(appointment.status === 'confirmed' || appointment.status === 'no-show') && (
            <Button className="w-full" onClick={() => navigate(`/doctor/appointment/${appointment.id}/summary`)}>
              <FileText className="h-4 w-4 mr-2" />
              Add Summary
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
