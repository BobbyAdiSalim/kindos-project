import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Star, MapPin, Video, User as UserIcon, Calendar, MessageSquare, Clock, UserPlus } from 'lucide-react';
import { mockDoctors, mockReviews } from '@/app/lib/mock-data';
import { DoctorProfile as DoctorProfileApi, getPublicProfile } from '@/app/lib/profile-api';
import { useAuth } from '@/app/lib/auth-context';
import { getMyConnections, sendConnectRequest, type ConnectionInfo } from '@/app/lib/chat-api';
import { format } from 'date-fns';
import { toast } from 'sonner';

export function DoctorProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [doctorFromApi, setDoctorFromApi] = useState<DoctorProfileApi | null>(null);
  const [doctorUsername, setDoctorUsername] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'none' | 'pending' | 'accepted' | 'rejected'>('none');
  const [connectLoading, setConnectLoading] = useState(false);
  const mockDoctor = mockDoctors.find((d) => d.id === id);

  useEffect(() => {
    const loadDoctor = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        const data = await getPublicProfile(id);
        if (data.user.role === 'doctor') {
          setDoctorFromApi((data.profile as DoctorProfileApi | null) || null);
          setDoctorUsername(data.user.username || '');
        }
      } catch {
        // Keep UI functional with mock fallback.
      } finally {
        setLoading(false);
      }
    };

    loadDoctor();
  }, [id]);

  // Load connection status with this doctor
  useEffect(() => {
    const loadConnectionStatus = async () => {
      if (!token || !doctorFromApi) return;
      try {
        const data = await getMyConnections(token);
        const match = data.connections.find(
          (c: ConnectionInfo) => c.doctor_id === doctorFromApi.id
        );
        if (match) {
          setConnectionStatus(match.status);
        }
      } catch {
        // Non-critical — button defaults to "Connect"
      }
    };

    loadConnectionStatus();
  }, [token, doctorFromApi]);

  const handleConnect = async () => {
    if (!doctorFromApi || !token) return;
    setConnectLoading(true);
    try {
      await sendConnectRequest(token, doctorFromApi.id);
      setConnectionStatus('pending');
      toast.success('Connect request sent!');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setConnectLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p>Loading doctor profile...</p>
      </div>
    );
  }

  const doctor = doctorFromApi
    ? {
        id: id || '',
        name: doctorFromApi.full_name || doctorUsername,
        specialty: doctorFromApi.specialty || 'General Practice',
        photo: '',
        languages: doctorFromApi.languages || [],
        rating: mockDoctor?.rating || 0,
        reviewCount: mockDoctor?.reviewCount || 0,
        bio: doctorFromApi.bio || 'No bio provided.',
        clinicLocation: doctorFromApi.clinic_location || 'Location not provided.',
        virtualAvailable: doctorFromApi.virtual_available ?? true,
        inPersonAvailable: doctorFromApi.in_person_available ?? true,
        nextAvailable: mockDoctor?.nextAvailable || null,
        verified: doctorFromApi.verification_status === 'approved',
      }
    : mockDoctor;

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

  const doctorReviews = mockReviews.filter((r) => r.doctorId === doctor.id);
  const nextAvailableDate = doctor.nextAvailable ? new Date(doctor.nextAvailable) : null;
  const hasNextAvailableDate = Boolean(
    nextAvailableDate && !Number.isNaN(nextAvailableDate.getTime())
  );

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
              {connectionStatus === 'accepted' ? (
                <Link to="/patient/messages" className="flex-1 md:flex-none">
                  <Button variant="outline" className="w-full">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Message
                  </Button>
                </Link>
              ) : connectionStatus === 'pending' ? (
                <Button variant="outline" className="w-full flex-1 md:flex-none" disabled>
                  <Clock className="h-4 w-4 mr-2" />
                  Pending
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="w-full flex-1 md:flex-none"
                  onClick={handleConnect}
                  disabled={connectLoading}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  {connectLoading ? 'Connecting...' : 'Connect'}
                </Button>
              )}
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
                  {hasNextAvailableDate
                    ? format(nextAvailableDate as Date, 'MMMM d, yyyy \'at\' h:mm a')
                    : 'No available dates'}
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
