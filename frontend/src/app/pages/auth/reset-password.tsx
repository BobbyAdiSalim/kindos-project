import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { toast } from 'sonner';

const API_BASE = '/api';

export function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);

  const safeToken = useMemo(() => token || '', [token]);

  useEffect(() => {
    const validateToken = async () => {
      if (!safeToken) {
        setTokenValid(false);
        setIsValidating(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/auth/reset-password/${safeToken}/validate`);
        const data = await response.json();
        setTokenValid(Boolean(data?.valid));
      } catch {
        setTokenValid(false);
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
  }, [safeToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: safeToken, newPassword: password }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Unable to reset password');
      }

      toast.success('Password reset successful. Please log in.');
      navigate('/login', { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to reset password');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isValidating) {
    return (
      <div className="container mx-auto px-4 py-12 md:py-20 max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Validating reset link...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="container mx-auto px-4 py-12 md:py-20 max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Invalid or Expired Link</CardTitle>
            <CardDescription className="text-base">
              This reset link is no longer valid. Please request a new password reset link.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/forgot-password" className="block">
              <Button className="w-full">Request New Reset Link</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 md:py-20 max-w-md">
      <Card>
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl">Set a New Password</CardTitle>
          <CardDescription className="text-base">
            Enter your new password below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-new-password">Confirm New Password</Label>
              <Input
                id="confirm-new-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="h-12"
              />
            </div>

            <Button type="submit" className="w-full h-12 text-base" disabled={isSubmitting}>
              {isSubmitting ? 'Resetting...' : 'Reset Password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}