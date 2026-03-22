import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/app/components/ui/chart';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { useAuth } from '@/app/lib/auth-context';

type TimeframeOption = '7d' | '30d' | '90d' | '365d' | 'all';

interface AppointmentRejectionReason {
  code: string;
  label: string;
  count: number;
}

interface AppointmentRejectionAnalyticsResponse {
  timeframe: TimeframeOption;
  date_range: {
    start: string;
    end: string;
  } | null;
  summary: {
    total_declined_appointments: number;
    unique_reason_count: number;
    top_reason: AppointmentRejectionReason | null;
  };
  reasons: AppointmentRejectionReason[];
}

const timeframeLabels: Record<TimeframeOption, string> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  '365d': 'Last 12 months',
  all: 'All time',
};

const chartConfig = {
  count: {
    label: 'Declined appointments',
    color: '#4A7C7E',
  },
} satisfies ChartConfig;

export function Analytics() {
  const { token } = useAuth();
  const [timeframe, setTimeframe] = useState<TimeframeOption>('30d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [analytics, setAnalytics] = useState<AppointmentRejectionAnalyticsResponse | null>(null);

  useEffect(() => {
    const loadAnalytics = async () => {
      if (!token) {
        setError('Authentication required.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');

        const response = await fetch(`/api/admin/analytics/appointment-rejections?timeframe=${timeframe}`, {
          credentials: 'include',
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || 'Failed to load analytics.');
        }

        setAnalytics(data as AppointmentRejectionAnalyticsResponse);
      } catch (loadError) {
        setAnalytics(null);
        setError(loadError instanceof Error ? loadError.message : 'Failed to load analytics.');
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [timeframe, token]);

  const chartData = useMemo(
    () => (analytics?.reasons || []).map((reason) => ({
      reason: reason.label,
      count: reason.count,
    })),
    [analytics]
  );

  const dateRangeLabel = analytics?.date_range
    ? `${analytics.date_range.start} to ${analytics.date_range.end}`
    : 'All recorded data';

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold mb-2">
            Analytics Dashboard
          </h1>
          <p className="text-muted-foreground">
            Review appointment rejection trends and common doctor decline reasons.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select value={timeframe} onValueChange={(value) => setTimeframe(value as TimeframeOption)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select timeframe" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(timeframeLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Link to="/admin/dashboard">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Declined Appointments</p>
            <p className="text-3xl font-semibold mt-2">
              {loading ? '...' : analytics?.summary.total_declined_appointments ?? 0}
            </p>
            <p className="text-xs text-muted-foreground mt-2">{timeframeLabels[timeframe]}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Reason Categories Used</p>
            <p className="text-3xl font-semibold mt-2">
              {loading ? '...' : analytics?.summary.unique_reason_count ?? 0}
            </p>
            <p className="text-xs text-muted-foreground mt-2">{dateRangeLabel}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Most Common Reason</p>
            <p className="text-xl font-semibold mt-2">
              {loading ? 'Loading...' : analytics?.summary.top_reason?.label || 'No data'}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {analytics?.summary.top_reason ? `${analytics.summary.top_reason.count} declines` : 'No declined appointments in this timeframe'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Appointment Rejection Reasons</CardTitle>
          <p className="text-sm text-muted-foreground">
            Counts of doctor-declined appointments grouped by selected rejection reason.
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-[320px] flex items-center justify-center text-sm text-muted-foreground">
              Loading analytics...
            </div>
          ) : error ? (
            <div className="h-[320px] flex flex-col items-center justify-center gap-4 text-center">
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Retry
              </Button>
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-[320px] flex items-center justify-center text-sm text-muted-foreground">
              No declined appointments found for {timeframeLabels[timeframe].toLowerCase()}.
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="h-[320px] w-full">
              <BarChart data={chartData} margin={{ left: 12, right: 12, top: 12 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="reason"
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={72}
                />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                <ChartTooltip
                  cursor={false}
                  content={(
                    <ChartTooltipContent
                      labelFormatter={(_value, payload) => payload?.[0]?.payload?.reason || 'Decline reason'}
                      formatter={(value) => (
                        <div className="flex min-w-[8rem] items-center justify-between gap-3">
                          <span className="text-muted-foreground">Count</span>
                          <span className="font-mono font-medium tabular-nums text-foreground">
                            {Number(value).toLocaleString()}
                          </span>
                        </div>
                      )}
                    />
                  )}
                />
                <Bar
                  dataKey="count"
                  fill="var(--color-count)"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
