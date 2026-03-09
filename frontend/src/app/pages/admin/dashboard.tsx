import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { useAuth } from '@/app/lib/auth-context';
import { Users, CheckCircle, BarChart3, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface UnverifiedDoctor {
  id: number;
  user_id: number;
  full_name: string;
  specialty: string;
  license_number: string;
  verification_status: 'pending' | 'approved' | 'denied';
  updated_at: string;
  email: string | null;
}

export function AdminDashboard() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unverifiedDoctors, setUnverifiedDoctors] = useState<UnverifiedDoctor[]>([]);

  useEffect(() => {
    const loadUnverifiedDoctors = async () => {
      if (!token) {
        setError('Authentication required.');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/admin/doctors/unverified', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || 'Failed to load unverified doctors.');
        }

        setUnverifiedDoctors(data.doctors || []);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load unverified doctors.');
      } finally {
        setLoading(false);
      }
    };

    loadUnverifiedDoctors();
  }, [token]);

  const pendingCount = useMemo(
    () => unverifiedDoctors.filter((doctor) => doctor.verification_status === 'pending').length,
    [unverifiedDoctors]
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <h1 className="text-2xl md:text-3xl font-semibold mb-8">Admin Dashboard</h1>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Verifications</p>
                <p className="text-3xl font-semibold mt-2">{pendingCount}</p>
              </div>
              <AlertCircle className="h-10 w-10 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Verified Doctors</p>
                <p className="text-3xl font-semibold mt-2">4</p>
              </div>
              <CheckCircle className="h-10 w-10 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Patients</p>
                <p className="text-3xl font-semibold mt-2">1,247</p>
              </div>
              <Users className="h-10 w-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Bookings</p>
                <p className="text-3xl font-semibold mt-2">1,247</p>
              </div>
              <BarChart3 className="h-10 w-10 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Doctor Verifications</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Review and approve pending doctor registration requests
            </p>
            <Link to="/admin/verification">
              <Button>Review Pending ({pendingCount})</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              View booking statistics and platform analytics
            </p>
            <Link to="/admin/analytics">
              <Button variant="outline">View Analytics</Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Doctors Not Verified Yet</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading doctors...</p>
          ) : error ? (
            <p className="text-destructive">{error}</p>
          ) : unverifiedDoctors.length === 0 ? (
            <p className="text-muted-foreground">All doctors are currently verified.</p>
          ) : (
            <div className="space-y-3">
              {unverifiedDoctors.map((doctor) => (
                <div key={doctor.id} className="rounded-md border p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-medium">{doctor.full_name}</p>
                      <p className="text-sm text-muted-foreground">{doctor.specialty}</p>
                      <p className="text-sm text-muted-foreground">{doctor.email || 'No email available'}</p>
                      <p className="text-sm text-muted-foreground">License: {doctor.license_number}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={
                          doctor.verification_status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }
                      >
                        {doctor.verification_status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Updated {format(new Date(doctor.updated_at), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
