import React from 'react';
import { Card, CardContent } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Link } from 'react-router';
import { format } from 'date-fns';
import { Calendar, Clock, Video, MapPin } from 'lucide-react';
import { AppointmentTypeBadge, StatusBadge } from '@/app/components/status-badges';

interface AppointmentCardProps {
  appointment: {
    id: string;
    doctorName: string;
    patientName?: string;
    date: string;
    time: string;
    type: 'virtual' | 'in-person';
    status: 'upcoming' | 'completed' | 'cancelled';
    reason: string;
  };
  userRole: 'patient' | 'doctor';
}

export function AppointmentCard({ appointment, userRole }: AppointmentCardProps) {
  const detailLink =
    userRole === 'patient'
      ? `/patient/appointment/${appointment.id}`
      : `/doctor/appointment/${appointment.id}`;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="space-y-3 flex-1">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <h3 className="font-semibold text-lg">
                  {userRole === 'patient' ? appointment.doctorName : appointment.patientName}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">{appointment.reason}</p>
              </div>
              <div className="flex gap-2">
                <AppointmentTypeBadge type={appointment.type} />
                <StatusBadge status={appointment.status} />
              </div>
            </div>

            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{format(new Date(appointment.date), 'MMMM d, yyyy')}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{appointment.time}</span>
              </div>
            </div>
          </div>

          <div className="flex sm:flex-col gap-2">
            <Link to={detailLink} className="flex-1 sm:flex-none">
              <Button variant="outline" size="sm" className="w-full">
                View Details
              </Button>
            </Link>
            {appointment.status === 'upcoming' && appointment.type === 'virtual' && (
              <Button size="sm" className="flex-1 sm:flex-none">
                <Video className="h-4 w-4 mr-2" />
                Join Call
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
