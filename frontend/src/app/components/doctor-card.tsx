import React from 'react';
import { Link } from 'react-router';
import { Card, CardContent, CardFooter } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { Star, MapPin, Video, User as UserIcon, Award } from 'lucide-react';
import { format } from 'date-fns';

interface DoctorCardProps {
  doctor: {
    id: string;
    name: string;
    specialty: string;
    photo: string;
    languages: string[];
    rating: number;
    reviewCount: number;
    clinicLocation: string;
    virtualAvailable: boolean;
    inPersonAvailable: boolean;
    nextAvailable: string;
    verified: boolean;
  };
  showBookButton?: boolean;
  matchScore?: number;
}

export function DoctorCard({ doctor, showBookButton = true, matchScore }: DoctorCardProps) {
  const nextAvailableDate = new Date(doctor.nextAvailable);
  
  // Determine badge color based on match score
  const getMatchBadgeVariant = (score: number) => {
    if (score === 100) return 'default';
    if (score >= 75) return 'secondary';
    return 'outline';
  };
  
  return (
    <Card className="hover:shadow-lg transition-shadow relative">
      {/* Top badges container - flex to handle multiple badges */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        {/* Match Score Badge */}
        {matchScore !== undefined && matchScore < 100 && (
          <Badge 
            variant={getMatchBadgeVariant(matchScore)}
            className="text-xs shadow-sm"
          >
            <Award className="h-3 w-3 mr-1" />
            {Math.round(matchScore)}% Match
          </Badge>
        )}
        
        {/* Perfect Match Badge */}
        {matchScore === 100 && (
          <Badge 
            className="bg-green-500 hover:bg-green-600 text-white text-xs shadow-sm"
          >
            <Star className="h-3 w-3 mr-1 fill-white" />
            Perfect Match
          </Badge>
        )}
        
        {/* Verified Badge - Moved to top right with others */}
        {doctor.verified && (
          <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs shadow-sm">
            Verified
          </Badge>
        )}
      </div>

      <CardContent className="p-6">
        <div className="flex gap-4">
          <Avatar className="h-16 w-16 flex-shrink-0">
            <AvatarImage src={doctor.photo} alt={doctor.name} />
            <AvatarFallback>
              <UserIcon className="h-8 w-8" />
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-lg">{doctor.name}</h3>
                <p className="text-sm text-muted-foreground">{doctor.specialty}</p>
              </div>
              {/* Removed verified badge from here - it's now in the top right */}
            </div>
            
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Star className="h-4 w-4 fill-primary text-primary" />
                <span className="font-medium">{doctor.rating}</span>
                <span className="text-muted-foreground">({doctor.reviewCount} reviews)</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{doctor.clinicLocation}</span>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {doctor.virtualAvailable && (
                  <Badge variant="outline" className="text-xs">
                    <Video className="h-3 w-3 mr-1" />
                    Virtual
                  </Badge>
                )}
                {doctor.inPersonAvailable && (
                  <Badge variant="outline" className="text-xs">
                    In-Person
                  </Badge>
                )}
              </div>
              
              <div className="flex flex-wrap gap-1 text-xs text-muted-foreground">
                <span className="font-medium">Languages:</span>{' '}
                {doctor.languages.join(', ')}
              </div>

              {/* Show which criteria were matched (optional) */}
              {matchScore !== undefined && matchScore < 100 && (
                <div className="mt-2 text-xs text-muted-foreground border-t pt-2">
                  <span className="font-medium">Matches:</span>{' '}
                  {matchScore >= 75 ? 'Most criteria ✓' : 'Some criteria ✓'}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="px-6 py-4 bg-muted/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="text-sm">
          <span className="text-muted-foreground">Next available:</span>{' '}
          <span className="font-medium">
            {format(nextAvailableDate, 'MMM d, h:mm a')}
          </span>
        </div>
        
        {showBookButton && (
          <div className="flex gap-2 w-full sm:w-auto">
            <Link to={`/patient/doctor/${doctor.id}`} className="flex-1 sm:flex-none">
              <Button variant="outline" size="sm" className="w-full sm:w-auto">
                View Profile
              </Button>
            </Link>
            <Link to={`/patient/booking/${doctor.id}`} className="flex-1 sm:flex-none">
              <Button size="sm" className="w-full sm:w-auto">Book</Button>
            </Link>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}