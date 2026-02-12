import React, { useEffect, useState } from 'react';
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

export function DoctorProfileEdit() {
  const { token, updateUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    fullName: '',
    specialty: '',
    licenseNumber: '',
    bio: '',
    clinicLocation: '',
    phone: '',
    languages: '',
    virtualAvailable: true,
    inPersonAvailable: true,
  });

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
          phone: profile.phone || '',
          languages: (profile.languages || []).join(', '),
          virtualAvailable: profile.virtual_available ?? true,
          inPersonAvailable: profile.in_person_available ?? true,
        });
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
      const data = await updateMyProfile(token, {
        username: formData.username,
        email: formData.email,
        fullName: formData.fullName,
        specialty: formData.specialty,
        licenseNumber: formData.licenseNumber,
        bio: formData.bio,
        clinicLocation: formData.clinicLocation,
        phone: formData.phone,
        languages: formData.languages,
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

            <div className="space-y-2">
              <Label htmlFor="licenseNumber">License Number</Label>
              <Input
                id="licenseNumber"
                value={formData.licenseNumber}
                onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
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
                value={formData.clinicLocation}
                onChange={(e) => setFormData({ ...formData, clinicLocation: e.target.value })}
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

        <Button onClick={handleSave} size="lg" className="w-full" disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
