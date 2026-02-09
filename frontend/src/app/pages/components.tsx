import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Badge } from '@/app/components/ui/badge';
import { Textarea } from '@/app/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Switch } from '@/app/components/ui/switch';
import { AppointmentTypeBadge, StatusBadge } from '@/app/components/status-badges';
import { DoctorCard } from '@/app/components/doctor-card';
import { AppointmentCard } from '@/app/components/appointment-card';
import { mockDoctors, mockAppointments } from '@/app/lib/mock-data';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';

export function ComponentLibrary() {
  const [switchState, setSwitchState] = useState(false);

  return (
    <div className="container mx-auto px-4 py-12 max-w-7xl">
      <div className="mb-12">
        <h1 className="text-3xl md:text-4xl font-semibold mb-4">
          UTLWA Design System
        </h1>
        <p className="text-lg text-muted-foreground">
          Component library and design tokens for the healthcare booking platform
        </p>
      </div>

      {/* Color Palette */}
      <section className="mb-16">
        <h2 className="text-2xl font-semibold mb-6">Brand Colors</h2>
        <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { name: 'Primary Teal', value: '#4A7C7E', var: '--utlwa-teal' },
            { name: 'Accent Gold', value: '#E8B84D', var: '--utlwa-gold' },
            { name: 'Background Beige', value: '#F5F5F0', var: '--utlwa-beige' },
            { name: 'Text Primary', value: '#191312', var: '--utlwa-text-primary' },
            { name: 'Text Secondary', value: '#2F2521', var: '--utlwa-text-secondary' },
            { name: 'Border', value: '#CCC9C8', var: '--utlwa-border' },
          ].map((color) => (
            <Card key={color.name}>
              <CardContent className="p-4">
                <div
                  className="w-full h-20 rounded-lg mb-3 border"
                  style={{ backgroundColor: color.value }}
                />
                <p className="font-medium text-sm">{color.name}</p>
                <p className="text-xs text-muted-foreground">{color.value}</p>
                <p className="text-xs text-muted-foreground font-mono">{color.var}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Typography */}
      <section className="mb-16">
        <h2 className="text-2xl font-semibold mb-6">Typography</h2>
        <Card>
          <CardContent className="p-8 space-y-6">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Heading 1</p>
              <h1>The quick brown fox jumps over the lazy dog</h1>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Heading 2</p>
              <h2>The quick brown fox jumps over the lazy dog</h2>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Heading 3</p>
              <h3>The quick brown fox jumps over the lazy dog</h3>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Body Text</p>
              <p>The quick brown fox jumps over the lazy dog</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Small Text</p>
              <p className="text-sm">The quick brown fox jumps over the lazy dog</p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Buttons */}
      <section className="mb-16">
        <h2 className="text-2xl font-semibold mb-6">Buttons</h2>
        <Card>
          <CardContent className="p-8">
            <div className="space-y-6">
              <div>
                <p className="text-sm text-muted-foreground mb-3">Primary Button</p>
                <div className="flex flex-wrap gap-3">
                  <Button size="sm">Small</Button>
                  <Button>Default</Button>
                  <Button size="lg">Large</Button>
                  <Button disabled>Disabled</Button>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-3">Secondary Button</p>
                <div className="flex flex-wrap gap-3">
                  <Button variant="outline" size="sm">Small</Button>
                  <Button variant="outline">Default</Button>
                  <Button variant="outline" size="lg">Large</Button>
                  <Button variant="outline" disabled>Disabled</Button>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-3">Destructive Button</p>
                <div className="flex flex-wrap gap-3">
                  <Button variant="destructive" size="sm">Small</Button>
                  <Button variant="destructive">Default</Button>
                  <Button variant="destructive" size="lg">Large</Button>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-3">Ghost Button</p>
                <div className="flex flex-wrap gap-3">
                  <Button variant="ghost" size="sm">Small</Button>
                  <Button variant="ghost">Default</Button>
                  <Button variant="ghost" size="lg">Large</Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Form Elements */}
      <section className="mb-16">
        <h2 className="text-2xl font-semibold mb-6">Form Elements</h2>
        <Card>
          <CardContent className="p-8 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="demo-input">Text Input</Label>
              <Input id="demo-input" placeholder="Enter text..." />
            </div>

            <div className="space-y-2">
              <Label htmlFor="demo-textarea">Textarea</Label>
              <Textarea id="demo-textarea" placeholder="Enter longer text..." rows={3} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="demo-select">Select</Label>
              <Select>
                <SelectTrigger id="demo-select">
                  <SelectValue placeholder="Select an option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Option 1</SelectItem>
                  <SelectItem value="2">Option 2</SelectItem>
                  <SelectItem value="3">Option 3</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="demo-switch">Switch</Label>
                <p className="text-sm text-muted-foreground">Toggle option on/off</p>
              </div>
              <Switch
                id="demo-switch"
                checked={switchState}
                onCheckedChange={setSwitchState}
              />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Badges */}
      <section className="mb-16">
        <h2 className="text-2xl font-semibold mb-6">Status Badges</h2>
        <Card>
          <CardContent className="p-8">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-3">Verification Status</p>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status="verified" />
                  <StatusBadge status="pending" />
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-3">Appointment Status</p>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status="upcoming" />
                  <StatusBadge status="completed" />
                  <StatusBadge status="cancelled" />
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-3">Appointment Type</p>
                <div className="flex flex-wrap gap-2">
                  <AppointmentTypeBadge type="virtual" />
                  <AppointmentTypeBadge type="in-person" />
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-3">Generic Badges</p>
                <div className="flex flex-wrap gap-2">
                  <Badge>Default</Badge>
                  <Badge variant="secondary">Secondary</Badge>
                  <Badge variant="outline">Outline</Badge>
                  <Badge variant="destructive">Destructive</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Cards */}
      <section className="mb-16">
        <h2 className="text-2xl font-semibold mb-6">Complex Components</h2>
        
        <Tabs defaultValue="doctor">
          <TabsList>
            <TabsTrigger value="doctor">Doctor Card</TabsTrigger>
            <TabsTrigger value="appointment">Appointment Card</TabsTrigger>
          </TabsList>

          <TabsContent value="doctor" className="mt-6">
            <DoctorCard doctor={mockDoctors[0]} />
          </TabsContent>

          <TabsContent value="appointment" className="mt-6">
            <AppointmentCard
              appointment={mockAppointments[0]}
              userRole="patient"
            />
          </TabsContent>
        </Tabs>
      </section>

      {/* Accessibility Note */}
      <section>
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle>Accessibility</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-muted-foreground">
              All components are designed with accessibility in mind:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>WCAG AA contrast ratios maintained</li>
              <li>Keyboard navigation support</li>
              <li>Screen reader compatible with semantic HTML and ARIA labels</li>
              <li>Large tap targets (minimum 44x44px) for mobile</li>
              <li>Clear focus states visible on all interactive elements</li>
              <li>Generous spacing and readable line-heights</li>
            </ul>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}