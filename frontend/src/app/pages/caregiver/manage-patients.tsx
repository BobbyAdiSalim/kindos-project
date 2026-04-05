/**
 * Manage Patients page — allows caregivers to send link requests to patients
 * by email, view the status of all links (pending/approved/rejected), and
 * remove existing links.
 */
import React, { useEffect, useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { toast } from 'sonner';
import { UserPlus, X, Clock, CheckCircle, XCircle } from 'lucide-react';
import {
  getLinkedPatients,
  sendLinkRequest,
  removeLinkedPatient,
  type LinkedPatient,
} from '@/app/lib/caregiver-api';

const statusIcon = (status: LinkedPatient['status']) => {
  if (status === 'approved') return <CheckCircle className="h-4 w-4 text-green-500" />;
  if (status === 'pending') return <Clock className="h-4 w-4 text-yellow-500" />;
  return <XCircle className="h-4 w-4 text-destructive" />;
};

export function ManagePatients() {
  const [links, setLinks] = useState<LinkedPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [relationship, setRelationship] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const data = await getLinkedPatients();
      setLinks(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load patients.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Please enter a patient email.');
      return;
    }

    try {
      setSubmitting(true);
      await sendLinkRequest(email.trim(), relationship.trim() || undefined);
      toast.success('Link request sent!');
      setEmail('');
      setRelationship('');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (patientId: number) => {
    try {
      await removeLinkedPatient(patientId);
      toast.success('Patient link removed.');
      setLinks((prev) => prev.filter((l) => l.patient_id !== patientId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove link.');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-2xl md:text-3xl font-semibold mb-2">Manage Patients</h1>
      <p className="text-muted-foreground mb-8">Link patient accounts to manage their appointments.</p>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg">Send Link Request</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSendRequest} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="patient-email">Patient Email</Label>
              <Input
                id="patient-email"
                type="email"
                placeholder="patient@example.com"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                required
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="relationship">Relationship (optional)</Label>
              <Input
                id="relationship"
                type="text"
                placeholder="e.g., parent, spouse, child"
                value={relationship}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRelationship(e.target.value)}
                className="h-12"
              />
            </div>
            <Button type="submit" disabled={submitting}>
              <UserPlus className="h-4 w-4 mr-2" />
              {submitting ? 'Sending...' : 'Send Request'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <h2 className="text-lg font-semibold mb-4">Linked Patients</h2>

      {loading && <p className="text-muted-foreground">Loading...</p>}

      {!loading && links.length === 0 && (
        <p className="text-muted-foreground">No linked patients yet.</p>
      )}

      <div className="space-y-3">
        {links.map((link) => (
          <div
            key={link.id}
            className="flex items-center justify-between rounded-md border px-4 py-3"
          >
            <div className="flex items-center gap-3">
              {statusIcon(link.status)}
              <div>
                <p className="text-sm font-medium">{link.patient.full_name}</p>
                <p className="text-xs text-muted-foreground">
                  {link.patient.user.email}
                  {link.relationship && <span> &middot; {link.relationship}</span>}
                  <span> &middot; </span>
                  <span className="capitalize">{link.status}</span>
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleRemove(link.patient_id)}
              aria-label="Remove link"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
