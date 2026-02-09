import React from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { mockAppointments } from '@/app/lib/mock-data';
import { format } from 'date-fns';
import { Calendar, Clock, FileText } from 'lucide-react';
import { AppointmentTypeBadge, StatusBadge } from '@/app/components/status-badges';

export function DoctorAppointmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const appointment = mockAppointments.find(apt => apt.id === id);

  if (!appointment) return <div>Appointment not found</div>;

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
        ← Back
      </Button>

      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold mb-2">
              Appointment with {appointment.patientName}
            </h1>
            <div className="flex gap-2">
              <AppointmentTypeBadge type={appointment.type} />
              <StatusBadge status={appointment.status as any} />
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
                    {format(new Date(appointment.date), 'MMMM d, yyyy')}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Time</p>
                  <p className="text-muted-foreground">
                    {appointment.time} ({appointment.duration} minutes)
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
          {appointment.status === 'upcoming' && (
            <>
              <Button variant="outline" className="flex-1">
                Reschedule
              </Button>
              <Button variant="outline" className="flex-1">
                Cancel
              </Button>
            </>
          )}
          {appointment.status === 'completed' ? (
            <Button className="w-full" onClick={() => navigate(`/doctor/appointment/${appointment.id}/summary`)}>
              <FileText className="h-4 w-4 mr-2" />
              View Summary
            </Button>
          ) : (
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
