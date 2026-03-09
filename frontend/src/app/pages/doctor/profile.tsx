import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Switch } from '@/app/components/ui/switch';
import { useAuth } from '@/app/lib/auth-context';
import { useNavigate } from 'react-router';
import { DoctorProfile, getMyProfile, updateMyProfile } from '@/app/lib/profile-api';
import { toast } from 'sonner';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in Leaflet with Next.js/React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface LocationData {
  lat: number;
  lng: number;
  address: string;
}

interface Suggestion {
  display_name: string;
  lat: string;
  lon: string;
  importance?: number;
  class?: string;
  type?: string;
}

export function DoctorProfileEdit() {
  const { token, updateUser } = useAuth();
  const navigate = useNavigate();
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [searchAddress, setSearchAddress] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const [viewBounds, setViewBounds] = useState<{ minlat?: number; maxlat?: number; minlon?: number; maxlon?: number }>({});
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    fullName: '',
    specialty: '',
    licenseNumber: '',
    bio: '',
    clinicLocation: '',
    latitude: '',
    longitude: '',
    phone: '',
    languages: '',
    virtualAvailable: true,
    inPersonAvailable: true,
  });

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update view bounds when map moves
  const updateMapBounds = useCallback(() => {
    if (mapRef.current) {
      const bounds = mapRef.current.getBounds();
      setViewBounds({
        minlat: bounds.getSouth(),
        maxlat: bounds.getNorth(),
        minlon: bounds.getWest(),
        maxlon: bounds.getEast()
      });
    }
  }, []);

  // Debounced address search for autocomplete - BEST BALANCE
  const searchAddressAutocomplete = useCallback(async (query: string) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      return;
    }

    try {
      let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=8&addressdetails=1`;
      
      url += `&countrycodes=us,ca,mx`; // Change this to your country
      
      if (viewBounds.minlat && viewBounds.maxlat && viewBounds.minlon && viewBounds.maxlon) {
        const latRange = viewBounds.maxlat - viewBounds.minlat;
        const lonRange = viewBounds.maxlon - viewBounds.minlon;
        
        const expandedBounds = {
          minlat: viewBounds.minlat - latRange * 3,
          maxlat: viewBounds.maxlat + latRange * 3,
          minlon: viewBounds.minlon - lonRange * 3,
          maxlon: viewBounds.maxlon + lonRange * 3
        };
        
        url += `&viewbox=${expandedBounds.minlon},${expandedBounds.minlat},${expandedBounds.maxlon},${expandedBounds.maxlat}`;
      }
      
      url += `&accept-language=en`;

      const response = await fetch(url);
      const data = await response.json();
      
      setSuggestions(data);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Autocomplete error:', error);
    }
  }, [viewBounds]);

  // Handle search input change with debounce
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchAddress(value);
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Set new timeout for debounce
    searchTimeoutRef.current = setTimeout(() => {
      searchAddressAutocomplete(value);
    }, 300);
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: Suggestion) => {
    const lat = parseFloat(suggestion.lat);
    const lng = parseFloat(suggestion.lon);
    
    setSearchAddress(suggestion.display_name);
    setShowSuggestions(false);
    
    if (mapRef.current) {
      mapRef.current.setView([lat, lng], 18);
      placeMarker(lat, lng);
      setSelectedLocation({
        lat,
        lng,
        address: suggestion.display_name
      });
      setFormData(prev => ({
        ...prev,
        clinicLocation: suggestion.display_name
      }));
    }
  };

  // Initialize map
  useEffect(() => {
    if (showMap && !mapRef.current) {
      // Default to NYC or existing location
      const defaultLat = selectedLocation?.lat || (formData.latitude ? parseFloat(formData.latitude) : 43.6548);
      const defaultLng = selectedLocation?.lng || (formData.longitude ? parseFloat(formData.longitude) : -79.3884);
      
      const map = L.map('map').setView([defaultLat, defaultLng], 13);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);
      
      // Add click handler
      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        placeMarker(lat, lng);
        getAddressFromLatLng(lat, lng);
      });

      // Update bounds when map moves
      map.on('moveend', updateMapBounds);
      map.on('zoomend', updateMapBounds);
      
      mapRef.current = map;
      
      // Initial bounds update
      setTimeout(updateMapBounds, 100);
      
      // If there's an existing location, show it
      if (selectedLocation) {
        placeMarker(selectedLocation.lat, selectedLocation.lng);
        map.setView([selectedLocation.lat, selectedLocation.lng], 15);
      } else if (formData.latitude && formData.longitude) {
        const lat = parseFloat(formData.latitude);
        const lng = parseFloat(formData.longitude);
        setSelectedLocation({
          lat,
          lng,
          address: formData.clinicLocation || 'Loading address...'
        });
        placeMarker(lat, lng);
        map.setView([lat, lng], 15);
      }
    }
    
    return () => {
      if (mapRef.current) {
        mapRef.current.off('moveend', updateMapBounds);
        mapRef.current.off('zoomend', updateMapBounds);
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [showMap]);

  const placeMarker = (lat: number, lng: number) => {
    if (!mapRef.current) return;
    
    // Remove existing marker
    if (markerRef.current) {
      markerRef.current.remove();
    }
    
    // Add new marker (draggable)
    const marker = L.marker([lat, lng], { draggable: true }).addTo(mapRef.current);
    
    // Handle drag end
    marker.on('dragend', (e) => {
      const position = e.target.getLatLng();
      getAddressFromLatLng(position.lat, position.lng);
    });
    
    markerRef.current = marker;
    
    // Update form data
    setSelectedLocation(prev => ({
      lat,
      lng,
      address: prev?.address || 'Loading address...'
    }));
    
    setFormData(prev => ({
      ...prev,
      latitude: lat.toString(),
      longitude: lng.toString()
    }));
  };

  const getAddressFromLatLng = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=en&zoom=18&addressdetails=1`
      );
      const data = await response.json();
      
      if (data && data.display_name) {
        // Try to get a shorter, cleaner address
        let cleanAddress = data.display_name;
        
        // If we have address details, we can format it nicer
        if (data.address) {
          const parts = [];
          if (data.address.road) parts.push(data.address.road);
          if (data.address.house_number) parts.push(data.address.house_number);
          if (data.address.city || data.address.town || data.address.village) {
            parts.push(data.address.city || data.address.town || data.address.village);
          }
          if (data.address.state) parts.push(data.address.state);
          if (data.address.country) parts.push(data.address.country);
          
          if (parts.length > 0) {
            cleanAddress = parts.join(', ');
          }
        }
        
        setSelectedLocation({
          lat,
          lng,
          address: cleanAddress
        });
        
        setFormData(prev => ({
          ...prev,
          clinicLocation: cleanAddress
        }));
        
        setSearchAddress(cleanAddress);
        toast.success('Location updated!');
      }
    } catch (error) {
      console.error('Error getting address:', error);
      setSelectedLocation({
        lat,
        lng,
        address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`
      });
    }
  };

  const searchLocation = async () => {
    if (!searchAddress || !mapRef.current) return;
    
    try {
      let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchAddress)}&limit=1&addressdetails=1`;
      
      // Add viewbox to prioritize current area
      if (viewBounds.minlat && viewBounds.maxlat && viewBounds.minlon && viewBounds.maxlon) {
        url += `&viewbox=${viewBounds.minlon},${viewBounds.minlat},${viewBounds.maxlon},${viewBounds.maxlat}`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        
        mapRef.current.setView([lat, lng], 18);
        placeMarker(lat, lng);
        setSelectedLocation({
          lat,
          lng,
          address: data[0].display_name
        });
        setFormData(prev => ({
          ...prev,
          clinicLocation: data[0].display_name
        }));
        setSearchAddress(data[0].display_name);
        setShowSuggestions(false);
        toast.success('Location found!');
      } else {
        toast.error('Address not found');
      }
    } catch (error) {
      toast.error('Error searching for address');
    }
  };

  const getGoogleMapsLink = () => {
    if (!selectedLocation && !(formData.latitude && formData.longitude)) return '';
    const lat = selectedLocation?.lat || parseFloat(formData.latitude);
    const lng = selectedLocation?.lng || parseFloat(formData.longitude);
    return `https://www.google.com/maps?q=${lat},${lng}`;
  };

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await getMyProfile(token);
        const profile = (data.profile || {}) as DoctorProfile;

        setFormData({
          username: data.user.username || '',
          email: data.user.email || '',
          fullName: profile.full_name || '',
          specialty: profile.specialty || '',
          licenseNumber: profile.license_number || '',
          bio: profile.bio || '',
          clinicLocation: profile.clinic_location || '',
          latitude: profile.latitude || '',
          longitude: profile.longitude || '',
          phone: profile.phone || '',
          languages: (profile.languages || []).join(', '),
          virtualAvailable: profile.virtual_available ?? true,
          inPersonAvailable: profile.in_person_available ?? true,
        });

        if (profile.latitude && profile.longitude) {
          setSelectedLocation({
            lat: parseFloat(profile.latitude),
            lng: parseFloat(profile.longitude),
            address: profile.clinic_location || `${profile.latitude}, ${profile.longitude}`
          });
          setSearchAddress(profile.clinic_location || '');
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [token]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const languagesArray = formData.languages
        .split(',')
        .map(lang => lang.trim())
        .filter(lang => lang !== '');

      const data = await updateMyProfile(token, {
        username: formData.username,
        email: formData.email,
        fullName: formData.fullName,
        specialty: formData.specialty,
        licenseNumber: formData.licenseNumber,
        bio: formData.bio,
        clinicLocation: formData.clinicLocation,
        latitude: formData.latitude,
        longitude: formData.longitude,
        phone: formData.phone,
        languages: languagesArray,
        virtualAvailable: formData.virtualAvailable,
        inPersonAvailable: formData.inPersonAvailable,
      });

      updateUser({
        username: data.user.username,
        email: data.user.email || '',
        name: (data.profile as DoctorProfile | null)?.full_name || data.user.username,
      });

      toast.success('Profile updated successfully');
      navigate('/doctor/dashboard');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <p className="text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-2xl md:text-3xl font-semibold mb-6">Edit Profile</h1>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Professional Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="specialty">Specialty</Label>
                <Input
                  id="specialty"
                  value={formData.specialty}
                  onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="licenseNumber">License Number</Label>
              <Input
                id="licenseNumber"
                value={formData.licenseNumber}
                onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="languages">Languages (comma-separated)</Label>
              <Input
                id="languages"
                value={formData.languages}
                onChange={(e) => setFormData({ ...formData, languages: e.target.value })}
                placeholder="e.g., English, Spanish, ASL"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Clinic Location</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm text-muted-foreground">
                  {formData.latitude && formData.longitude ? (
                    <>📍 Location set: {parseFloat(formData.latitude).toFixed(6)}, {parseFloat(formData.longitude).toFixed(6)}</>
                  ) : (
                    <>📍 No location set yet</>
                  )}
                </p>
              </div>
              <Button 
                type="button" 
                variant={showMap ? "default" : "outline"}
                onClick={() => setShowMap(!showMap)}
              >
                {showMap ? 'Hide Map' : (formData.latitude && formData.longitude ? 'Edit on Map' : 'Set on Map')}
              </Button>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="address">Clinic Address</Label>
              <Textarea
                id="address"
                value={formData.clinicLocation}
                onChange={(e) => setFormData({ ...formData, clinicLocation: e.target.value })}
                rows={2}
                placeholder="Enter clinic address"
              />
            </div>

            {/* Map Picker */}
            {showMap && (
              <div className="space-y-4 mt-4 border rounded-lg p-4 bg-muted/10">
                <div className="relative">
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Input
                        type="text"
                        placeholder="Search for an address..."
                        value={searchAddress}
                        onChange={handleSearchChange}
                        onKeyPress={(e) => e.key === 'Enter' && searchLocation()}
                        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                      />
                      
                      {/* Autocomplete suggestions dropdown */}
                      {showSuggestions && suggestions.length > 0 && (
                        <div 
                          ref={suggestionsRef}
                          className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto"
                        >
                          {suggestions.map((suggestion, index) => (
                            <button
                              key={index}
                              className="w-full text-left px-4 py-2 hover:bg-muted transition-colors text-sm border-b last:border-0"
                              onClick={() => handleSuggestionSelect(suggestion)}
                              type="button"
                            >
                              <div className="font-medium">{suggestion.display_name.split(',')[0]}</div>
                              <div className="text-xs text-muted-foreground truncate">
                                {suggestion.display_name.split(',').slice(1).join(',').trim()}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button onClick={searchLocation} type="button" variant="secondary">
                      Search
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {viewBounds.minlat ? '📍 Showing results near current map area' : '📍 Pan the map to focus search results'}
                  </p>
                </div>
                
                <div id="map" style={{ height: '400px', width: '100%', borderRadius: '8px', zIndex: 1 }} />
                
                {(selectedLocation || (formData.latitude && formData.longitude)) && (
                  <div className="bg-background p-4 rounded-lg border space-y-3">
                    <h4 className="font-semibold">Selected Location</h4>
                    <p className="text-sm">
                      <span className="font-medium">Address:</span><br />
                      {selectedLocation?.address || formData.clinicLocation || 'Address not set'}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Coordinates:</span><br />
                      Lat: {(selectedLocation?.lat || parseFloat(formData.latitude || '0')).toFixed(6)}<br />
                      Lng: {(selectedLocation?.lng || parseFloat(formData.longitude || '0')).toFixed(6)}
                    </p>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Share with patients:</p>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            window.open(getGoogleMapsLink(), '_blank');
                          }}
                        >
                          Open in Google Maps
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            navigator.clipboard.writeText(getGoogleMapsLink());
                            toast.success('Google Maps link copied!');
                          }}
                        >
                          Copy Link
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
                
                <p className="text-xs text-muted-foreground text-center">
                  Click on the map to set your clinic location • Drag the marker to adjust • Search will prioritize current map area
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Appointment Options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="virtual" className="text-base">Virtual Appointments</Label>
                <p className="text-sm text-muted-foreground">Offer video call appointments</p>
              </div>
              <Switch
                id="virtual"
                checked={formData.virtualAvailable}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, virtualAvailable: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="in-person" className="text-base">In-Person Appointments</Label>
                <p className="text-sm text-muted-foreground">Offer appointments at your clinic</p>
              </div>
              <Switch
                id="in-person"
                checked={formData.inPersonAvailable}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, inPersonAvailable: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="flex-1"
            onClick={() => navigate('/doctor/dashboard')}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            size="lg" 
            className="flex-1" 
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}