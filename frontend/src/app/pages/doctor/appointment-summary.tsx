import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { Textarea } from '@/app/components/ui/textarea';
import { toast } from 'sonner';
import { useAuth } from '@/app/lib/auth-context';
import {
  getAppointmentById,
  saveSummary,
  markAppointmentComplete,
  type AppointmentRecord,
} from '@/app/lib/appointment-api';

export function AppointmentSummary() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [summary, setSummary] = useState('');
  const [appointment, setAppointment] = useState<AppointmentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadAppointment = async () => {
      if (!id || !token) {
        setLoading(false);
        setError('Appointment not found.');
        return;
      }

      try {
        setLoading(true);
        const data = await getAppointmentById(token, id);
        setAppointment(data);
        if (data.summary) {
          setSummary(data.summary);
        }
        setError('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load appointment.');
        setAppointment(null);
      } finally {
        setLoading(false);
      }
    };

    loadAppointment();
  }, [id, token]);

  const handleSave = async () => {
    if (!token || !id || !summary.trim()) {
      toast.error('Please enter a visit summary.');
      return;
    }

    try {
      setSaving(true);
      await saveSummary(token, id, summary);
      await markAppointmentComplete(token, id);
      toast.success('Summary saved and appointment marked as complete.');
      navigate('/doctor/dashboard');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save summary.');
    } finally {
      setSaving(false);
    }
  };


  if (loading) {
    return <div className="container mx-auto px-4 py-12 text-center">Loading appointment details...</div>;
  }

  if (!appointment) {
    return <div className="container mx-auto px-4 py-12 text-center">{error || 'Appointment not found.'}</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
        ← Back
      </Button>

      <h1 className="text-2xl md:text-3xl font-semibold mb-6">Mark Appointment as Complete</h1>

      <Card>
        <CardContent className="space-y-6 pt-6">
          <Textarea
            id="summary"
            placeholder="Brief summary of the visit..."
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={6}
          />

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
            <p className="text-blue-900">
              <strong>Note:</strong> This summary will be stored in the appointment record.
            </p>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate(-1)} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !summary.trim()}
              className="flex-1"
            >
              {saving ? 'Saving...' : 'Save Summary'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
