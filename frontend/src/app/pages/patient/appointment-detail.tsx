import React from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { AppointmentTypeBadge, StatusBadge } from '@/app/components/status-badges';
import { mockAppointments } from '@/app/lib/mock-data';
import { format } from 'date-fns';
import { Calendar, Clock, MapPin, Video, Phone } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/app/components/ui/alert-dialog';
import { toast } from 'sonner';

export function AppointmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const appointment = mockAppointments.find(apt => apt.id === id);

  if (!appointment) {
    return <div className="container mx-auto px-4 py-12 text-center">Appointment not found</div>;
  }

  const handleCancel = () => {
    toast.success('Appointment cancelled');
    navigate('/patient/dashboard');
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
        ← Back
      </Button>

      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold mb-2">
              Appointment Details
            </h1>
            <div className="flex flex-wrap gap-2">
              <AppointmentTypeBadge type={appointment.type} />
              <StatusBadge status={appointment.status as any} />
            </div>
          </div>
        </div>

        <Card>
          <CardContent className="p-6 space-y-6">
            <div>
              <h3 className="font-semibold mb-3">Provider</h3>
              <p className="text-lg">{appointment.doctorName}</p>
            </div>

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

            {appointment.type === 'virtual' ? (
              <div className="flex items-start gap-3">
                <Video className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Virtual Appointment</p>
                  <p className="text-sm text-muted-foreground">
                    Video call link will be available 15 minutes before
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">In-Person</p>
                  <p className="text-sm text-muted-foreground">
                    123 Main St, Suite 200, Seattle, WA 98101
                  </p>
                </div>
              </div>
            )}

            <div>
              <h3 className="font-semibold mb-2">Reason for Visit</h3>
              <p className="text-muted-foreground">{appointment.reason}</p>
            </div>

            {appointment.notes && (
              <div>
                <h3 className="font-semibold mb-2">Notes</h3>
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

        {appointment.status === 'upcoming' && (
          <div className="flex flex-col sm:flex-row gap-3">
            {appointment.type === 'virtual' && (
              <Button size="lg" className="flex-1">
                <Video className="h-5 w-5 mr-2" />
                Join Video Call
              </Button>
            )}
            <Button variant="outline" size="lg" className="flex-1">
              Reschedule
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="lg" className="flex-1">
                  Cancel Appointment
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel Appointment?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to cancel this appointment? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep Appointment</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Cancel Appointment
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        {appointment.status === 'completed' && (
          <Button size="lg" className="w-full" onClick={() => navigate(`/patient/review/${appointment.id}`)}>
            Write a Review
          </Button>
        )}
      </div>
    </div>
  );
}
