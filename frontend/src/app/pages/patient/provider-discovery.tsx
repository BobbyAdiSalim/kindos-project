import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { DoctorCard } from '@/app/components/doctor-card';
import { Badge } from '@/app/components/ui/badge';
import { careTypes } from '@/app/lib/mock-data';
import { Calendar, MapPin, Video, User, ArrowRight, ArrowLeft, Loader2, Globe, Navigation, LocateFixed } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/app/components/ui/radio-group';
import { Card, CardContent } from '@/app/components/ui/card';
import { format, addDays, parseISO } from 'date-fns';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom doctor icon
const createDoctorIcon = (isSelected = false) => {
  return L.divIcon({
    className: `doctor-marker ${isSelected ? 'selected' : ''}`,
    html: `<div style="
      background-color: ${isSelected ? '#2563eb' : '#3b82f6'};
      width: ${isSelected ? '40px' : '32px'};
      height: ${isSelected ? '40px' : '32px'};
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: ${isSelected ? '20px' : '16px'};
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      transition: all 0.2s;
      cursor: pointer;
    ">🏥</div>`,
    iconSize: [isSelected ? 40 : 32, isSelected ? 40 : 32],
    popupAnchor: [0, -20],
  });
};

// User location icon
const userIcon = L.divIcon({
  className: 'user-marker',
  html: `<div style="
    background-color: #10b981;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 14px;
    border: 3px solid white;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  ">📍</div>`,
  iconSize: [24, 24],
  popupAnchor: [0, -12],
});

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
  
  // Map related state
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const userMarkerRef = useRef<L.Marker | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);

  const getDateRangeFromPreference = (preference: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    switch (preference) {
      case 'today': return { start: today, end: today };
      case 'tomorrow': 
        const tomorrow = addDays(today, 1);
        return { start: tomorrow, end: tomorrow };
      case 'this-week': {
        const endOfWeek = addDays(today, 7);
        return { start: today, end: endOfWeek };
      }
      case 'next-week': {
        const startNextWeek = addDays(today, 7);
        const endNextWeek = addDays(today, 14);
        return { start: startNextWeek, end: endNextWeek };
      }
      default: return null;
    }
  };

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
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch doctors: ${response.status}`);
      }
      
      const data = await response.json();
      return data.doctors || [];
    } catch (error) {
      console.error('Error fetching doctors:', error);
      throw error;
    }
  };

  const hasMatchingAvailability = (doctor: any) => {
    const preferredDateRange = getDateRangeFromPreference(formData.preferredDate);
    const preferredTimeRange = TIME_OF_DAY_OPTIONS.find(
      opt => opt.value === formData.preferredTimeOfDay
    )?.range;

    // Check explicit slots first
    const hasMatchingSlot = doctor.availability_slots?.some((slot: any) => {
      if (preferredDateRange) {
        const slotDate = parseISO(slot.slot_date);
        if (slotDate < preferredDateRange.start || slotDate > preferredDateRange.end) return false;
      }

      if (preferredTimeRange && formData.preferredTimeOfDay !== 'any') {
        if (!(slot.start_time < preferredTimeRange.end && slot.end_time > preferredTimeRange.start)) return false;
      }

      if (formData.appointmentType !== 'no-preference') {
        if (!slot.appointment_type?.includes(formData.appointmentType)) return false;
      }

      return slot.is_available;
    });

    if (hasMatchingSlot) return true;

    // Fall back to recurring patterns
    if (!doctor.availability_patterns?.length) return false;

    // Compute the set of day_of_week values covered by the date preference
    const coveredDays: Set<number> = new Set();
    if (!preferredDateRange) {
      // 'any' date — all days match, skip day filtering
    } else {
      const current = new Date(preferredDateRange.start);
      const end = new Date(preferredDateRange.end);
      while (current <= end) {
        coveredDays.add(current.getDay());
        current.setDate(current.getDate() + 1);
      }
    }

    return doctor.availability_patterns.some((pattern: any) => {
      if (coveredDays.size > 0 && !coveredDays.has(pattern.day_of_week)) return false;

      if (preferredTimeRange && formData.preferredTimeOfDay !== 'any') {
        if (!(pattern.start_time < preferredTimeRange.end && pattern.end_time > preferredTimeRange.start)) return false;
      }

      if (formData.appointmentType !== 'no-preference') {
        if (!pattern.appointment_type?.includes(formData.appointmentType)) return false;
      }

      return true;
    });
  };

  const filteredDoctors = useMemo(() => {
    if (!doctors.length) return [];

    return doctors.filter((doctor: any) => {
      if (formData.appointmentType === 'virtual' && !doctor.virtual_available) return false;
      if (formData.appointmentType === 'in-person' && !doctor.in_person_available) return false;
      if (formData.appointmentType === 'no-preference' && !doctor.virtual_available && !doctor.in_person_available) return false;
      return hasMatchingAvailability(doctor);
    });
  }, [doctors, formData]);

  // Initialize map when we're on the results step
  useEffect(() => {
    if (currentStep !== 3) return;

    const initMap = () => {
      const mapElement = document.getElementById('providers-map');
      
      if (!mapElement) {
        setTimeout(initMap, 100);
        return;
      }

      if (mapRef.current) {
        mapRef.current.invalidateSize();
        return;
      }
      
      try {
        const map = L.map(mapElement, {
          center: [43.6548, -79.3884],
          zoom: 12,
          zoomControl: true,
        });
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(map);
        
        mapRef.current = map;
        setIsMapReady(true);
        
        // Force invalidate size after creation
        setTimeout(() => {
          map.invalidateSize();
        }, 300);
        
      } catch (error) {
        console.error('Error creating map:', error);
      }
    };

    initMap();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        setIsMapReady(false);
      }
    };
  }, [currentStep]);

  // Add markers to map
  const addMarkersToMap = () => {
    if (!mapRef.current) {
      return;
    }

    let markersAdded = 0;

    filteredDoctors.forEach(doctor => {
      if (doctor.latitude && doctor.longitude) {
        const lat = parseFloat(doctor.latitude);
        const lng = parseFloat(doctor.longitude);
                
        const marker = L.marker([lat, lng], {
          icon: createDoctorIcon(false),
          riseOnHover: true
        }).addTo(mapRef.current!);
        
        // Create popup with button that navigates to doctor profile
        const popupContent = document.createElement('div');
        popupContent.className = 'p-3 min-w-[200px]';
        popupContent.innerHTML = `
          <h3 class="font-semibold text-base mb-1">${doctor.full_name}</h3>
          <p class="text-sm text-gray-600 mb-1">${doctor.specialty}</p>
          <p class="text-xs text-gray-500 mb-3">${doctor.clinic_location || 'Location not specified'}</p>
          <button 
            class="w-full border border-input bg-background hover:bg-accent hover:text-accent-foreground text-sm font-medium py-2 px-3 rounded transition-colors"
            data-doctor-id="${doctor.id}"
          >
            View Profile
          </button>
        `;
        
        // Add click handler to the button
        const button = popupContent.querySelector('button');
        if (button) {
          button.onclick = (e) => {
            e.stopPropagation();
            // Use window.location to navigate (simpler than trying to use React Router in a popup)
            window.location.href = `/patient/doctor/${doctor.user_id || doctor.id}`;
          };
        }
        
        const popup = L.popup({ 
          offset: [0, -20],
          className: 'doctor-popup'
        }).setContent(popupContent);
        
        marker.bindPopup(popup);
        
        marker.on('click', () => {
          setSelectedDoctor(doctor);
        });
        
        markersRef.current[doctor.id] = marker;
        markersAdded++;
      }
    });

    const markers = Object.values(markersRef.current);
    if (markers.length > 0 && mapRef.current) {
      const group = L.featureGroup(markers);
      mapRef.current.fitBounds(group.getBounds().pad(0.1));
    }
  };

  // Update marker when doctor is selected
  useEffect(() => {
    if (selectedDoctor && markersRef.current[selectedDoctor.id]) {
      Object.entries(markersRef.current).forEach(([id, marker]) => {
        marker.setIcon(createDoctorIcon(false));
      });
      
      markersRef.current[selectedDoctor.id].setIcon(createDoctorIcon(true));
      markersRef.current[selectedDoctor.id].openPopup();
      
      if (mapRef.current && selectedDoctor.latitude && selectedDoctor.longitude) {
        mapRef.current.setView(
          [parseFloat(selectedDoctor.latitude), parseFloat(selectedDoctor.longitude)],
          15
        );
      }
    }
  }, [selectedDoctor]);

  // Trigger markers when map is ready AND doctors are loaded
  useEffect(() => {
    if (currentStep === 3 && isMapReady && filteredDoctors.length > 0) {      
      setTimeout(() => {
        Object.values(markersRef.current).forEach(marker => marker.remove());
        markersRef.current = {};
        addMarkersToMap();
      }, 300);
    }
  }, [currentStep, isMapReady, filteredDoctors]);

  // Get user's current location
  const getUserLocation = () => {
    setGettingLocation(true);
    
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      setGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        
        if (userMarkerRef.current) {
          userMarkerRef.current.remove();
        }
        
        if (mapRef.current) {
          const userMarker = L.marker([latitude, longitude], {
            icon: userIcon
          }).addTo(mapRef.current);
          
          userMarker.bindPopup('<strong>You are here</strong>').openPopup();
          userMarkerRef.current = userMarker;
          mapRef.current.setView([latitude, longitude], 13);
        }
        
        setGettingLocation(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        let message = 'Unable to get your location.';
        if (error.code === 1) {
          message = 'Location permission denied. Please enable location services.';
        } else if (error.code === 2) {
          message = 'Location unavailable. Please try again.';
        } else if (error.code === 3) {
          message = 'Location request timed out.';
        }
        alert(message);
        setGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  // Make selectDoctor available globally
  useEffect(() => {
    (window as any).selectDoctor = (doctorId: number) => {
      const doctor = doctors.find(d => d.id === doctorId);
      if (doctor) setSelectedDoctor(doctor);
    };
    
    return () => {
      delete (window as any).selectDoctor;
    };
  }, [doctors]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

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

  const handleNext = () => {
    if (currentStep === 2) {
      setCurrentStep(3);
      void handleSearch();
    } else if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const runSearch = async (searchFormData = formData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const filters = {
        appointmentType: searchFormData.appointmentType,
        specialty: searchFormData.careType,
        date: searchFormData.preferredDate === 'any' ? null : getDateFromPreference(searchFormData.preferredDate),
        timeOfDay: searchFormData.preferredTimeOfDay,
      };
      
      const data = await fetchDoctorsWithAvailability(filters);
      setDoctors(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    await runSearch(formData);
  };

  const getDateFromPreference = (preference: string) => {
    const option = DATE_OPTIONS.find(opt => opt.value === preference);
    if (!option || option.value === 'any') return null;
    return addDays(new Date(), option.days);
  };

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

  const getNextAvailableFromSlots = (slots: any[] = []) => {
    if (!Array.isArray(slots) || slots.length === 0) return null;

    const parsedDates = slots
      .map((slot) => {
        if (!slot?.slot_date || !slot?.start_time) return null;
        const date = new Date(`${slot.slot_date}T${slot.start_time}`);
        return Number.isNaN(date.getTime()) ? null : date;
      })
      .filter((value) => value !== null)
      .sort((a, b) => a.getTime() - b.getTime());

    return parsedDates.length > 0 ? parsedDates[0].toISOString() : null;
  };

  const transformDoctorForCard = (doctor: any) => ({
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

  const renderStep = () => {
    switch (currentStep) {
      case 0:
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
              {[
                { value: 'virtual', icon: Video, label: 'Virtual Visit', desc: 'Meet from anywhere via video call' },
                { value: 'in-person', icon: MapPin, label: 'In-Person Visit', desc: 'Visit a provider at their clinic' },
                { value: 'no-preference', icon: Globe, label: 'No Preference', desc: 'Show all available options' }
              ].map((option) => (
                <div key={option.value}>
                  <RadioGroupItem value={option.value} id={option.value} className="peer sr-only" />
                  <Label
                    htmlFor={option.value}
                    className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-popover p-6 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer h-full"
                  >
                    <option.icon className="h-12 w-12 mb-3 text-primary" />
                    <span className="text-lg font-semibold">{option.label}</span>
                    <span className="text-sm text-muted-foreground text-center mt-2">{option.desc}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        );

      case 1:
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
                    <div className="text-sm text-muted-foreground mt-1 line-clamp-2">{type.description}</div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-semibold mb-2">When would you like to schedule?</h2>
              <p className="text-muted-foreground">Select your preferred date and time</p>
            </div>
            <div className="space-y-6">
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
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-4">
              <h2 className="text-2xl font-semibold mb-2">Available Providers</h2>
              <p className="text-muted-foreground">
                {filteredDoctors.length} provider{filteredDoctors.length !== 1 ? 's' : ''} match your criteria
              </p>
            </div>

            <div className="flex flex-wrap gap-2 justify-center mb-4">
              <Badge variant="secondary" className="px-3 py-1">
                {formData.appointmentType === 'virtual' ? 'Virtual Visit' : 
                 formData.appointmentType === 'in-person' ? 'In-Person Visit' : 'No Preference'}
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
                <p className="text-muted-foreground mb-4">No providers available for your selected time.</p>
                <Button onClick={() => setCurrentStep(2)}>Change Schedule</Button>
              </div>
            ) : (
              <div className="flex gap-4 h-[600px]">
                <div 
                  className="w-2/5 overflow-y-auto px-4 py-4 space-y-4"
                  style={{
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none'
                  }}
                >
                  {filteredDoctors.map(doctor => (
                    <div
                      key={doctor.id}
                      onClick={() => setSelectedDoctor(doctor)}
                      className={`cursor-pointer transition-all ${
                        selectedDoctor?.id === doctor.id
                          ? 'ring-2 ring-primary rounded-lg'
                          : 'hover:ring-1 hover:ring-muted rounded-lg'
                      }`}
                    >
                      <DoctorCard doctor={transformDoctorForCard(doctor)} showAvailability={true} />
                    </div>
                  ))}
                </div>

                <div className="w-3/5 relative">
                  <Card className="h-full overflow-hidden">
                    <CardContent className="p-0 h-full relative">
                      <div 
                        id="providers-map"
                        className="absolute inset-0 w-full h-full"
                        style={{ 
                          minHeight: '600px',
                          backgroundColor: '#e5e7eb',
                          zIndex: 1
                        }}
                      />
                      
                      <div className="absolute top-4 right-4 z-20 space-y-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="shadow-lg bg-white"
                          onClick={() => {
                            if (mapRef.current) {
                              const markers = Object.values(markersRef.current);
                              if (markers.length > 0) {
                                const group = L.featureGroup(markers);
                                mapRef.current.fitBounds(group.getBounds().pad(0.1));
                              }
                              mapRef.current.invalidateSize();
                            }
                          }}
                        >
                          <MapPin className="h-4 w-4 mr-2" />
                          Show All
                        </Button>
                      </div>

                      <div className="absolute top-4 left-4 z-20">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="shadow-lg bg-white"
                          onClick={getUserLocation}
                          disabled={gettingLocation}
                        >
                          {gettingLocation ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <LocateFixed className="h-4 w-4 mr-2" />
                          )}
                          My Location
                        </Button>
                      </div>

                      {userLocation && (
                        <div className="absolute bottom-4 left-4 z-20">
                          <Badge variant="secondary" className="shadow-lg bg-white">
                            <Navigation className="h-3 w-3 mr-1" />
                            Using your location
                          </Badge>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Progress Steps - Simple color changes, no lines */}
      <div className="mb-12">
        <div className="flex justify-between">
          {/* Step 1 - Appointment Type */}
          <div className="flex flex-col items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
              currentStep >= 0 ? 'border-primary bg-primary text-primary-foreground' : 'border-muted bg-background'
            }`}>
              <Video className="h-5 w-5" />
            </div>
            <span className={`text-sm mt-2 ${
              currentStep >= 0 ? 'text-primary font-medium' : 'text-muted-foreground'
            }`}>
              Appointment Type
            </span>
          </div>
          
          {/* Step 2 - Care Needed */}
          <div className="flex flex-col items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
              currentStep >= 1 ? 'border-primary bg-primary text-primary-foreground' : 'border-muted bg-background'
            }`}>
              <User className="h-5 w-5" />
            </div>
            <span className={`text-sm mt-2 ${
              currentStep >= 1 ? 'text-primary font-medium' : 'text-muted-foreground'
            }`}>
              Care Needed
            </span>
          </div>
          
          {/* Step 3 - Preferred Time */}
          <div className="flex flex-col items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
              currentStep >= 2 ? 'border-primary bg-primary text-primary-foreground' : 'border-muted bg-background'
            }`}>
              <Calendar className="h-5 w-5" />
            </div>
            <span className={`text-sm mt-2 ${
              currentStep >= 2 ? 'text-primary font-medium' : 'text-muted-foreground'
            }`}>
              Preferred Time
            </span>
          </div>
          
          {/* Step 4 - Find Provider */}
          <div className="flex flex-col items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
              currentStep >= 3 ? 'border-primary bg-primary text-primary-foreground' : 'border-muted bg-background'
            }`}>
              <MapPin className="h-5 w-5" />
            </div>
            <span className={`text-sm mt-2 ${
              currentStep >= 3 ? 'text-primary font-medium' : 'text-muted-foreground'
            }`}>
              Find Provider
            </span>
          </div>
        </div>
      </div>

      <Card className="border-2">
        <CardContent className="pt-8 pb-6 px-6">
          {renderStep()}
        </CardContent>
      </Card>

      {currentStep < 3 && (
        <div className="flex justify-between mt-6">
          <Button variant="outline" onClick={handlePrevious} disabled={currentStep === 0} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Previous
          </Button>
          <Button onClick={handleNext} disabled={!isStepValid()} className="gap-2">
            {currentStep === 2 ? 'Find Providers' : 'Next'} <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {currentStep === 3 && (
        <div className="flex justify-center mt-6">
          <Button variant="outline" onClick={() => {
            setCurrentStep(0);
            setDoctors([]);
            setSelectedDoctor(null);
            setFormData({ appointmentType: '', careType: '', preferredDate: '', preferredTimeOfDay: '' });
          }}>
            Start Over
          </Button>
        </div>
      )}
    </div>
  );
}