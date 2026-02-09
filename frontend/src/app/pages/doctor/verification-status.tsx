import React from 'react';
import { Link } from 'react-router';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Clock, CheckCircle2, AlertCircle } from 'lucide-react';

export function VerificationStatus() {
  const isPending = true;

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <Card>
        <CardContent className="p-8 md:p-12 text-center space-y-6">
          {isPending ? (
            <>
              <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-semibold mb-2">
                  Verification Pending
                </h1>
                <p className="text-muted-foreground text-lg">
                  Your account is under review
                </p>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Thank you for registering! Our team is reviewing your credentials. 
                  This typically takes 1-3 business days. You'll receive an email once your account is verified.
                </AlertDescription>
              </Alert>

              <div className="bg-muted/50 p-6 rounded-lg text-left space-y-3">
                <h3 className="font-semibold">What happens next?</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Our team will verify your medical license and credentials</li>
                  <li>• You'll receive an email notification once approved</li>
                  <li>• After approval, you can set up your profile and availability</li>
                  <li>• Patients will then be able to book appointments with you</li>
                </ul>
              </div>

              <Link to="/">
                <Button variant="outline">Return to Home</Button>
              </Link>
            </>
          ) : (
            <>
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-semibold mb-2">
                  Account Verified!
                </h1>
                <p className="text-muted-foreground text-lg">
                  You're all set to start seeing patients
                </p>
              </div>
              <Link to="/doctor/profile">
                <Button size="lg">Complete Your Profile</Button>
              </Link>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
