import React, { useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Switch } from '@/app/components/ui/switch';
import { toast } from 'sonner';

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const times = ['8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'];

export function AvailabilitySetup() {
  const [schedule, setSchedule] = useState(
    days.reduce((acc, day) => ({
      ...acc,
      [day]: { enabled: day !== 'Saturday' && day !== 'Sunday', start: '9:00 AM', end: '5:00 PM' }
    }), {})
  );

  const handleSave = () => {
    toast.success('Availability updated successfully');
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-semibold mb-2">Set Your Availability</h1>
        <p className="text-muted-foreground">
          Choose when you're available for appointments
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Weekly Schedule</CardTitle>
          <CardDescription>
            Set your regular weekly availability. You can add exceptions later.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {days.map((day) => (
            <div key={day} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <Label htmlFor={`${day}-enabled`} className="text-base font-semibold">
                  {day}
                </Label>
                <Switch
                  id={`${day}-enabled`}
                  checked={schedule[day].enabled}
                  onCheckedChange={(checked) => {
                    setSchedule({
                      ...schedule,
                      [day]: { ...schedule[day], enabled: checked }
                    });
                  }}
                />
              </div>

              {schedule[day].enabled && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`${day}-start`} className="text-sm">Start Time</Label>
                    <Select
                      value={schedule[day].start}
                      onValueChange={(value) => {
                        setSchedule({
                          ...schedule,
                          [day]: { ...schedule[day], start: value }
                        });
                      }}
                    >
                      <SelectTrigger id={`${day}-start`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {times.map(time => (
                          <SelectItem key={time} value={time}>{time}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`${day}-end`} className="text-sm">End Time</Label>
                    <Select
                      value={schedule[day].end}
                      onValueChange={(value) => {
                        setSchedule({
                          ...schedule,
                          [day]: { ...schedule[day], end: value }
                        });
                      }}
                    >
                      <SelectTrigger id={`${day}-end`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {times.map(time => (
                          <SelectItem key={time} value={time}>{time}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          ))}

          <Button onClick={handleSave} size="lg" className="w-full">
            Save Availability
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
