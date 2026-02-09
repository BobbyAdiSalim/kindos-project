import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { toast } from 'sonner';

export function AppointmentSummary() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [summary, setSummary] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [recommendations, setRecommendations] = useState('');

  const handleSave = () => {
    toast.success('Summary saved successfully');
    navigate('/doctor/dashboard');
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
        ← Back
      </Button>

      <h1 className="text-2xl md:text-3xl font-semibold mb-6">Appointment Summary</h1>

      <Card>
        <CardHeader>
          <CardTitle>Clinical Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="summary">Visit Summary *</Label>
            <Textarea
              id="summary"
              placeholder="Brief summary of the visit..."
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="diagnosis">Diagnosis/Assessment</Label>
            <Textarea
              id="diagnosis"
              placeholder="Clinical assessment and diagnosis..."
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="recommendations">Recommendations & Follow-up</Label>
            <Textarea
              id="recommendations"
              placeholder="Treatment plan, medications, follow-up instructions..."
              value={recommendations}
              onChange={(e) => setRecommendations(e.target.value)}
              rows={4}
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
            <p className="text-blue-900">
              <strong>Note:</strong> This summary will be shared with the patient and stored in their medical record.
            </p>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate(-1)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSave} className="flex-1">
              Save Summary
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
