import React, { useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { DoctorCard } from '@/app/components/doctor-card';
import { mockDoctors } from '@/app/lib/mock-data';
import { Map as MapIcon, List } from 'lucide-react';
import { Link } from 'react-router';

export function ProviderMap() {
  const [radiusFilter, setRadiusFilter] = useState('10');

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-semibold">Provider Map</h1>
        <Link to="/patient/providers">
          <Button variant="outline">
            <List className="h-4 w-4 mr-2" />
            List View
          </Button>
        </Link>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Map Panel */}
        <div className="lg:col-span-2">
          <Card className="h-[600px] overflow-hidden">
            <CardContent className="p-0 h-full bg-muted flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <MapIcon className="h-16 w-16 mx-auto mb-4" />
                <p>Interactive map view</p>
                <p className="text-sm mt-2">Showing providers near Seattle, WA</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* List Panel */}
        <div className="lg:col-span-1">
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="space-y-3">
                <Input placeholder="Search location..." />
                <Select value={radiusFilter} onValueChange={setRadiusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">Within 5 miles</SelectItem>
                    <SelectItem value="10">Within 10 miles</SelectItem>
                    <SelectItem value="25">Within 25 miles</SelectItem>
                    <SelectItem value="50">Within 50 miles</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" className="w-full">
                  Use My Location
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3 max-h-[480px] overflow-y-auto">
            {mockDoctors.map(doctor => (
              <DoctorCard key={doctor.id} doctor={doctor} showBookButton={false} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
