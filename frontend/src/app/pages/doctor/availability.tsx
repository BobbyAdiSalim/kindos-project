import React, { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Switch } from '@/app/components/ui/switch';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Calendar } from '@/app/components/ui/calendar';
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
const durationOptions = [30, 60];
const defaultAppointmentTypes = ['virtual', 'in-person'];

const timeToMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const getValidEndTimes = (start: string, duration: number) => {
  const startMinutes = timeToMinutes(start);
  return timeSlots.filter((t) => {
    const diff = timeToMinutes(t.value) - startMinutes;
    return diff > 0 && diff % duration === 0;
  });
};

interface RangeError {
  rangeIndex: number;
  message: string;
}

const validateDayRanges = (ranges: TimeRange[]): RangeError[] => {
  const errors: RangeError[] = [];

  ranges.forEach((range, i) => {
    if (timeToMinutes(range.start) >= timeToMinutes(range.end)) {
      errors.push({ rangeIndex: i, message: 'Start time must be before end time' });
    }
  });

  for (let i = 0; i < ranges.length; i++) {
    for (let j = i + 1; j < ranges.length; j++) {
      const aStart = timeToMinutes(ranges[i].start);
      const aEnd = timeToMinutes(ranges[i].end);
      const bStart = timeToMinutes(ranges[j].start);
      const bEnd = timeToMinutes(ranges[j].end);
      if (aStart < bEnd && aEnd > bStart) {
        if (!errors.some((e) => e.rangeIndex === i))
          errors.push({ rangeIndex: i, message: 'Overlaps with another time range' });
        if (!errors.some((e) => e.rangeIndex === j))
          errors.push({ rangeIndex: j, message: 'Overlaps with another time range' });
      }
    }
  }

  return errors;
};

interface TimeRange {
  start: string;
  end: string;
  duration: number;
  appointmentTypes: string[];
}

interface WeeklySchedule {
  [key: string]: {
    enabled: boolean;
    ranges: TimeRange[];
  };
}

interface SpecificSlot {
  id?: number;
  date: Date;
  start_time: string;
  end_time: string;
  appointment_type: string[];
  is_available: boolean;
  appointment_duration?: number;
}

const defaultRange = (): TimeRange => ({
  start: '09:00',
  end: '17:00',
  duration: 30,
  appointmentTypes: [...defaultAppointmentTypes],
});

const createWeeklySchedule = (enabledByDefault: (dayIndex: number) => boolean): WeeklySchedule =>
  days.reduce((acc, day, index) => ({
    ...acc,
    [day]: {
      enabled: enabledByDefault(index),
      ranges: [defaultRange()],
    },
  }), {});

