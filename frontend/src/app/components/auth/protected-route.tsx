import React, { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { getDashboardPath, useAuth, UserRole } from '@/app/lib/auth-context';
import { Button } from '@/app/components/ui/button';

type GuardStatus = 'checking' | 'authorized' | 'unauthenticated' | 'forbidden';

interface ProtectedRouteProps {
  allowedRoles: UserRole[];
}

function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, token, user, updateUser, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState<GuardStatus>('checking');
  const [resolvedRole, setResolvedRole] = useState<UserRole | null>(user?.role || null);
  const allowedRolesKey = allowedRoles.join(',');

  useEffect(() => {
    let isCancelled = false;

    const verifySession = async () => {
      if (!isAuthenticated || !token || !user) {
        if (!isCancelled) setStatus('unauthenticated');
        return;
      }

      try {
        const response = await fetch('/api/profile/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error || 'Session verification failed.');
        }

        const dbUser = data?.user;
        if (!dbUser) {
          throw new Error('Session verification failed.');
        }

        const idMatches = String(dbUser.id) === String(user.id);
        const roleMatches = dbUser.role === user.role;

        if (!idMatches || !roleMatches) {
          await logout();
          if (!isCancelled) setStatus('unauthenticated');
          return;
        }

        const isDoctorVerified = dbUser.role === 'doctor' ? data?.profile?.verification_status === 'approved' : undefined;

        const nextUser = {
          id: String(dbUser.id),
          username: dbUser.username,
          email: dbUser.email || '',
          role: dbUser.role as UserRole,
          name: data?.profile?.full_name || dbUser.username,
          verified: isDoctorVerified,
          verificationStatus: data?.profile?.verification_status,
        };

        const shouldUpdateUser =
          user.id !== nextUser.id ||
          user.username !== nextUser.username ||
          user.email !== nextUser.email ||
          user.role !== nextUser.role ||
          user.name !== nextUser.name ||
          user.verified !== nextUser.verified ||
          user.verificationStatus !== nextUser.verificationStatus;

        if (shouldUpdateUser) {
          updateUser(nextUser);
        }

        if (!allowedRoles.includes(dbUser.role)) {
          if (!isCancelled) {
            setResolvedRole(dbUser.role);
            setStatus('forbidden');
          }
          return;
        }

        const isDoctorDashboardRoute = location.pathname.startsWith('/doctor/dashboard');

        if (
          dbUser.role === 'doctor' &&
          data?.profile?.verification_status !== 'approved' &&
          !isDoctorDashboardRoute
        ) {
          if (!isCancelled) {
            setResolvedRole(dbUser.role);
            setStatus('forbidden');
          }
          return;
        }

        if (!isCancelled) {
          setResolvedRole(dbUser.role);
          setStatus('authorized');
        }
      } catch {
        try {
          await logout();
        } catch {
          // Ignore logout errors while forcing local unauthenticated state.
        }
        if (!isCancelled) setStatus('unauthenticated');
      }
    };

    verifySession();

    return () => {
      isCancelled = true;
    };
  }, [
    allowedRolesKey,
    isAuthenticated,
    logout,
    token,
    updateUser,
    user?.id,
    user?.username,
    user?.email,
    user?.role,
    user?.name,
    user?.verified,
    user?.verificationStatus,
    location.pathname,
  ]);

  if (status === 'checking') {
    return (
      <div className="container mx-auto px-4 py-10 text-sm text-muted-foreground">
        Verifying session...
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="rounded-lg border bg-card p-8 text-center">
          <h1 className="text-2xl font-semibold mb-3">Unauthorized</h1>
          <p className="text-muted-foreground mb-6">
            You must be logged in to access this page.
          </p>
          <Button onClick={() => navigate('/login')}>Go to Login</Button>
        </div>
      </div>
    );
  }

  if (status === 'forbidden') {
    const role = resolvedRole || user?.role || 'patient';
    const isUnverifiedDoctorTryingRestrictedRoute =
      role === 'doctor' && user?.verified === false && !location.pathname.startsWith('/doctor/dashboard');

    return (
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="rounded-lg border bg-card p-8 text-center">
          <h1 className="text-2xl font-semibold mb-3">Unauthorized</h1>
          <p className="text-muted-foreground mb-6">
            {isUnverifiedDoctorTryingRestrictedRoute
              ? 'Your doctor account is not verified yet. Only the dashboard is available until verification is approved.'
              : 'You do not have permission to access this page.'}
          </p>
          <Button onClick={() => navigate(getDashboardPath(role))}>Go to Dashboard</Button>
        </div>
      </div>
    );
  }

  return <Outlet />;
}

export function RequirePatientRoute() {
  return <ProtectedRoute allowedRoles={PATIENT_ROLES} />;
}

export function RequireDoctorRoute() {
  return <ProtectedRoute allowedRoles={DOCTOR_ROLES} />;
}

export function RequireAdminRoute() {
  return <ProtectedRoute allowedRoles={ADMIN_ROLES} />;
}

const PATIENT_ROLES: UserRole[] = ['patient'];
const DOCTOR_ROLES: UserRole[] = ['doctor'];
const ADMIN_ROLES: UserRole[] = ['admin'];
