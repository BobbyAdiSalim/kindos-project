import React, { useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Switch } from '@/app/components/ui/switch';
import { toast } from 'sonner';

export function DoctorProfileEdit() {
  const [formData, setFormData] = useState({
    name: 'Dr. Sarah Chen',
    specialty: 'Family Medicine',
    bio: 'Board-certified family physician with 15+ years of experience.',
    clinicAddress: '123 Main St, Suite 200, Seattle, WA 98101',
    phone: '(206) 555-0100',
    languages: 'English, Mandarin, ASL',
    virtualAvailable: true,
    inPersonAvailable: true,
  });

  const handleSave = () => {
    toast.success('Profile updated successfully');
  };

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
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="specialty">Medical Specialty</Label>
              <Input
                id="specialty"
                value={formData.specialty}
                onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
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
              <Label htmlFor="languages">Languages</Label>
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
            <CardTitle>Clinic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">Clinic Address</Label>
              <Textarea
                id="address"
                value={formData.clinicAddress}
                onChange={(e) => setFormData({ ...formData, clinicAddress: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Clinic Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Appointment Options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="virtual">Offer Virtual Appointments</Label>
                <p className="text-sm text-muted-foreground">Video call appointments</p>
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
                <Label htmlFor="in-person">Offer In-Person Appointments</Label>
                <p className="text-sm text-muted-foreground">At your clinic</p>
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

        <Button onClick={handleSave} size="lg" className="w-full">
          Save Changes
        </Button>
      </div>
    </div>
  );
}
