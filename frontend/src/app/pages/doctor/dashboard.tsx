// Doctor pages
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { AppointmentCard } from '@/app/components/appointment-card';
import { mockAppointments } from '@/app/lib/mock-data';
import { Calendar, Settings, Clock, AlertCircle, MessageSquare } from 'lucide-react';
import { useAuth } from '@/app/lib/auth-context';
import { toast } from 'sonner';

export function DoctorDashboard() {
  const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
  const { user, token, updateUser } = useAuth();
  const isVerified = user?.verified === true;
  const upcomingAppointments = mockAppointments.filter(apt => apt.status === 'upcoming');
  const pastAppointments = mockAppointments.filter(apt => apt.status === 'completed');
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [formData, setFormData] = useState({
    fullName: '',
    specialty: '',
    licenseNumber: '',
    clinicAddress: '',
  });
  const [verificationDocumentName, setVerificationDocumentName] = useState('');
  const [verificationDocumentDataUrl, setVerificationDocumentDataUrl] = useState('');

  const fileToDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Failed to read file.'));
      reader.readAsDataURL(file);
    });

  useEffect(() => {
    const loadMyDoctorProfile = async () => {
      if (!token) {
        setLoadingProfile(false);
        return;
      }

      try {
        const response = await fetch('/api/profile/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || 'Failed to load doctor profile.');
        }

        setFormData({
          fullName: data?.profile?.full_name || '',
          specialty: data?.profile?.specialty || '',
          licenseNumber: data?.profile?.license_number || '',
          clinicAddress: data?.profile?.clinic_location || '',
        });

        const lastRejectionReason =
          data?.profile?.verification_status === 'denied'
            ? data?.profile?.rejection_reason || 'Your previous application was rejected. Please update and resubmit your documents.'
            : '';
        setRejectionReason(lastRejectionReason);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load profile');
      } finally {
        setLoadingProfile(false);
      }
    };

    loadMyDoctorProfile();
  }, [token]);

  const handleVerificationDocumentChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setVerificationDocumentDataUrl('');
      setVerificationDocumentName('');
      return;
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error('File must be 5MB or smaller.');
      event.target.value = '';
      setVerificationDocumentDataUrl('');
      setVerificationDocumentName('');
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);
      setVerificationDocumentDataUrl(dataUrl);
      setVerificationDocumentName(file.name);
    } catch {
      toast.error('Failed to read selected document.');
      setVerificationDocumentDataUrl('');
      setVerificationDocumentName('');
    }
  };

  const handleResubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      toast.error('Authentication required.');
      return;
    }

    if (!formData.fullName || !formData.specialty || !formData.licenseNumber || !verificationDocumentDataUrl) {
      toast.error('Please fill all required fields and upload a verification document.');
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch('/api/doctor/verification/resubmit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName: formData.fullName,
          specialty: formData.specialty,
          licenseNumber: formData.licenseNumber,
          clinicAddress: formData.clinicAddress,
          verificationDocuments: [verificationDocumentDataUrl],
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to resubmit verification.');
      }

      updateUser({
        name: formData.fullName,
        verified: false,
        verificationStatus: 'pending',
      });
      setVerificationDocumentDataUrl('');
      setVerificationDocumentName('');
      setRejectionReason('');
      toast.success('Application resubmitted successfully.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to resubmit verification.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isVerified) {
    const isDenied = user?.verificationStatus === 'denied';

    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-2xl md:text-3xl font-semibold mb-6">Doctor Dashboard</h1>
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <div className="mx-auto h-14 w-14 rounded-full bg-yellow-100 flex items-center justify-center">
              <AlertCircle className="h-7 w-7 text-yellow-700" />
            </div>
            {loadingProfile ? (
              <p className="text-muted-foreground">Loading verification status...</p>
            ) : isDenied ? (
              <div className="space-y-6 text-left">
                <div className="text-center">
                  <h2 className="text-xl font-semibold">Verification Rejected</h2>
                  <p className="text-muted-foreground mt-2">
                    Your previous verification was rejected. Update your application and resubmit.
                  </p>
                  {rejectionReason ? (
                    <p className="text-sm text-destructive mt-2">{rejectionReason}</p>
                  ) : null}
                </div>

                <form className="space-y-4" onSubmit={handleResubmit}>
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={formData.fullName}
                      onChange={(event) => setFormData((prev) => ({ ...prev, fullName: event.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="specialty">Medical Specialty</Label>
                    <Input
                      id="specialty"
                      value={formData.specialty}
                      onChange={(event) => setFormData((prev) => ({ ...prev, specialty: event.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="licenseNumber">Medical License Number</Label>
                    <Input
                      id="licenseNumber"
                      value={formData.licenseNumber}
                      onChange={(event) => setFormData((prev) => ({ ...prev, licenseNumber: event.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clinicAddress">Clinic Address (Optional)</Label>
                    <Textarea
                      id="clinicAddress"
                      value={formData.clinicAddress}
                      onChange={(event) => setFormData((prev) => ({ ...prev, clinicAddress: event.target.value }))}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="verificationDocument">Verification Document (Required, max 5MB)</Label>
                    <Input
                      id="verificationDocument"
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.webp"
                      onChange={handleVerificationDocumentChange}
                      required
                    />
                    {verificationDocumentName ? (
                      <p className="text-xs text-muted-foreground">Selected: {verificationDocumentName}</p>
                    ) : null}
                  </div>
                  <Button type="submit" disabled={submitting} className="w-full">
                    {submitting ? 'Submitting...' : 'Resubmit Application'}
                  </Button>
                </form>
              </div>
            ) : (
              <div className="space-y-2 text-center">
                <h2 className="text-xl font-semibold">Verification Pending</h2>
                <p className="text-muted-foreground">
                  Your account is under review by the system administrator. Appointment and scheduling features are
                  disabled until verification is approved.
                </p>
                <Button disabled>Waiting for Admin Approval</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold mb-2">My Schedule</h1>
          <p className="text-muted-foreground">Manage your appointments</p>
        </div>
        <div className="flex gap-2">
          <Link to="/doctor/availability">
            <Button variant="outline">
              <Clock className="h-4 w-4 mr-2" />
              Availability
            </Button>
          </Link>
          <Link to="/doctor/messages">
            <Button variant="outline">
              <MessageSquare className="h-4 w-4 mr-2" />
              Messages
            </Button>
          </Link>
          <Link to="/doctor/profile">
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Profile
            </Button>
          </Link>
        </div>
      </div>

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="w-full md:w-auto">
          <TabsTrigger value="upcoming" className="flex-1 md:flex-none">
            <Calendar className="h-4 w-4 mr-2" />
            Upcoming ({upcomingAppointments.length})
          </TabsTrigger>
          <TabsTrigger value="past" className="flex-1 md:flex-none">
            Past ({pastAppointments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-6 space-y-4">
          {upcomingAppointments.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                No upcoming appointments
              </CardContent>
            </Card>
          ) : (
            upcomingAppointments.map(appointment => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                userRole="doctor"
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="past" className="mt-6 space-y-4">
          {pastAppointments.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                No past appointments
              </CardContent>
            </Card>
          ) : (
            pastAppointments.map(appointment => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                userRole="doctor"
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
