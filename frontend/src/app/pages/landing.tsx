import React from 'react';
import { Link, useNavigate } from 'react-router';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Calendar, Heart, Shield, Users, ArrowRight } from 'lucide-react';

export function Landing() {
  const navigate = useNavigate();

  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-12 md:py-20 max-w-6xl">
        <div className="text-center space-y-6 max-w-3xl mx-auto">
          <h1 className="text-3xl md:text-5xl font-semibold leading-tight">
            Accessible Healthcare Booking & Referral
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
            Connect with verified healthcare providers for virtual or in-person care.
            Referral routing only — not diagnosis. Clear, accessible, and inclusive.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link to="/register">
              <Button size="lg" className="w-full sm:w-auto text-base px-8">
                Register
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-base px-8">
                Log in
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Quick Action */}
      <section className="bg-muted/30 py-12">
        <div className="container mx-auto px-4 max-w-6xl">
          <Card className="border-primary/20">
            <CardContent className="p-8 md:p-10">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="text-center md:text-left space-y-2">
                  <h2 className="text-2xl font-semibold">Need to book an appointment?</h2>
                  <p className="text-muted-foreground">
                    Answer a few quick questions to find the right provider for your needs
                  </p>
                </div>
                <Button
                  size="lg"
                  onClick={() => navigate('/register')}
                  className="w-full md:w-auto"
                >
                  Book Appointment
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16 md:py-20 max-w-6xl">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-semibold mb-4">
            How UTLWA Works
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            A simple, accessible platform designed to connect you with the care you need
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader>
              <Calendar className="h-10 w-10 text-primary mb-3" />
              <CardTitle className="text-xl">Easy Booking</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base leading-relaxed">
                Schedule virtual or in-person appointments with verified healthcare providers
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Heart className="h-10 w-10 text-primary mb-3" />
              <CardTitle className="text-xl">Personalized Care</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base leading-relaxed">
                Tell us your needs and we'll recommend the right type of care for you
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Users className="h-10 w-10 text-primary mb-3" />
              <CardTitle className="text-xl">Inclusive Access</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base leading-relaxed">
                Filter by language support, accessibility features, and cultural preferences
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Shield className="h-10 w-10 text-primary mb-3" />
              <CardTitle className="text-xl">Verified Providers</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base leading-relaxed">
                All healthcare providers are verified and licensed professionals
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Important Notice */}
      <section className="bg-muted/30 py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <Card>
            <CardContent className="p-8 md:p-10">
              <h3 className="text-xl font-semibold mb-4">Important Information</h3>
              <div className="space-y-3 text-muted-foreground leading-relaxed">
                <p>
                  <strong className="text-foreground">This is a referral routing service</strong> — 
                  UTLWA helps connect you with appropriate healthcare providers based on your needs.
                </p>
                <p>
                  We do not provide diagnosis, treatment, or emergency services. For medical emergencies, 
                  please call 911 or visit your nearest emergency room.
                </p>
                <p>
                  All appointments are subject to provider availability and approval. Virtual care options 
                  may vary by provider and location.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16 md:py-20 max-w-4xl text-center">
        <div className="space-y-6">
          <h2 className="text-2xl md:text-3xl font-semibold">
            Ready to get started?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Create your account to book appointments and access quality healthcare
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link to="/register">
              <Button size="lg" className="w-full sm:w-auto text-base px-8">
                Create Account
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-base px-8">
                I have an account
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
