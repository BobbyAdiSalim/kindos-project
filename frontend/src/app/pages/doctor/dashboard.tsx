// Doctor pages
import React, { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { AppointmentCard } from '@/app/components/appointment-card';
import { mockAppointments } from '@/app/lib/mock-data';
import { Calendar, Settings, Clock } from 'lucide-react';

export function DoctorDashboard() {
  const upcomingAppointments = mockAppointments.filter(apt => apt.status === 'upcoming');
  const pastAppointments = mockAppointments.filter(apt => apt.status === 'completed');

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold mb-2">My Schedule</h1>
          <p className="text-muted-foreground">Manage your appointments</p>
        </div>
        <div className="flex gap-2">
          <Link to="/doctor/availability">
            <Button variant="outline">
              <Clock className="h-4 w-4 mr-2" />
              Availability
            </Button>
          </Link>
          <Link to="/doctor/profile">
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Profile
            </Button>
          </Link>
        </div>
      </div>

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="w-full md:w-auto">
          <TabsTrigger value="upcoming" className="flex-1 md:flex-none">
            <Calendar className="h-4 w-4 mr-2" />
            Upcoming ({upcomingAppointments.length})
          </TabsTrigger>
          <TabsTrigger value="past" className="flex-1 md:flex-none">
            Past ({pastAppointments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-6 space-y-4">
          {upcomingAppointments.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                No upcoming appointments
              </CardContent>
            </Card>
          ) : (
            upcomingAppointments.map(appointment => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                userRole="doctor"
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="past" className="mt-6 space-y-4">
          {pastAppointments.length === 0 ? (
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
                userRole="doctor"
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
