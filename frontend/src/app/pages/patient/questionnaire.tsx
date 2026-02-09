import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Label } from '@/app/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/app/components/ui/radio-group';
import { Textarea } from '@/app/components/ui/textarea';
import { Progress } from '@/app/components/ui/progress';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { careTypes } from '@/app/lib/mock-data';

export function NeedsQuestionnaire() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    careType: '',
    urgency: '',
    preferredType: '',
    accessibility: [] as string[],
    description: '',
  });
  const navigate = useNavigate();

  const totalSteps = 4;
  const progress = (step / totalSteps) * 100;

  const handleNext = () => {
    if (step < totalSteps) setStep(step + 1);
    else {
      // Navigate to provider discovery with filters
      navigate('/patient/providers');
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleAccessibility = (option: string) => {
    setFormData(prev => ({
      ...prev,
      accessibility: prev.accessibility.includes(option)
        ? prev.accessibility.filter(item => item !== option)
        : [...prev.accessibility, option],
    }));
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-semibold mb-2">Tell Us About Your Needs</h1>
        <p className="text-muted-foreground">
          Answer a few questions to help us recommend the right care
        </p>
        <Progress value={progress} className="mt-4" />
        <p className="text-sm text-muted-foreground mt-2">
          Step {step} of {totalSteps}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {step === 1 && 'What type of care do you need?'}
            {step === 2 && 'How soon do you need care?'}
            {step === 3 && 'Appointment preference'}
            {step === 4 && 'Accessibility preferences'}
          </CardTitle>
          <CardDescription>
            {step === 1 && 'Select the category that best matches your needs'}
            {step === 2 && 'This helps us prioritize your request'}
            {step === 3 && 'Choose how you\'d like to meet with your provider'}
            {step === 4 && 'Optional: Let us know if you need any special accommodations'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === 1 && (
            <RadioGroup value={formData.careType} onValueChange={(value) => updateField('careType', value)}>
              {careTypes.map((type) => (
                <div key={type.id} className="flex items-start space-x-3 space-y-0 border rounded-lg p-4 hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value={type.id} id={type.id} className="mt-1" />
                  <Label htmlFor={type.id} className="flex-1 cursor-pointer">
                    <div className="font-medium">{type.name}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {type.description}
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          )}

          {step === 2 && (
            <RadioGroup value={formData.urgency} onValueChange={(value) => updateField('urgency', value)}>
              <div className="flex items-center space-x-3 border rounded-lg p-4 hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="urgent" id="urgent" />
                <Label htmlFor="urgent" className="cursor-pointer flex-1">
                  <div className="font-medium">Within 1-2 days</div>
                  <div className="text-sm text-muted-foreground">Needs prompt attention</div>
                </Label>
              </div>
              <div className="flex items-center space-x-3 border rounded-lg p-4 hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="soon" id="soon" />
                <Label htmlFor="soon" className="cursor-pointer flex-1">
                  <div className="font-medium">Within 1 week</div>
                  <div className="text-sm text-muted-foreground">Can wait a few days</div>
                </Label>
              </div>
              <div className="flex items-center space-x-3 border rounded-lg p-4 hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="flexible" id="flexible" />
                <Label htmlFor="flexible" className="cursor-pointer flex-1">
                  <div className="font-medium">Flexible</div>
                  <div className="text-sm text-muted-foreground">Routine checkup or follow-up</div>
                </Label>
              </div>
            </RadioGroup>
          )}

          {step === 3 && (
            <RadioGroup value={formData.preferredType} onValueChange={(value) => updateField('preferredType', value)}>
              <div className="flex items-center space-x-3 border rounded-lg p-4 hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="virtual" id="prefer-virtual" />
                <Label htmlFor="prefer-virtual" className="cursor-pointer flex-1">
                  <div className="font-medium">Virtual (Video Call)</div>
                  <div className="text-sm text-muted-foreground">Meet from anywhere</div>
                </Label>
              </div>
              <div className="flex items-center space-x-3 border rounded-lg p-4 hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="in-person" id="prefer-in-person" />
                <Label htmlFor="prefer-in-person" className="cursor-pointer flex-1">
                  <div className="font-medium">In-Person</div>
                  <div className="text-sm text-muted-foreground">Visit a clinic</div>
                </Label>
              </div>
              <div className="flex items-center space-x-3 border rounded-lg p-4 hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="either" id="prefer-either" />
                <Label htmlFor="prefer-either" className="cursor-pointer flex-1">
                  <div className="font-medium">No Preference</div>
                  <div className="text-sm text-muted-foreground">Either option works</div>
                </Label>
              </div>
            </RadioGroup>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="space-y-3">
                {[
                  { id: 'asl', label: 'ASL (American Sign Language) support' },
                  { id: 'interpreter', label: 'Language interpreter needed' },
                  { id: 'wheelchair', label: 'Wheelchair accessible facility' },
                  { id: 'captions', label: 'Closed captions for virtual appointments' },
                ].map((option) => (
                  <div
                    key={option.id}
                    className="flex items-center space-x-3 border rounded-lg p-4 hover:bg-muted/50 cursor-pointer"
                    onClick={() => toggleAccessibility(option.id)}
                  >
                    <input
                      type="checkbox"
                      checked={formData.accessibility.includes(option.id)}
                      onChange={() => {}}
                      className="h-4 w-4 rounded border-input"
                    />
                    <Label className="cursor-pointer flex-1">{option.label}</Label>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">
                  Additional Information (Optional)
                </Label>
                <Textarea
                  id="description"
                  placeholder="Tell us more about what you're looking for..."
                  value={formData.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3 mt-6">
        {step > 1 && (
          <Button variant="outline" onClick={handleBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        )}
        <Button onClick={handleNext} className="ml-auto gap-2">
          {step === totalSteps ? 'Find Providers' : 'Next'}
          {step < totalSteps && <ArrowRight className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}