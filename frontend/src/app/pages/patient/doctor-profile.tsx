import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Star, MapPin, Video, User as UserIcon, Calendar, MessageSquare } from 'lucide-react';
import { mockDoctors, mockReviews } from '@/app/lib/mock-data';
import { format } from 'date-fns';

export function DoctorProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const doctor = mockDoctors.find(d => d.id === id);

  if (!doctor) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p>Doctor not found</p>
        <Link to="/patient/providers">
          <Button className="mt-4">Back to Providers</Button>
        </Link>
      </div>
    );
  }

  const doctorReviews = mockReviews.filter(r => r.doctorId === doctor.id);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
        ← Back
      </Button>

      {/* Doctor Header */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            <Avatar className="h-24 w-24 md:h-32 md:w-32">
              <AvatarImage src={doctor.photo} alt={doctor.name} />
              <AvatarFallback><UserIcon className="h-12 w-12" /></AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-4">
              <div>
                <div className="flex items-start gap-3 mb-2">
                  <h1 className="text-2xl md:text-3xl font-semibold">{doctor.name}</h1>
                  {doctor.verified && (
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      Verified
                    </Badge>
                  )}
                </div>
                <p className="text-lg text-muted-foreground">{doctor.specialty}</p>
              </div>

              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 fill-primary text-primary" />
                <span className="font-semibold">{doctor.rating}</span>
                <span className="text-muted-foreground">
                  ({doctor.reviewCount} reviews)
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {doctor.virtualAvailable && (
                  <Badge variant="outline">
                    <Video className="h-3 w-3 mr-1" />
                    Virtual
                  </Badge>
                )}
                {doctor.inPersonAvailable && (
                  <Badge variant="outline">In-Person</Badge>
                )}
              </div>
            </div>

            <div className="flex md:flex-col gap-2">
              <Link to={`/patient/booking/${doctor.id}`} className="flex-1 md:flex-none">
                <Button className="w-full">
                  <Calendar className="h-4 w-4 mr-2" />
                  Book Appointment
                </Button>
              </Link>
              <Link to="/patient/messages" className="flex-1 md:flex-none">
                <Button variant="outline" className="w-full">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Message
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="about">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="about">About</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
        </TabsList>

        <TabsContent value="about" className="mt-6 space-y-6">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div>
                <h3 className="font-semibold mb-2">About</h3>
                <p className="text-muted-foreground leading-relaxed">{doctor.bio}</p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Location</h3>
                <div className="flex items-start gap-2 text-muted-foreground">
                  <MapPin className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <span>{doctor.clinicLocation}</span>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Languages</h3>
                <div className="flex flex-wrap gap-2">
                  {doctor.languages.map(lang => (
                    <Badge key={lang} variant="secondary">{lang}</Badge>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Next Available</h3>
                <p className="text-muted-foreground">
                  {format(new Date(doctor.nextAvailable), 'MMMM d, yyyy \'at\' h:mm a')}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reviews" className="mt-6 space-y-4">
          {doctorReviews.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No reviews yet
              </CardContent>
            </Card>
          ) : (
            doctorReviews.map(review => (
              <Card key={review.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold">{review.patientName}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(review.date), 'MMMM d, yyyy')}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: review.rating }).map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                      ))}
                    </div>
                  </div>
                  <p className="text-muted-foreground">{review.comment}</p>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
