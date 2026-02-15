import React, { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { AppointmentCard } from '@/app/components/appointment-card';
import { mockAppointments } from '@/app/lib/mock-data';
import { Plus, Calendar as CalendarIcon } from 'lucide-react';

export function PatientDashboard() {
  const upcomingAppointments = mockAppointments.filter(apt => apt.status === 'upcoming');
  const pastAppointments = mockAppointments.filter(apt => apt.status === 'completed');

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
          {upcomingAppointments.length === 0 ? (
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
                userRole="patient"
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
