import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Textarea } from '@/app/components/ui/textarea';
import { useAuth } from '@/app/lib/auth-context';
import { format } from 'date-fns';
import { CheckCircle, XCircle, FileText } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/app/components/ui/alert-dialog';

interface VerificationDoctor {
  id: number;
  user_id: number;
  full_name: string;
  specialty: string;
  license_number: string;
  verification_status: 'pending' | 'approved' | 'denied';
  verification_documents: string[];
  updated_at: string;
  email: string | null;
}

interface VerificationHistoryItem {
  id: number;
  action_type: 'doctor_verified' | 'doctor_denied' | 'doctor_resubmitted';
  created_at: string;
  details?: {
    reason?: string | null;
  };
  admin: {
    id: number;
    username: string;
    email: string;
  } | null;
  doctor: {
    id: number;
    user_id: number;
    full_name: string;
    specialty: string;
    license_number: string;
  } | null;
}

export function VerificationQueue() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState<VerificationDoctor[]>([]);
  const [denyReasons, setDenyReasons] = useState<Record<number, string>>({});
  const [historyLoading, setHistoryLoading] = useState(true);
  const [history, setHistory] = useState<VerificationHistoryItem[]>([]);

  useEffect(() => {
    const loadPendingDoctors = async () => {
      if (!token) {
        setLoading(false);
        toast.error('Authentication required.');
        return;
      }

      try {
        const response = await fetch('/api/admin/doctors/unverified?status=pending', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || 'Failed to load pending verifications.');
        }

        setDoctors(data.doctors || []);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load pending verifications.');
      } finally {
        setLoading(false);
      }
    };

    loadPendingDoctors();
  }, [token]);

  useEffect(() => {
    const loadHistory = async () => {
      if (!token) {
        setHistoryLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/admin/doctors/verification-history', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error || 'Failed to load verification history.');
        }
        setHistory(data.history || []);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load verification history.');
      } finally {
        setHistoryLoading(false);
      }
    };

    loadHistory();
  }, [token]);

  const refreshHistory = async () => {
    if (!token) return;

    const response = await fetch('/api/admin/doctors/verification-history', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (response.ok) {
      setHistory(data.history || []);
    }
  };

  const updateDoctorStatus = async (doctorId: number, status: 'approved' | 'denied', reason?: string) => {
    if (!token) {
      toast.error('Authentication required.');
      return;
    }

    const response = await fetch(`/api/admin/doctors/${doctorId}/verification`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status, reason }),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error || 'Failed to update verification status.');
    }
  };

  const handleApprove = async (id: number) => {
    try {
      await updateDoctorStatus(id, 'approved');
      setDoctors((prev) => prev.filter((doctor) => doctor.id !== id));
      await refreshHistory();
      toast.success('Doctor approved successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to approve doctor.');
    }
  };

  const handleDeny = async (id: number) => {
    const reason = String(denyReasons[id] || '').trim();
    if (!reason) {
      toast.error('Please provide a rejection reason.');
      return;
    }

    try {
      await updateDoctorStatus(id, 'denied', reason);
      setDoctors((prev) => prev.filter((doctor) => doctor.id !== id));
      setDenyReasons((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      await refreshHistory();
      toast.success('Application denied');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to deny doctor.');
    }
  };

  const handleViewDocuments = (doctor: VerificationDoctor) => {
    if (!doctor.verification_documents.length) {
      toast.info('No verification documents uploaded yet.');
      return;
    }

    window.open(doctor.verification_documents[0], '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <Button variant="ghost" className="mb-3 px-0" onClick={() => navigate('/admin/dashboard')}>
        ← Back to Dashboard
      </Button>

      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-semibold mb-2">
          Doctor Verification Queue
        </h1>
        <p className="text-muted-foreground">
          Review and approve pending doctor applications
        </p>
      </div>

      <div className="space-y-4">
        {loading ? (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              Loading pending verifications...
            </CardContent>
          </Card>
        ) : doctors.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <h3 className="font-semibold mb-2">All caught up!</h3>
              <p className="text-muted-foreground">
                No pending doctor verifications at this time
              </p>
            </CardContent>
          </Card>
        ) : (
          doctors.map((doctor) => (
            <Card key={doctor.id}>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">{doctor.full_name}</h3>
                        <p className="text-muted-foreground">{doctor.specialty}</p>
                      </div>
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                        Pending
                      </Badge>
                    </div>

                    <div className="grid md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Email</p>
                        <p className="font-medium">{doctor.email || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">License Number</p>
                        <p className="font-medium">{doctor.license_number}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Last Updated</p>
                        <p className="font-medium">
                          {format(new Date(doctor.updated_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex md:flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 md:flex-none"
                      onClick={() => handleViewDocuments(doctor)}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      View Documents
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" className="flex-1 md:flex-none">
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Approve Doctor?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will verify {doctor.full_name} and allow them to accept patient appointments.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleApprove(doctor.id)}>
                            Approve
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="flex-1 md:flex-none">
                          <XCircle className="h-4 w-4 mr-2" />
                          Deny
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Deny Application?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will reject {doctor.full_name}'s application. This action cannot be undone.
                          </AlertDialogDescription>
                          <div className="space-y-2 pt-2">
                            <p className="text-sm font-medium">Rejection reason</p>
                            <Textarea
                              value={denyReasons[doctor.id] || ''}
                              onChange={(event) =>
                                setDenyReasons((prev) => ({
                                  ...prev,
                                  [doctor.id]: event.target.value,
                                }))
                              }
                              placeholder="Explain why the application is rejected..."
                              rows={3}
                            />
                          </div>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeny(doctor.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Deny
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-3">Verification History</h2>
        {historyLoading ? (
          <Card>
            <CardContent className="p-6 text-muted-foreground">Loading verification history...</CardContent>
          </Card>
        ) : history.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-muted-foreground">No verification actions recorded yet.</CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {history.map((item) => (
              <Card key={item.id}>
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div>
                      <p className="font-medium">{item.doctor?.full_name || 'Unknown doctor'}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.doctor?.specialty || 'Unknown specialty'} • License {item.doctor?.license_number || 'N/A'}
                      </p>
                      {item.action_type === 'doctor_denied' && item.details?.reason ? (
                        <p className="text-sm text-destructive">Reason: {item.details.reason}</p>
                      ) : null}
                      <p className="text-xs text-muted-foreground">
                        By {item.admin?.username || 'System'} on {format(new Date(item.created_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className={
                        item.action_type === 'doctor_verified'
                          ? 'bg-green-100 text-green-800'
                          : item.action_type === 'doctor_denied'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-blue-100 text-blue-800'
                      }
                    >
                      {item.action_type === 'doctor_verified'
                        ? 'Approved'
                        : item.action_type === 'doctor_denied'
                          ? 'Denied'
                          : 'Resubmitted'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
