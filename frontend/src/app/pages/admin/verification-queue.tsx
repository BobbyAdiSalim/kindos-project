import React, { useState } from 'react';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { mockPendingDoctors } from '@/app/lib/mock-data';
import { format } from 'date-fns';
import { CheckCircle, XCircle, FileText } from 'lucide-react';
import { toast } from 'sonner';
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

export function VerificationQueue() {
  const [doctors, setDoctors] = useState(mockPendingDoctors);

  const handleApprove = (id: string) => {
    setDoctors(doctors.filter(d => d.id !== id));
    toast.success('Doctor approved successfully');
  };

  const handleDeny = (id: string) => {
    setDoctors(doctors.filter(d => d.id !== id));
    toast.success('Application denied');
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-semibold mb-2">
          Doctor Verification Queue
        </h1>
        <p className="text-muted-foreground">
          Review and approve pending doctor applications
        </p>
      </div>

      <div className="space-y-4">
        {doctors.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <h3 className="font-semibold mb-2">All caught up!</h3>
              <p className="text-muted-foreground">
                No pending doctor verifications at this time
              </p>
            </CardContent>
          </Card>
        ) : (
          doctors.map((doctor) => (
            <Card key={doctor.id}>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">{doctor.name}</h3>
                        <p className="text-muted-foreground">{doctor.specialty}</p>
                      </div>
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                        Pending
                      </Badge>
                    </div>

                    <div className="grid md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Email</p>
                        <p className="font-medium">{doctor.email}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">License Number</p>
                        <p className="font-medium">{doctor.licenseNumber}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Submitted</p>
                        <p className="font-medium">
                          {format(new Date(doctor.submittedDate), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex md:flex-col gap-2">
                    <Button variant="outline" size="sm" className="flex-1 md:flex-none">
                      <FileText className="h-4 w-4 mr-2" />
                      View Documents
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" className="flex-1 md:flex-none">
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Approve Doctor?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will verify {doctor.name} and allow them to accept patient appointments.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleApprove(doctor.id)}>
                            Approve
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="flex-1 md:flex-none">
                          <XCircle className="h-4 w-4 mr-2" />
                          Deny
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Deny Application?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will reject {doctor.name}'s application. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeny(doctor.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Deny
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
