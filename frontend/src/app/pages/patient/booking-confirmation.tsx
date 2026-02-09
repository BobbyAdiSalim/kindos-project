import React from 'react';
import { Link, useNavigate } from 'react-router';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { Check, Calendar, MapPin, Video } from 'lucide-react';

export function BookingConfirmation() {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <Card>
        <CardContent className="p-8 md:p-12 text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <Check className="h-8 w-8 text-green-600" />
          </div>

          <div>
            <h1 className="text-2xl md:text-3xl font-semibold mb-2">
              Appointment Confirmed!
            </h1>
            <p className="text-muted-foreground text-lg">
              Your appointment has been successfully booked
            </p>
          </div>

          <Card className="bg-muted/30 border-none">
            <CardContent className="p-6 space-y-4 text-left">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">February 10, 2026 at 10:00 AM</p>
                  <p className="text-sm text-muted-foreground">30 minutes</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Video className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Virtual Appointment</p>
                  <p className="text-sm text-muted-foreground">Video call link will be sent via email</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Dr. Sarah Chen</p>
                  <p className="text-sm text-muted-foreground">Family Medicine</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <strong>Confirmation email sent</strong> — Check your inbox for appointment details 
              and a calendar invite. You'll receive a reminder 24 hours before your appointment.
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
