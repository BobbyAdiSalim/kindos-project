import React from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Label } from '@/app/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/app/components/ui/radio-group';
import { mockDoctors } from '@/app/lib/mock-data';
import { toast } from 'sonner';
import { Bell } from 'lucide-react';

export function JoinWaitlist() {
  const { doctorId } = useParams();
  const navigate = useNavigate();
  const doctor = mockDoctors.find(d => d.id === doctorId);

  const handleJoin = () => {
    toast.success('Added to waitlist! We\'ll notify you when a spot opens up.');
    navigate('/patient/dashboard');
  };

  if (!doctor) return <div>Doctor not found</div>;

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
        ← Back
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <Bell className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>Join Waitlist</CardTitle>
              <CardDescription>{doctor.name}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 p-4 rounded-lg">
            <p className="text-sm">
              This provider is currently fully booked. Join the waitlist to be notified 
              when an appointment becomes available.
            </p>
          </div>

          <div className="space-y-3">
            <Label>Notification Preference</Label>
            <RadioGroup defaultValue="both">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="email" id="email" />
                <Label htmlFor="email" className="font-normal cursor-pointer">
                  Email only
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="sms" id="sms" />
                <Label htmlFor="sms" className="font-normal cursor-pointer">
                  Text message only
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="both" id="both" />
                <Label htmlFor="both" className="font-normal cursor-pointer">
                  Both email and text
                </Label>
              </div>
            </RadioGroup>
          </div>

          <Button onClick={handleJoin} className="w-full">Join Waitlist</Button>
        </CardContent>
      </Card>
    </div>
  );
}
