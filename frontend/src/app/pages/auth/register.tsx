import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth, UserRole, getDashboardPath } from '@/app/lib/auth-context';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/app/components/ui/radio-group';
import { Textarea } from '@/app/components/ui/textarea';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export function Register() {
  const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
  const [role, setRole] = useState<UserRole>('patient');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [verificationDocumentName, setVerificationDocumentName] = useState('');
  const [verificationDocumentDataUrl, setVerificationDocumentDataUrl] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    // Doctor-specific fields
    specialty: '',
    licenseNumber: '',
    clinicAddress: '',
  });

  const { register, user } = useAuth();
  const navigate = useNavigate();

  const fileToDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Failed to read file.'));
      reader.readAsDataURL(file);
    });

  useEffect(() => {
    if (!user) return;
    navigate(getDashboardPath(user.role), { replace: true });
  }, [navigate, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.password) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (role === 'doctor' && (!formData.specialty || !formData.licenseNumber)) {
      toast.error('Please fill in all professional details');
      return;
    }

    if (role === 'doctor' && !verificationDocumentDataUrl) {
      toast.error('Please upload a verification document (max 5MB).');
      return;
    }

    try {
      setIsSubmitting(true);
      await register(formData.email, formData.password, formData.name, role, {
        specialty: formData.specialty,
        licenseNumber: formData.licenseNumber,
        clinicAddress: formData.clinicAddress,
        verificationDocuments: verificationDocumentDataUrl ? [verificationDocumentDataUrl] : [],
      });

      if (role === 'doctor') {
        toast.success('Registration submitted! Awaiting verification.');
        navigate('/doctor/dashboard');
      } else {
        toast.success('Account created successfully!');
        navigate(role === 'patient' ? '/patient/questionnaire' : '/admin/dashboard');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to create account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleVerificationDocumentChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setVerificationDocumentDataUrl('');
      setVerificationDocumentName('');
      return;
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error('File must be 5MB or smaller.');
      event.target.value = '';
      setVerificationDocumentDataUrl('');
      setVerificationDocumentName('');
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);
      setVerificationDocumentDataUrl(dataUrl);
      setVerificationDocumentName(file.name);
    } catch {
      toast.error('Failed to read selected document.');
      setVerificationDocumentDataUrl('');
      setVerificationDocumentName('');
    }
  };

  return (
    <div className="container mx-auto px-4 py-12 md:py-20 max-w-lg">
      <Card>
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl">Create Your Account</CardTitle>
          <CardDescription className="text-base">
            Join UTLWA to access healthcare services
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="role">I am a:</Label>
                <RadioGroup value={role} onValueChange={(value: string) => setRole(value as UserRole)}>
                  <div className="flex items-center space-x-3 space-y-0">
                    <RadioGroupItem value="patient" id="register-patient" />
                    <Label htmlFor="register-patient" className="font-normal cursor-pointer">
                      Patient
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 space-y-0">
                    <RadioGroupItem value="doctor" id="register-doctor" />
                    <Label htmlFor="register-doctor" className="font-normal cursor-pointer">
                      Healthcare Provider
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 space-y-0">
                    <RadioGroupItem value="admin" id="register-admin" />
                    <Label htmlFor="register-admin" className="font-normal cursor-pointer">
                      System Administrator
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('name', e.target.value)}
                  required
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-email">Email Address</Label>
                <Input
                  id="register-email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={formData.email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('email', e.target.value)}
                  required
                  className="h-12"
                />
              </div>

              {role === 'doctor' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="specialty">Medical Specialty</Label>
                    <Input
                      id="specialty"
                      type="text"
                      placeholder="e.g., Family Medicine, Pediatrics"
                      value={formData.specialty}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('specialty', e.target.value)}
                      required
                      className="h-12"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="licenseNumber">Medical License Number</Label>
                    <Input
                      id="licenseNumber"
                      type="text"
                      placeholder="Enter your license number"
                      value={formData.licenseNumber}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('licenseNumber', e.target.value)}
                      required
                      className="h-12"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="clinicAddress">Clinic Address (Optional)</Label>
                    <Textarea
                      id="clinicAddress"
                      placeholder="Enter clinic address"
                      value={formData.clinicAddress}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateField('clinicAddress', e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="verificationDocument">Verification Document (Required, max 5MB)</Label>
                    <Input
                      id="verificationDocument"
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.webp"
                      onChange={handleVerificationDocumentChange}
                      required
                      className="h-12"
                    />
                    {verificationDocumentName ? (
                      <p className="text-xs text-muted-foreground">Selected: {verificationDocumentName}</p>
                    ) : null}
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a password"
                    value={formData.password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('password', e.target.value)}
                    required
                    className="h-12 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex items-center justify-center px-3 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Re-enter your password"
                    value={formData.confirmPassword}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('confirmPassword', e.target.value)}
                    required
                    className="h-12 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex items-center justify-center px-3 text-muted-foreground hover:text-foreground"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            {role === 'doctor' && (
              <div className="bg-muted/50 p-4 rounded-lg text-sm text-muted-foreground">
                <p>
                  <strong className="text-foreground">Note:</strong> Healthcare provider accounts
                  require verification. You'll be able to access your account after our team reviews
                  your credentials.
                </p>
              </div>
            )}

            <Button type="submit" className="w-full h-12 text-base" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : role === 'doctor' ? 'Submit for Verification' : 'Create Account'}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <Link to="/login" className="text-primary hover:underline font-medium">
              Log in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
