import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { mockAnalytics } from '@/app/lib/mock-data';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#4A7C7E', '#E8B84D', '#CCC9C8', '#F5F5F0'];

export function Analytics() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <h1 className="text-2xl md:text-3xl font-semibold mb-8">
        Analytics Dashboard
      </h1>

      {/* Key Metrics */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Total Bookings</p>
            <p className="text-3xl font-semibold mt-2">{mockAnalytics.totalBookings}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Virtual Bookings</p>
            <p className="text-3xl font-semibold mt-2">{mockAnalytics.virtualBookings}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round((mockAnalytics.virtualBookings / mockAnalytics.totalBookings) * 100)}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">In-Person Bookings</p>
            <p className="text-3xl font-semibold mt-2">{mockAnalytics.inPersonBookings}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round((mockAnalytics.inPersonBookings / mockAnalytics.totalBookings) * 100)}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Cancellation Rate</p>
            <p className="text-3xl font-semibold mt-2">{mockAnalytics.cancellationRate}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Booking Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={mockAnalytics.bookingTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="bookings" fill="#4A7C7E" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Popular Care Types</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={mockAnalytics.popularCareTypes}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => entry.name}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {mockAnalytics.popularCareTypes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Care Type Details */}
      <Card>
        <CardHeader>
          <CardTitle>Care Type Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockAnalytics.popularCareTypes.map((type, index) => (
              <div key={type.name}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{type.name}</span>
                  <span className="text-muted-foreground">{type.count} bookings</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${(type.count / mockAnalytics.totalBookings) * 100}%`,
                      backgroundColor: COLORS[index],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Additional Stats */}
      <div className="grid md:grid-cols-2 gap-6 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Waitlist</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{mockAnalytics.waitlistCount}</p>
            <p className="text-sm text-muted-foreground mt-2">
              Patients currently on provider waitlists
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Average Response Time</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">2.3 hours</p>
            <p className="text-sm text-muted-foreground mt-2">
              Average time for appointment confirmation
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}