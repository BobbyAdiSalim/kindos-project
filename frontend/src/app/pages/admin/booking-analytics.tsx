import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
  Pie,
  PieChart,
  Cell,
} from 'recharts';
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

interface StatusBreakdown {
  status: string;
  count: number;
}

interface TypeBreakdown {
  type: string;
  count: number;
}

interface DailyTrend {
  date: string;
  total: number;
  completed: number;
  cancelled: number;
}

interface TopDoctor {
  doctor_id: number;
  full_name: string;
  specialty: string;
  total: number;
  completed: number;
}

interface PeakHour {
  hour: number;
  label: string;
  count: number;
}

interface PeakDay {
  day: number;
  label: string;
  count: number;
}

interface CancellationByRole {
  role: string;
  count: number;
}

interface RejectionReason {
  reason: string;
  count: number;
}

interface CancellationInsights {
  total_cancelled: number;
  by_role: CancellationByRole[];
  doctor_rejection_reasons: RejectionReason[];
}

interface BookingAnalyticsResponse {
  timeframe: TimeframeOption;
  date_range: { start: string; end: string } | null;
  summary: {
    total_appointments: number;
    completion_rate: number;
    cancellation_rate: number;
    no_show_rate: number;
  };
  status_breakdown: StatusBreakdown[];
  type_breakdown: TypeBreakdown[];
  daily_trends: DailyTrend[];
  top_doctors: TopDoctor[];
  peak_hours: PeakHour[];
  peak_days: PeakDay[];
  cancellation_insights: CancellationInsights;
}

const timeframeLabels: Record<TimeframeOption, string> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  '365d': 'Last 12 months',
  all: 'All time',
};

const STATUS_COLORS: Record<string, string> = {
  scheduled: '#3b82f6',
  confirmed: '#8b5cf6',
  completed: '#22c55e',
  cancelled: '#ef4444',
  'no-show': '#f59e0b',
};

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Scheduled',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  'no-show': 'No-show',
};

const TYPE_COLORS = ['#4A7C7E', '#E8927C'];

const statusChartConfig = {
  count: { label: 'Appointments' },
  scheduled: { label: 'Scheduled', color: STATUS_COLORS.scheduled },
  confirmed: { label: 'Confirmed', color: STATUS_COLORS.confirmed },
  completed: { label: 'Completed', color: STATUS_COLORS.completed },
  cancelled: { label: 'Cancelled', color: STATUS_COLORS.cancelled },
  'no-show': { label: 'No-show', color: STATUS_COLORS['no-show'] },
} satisfies ChartConfig;

const trendChartConfig = {
  total: { label: 'Total', color: '#4A7C7E' },
  completed: { label: 'Completed', color: '#22c55e' },
  cancelled: { label: 'Cancelled', color: '#ef4444' },
} satisfies ChartConfig;

const typeChartConfig = {
  count: { label: 'Appointments' },
  virtual: { label: 'Virtual', color: TYPE_COLORS[0] },
  'in-person': { label: 'In-person', color: TYPE_COLORS[1] },
} satisfies ChartConfig;

const peakHoursChartConfig = {
  count: { label: 'Appointments', color: '#6366f1' },
} satisfies ChartConfig;

const peakDaysChartConfig = {
  count: { label: 'Appointments', color: '#8b5cf6' },
} satisfies ChartConfig;

const ROLE_COLORS: Record<string, string> = {
  Patient: '#f59e0b',
  Doctor: '#ef4444',
  Unknown: '#94a3b8',
};

const cancellationByRoleConfig = {
  count: { label: 'Cancellations' },
  Patient: { label: 'Patient', color: ROLE_COLORS.Patient },
  Doctor: { label: 'Doctor', color: ROLE_COLORS.Doctor },
  Unknown: { label: 'Unknown', color: ROLE_COLORS.Unknown },
} satisfies ChartConfig;

const rejectionReasonConfig = {
  count: { label: 'Count', color: '#ef4444' },
} satisfies ChartConfig;

