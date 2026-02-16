import React, { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { DoctorCard } from '@/app/components/doctor-card';
import { Badge } from '@/app/components/ui/badge';
import { careTypes } from '@/app/lib/mock-data';
import { Calendar, MapPin, Video, User, ArrowRight, ArrowLeft, Loader2, Globe } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/app/components/ui/radio-group';
import { Card, CardContent } from '@/app/components/ui/card';
import { format, addDays, parseISO } from 'date-fns';

// API service function to fetch doctors with availability
const fetchDoctorsWithAvailability = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    if (filters.appointmentType && filters.appointmentType !== 'no-preference') 
      params.append('appointmentType', filters.appointmentType);
    if (filters.specialty) params.append('specialty', filters.specialty);
    if (filters.date) params.append('date', filters.date.toISOString().split('T')[0]);
    if (filters.timeOfDay) params.append('timeOfDay', filters.timeOfDay);
    
    const url = `/api/doctors/with-availability?${params.toString()}`;
    console.log('Fetching URL:', url);
    console.log('Filters being sent:', Object.fromEntries(params));
    
    const response = await fetch(url);
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      throw new Error(`Failed to fetch doctors: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Raw response data:', data);
    
    return data.doctors || [];
  } catch (error) {
    console.error('Error fetching doctors:', error);
    throw error;
  }
};

// Step definitions
const STEPS = [
  { id: 'appointment-type', title: 'Appointment Type', icon: Video },
  { id: 'care-type', title: 'Care Needed', icon: User },
  { id: 'schedule', title: 'Preferred Time', icon: Calendar },
  { id: 'results', title: 'Find Provider', icon: MapPin },
];

// Time of day options
const TIME_OF_DAY_OPTIONS = [
  { value: 'morning', label: 'Morning (8am - 12pm)', range: { start: '08:00', end: '12:00' } },
  { value: 'afternoon', label: 'Afternoon (12pm - 5pm)', range: { start: '12:00', end: '17:00' } },
  { value: 'evening', label: 'Evening (5pm - 9pm)', range: { start: '17:00', end: '21:00' } },
  { value: 'any', label: 'Any time' },
];

// Date options
const DATE_OPTIONS = [
  { value: 'today', label: 'Today', days: 0 },
  { value: 'tomorrow', label: 'Tomorrow', days: 1 },
  { value: 'this-week', label: 'This week', days: 7 },
  { value: 'next-week', label: 'Next week', days: 14 },
  { value: 'any', label: 'Any date' },
];

export function ProviderDiscovery() {
  const [searchParams] = useSearchParams();
  // Form state for the 4 questions
  const [formData, setFormData] = useState({
    appointmentType: '',
    careType: '',
    preferredDate: '',
    preferredTimeOfDay: '',
  });
  
  const [currentStep, setCurrentStep] = useState(0);
  const [doctors, setDoctors] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Handle form input changes
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Check if current step is valid
  const isStepValid = () => {
    const currentField = STEPS[currentStep].id;
    switch (currentField) {
      case 'appointment-type':
        return !!formData.appointmentType;
      case 'care-type':
        return !!formData.careType;
      case 'schedule':
        return !!formData.preferredDate && !!formData.preferredTimeOfDay;
      default:
        return true;
    }
  };

  // Navigate to next step
  const handleNext = () => {
    if (currentStep === 2) {
      // Moving from schedule to results: immediately fetch providers.
      setCurrentStep(3);
      void handleSearch();
    } else if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  // Navigate to previous step
  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const runSearch = async (searchFormData = formData) => {
    console.log('🔵 runSearch called with formData:', searchFormData);
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🔵 Preparing filters...');
      const filters = {
        appointmentType: searchFormData.appointmentType,
        specialty: searchFormData.careType,
        date: searchFormData.preferredDate === 'any' ? null : getDateFromPreference(searchFormData.preferredDate),
        timeOfDay: searchFormData.preferredTimeOfDay,
      };
      console.log('🔵 Filters prepared:', filters);
      
      console.log('🔵 Calling fetchDoctorsWithAvailability...');
      const data = await fetchDoctorsWithAvailability(filters);
      console.log('🔵 Data received:', data);
      
      setDoctors(data);
    } catch (err) {
      console.error('🔴 Error in handleSearch:', err);
      setError(err.message);
    } finally {
      console.log('🔵 Setting isLoading to false');
      setIsLoading(false);
    }
  };

  // Search for providers
  const handleSearch = async () => {
    await runSearch(formData);
  };

  // Helper to convert date preference to actual date
  const getDateFromPreference = (preference) => {
    const option = DATE_OPTIONS.find(opt => opt.value === preference);
    if (!option || option.value === 'any') return null;
    return addDays(new Date(), option.days);
  };

  // If arriving from questionnaire with prefilled query params, run search immediately.
  useEffect(() => {
    if (searchParams.get('autoSearch') !== '1') return;

    const prefilledFormData = {
      appointmentType: searchParams.get('appointmentType') || 'no-preference',
      careType: searchParams.get('careType') || '',
      preferredDate: searchParams.get('preferredDate') || 'any',
      preferredTimeOfDay: searchParams.get('preferredTimeOfDay') || 'any',
    };

    setFormData(prefilledFormData);
    setCurrentStep(3);
    void runSearch(prefilledFormData);
  }, [searchParams]);

  // Helper function to convert date preference to actual date range
  const getDateRangeFromPreference = (preference) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    switch (preference) {
      case 'today':
        return {
          start: today,
          end: today
        };
      
      case 'tomorrow':
        const tomorrow = addDays(today, 1);
        return {
          start: tomorrow,
          end: tomorrow
        };
      
      case 'this-week': {
        // This week = today through next 7 days
        const endOfWeek = addDays(today, 7);
        return {
          start: today,
          end: endOfWeek
        };
      }
      
      case 'next-week': {
        // Next week = 7-14 days from now
        const startNextWeek = addDays(today, 7);
        const endNextWeek = addDays(today, 14);
        return {
          start: startNextWeek,
          end: endNextWeek
        };
      }
      
      case 'any':
      default:
        return null; // No date filtering
    }
  };

  // Check if a doctor has availability matching the user's preferences
  const hasMatchingAvailability = (doctor) => {
    // If no slots, doctor is not available
    if (!doctor.availability_slots || doctor.availability_slots.length === 0) {
      return false;
    }

    // Get the preferred date range based on user selection
    const preferredDateRange = getDateRangeFromPreference(formData.preferredDate);
    
    // Get the preferred time range based on user selection
    const preferredTimeRange = TIME_OF_DAY_OPTIONS.find(
      opt => opt.value === formData.preferredTimeOfDay
    )?.range;

    // Check each slot to see if it matches
    return doctor.availability_slots.some(slot => {
      // Parse slot times
      const slotStartTime = slot.start_time;
      const slotEndTime = slot.end_time;
      
      // 1. Check date match
      if (preferredDateRange) {
        const slotDate = parseISO(slot.slot_date);
        // Check if slot date is within preferred date range
        if (slotDate < preferredDateRange.start || slotDate > preferredDateRange.end) {
          return false;
        }
      }

      // 2. Check time of day match (if not "any")
      if (preferredTimeRange && formData.preferredTimeOfDay !== 'any') {
        // Check if the slot overlaps with the preferred time range
        const slotStart = slotStartTime;
        const slotEnd = slotEndTime;
        
        // Check for any overlap between slot and preferred time range
        const hasOverlap = (
          // Slot starts before preferred range ends AND slot ends after preferred range starts
          (slotStart < preferredTimeRange.end && slotEnd > preferredTimeRange.start)
        );
        
        if (!hasOverlap) {
          return false;
        }
      }

      // 3. Check appointment type match (if not "no-preference")
      if (formData.appointmentType !== 'no-preference') {
        // Check if slot supports the requested appointment type
        if (!slot.appointment_type || !slot.appointment_type.includes(formData.appointmentType)) {
          return false;
        }
      }

      // 4. Check if slot is available
      if (!slot.is_available) {
        return false;
      }

      // All checks passed
      return true;
    });
  };

  // Filter doctors based on all criteria including availability
  const filteredDoctors = useMemo(() => {
    if (!doctors.length) return [];

    return doctors.filter(doctor => {
      // Filter by appointment type (only if not "no-preference")
      if (formData.appointmentType === 'virtual' && !doctor.virtual_available) return false;
      if (formData.appointmentType === 'in-person' && !doctor.in_person_available) return false;
      // If "no-preference", show doctors that have either virtual OR in-person available
      if (formData.appointmentType === 'no-preference' && !doctor.virtual_available && !doctor.in_person_available) return false;
      
      // Filter by availability
      return hasMatchingAvailability(doctor);
    });
  }, [doctors, formData]);

  // Transform doctor data for DoctorCard
  const getNextAvailableFromSlots = (slots = []) => {
    if (!Array.isArray(slots) || slots.length === 0) return null;

    const parsedDates = slots
      .map((slot) => {
        if (!slot?.slot_date || !slot?.start_time) return null;
        const date = new Date(`${slot.slot_date}T${slot.start_time}`);
        if (Number.isNaN(date.getTime())) return null;
        return date;
      })
      .filter((value) => value !== null)
      .sort((a, b) => a.getTime() - b.getTime());

    return parsedDates.length > 0 ? parsedDates[0].toISOString() : null;
  };

  const transformDoctorForCard = (doctor) => ({
    // Profile/booking routes expect users.id, not doctors.id.
    id: String(doctor.user_id || doctor.id),
    name: doctor.full_name,
    specialty: doctor.specialty,
    photo: doctor.photo || '',
    languages: doctor.languages || [],
    rating: doctor.rating || 4.5,
    reviewCount: doctor.review_count || 0,
    clinicLocation: doctor.clinic_location || 'Location not specified',
    virtualAvailable: doctor.virtual_available,
    inPersonAvailable: doctor.in_person_available,
    nextAvailable: doctor.next_available || getNextAvailableFromSlots(doctor.availability_slots),
    verified: doctor.verification_status === 'approved',
    availableSlots: doctor.availability_slots || [],
  });

  // Render current step
  const renderStep = () => {
    switch (currentStep) {
      case 0: // Appointment Type
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-semibold mb-2">How would you like to meet with your provider?</h2>
              <p className="text-muted-foreground">Choose your preferred appointment type</p>
            </div>
            
            <RadioGroup
              value={formData.appointmentType}
              onValueChange={(value) => handleInputChange('appointmentType', value)}
              className="grid md:grid-cols-3 gap-4"
            >
              <div>
                <RadioGroupItem value="virtual" id="virtual" className="peer sr-only" />
                <Label
                  htmlFor="virtual"
                  className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-popover p-6 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer h-full"
                >
                  <Video className="h-12 w-12 mb-3 text-primary" />
                  <span className="text-lg font-semibold">Virtual Visit</span>
                  <span className="text-sm text-muted-foreground text-center mt-2">
                    Meet from anywhere via video call
                  </span>
                </Label>
              </div>

              <div>
                <RadioGroupItem value="in-person" id="in-person" className="peer sr-only" />
                <Label
                  htmlFor="in-person"
                  className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-popover p-6 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer h-full"
                >
                  <MapPin className="h-12 w-12 mb-3 text-primary" />
                  <span className="text-lg font-semibold">In-Person Visit</span>
                  <span className="text-sm text-muted-foreground text-center mt-2">
                    Visit a provider at their clinic
                  </span>
                </Label>
              </div>

              <div>
                <RadioGroupItem value="no-preference" id="no-preference" className="peer sr-only" />
                <Label
                  htmlFor="no-preference"
                  className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-popover p-6 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer h-full"
                >
                  <Globe className="h-12 w-12 mb-3 text-primary" />
                  <span className="text-lg font-semibold">No Preference</span>
                  <span className="text-sm text-muted-foreground text-center mt-2">
                    Show all available options
                  </span>
                </Label>
              </div>
            </RadioGroup>
          </div>
        );

      case 1: // Care Type
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-semibold mb-2">What type of care do you need?</h2>
              <p className="text-muted-foreground">Select the specialty that best matches your needs</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto p-2">
              {careTypes.map((type) => (
                <Button
                  key={type.id}
                  variant={formData.careType === type.id ? "default" : "outline"}
                  className="h-auto py-4 px-4 justify-start text-left whitespace-normal"
                  onClick={() => handleInputChange('careType', type.id)}
                >
                  <div className="w-full">
                    <div className="font-medium truncate">{type.name}</div>
                    <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {type.description}
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        );

      case 2: // Schedule
        return (
          <div className="space-y-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-semibold mb-2">When would you like to schedule?</h2>
              <p className="text-muted-foreground">Select your preferred date and time</p>
            </div>

            <div className="space-y-6">
              {/* Date Selection */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Preferred Date</Label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {DATE_OPTIONS.map((option) => (
                    <Button
                      key={option.value}
                      variant={formData.preferredDate === option.value ? "default" : "outline"}
                      className="flex-1 whitespace-normal h-auto py-2 px-1 text-sm"
                      onClick={() => handleInputChange('preferredDate', option.value)}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Time of Day Selection */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Preferred Time</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {TIME_OF_DAY_OPTIONS.map((option) => (
                    <Button
                      key={option.value}
                      variant={formData.preferredTimeOfDay === option.value ? "default" : "outline"}
                      className="flex-1 whitespace-normal h-auto py-2 px-1 text-sm"
                      onClick={() => handleInputChange('preferredTimeOfDay', option.value)}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Summary Card */}
              {formData.preferredDate && formData.preferredTimeOfDay && (
                <Card className="mt-6 bg-primary/5 border-primary">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">Your selection:</p>
                        <p className="text-sm text-muted-foreground">
                          {DATE_OPTIONS.find(d => d.value === formData.preferredDate)?.label} • 
                          {TIME_OF_DAY_OPTIONS.find(t => t.value === formData.preferredTimeOfDay)?.label}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        );

      case 3: // Results
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-semibold mb-2">Available Providers</h2>
              <p className="text-muted-foreground">
                {filteredDoctors.length} provider{filteredDoctors.length !== 1 ? 's' : ''} match your criteria
              </p>
            </div>

            {/* Selected Criteria Summary */}
            <div className="flex flex-wrap gap-2 justify-center mb-6">
              <Badge variant="secondary" className="px-3 py-1">
                {formData.appointmentType === 'virtual' ? 'Virtual Visit' : 
                 formData.appointmentType === 'in-person' ? 'In-Person Visit' : 
                 'No Preference'}
              </Badge>
              <Badge variant="secondary" className="px-3 py-1">
                {careTypes.find(t => t.id === formData.careType)?.name || formData.careType}
              </Badge>
              <Badge variant="secondary" className="px-3 py-1">
                {DATE_OPTIONS.find(d => d.value === formData.preferredDate)?.label}
              </Badge>
              <Badge variant="secondary" className="px-3 py-1">
                {TIME_OF_DAY_OPTIONS.find(t => t.value === formData.preferredTimeOfDay)?.label}
              </Badge>
            </div>

            {/* Results */}
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : error ? (
              <div className="text-center py-12 bg-card rounded-lg border">
                <p className="text-muted-foreground mb-4">{error}</p>
                <Button onClick={handleSearch}>Try Again</Button>
              </div>
            ) : filteredDoctors.length === 0 ? (
              <div className="text-center py-12 bg-card rounded-lg border">
                <p className="text-muted-foreground mb-4">
                  No providers available for your selected time.
                </p>
                <Button onClick={() => setCurrentStep(2)}>
                  Change Schedule
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredDoctors.map(doctor => (
                  <DoctorCard 
                    key={doctor.id} 
                    doctor={transformDoctorForCard(doctor)} 
                    showAvailability={true}
                  />
                ))}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Progress Steps - Fixed Version */}
      <div className="mb-8">
        <div className="flex justify-between items-center relative">
          {/* Background line that runs behind all circles */}
          <div className="absolute left-0 top-5 h-0.5 w-full bg-muted" />
          
          {/* Colored progress line that shows completed steps */}
          <div 
            className="absolute left-0 top-5 h-0.5 bg-primary transition-all duration-300"
            style={{ 
              width: `${(currentStep / (STEPS.length - 1)) * 100}%`,
              maxWidth: '100%'
            }}
          />
          
          {/* Step circles */}
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            
            return (
              <div key={step.id} className="flex-1 text-center relative z-10">
                <div className="relative flex flex-col items-center gap-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 bg-background transition-colors ${
                    isActive ? 'border-primary bg-primary text-primary-foreground' :
                    isCompleted ? 'border-primary bg-primary text-primary-foreground' :
                    'border-muted bg-background'
                  }`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className={`text-sm hidden md:block ${
                    isActive ? 'font-medium text-primary' : 'text-muted-foreground'
                  }`}>
                    {step.title}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Form Content */}
      <Card className="border-2">
        <CardContent className="pt-8 pb-6 px-6">
          {renderStep()}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-6">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 0}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Previous
        </Button>

        {currentStep < 2 ? ( // Before the last step (schedule)
          <Button
            onClick={handleNext}
            disabled={!isStepValid()}
            className="gap-2"
          >
            Next
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : currentStep === 2 ? ( // On the schedule step
          <Button
            onClick={handleNext}
            disabled={!isStepValid()}
            className="gap-2"
          >
            Next
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : currentStep === 3 ? ( // On results step
          <Button
            variant="outline"
            onClick={() => {
              setCurrentStep(0);
              setDoctors([]);
              setFormData({
                appointmentType: '',
                careType: '',
                preferredDate: '',
                preferredTimeOfDay: '',
              });
            }}
          >
            Start Over
          </Button>
        ) : null}
      </div>

      {/* Quick Map View Link */}
      {currentStep === 3 && filteredDoctors.length > 0 && (
        <div className="mt-6 text-center">
          <Link to="/patient/providers/map" className="text-primary hover:underline inline-flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            View these providers on map
          </Link>
        </div>
      )}
    </div>
  );
}
