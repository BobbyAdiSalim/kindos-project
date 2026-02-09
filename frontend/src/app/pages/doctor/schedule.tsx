import React from 'react';
import { Calendar } from '@/app/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { AppointmentCard } from '@/app/components/appointment-card';
import { mockAppointments } from '@/app/lib/mock-data';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { CalendarIcon, List } from 'lucide-react';

export function DoctorSchedule() {
  const upcomingAppointments = mockAppointments.filter(apt => apt.status === 'upcoming');

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <h1 className="text-2xl md:text-3xl font-semibold mb-6">My Schedule</h1>

      <Tabs defaultValue="calendar" className="w-full">
        <TabsList>
          <TabsTrigger value="calendar">
            <CalendarIcon className="h-4 w-4 mr-2" />
            Calendar View
          </TabsTrigger>
          <TabsTrigger value="list">
            <List className="h-4 w-4 mr-2" />
            List View
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="mt-6">
          <div className="grid lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1">
              <CardContent className="p-6">
                <Calendar mode="single" className="rounded-md border" />
              </CardContent>
            </Card>

            <div className="lg:col-span-2 space-y-4">
              <h3 className="font-semibold">Today's Appointments</h3>
              {upcomingAppointments.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center text-muted-foreground">
                    No appointments today
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
            </div>
          </div>
        </TabsContent>

        <TabsContent value="list" className="mt-6 space-y-4">
          {upcomingAppointments.map(appointment => (
            <AppointmentCard
              key={appointment.id}
              appointment={appointment}
              userRole="doctor"
            />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
