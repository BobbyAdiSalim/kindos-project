import React, { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Switch } from '@/app/components/ui/switch';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Calendar } from '@/app/components/ui/calendar';
import { Input } from '@/app/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Badge } from '@/app/components/ui/badge';
import { toast } from 'sonner';
import { Trash2, Plus, Calendar as CalendarIcon } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const generateTimeSlots = () => {
  const slots = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      const displayTime = new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      slots.push({ value: time, label: displayTime });
    }
  }
  return slots;
};

const timeSlots = generateTimeSlots();
const durationOptions = [15, 30, 45, 60, 90, 120];

interface WeeklySchedule {
  [key: string]: {
    enabled: boolean;
    start: string;
    end: string;
    duration: number;
    appointmentTypes: string[];
  };
}

interface SpecificSlot {
  id?: number;
  date: Date;
  start_time: string;
  end_time: string;
  appointment_type: string[];
  is_available: boolean;
}

export function AvailabilitySetup() {
  const [schedule, setSchedule] = useState<WeeklySchedule>(
    days.reduce((acc, day, index) => ({
      ...acc,
      [day]: {
        enabled: index !== 0 && index !== 6, // Disable Sunday and Saturday by default
        start: '09:00',
        end: '17:00',
        duration: 30,
        appointmentTypes: ['virtual', 'in-person'],
      }
    }), {})
  );

  const [specificSlots, setSpecificSlots] = useState<SpecificSlot[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [newSlot, setNewSlot] = useState({
    start_time: '09:00',
    end_time: '17:00',
    appointment_type: ['virtual', 'in-person'],
  });
  const [loading, setLoading] = useState(false);

  // Get JWT token from localStorage
  const getAuthHeader = () => {
    const raw = localStorage.getItem('utlwa_auth');
    if (!raw) return {};
    try {
      const { token } = JSON.parse(raw);
      return { Authorization: `Bearer ${token}` };
    } catch {
      return {};
    }
  };

  // Load existing patterns on component mount
  useEffect(() => {
    loadAvailabilityPatterns();
    loadAvailabilitySlots();
  }, []);

  const loadAvailabilityPatterns = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/availability/patterns`, {
        headers: getAuthHeader(),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.patterns && data.patterns.length > 0) {
          const loadedSchedule = { ...schedule };
          data.patterns.forEach((pattern: any) => {
            const dayName = days[pattern.day_of_week];
            loadedSchedule[dayName] = {
              enabled: pattern.is_active,
              start: pattern.start_time.substring(0, 5),
              end: pattern.end_time.substring(0, 5),
              duration: pattern.appointment_duration,
              appointmentTypes: pattern.appointment_type || ['virtual', 'in-person'],
            };
          });
          setSchedule(loadedSchedule);
        }
      }
    } catch (error) {
      console.error('Error loading patterns:', error);
    }
  };

  const loadAvailabilitySlots = async () => {
    try {
      const startDate = new Date().toISOString().split('T')[0];
      const response = await fetch(`${API_BASE_URL}/availability/slots?startDate=${startDate}`, {
        headers: getAuthHeader(),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.slots) {
          const slots = data.slots.map((slot: any) => ({
            id: slot.id,
            date: new Date(slot.slot_date),
            start_time: slot.start_time.substring(0, 5),
            end_time: slot.end_time.substring(0, 5),
            appointment_type: slot.appointment_type || ['virtual', 'in-person'],
            is_available: slot.is_available,
          }));
          setSpecificSlots(slots);
        }
      }
    } catch (error) {
      console.error('Error loading slots:', error);
    }
  };

  const handleSaveWeeklySchedule = async () => {
    setLoading(true);
    try {
      const patterns = Object.entries(schedule)
        .filter(([_, config]) => config.enabled)
        .map(([day, config]) => ({
          day_of_week: days.indexOf(day),
          start_time: config.start,
          end_time: config.end,
          appointment_duration: config.duration,
          appointment_type: config.appointmentTypes,
          is_active: true,
        }));

      console.log("Here are the patterns being sent to the backend:", patterns);

      const response = await fetch(`${API_BASE_URL}/availability/patterns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ patterns }),
      });

      if (response.ok) {
        toast.success('Weekly schedule updated successfully');
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to update schedule');
      }
    } catch (error) {
      console.error('Error saving schedule:', error);
      toast.error('Failed to update schedule');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSpecificSlot = async () => {
    if (!selectedDate) {
      toast.error('Please select a date');
      return;
    }

    setLoading(true);
    try {
      const slot = {
        slot_date: selectedDate.toISOString().split('T')[0],
        start_time: newSlot.start_time,
        end_time: newSlot.end_time,
        appointment_type: newSlot.appointment_type,
        is_available: true,
      };

      const response = await fetch(`${API_BASE_URL}/availability/slots`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ slots: [slot] }),
      });

      if (response.ok) {
        toast.success('Specific slot added successfully');
        loadAvailabilitySlots();
        setSelectedDate(undefined);
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to add slot');
      }
    } catch (error) {
      console.error('Error adding slot:', error);
      toast.error('Failed to add slot');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSlot = async (slotId: number) => {
    setLheaders: getAuthHeader()
    try {
      const response = await fetch(`${API_BASE_URL}/availability/slots/${slotId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        toast.success('Slot deleted successfully');
        loadAvailabilitySlots();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to delete slot');
      }
    } catch (error) {
      console.error('Error deleting slot:', error);
      toast.error('Failed to delete slot');
    } finally {
      setLoading(false);
    }
  };

  const toggleAppointmentType = (day: string, type: string) => {
    setSchedule({
      ...schedule,
      [day]: {
        ...schedule[day],
        appointmentTypes: schedule[day].appointmentTypes.includes(type)
          ? schedule[day].appointmentTypes.filter((t) => t !== type)
          : [...schedule[day].appointmentTypes, type],
      },
    });
  };

  const toggleNewSlotAppointmentType = (type: string) => {
    setNewSlot({
      ...newSlot,
      appointment_type: newSlot.appointment_type.includes(type)
        ? newSlot.appointment_type.filter((t) => t !== type)
        : [...newSlot.appointment_type, type],
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-semibold mb-2">Set Your Availability</h1>
        <p className="text-muted-foreground">
          Configure your regular schedule and add specific dates when you're available for appointments
        </p>
      </div>

      <Tabs defaultValue="weekly" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="weekly">Weekly Schedule</TabsTrigger>
          <TabsTrigger value="specific">Specific Dates</TabsTrigger>
        </TabsList>

        <TabsContent value="weekly">
          <Card>
            <CardHeader>
              <CardTitle>Regular Weekly Schedule</CardTitle>
              <CardDescription>
                Set your recurring weekly availability pattern
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {days.map((day) => (
                <div key={day} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
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
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                              {timeSlots.map(time => (
                                <SelectItem key={time.value} value={time.value}>{time.label}</SelectItem>
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
                              {timeSlots.map(time => (
                                <SelectItem key={time.value} value={time.value}>{time.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`${day}-duration`} className="text-sm">Duration (min)</Label>
                          <Select
                            value={schedule[day].duration.toString()}
                            onValueChange={(value) => {
                              setSchedule({
                                ...schedule,
                                [day]: { ...schedule[day], duration: parseInt(value) }
                              });
                            }}
                          >
                            <SelectTrigger id={`${day}-duration`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {durationOptions.map(duration => (
                                <SelectItem key={duration} value={duration.toString()}>
                                  {duration} min
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm">Appointment Types</Label>
                        <div className="flex gap-4">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`${day}-virtual`}
                              checked={schedule[day].appointmentTypes.includes('virtual')}
                              onCheckedChange={() => toggleAppointmentType(day, 'virtual')}
                            />
                            <label
                              htmlFor={`${day}-virtual`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              Virtual
                            </label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`${day}-in-person`}
                              checked={schedule[day].appointmentTypes.includes('in-person')}
                              onCheckedChange={() => toggleAppointmentType(day, 'in-person')}
                            />
                            <label
                              htmlFor={`${day}-in-person`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              In-Person
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <Button 
                onClick={handleSaveWeeklySchedule} 
                size="lg" 
                className="w-full"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Weekly Schedule'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="specific">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Add Specific Availability</CardTitle>
                <CardDescription>
                  Add or remove availability for specific dates (overrides weekly schedule)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <Label className="mb-2 block">Select Date</Label>
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) => date < new Date()}
                      className="rounded-md border"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="slot-start">Start Time</Label>
                      <Select
                        value={newSlot.start_time}
                        onValueChange={(value) => setNewSlot({ ...newSlot, start_time: value })}
                      >
                        <SelectTrigger id="slot-start">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {timeSlots.map(time => (
                            <SelectItem key={time.value} value={time.value}>{time.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="slot-end">End Time</Label>
                      <Select
                        value={newSlot.end_time}
                        onValueChange={(value) => setNewSlot({ ...newSlot, end_time: value })}
                      >
                        <SelectTrigger id="slot-end">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {timeSlots.map(time => (
                            <SelectItem key={time.value} value={time.value}>{time.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">Appointment Types</Label>
                      <div className="flex gap-4">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="slot-virtual"
                            checked={newSlot.appointment_type.includes('virtual')}
                            onCheckedChange={() => toggleNewSlotAppointmentType('virtual')}
                          />
                          <label
                            htmlFor="slot-virtual"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            Virtual
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="slot-in-person"
                            checked={newSlot.appointment_type.includes('in-person')}
                            onCheckedChange={() => toggleNewSlotAppointmentType('in-person')}
                          />
                          <label
                            htmlFor="slot-in-person"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            In-Person
                          </label>
                        </div>
                      </div>
                    </div>

                    <Button 
                      onClick={handleAddSpecificSlot} 
                      className="w-full"
                      disabled={loading || !selectedDate}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Availability
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Upcoming Specific Slots</CardTitle>
                <CardDescription>
                  Your scheduled specific availability slots
                </CardDescription>
              </CardHeader>
              <CardContent>
                {specificSlots.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No specific slots scheduled yet
                  </p>
                ) : (
                  <div className="space-y-3">
                    {specificSlots.map((slot) => (
                      <div
                        key={slot.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">
                              {slot.date.toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(`2000-01-01T${slot.start_time}`).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true,
                            })}
                            {' - '}
                            {new Date(`2000-01-01T${slot.end_time}`).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true,
                            })}
                          </div>
                          <div className="flex gap-2">
                            {slot.appointment_type.map((type) => (
                              <Badge key={type} variant="secondary" className="text-xs">
                                {type}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => slot.id && handleDeleteSlot(slot.id)}
                          disabled={loading}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
