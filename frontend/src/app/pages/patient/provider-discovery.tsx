import React, { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { DoctorCard } from '@/app/components/doctor-card';
import { mockDoctors, careTypes } from '@/app/lib/mock-data';
import { Search, SlidersHorizontal, Map } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/app/components/ui/sheet';

export function ProviderDiscovery() {
  const [searchQuery, setSearchQuery] = useState('');
  const [careTypeFilter, setCareTypeFilter] = useState('all');
  const [appointmentTypeFilter, setAppointmentTypeFilter] = useState('all');
  const [languageFilter, setLanguageFilter] = useState('all');

  const filteredDoctors = mockDoctors.filter(doctor => {
    const matchesSearch = doctor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doctor.specialty.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesAppointmentType = appointmentTypeFilter === 'all' ||
      (appointmentTypeFilter === 'virtual' && doctor.virtualAvailable) ||
      (appointmentTypeFilter === 'in-person' && doctor.inPersonAvailable);
    
    const matchesLanguage = languageFilter === 'all' ||
      doctor.languages.includes(languageFilter);
    
    return matchesSearch && matchesAppointmentType && matchesLanguage;
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-semibold mb-2">Find Your Provider</h1>
        <p className="text-muted-foreground">
          Browse verified healthcare providers that match your needs
        </p>
      </div>

      {/* Search and Filters */}
      <div className="bg-card border rounded-lg p-4 mb-6 space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search by name or specialty..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12"
            />
          </div>
          
          <div className="flex gap-2">
            <Link to="/patient/providers/map" className="md:min-w-[140px]">
              <Button variant="outline" className="h-12 w-full">
                <Map className="h-4 w-4 mr-2" />
                Map View
              </Button>
            </Link>

            {/* Mobile Filters */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="h-12 md:hidden">
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  Filters
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-6">
                  <div className="space-y-2">
                    <Label>Appointment Type</Label>
                    <Select value={appointmentTypeFilter} onValueChange={setAppointmentTypeFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="virtual">Virtual Only</SelectItem>
                        <SelectItem value="in-person">In-Person Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Language</Label>
                    <Select value={languageFilter} onValueChange={setLanguageFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Languages</SelectItem>
                        <SelectItem value="English">English</SelectItem>
                        <SelectItem value="Spanish">Spanish</SelectItem>
                        <SelectItem value="Mandarin">Mandarin</SelectItem>
                        <SelectItem value="ASL">ASL</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Desktop Filters */}
        <div className="hidden md:grid md:grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label htmlFor="careType">Care Type</Label>
            <Select value={careTypeFilter} onValueChange={setCareTypeFilter}>
              <SelectTrigger id="careType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Care Types</SelectItem>
                {careTypes.map(type => (
                  <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="appointmentType">Appointment Type</Label>
            <Select value={appointmentTypeFilter} onValueChange={setAppointmentTypeFilter}>
              <SelectTrigger id="appointmentType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="virtual">Virtual Only</SelectItem>
                <SelectItem value="in-person">In-Person Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="language">Language</Label>
            <Select value={languageFilter} onValueChange={setLanguageFilter}>
              <SelectTrigger id="language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Languages</SelectItem>
                <SelectItem value="English">English</SelectItem>
                <SelectItem value="Spanish">Spanish</SelectItem>
                <SelectItem value="Mandarin">Mandarin</SelectItem>
                <SelectItem value="ASL">ASL</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">
            {filteredDoctors.length} Provider{filteredDoctors.length !== 1 ? 's' : ''} Found
          </h2>
        </div>

        {filteredDoctors.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              No providers match your search criteria. Try adjusting your filters.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredDoctors.map(doctor => (
              <DoctorCard key={doctor.id} doctor={doctor} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