export function BookingAnalytics() {
  const { token } = useAuth();
  const [timeframe, setTimeframe] = useState<TimeframeOption>('30d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [analytics, setAnalytics] = useState<BookingAnalyticsResponse | null>(null);

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

        const response = await fetch(`/api/admin/analytics/bookings?timeframe=${timeframe}`, {
          credentials: 'include',
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || 'Failed to load analytics.');
        }

        setAnalytics(data as BookingAnalyticsResponse);
      } catch (loadError) {
        setAnalytics(null);
        setError(loadError instanceof Error ? loadError.message : 'Failed to load analytics.');
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [timeframe, token]);

  const statusChartData = useMemo(
    () =>
      (analytics?.status_breakdown || []).map((item) => ({
        status: STATUS_LABELS[item.status] || item.status,
        count: item.count,
        fill: STATUS_COLORS[item.status] || '#94a3b8',
      })),
    [analytics]
  );

  const typeChartData = useMemo(
    () =>
      (analytics?.type_breakdown || []).map((item, i) => ({
        type: item.type === 'in-person' ? 'In-person' : 'Virtual',
        count: item.count,
        fill: TYPE_COLORS[i] || '#94a3b8',
      })),
    [analytics]
  );

  const trendData = useMemo(
    () =>
      (analytics?.daily_trends || []).map((d) => ({
        date: d.date,
        total: d.total,
        completed: d.completed,
        cancelled: d.cancelled,
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
          <h1 className="text-2xl md:text-3xl font-semibold mb-2">Booking Analytics</h1>
          <p className="text-muted-foreground">
            Monitor appointment trends, completion rates, and system usage.
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
          <Link to="/admin/analytics">
            <Button variant="outline">Rejection Analytics</Button>
          </Link>
          <Link to="/admin/dashboard">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Total Appointments</p>
            <p className="text-3xl font-semibold mt-2">
              {loading ? '...' : (analytics?.summary.total_appointments ?? 0).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-2">{timeframeLabels[timeframe]}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Completion Rate</p>
            <p className="text-3xl font-semibold mt-2 text-green-600">
              {loading ? '...' : `${analytics?.summary.completion_rate ?? 0}%`}
            </p>
            <p className="text-xs text-muted-foreground mt-2">{dateRangeLabel}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Cancellation Rate</p>
            <p className="text-3xl font-semibold mt-2 text-red-500">
              {loading ? '...' : `${analytics?.summary.cancellation_rate ?? 0}%`}
            </p>
            <p className="text-xs text-muted-foreground mt-2">{dateRangeLabel}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">No-show Rate</p>
            <p className="text-3xl font-semibold mt-2 text-amber-500">
              {loading ? '...' : `${analytics?.summary.no_show_rate ?? 0}%`}
            </p>
            <p className="text-xs text-muted-foreground mt-2">{dateRangeLabel}</p>
          </CardContent>
        </Card>
      </div>

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
      ) : (
        <>
          {/* Status breakdown + Type breakdown row */}
          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle>Appointments by Status</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Distribution of appointment outcomes.
                </p>
              </CardHeader>
              <CardContent>
                {statusChartData.every((d) => d.count === 0) ? (
                  <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
                    No appointments found for {timeframeLabels[timeframe].toLowerCase()}.
                  </div>
                ) : (
                  <ChartContainer config={statusChartConfig} className="h-[280px] w-full">
                    <BarChart data={statusChartData} margin={{ left: 12, right: 12, top: 12 }}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="status" tickLine={false} axisLine={false} />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                      <ChartTooltip
                        cursor={false}
                        content={
                          <ChartTooltipContent
                            formatter={(value) => (
                              <div className="flex min-w-[8rem] items-center justify-between gap-3">
                                <span className="text-muted-foreground">Count</span>
                                <span className="font-mono font-medium tabular-nums text-foreground">
                                  {Number(value).toLocaleString()}
                                </span>
                              </div>
                            )}
                          />
                        }
                      />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                        {statusChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Appointment Type</CardTitle>
                <p className="text-sm text-muted-foreground">Virtual vs in-person split.</p>
              </CardHeader>
              <CardContent>
                {typeChartData.every((d) => d.count === 0) ? (
                  <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
                    No appointments found for {timeframeLabels[timeframe].toLowerCase()}.
                  </div>
                ) : (
                  <ChartContainer config={typeChartConfig} className="h-[280px] w-full">
                    <PieChart>
                      <Pie
                        data={typeChartData}
                        dataKey="count"
                        nameKey="type"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ type, count }) => `${type}: ${count}`}
                      >
                        {typeChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(value) => (
                              <div className="flex min-w-[8rem] items-center justify-between gap-3">
                                <span className="text-muted-foreground">Count</span>
                                <span className="font-mono font-medium tabular-nums text-foreground">
                                  {Number(value).toLocaleString()}
                                </span>
                              </div>
                            )}
                          />
                        }
                      />
                    </PieChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Daily trends */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Appointment Trends</CardTitle>
              <p className="text-sm text-muted-foreground">
                Daily booking volume over the selected period.
              </p>
            </CardHeader>
            <CardContent>
              {trendData.length === 0 ? (
                <div className="h-[320px] flex items-center justify-center text-sm text-muted-foreground">
                  No trend data available for {timeframeLabels[timeframe].toLowerCase()}.
                </div>
              ) : (
                <ChartContainer config={trendChartConfig} className="h-[320px] w-full">
                  <LineChart data={trendData} margin={{ left: 12, right: 12, top: 12 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => {
                        const d = new Date(val + 'T00:00:00');
                        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      }}
                      interval="preserveStartEnd"
                    />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          labelFormatter={(label) => {
                            const d = new Date(label + 'T00:00:00');
                            return d.toLocaleDateString('en-US', {
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric',
                            });
                          }}
                        />
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke="var(--color-total)"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="completed"
                      stroke="var(--color-completed)"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="cancelled"
                      stroke="var(--color-cancelled)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* Peak booking hours + Peak booking days row */}
          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle>Peak Booking Hours</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Appointment volume by hour of day.
                </p>
              </CardHeader>
              <CardContent>
                {(analytics?.peak_hours || []).every((d) => d.count === 0) ? (
                  <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
                    No appointment data for {timeframeLabels[timeframe].toLowerCase()}.
                  </div>
                ) : (
                  <ChartContainer config={peakHoursChartConfig} className="h-[280px] w-full">
                    <BarChart
                      data={(analytics?.peak_hours || []).filter((h) => h.hour >= 6 && h.hour <= 21)}
                      margin={{ left: 12, right: 12, top: 12 }}
                    >
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                      <ChartTooltip
                        cursor={false}
                        content={
                          <ChartTooltipContent
                            formatter={(value) => (
                              <div className="flex min-w-[8rem] items-center justify-between gap-3">
                                <span className="text-muted-foreground">Appointments</span>
                                <span className="font-mono font-medium tabular-nums text-foreground">
                                  {Number(value).toLocaleString()}
                                </span>
                              </div>
                            )}
                          />
                        }
                      />
                      <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Peak Booking Days</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Appointment volume by day of week.
                </p>
              </CardHeader>
              <CardContent>
                {(analytics?.peak_days || []).every((d) => d.count === 0) ? (
                  <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
                    No appointment data for {timeframeLabels[timeframe].toLowerCase()}.
                  </div>
                ) : (
                  <ChartContainer config={peakDaysChartConfig} className="h-[280px] w-full">
                    <BarChart data={analytics?.peak_days || []} margin={{ left: 12, right: 12, top: 12 }}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                      <ChartTooltip
                        cursor={false}
                        content={
                          <ChartTooltipContent
                            formatter={(value) => (
                              <div className="flex min-w-[8rem] items-center justify-between gap-3">
                                <span className="text-muted-foreground">Appointments</span>
                                <span className="font-mono font-medium tabular-nums text-foreground">
                                  {Number(value).toLocaleString()}
                                </span>
                              </div>
                            )}
                          />
                        }
                      />
                      <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Cancellation insights row */}
          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle>Cancellations by Role</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Who is cancelling appointments — patients or doctors.
                </p>
              </CardHeader>
              <CardContent>
                {!analytics?.cancellation_insights?.by_role?.length ? (
                  <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
                    No cancellations for {timeframeLabels[timeframe].toLowerCase()}.
                  </div>
                ) : (
                  <ChartContainer config={cancellationByRoleConfig} className="h-[280px] w-full">
                    <PieChart>
                      <Pie
                        data={analytics.cancellation_insights.by_role.map((entry) => ({
                          ...entry,
                          fill: ROLE_COLORS[entry.role] || '#94a3b8',
                        }))}
                        dataKey="count"
                        nameKey="role"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ role, count }) => `${role}: ${count}`}
                      >
                        {analytics.cancellation_insights.by_role.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={ROLE_COLORS[entry.role] || '#94a3b8'} />
                        ))}
                      </Pie>
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(value) => (
                              <div className="flex min-w-[8rem] items-center justify-between gap-3">
                                <span className="text-muted-foreground">Cancellations</span>
                                <span className="font-mono font-medium tabular-nums text-foreground">
                                  {Number(value).toLocaleString()}
                                </span>
                              </div>
                            )}
                          />
                        }
                      />
                    </PieChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Doctor Rejection Reasons</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Why doctors decline appointment requests.
                </p>
              </CardHeader>
              <CardContent>
                {!analytics?.cancellation_insights?.doctor_rejection_reasons?.length ? (
                  <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
                    No doctor rejections for {timeframeLabels[timeframe].toLowerCase()}.
                  </div>
                ) : (
                  <ChartContainer config={rejectionReasonConfig} className="h-[280px] w-full">
                    <BarChart
                      data={analytics.cancellation_insights.doctor_rejection_reasons}
                      layout="vertical"
                      margin={{ left: 20, right: 12, top: 12 }}
                    >
                      <CartesianGrid horizontal={false} />
                      <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
                      <YAxis
                        dataKey="reason"
                        type="category"
                        tickLine={false}
                        axisLine={false}
                        width={140}
                        fontSize={12}
                      />
                      <ChartTooltip
                        cursor={false}
                        content={
                          <ChartTooltipContent
                            formatter={(value) => (
                              <div className="flex min-w-[8rem] items-center justify-between gap-3">
                                <span className="text-muted-foreground">Count</span>
                                <span className="font-mono font-medium tabular-nums text-foreground">
                                  {Number(value).toLocaleString()}
                                </span>
                              </div>
                            )}
                          />
                        }
                      />
                      <Bar dataKey="count" fill="var(--color-count)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Top doctors table */}
          <Card>
            <CardHeader>
              <CardTitle>Top Doctors by Appointments</CardTitle>
              <p className="text-sm text-muted-foreground">
                Doctors with the most appointments in the selected period.
              </p>
            </CardHeader>
            <CardContent>
              {(analytics?.top_doctors || []).length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">
                  No appointment data available for {timeframeLabels[timeframe].toLowerCase()}.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-3 font-medium">Doctor</th>
                        <th className="pb-3 font-medium">Specialty</th>
                        <th className="pb-3 font-medium text-right">Total</th>
                        <th className="pb-3 font-medium text-right">Completed</th>
                        <th className="pb-3 font-medium text-right">Completion %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics!.top_doctors.map((doc) => (
                        <tr key={doc.doctor_id} className="border-b last:border-0">
                          <td className="py-3 font-medium">{doc.full_name}</td>
                          <td className="py-3 text-muted-foreground">{doc.specialty || '-'}</td>
                          <td className="py-3 text-right">{doc.total}</td>
                          <td className="py-3 text-right">{doc.completed}</td>
                          <td className="py-3 text-right">
                            {doc.total > 0 ? Math.round((doc.completed / doc.total) * 100) : 0}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