export function AvailabilitySetup() {
  const [schedule, setSchedule] = useState<WeeklySchedule>(
    createWeeklySchedule((index) => index !== 0 && index !== 6)
  );

  const [specificSlots, setSpecificSlots] = useState<SpecificSlot[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [newSlot, setNewSlot] = useState({
    start_time: '09:00',
    end_time: '17:00',
    appointment_type: ['virtual', 'in-person'] as string[],
    duration: 30,
  });
  const [loading, setLoading] = useState(false);

  const getAuthHeader = () => {
    return {};
  };

  useEffect(() => {
    loadAvailabilityPatterns();
    loadAvailabilitySlots();
  }, []);

  const loadAvailabilityPatterns = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/availability/patterns`, {
        headers: getAuthHeader(),
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        const patterns = Array.isArray(data.patterns) ? data.patterns : [];

        if (patterns.length > 0) {
          const loadedSchedule = createWeeklySchedule(() => false);
          // Reset all ranges to empty so we can accumulate them
          days.forEach((day) => {
            loadedSchedule[day].ranges = [];
          });

          patterns.forEach((pattern: any) => {
            const dayName = days[Number(pattern.day_of_week)];
            if (!dayName) return;
            if (pattern.is_active !== false) {
              loadedSchedule[dayName].enabled = true;
            }
            loadedSchedule[dayName].ranges.push({
              start: pattern.start_time.substring(0, 5),
              end: pattern.end_time.substring(0, 5),
              duration: pattern.appointment_duration || 30,
              appointmentTypes: pattern.appointment_type || [...defaultAppointmentTypes],
            });
          });

          // Ensure each day has at least one default range for the UI
          days.forEach((day) => {
            if (loadedSchedule[day].ranges.length === 0) {
              loadedSchedule[day].ranges = [defaultRange()];
            }
          });

          setSchedule(loadedSchedule);
        } else {
          setSchedule(createWeeklySchedule((index) => index !== 0 && index !== 6));
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
        credentials: 'include',
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
            appointment_duration: slot.appointment_duration || 30,
          }));
          setSpecificSlots(slots);
        }
      }
    } catch (error) {
      console.error('Error loading slots:', error);
    }
  };

  const handleSaveWeeklySchedule = async () => {
    // Validate all enabled days before saving
    const allErrors: string[] = [];
    Object.entries(schedule).forEach(([day, config]) => {
      if (!config.enabled) return;
      const errors = validateDayRanges(config.ranges);
      errors.forEach((err) => {
        allErrors.push(`${day} – Range ${err.rangeIndex + 1}: ${err.message}`);
      });
    });

    if (allErrors.length > 0) {
      allErrors.forEach((msg) => toast.error(msg));
      return;
    }

    setLoading(true);
    try {
      const patterns: any[] = [];
      Object.entries(schedule).forEach(([day, config]) => {
        if (config.enabled) {
          config.ranges.forEach((range) => {
            patterns.push({
              day_of_week: days.indexOf(day),
              start_time: range.start,
              end_time: range.end,
              appointment_duration: range.duration,
              appointment_type: range.appointmentTypes,
              is_active: true,
            });
          });
        }
      });

      const response = await fetch(`${API_BASE_URL}/availability/patterns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        credentials: 'include',
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

    if (timeToMinutes(newSlot.start_time) >= timeToMinutes(newSlot.end_time)) {
      toast.error('Start time must be before end time');
      return;
    }

    setLoading(true);
    try {
      const slot = {
        slot_date: selectedDate.toISOString().split('T')[0],
        start_time: newSlot.start_time,
        end_time: newSlot.end_time,
        appointment_type: newSlot.appointment_type,
        appointment_duration: newSlot.duration,
        is_available: true,
      };

      const response = await fetch(`${API_BASE_URL}/availability/slots`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        credentials: 'include',
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
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/availability/slots/${slotId}`, {
        method: 'DELETE',
        headers: getAuthHeader(),
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

  const addRange = (day: string) => {
    setSchedule({
      ...schedule,
      [day]: {
        ...schedule[day],
        ranges: [...schedule[day].ranges, defaultRange()],
      },
    });
  };

  const removeRange = (day: string, rangeIndex: number) => {
    setSchedule({
      ...schedule,
      [day]: {
        ...schedule[day],
        ranges: schedule[day].ranges.filter((_, i) => i !== rangeIndex),
      },
    });
  };

  const updateRange = (day: string, rangeIndex: number, field: keyof TimeRange, value: any) => {
    setSchedule({
      ...schedule,
      [day]: {
        ...schedule[day],
        ranges: schedule[day].ranges.map((range, i) => {
          if (i !== rangeIndex) return range;
          const updated = { ...range, [field]: value };
          if (field === 'start' || field === 'duration') {
            const validEnds = getValidEndTimes(updated.start, updated.duration);
            if (!validEnds.some((t) => t.value === updated.end)) {
              updated.end = validEnds[0]?.value ?? updated.end;
            }
          }
          return updated;
        }),
      },
    });
  };

  const toggleRangeAppointmentType = (day: string, rangeIndex: number, type: string) => {
    const range = schedule[day].ranges[rangeIndex];
    const newTypes = range.appointmentTypes.includes(type)
      ? range.appointmentTypes.filter((t) => t !== type)
      : [...range.appointmentTypes, type];
    updateRange(day, rangeIndex, 'appointmentTypes', newTypes);
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
                          [day]: { ...schedule[day], enabled: checked },
                        });
                      }}
                    />
                  </div>

                  {schedule[day].enabled && (
                    <div className="space-y-3">
                      {(() => {
                        const dayErrors = validateDayRanges(schedule[day].ranges);
                        return schedule[day].ranges.map((range, rangeIndex) => {
                          const rangeError = dayErrors.find((e) => e.rangeIndex === rangeIndex);
                          return (
                        <div key={rangeIndex} className={`border rounded p-3 space-y-3 ${rangeError ? 'border-destructive bg-destructive/5' : 'bg-muted/20'}`}>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Start Time</Label>
                              <Select
                                value={range.start}
                                onValueChange={(value) => updateRange(day, rangeIndex, 'start', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {timeSlots.map((time) => (
                                    <SelectItem key={time.value} value={time.value}>{time.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-1">
                              <Label className="text-xs">End Time</Label>
                              <Select
                                value={range.end}
                                onValueChange={(value) => updateRange(day, rangeIndex, 'end', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {getValidEndTimes(range.start, range.duration).map((time) => (
                                    <SelectItem key={time.value} value={time.value}>{time.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-1">
                              <Label className="text-xs">Duration (min)</Label>
                              <div className="flex gap-2 items-start">
                                <Select
                                  value={range.duration.toString()}
                                  onValueChange={(value) => updateRange(day, rangeIndex, 'duration', parseInt(value))}
                                >
                                  <SelectTrigger className="flex-1">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {durationOptions.map((d) => (
                                      <SelectItem key={d} value={d.toString()}>{d} min</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                {schedule[day].ranges.length > 1 && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeRange(day, rangeIndex)}
                                    className="shrink-0"
                                  >
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs">Appointment Types</Label>
                            <div className="flex gap-4">
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id={`${day}-${rangeIndex}-virtual`}
                                  checked={range.appointmentTypes.includes('virtual')}
                                  onCheckedChange={() => toggleRangeAppointmentType(day, rangeIndex, 'virtual')}
                                />
                                <label
                                  htmlFor={`${day}-${rangeIndex}-virtual`}
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                  Virtual
                                </label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id={`${day}-${rangeIndex}-in-person`}
                                  checked={range.appointmentTypes.includes('in-person')}
                                  onCheckedChange={() => toggleRangeAppointmentType(day, rangeIndex, 'in-person')}
                                />
                                <label
                                  htmlFor={`${day}-${rangeIndex}-in-person`}
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                  In-Person
                                </label>
                              </div>
                            </div>
                          </div>

                          {rangeError && (
                            <p className="text-xs text-destructive font-medium">
                              ⚠ {rangeError.message}
                            </p>
                          )}
                        </div>
                          );
                        });
                      })()}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addRange(day)}
                        className="w-full"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add time range
                      </Button>
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
                        onValueChange={(value) => {
                          const validEnds = getValidEndTimes(value, newSlot.duration);
                          const endStillValid = validEnds.some((t) => t.value === newSlot.end_time);
                          setNewSlot({
                            ...newSlot,
                            start_time: value,
                            end_time: endStillValid ? newSlot.end_time : (validEnds[0]?.value ?? newSlot.end_time),
                          });
                        }}
                      >
                        <SelectTrigger id="slot-start">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {timeSlots.map((time) => (
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
                          {getValidEndTimes(newSlot.start_time, newSlot.duration).map((time) => (
                            <SelectItem key={time.value} value={time.value}>{time.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="slot-duration">Slot Duration</Label>
                      <Select
                        value={newSlot.duration.toString()}
                        onValueChange={(value) => {
                          const dur = parseInt(value);
                          const validEnds = getValidEndTimes(newSlot.start_time, dur);
                          const endStillValid = validEnds.some((t) => t.value === newSlot.end_time);
                          setNewSlot({
                            ...newSlot,
                            duration: dur,
                            end_time: endStillValid ? newSlot.end_time : (validEnds[0]?.value ?? newSlot.end_time),
                          });
                        }}
                      >
                        <SelectTrigger id="slot-duration">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {durationOptions.map((d) => (
                            <SelectItem key={d} value={d.toString()}>{d} min</SelectItem>
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
                          <div className="flex gap-2 flex-wrap">
                            {slot.appointment_type.map((type) => (
                              <Badge key={type} variant="secondary" className="text-xs">
                                {type}
                              </Badge>
                            ))}
                            <Badge variant="outline" className="text-xs">
                              {slot.appointment_duration || 30} min slots
                            </Badge>
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
