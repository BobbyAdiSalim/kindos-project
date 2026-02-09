import React from 'react';
import { useParams, useNavigate } from 'react-router';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { mockAppointments } from '@/app/lib/mock-data';
import { format } from 'date-fns';
import { FileText } from 'lucide-react';

export function PatientHistory() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  
  const patientAppointments = mockAppointments.filter(
    apt => apt.patientId === patientId && apt.status === 'completed'
  );

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
        <CardContent>
          <p className="text-lg font-medium">John Smith</p>
          <p className="text-sm text-muted-foreground">DOB: January 15, 1985</p>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="font-semibold text-lg">Appointment History</h2>
        {patientAppointments.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              No previous appointments
            </CardContent>
          </Card>
        ) : (
          patientAppointments.map((appointment) => (
            <Card key={appointment.id}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-lg">
                      {format(new Date(appointment.date), 'MMMM d, yyyy')}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {appointment.reason}
                    </p>
                    {appointment.summary && (
                      <p className="text-sm text-muted-foreground mt-3">
                        {appointment.summary}
                      </p>
                    )}
                  </div>
                  <Button variant="outline" size="sm">
                    <FileText className="h-4 w-4 mr-2" />
                    View Summary
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
