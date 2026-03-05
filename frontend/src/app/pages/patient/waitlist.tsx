import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { format } from 'date-fns';
import { Bell, Calendar, Clock, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { useAuth } from '@/app/lib/auth-context';
import {
  getMyWaitlistEntries,
  removeMyWaitlistEntry,
  type WaitlistEntry,
} from '@/app/lib/waitlist-api';
import { formatTime24to12 } from '@/app/lib/availability-api';
import { toast } from 'sonner';

const waitlistStatusStyles: Record<string, string> = {
  active: 'bg-amber-100 text-amber-900',
  notified: 'bg-blue-100 text-blue-900',
  booked: 'bg-emerald-100 text-emerald-900',
  removed: 'bg-slate-200 text-slate-800',
};

const waitlistStatusLabels: Record<string, string> = {
  active: 'Active',
  notified: 'Notified',
  booked: 'Booked',
  removed: 'Removed',
};

const parseDateOnlyLocal = (value: string) => new Date(`${value}T00:00:00`);

export function JoinWaitlist() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingEntryId, setRemovingEntryId] = useState<number | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadEntries = async () => {
      if (!token) {
        setLoading(false);
        setEntries([]);
        return;
      }

      try {
        setLoading(true);
        setError('');
        const data = await getMyWaitlistEntries(token);
        setEntries(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load waitlist entries.');
        setEntries([]);
      } finally {
        setLoading(false);
      }
    };

    loadEntries();
  }, [token]);

  const handleRemove = async (entry: WaitlistEntry) => {
    if (!token) return;

    try {
      setRemovingEntryId(entry.id);
      await removeMyWaitlistEntry(token, entry.id);
      setEntries((prev) => prev.filter((candidate) => candidate.id !== entry.id));
      toast.success('Waitlist entry removed.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove waitlist entry.');
    } finally {
      setRemovingEntryId(null);
    }
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <Button variant="ghost" onClick={() => navigate('/patient/dashboard')} className="mb-4">
        Back to Dashboard
      </Button>

      <Card className="mb-6 border-amber-200 bg-gradient-to-r from-amber-50/70 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-900">
            <Bell className="h-5 w-5" />
            My Waitlist
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-amber-900">
          When a matching patient appointment is cancelled, the earliest active waitlist request is auto-booked.
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center p-12 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading waitlist entries...
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="space-y-4 p-12 text-center">
            <p className="text-muted-foreground">{error}</p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : entries.length === 0 ? (
        <Card>
          <CardContent className="space-y-4 p-12 text-center">
            <Bell className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="font-medium">No active waitlist entries</p>
            <p className="text-sm text-muted-foreground">
              Choose a provider and join a booked slot waitlist from the booking page.
            </p>
            <Link to="/patient/providers">
              <Button>Browse Providers</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => (
            <Card key={entry.id}>
              <CardContent className="p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{entry.doctor?.full_name || 'Doctor'}</p>
                      <Badge className={waitlistStatusStyles[entry.status] || waitlistStatusStyles.active}>
                        {waitlistStatusLabels[entry.status] || entry.status}
                      </Badge>
                      <Badge variant="outline">
                        {entry.appointment_type === 'virtual' ? 'Virtual' : 'In-Person'}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {format(parseDateOnlyLocal(entry.desired_date), 'MMMM d, yyyy')}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {formatTime24to12(entry.desired_start_time)}
                      </span>
                      <span>Notify: {entry.notification_preference}</span>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemove(entry)}
                    disabled={removingEntryId === entry.id}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {removingEntryId === entry.id ? 'Removing...' : 'Remove'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
