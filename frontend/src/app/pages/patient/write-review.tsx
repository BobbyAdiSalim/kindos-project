import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Loader2, Star } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/app/lib/auth-context';
import { getAppointmentById, type AppointmentRecord } from '@/app/lib/appointment-api';
import { getMyReviewForDoctor, upsertReview } from '@/app/lib/review-api';

export function WriteReview() {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [appointment, setAppointment] = useState<AppointmentRecord | null>(null);
  const [reviewExists, setReviewExists] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadReviewContext = async () => {
      if (!appointmentId || !token) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const appointmentData = await getAppointmentById(token, appointmentId);
        setAppointment(appointmentData);

        if (!appointmentData.doctor) {
          toast.error('Doctor information not found.');
          navigate(`/patient/appointment/${appointmentId}`);
          return;
        }

        if (appointmentData.status !== 'completed') {
          toast.error('You can only review completed appointments.');
          navigate(`/patient/appointment/${appointmentId}`);
          return;
        }

        const reviewData = await getMyReviewForDoctor(token, appointmentData.doctor.id);
        if (reviewData.review) {
          setRating(reviewData.review.rating);
          setComment(reviewData.review.comment || '');
          setIsAnonymous(reviewData.review.is_anonymous);
          setReviewExists(true);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to load review form.');
      } finally {
        setLoading(false);
      }
    };

    void loadReviewContext();
  }, [appointmentId, navigate, token]);

  const handleSubmit = async () => {
    if (!token || !appointmentId) {
      toast.error('You must be logged in to submit a review.');
      return;
    }

    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    try {
      setSubmitting(true);
      await upsertReview(token, {
        appointment_id: Number(appointmentId),
        rating,
        comment,
        is_anonymous: isAnonymous,
      });

      toast.success(reviewExists ? 'Review updated successfully' : 'Review submitted successfully');
      navigate(`/patient/appointment/${appointmentId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <Card>
          <CardContent className="p-8 flex items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading review form...
          </CardContent>
        </Card>
      </div>
    );
  };

  const doctorName = appointment?.doctor?.full_name || 'this doctor';

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
        ← Back
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>
            {reviewExists
              ? `Edit review for ${doctorName}`
              : `Write a review for ${doctorName}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label className="mb-3 block">How was your experience?</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-10 w-10 ${
                      star <= rating ? 'fill-primary text-primary' : 'text-muted-foreground'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment">Your Review (Optional)</Label>
            <Textarea
              id="comment"
              placeholder="Share your experience..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={5}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="anonymous"
              checked={isAnonymous}
              onCheckedChange={(checked) => setIsAnonymous(!!checked)}
            />
            <Label htmlFor="anonymous" className="text-sm font-normal cursor-pointer">
              Post this review anonymously
            </Label>
          </div>

          <Button onClick={handleSubmit} className="w-full" disabled={submitting}>
            {submitting
              ? (reviewExists ? 'Updating Review...' : 'Submitting Review...')
              : (reviewExists ? 'Update Review' : 'Submit Review')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
