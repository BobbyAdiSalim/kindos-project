import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { disconnectSocket } from './socket';

export type UserRole = 'patient' | 'doctor' | 'admin';

export interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  role: UserRole;
  profileComplete?: boolean;
  verified?: boolean;
  verificationStatus?: 'pending' | 'approved' | 'denied';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, role: UserRole) => Promise<void>;
  register: (
    email: string,
    password: string,
    name: string,
    role: UserRole,
    extra?: {
      specialty?: string;
      licenseNumber?: string;
      clinicAddress?: string;
      verificationDocuments?: string[];
    }
  ) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE = '/api';
const SESSION_TOKEN_PLACEHOLDER = 'cookie-session';

interface AuthApiResponse {
  user: {
    id: number;
    username: string;
    email: string;
    role: UserRole;
    profile: {
      full_name?: string;
      profile_complete?: boolean;
      verification_status?: 'pending' | 'approved' | 'denied';
    } | null;
  };
}

const mapApiUserToUser = (apiUser: AuthApiResponse['user']): User => ({
  id: String(apiUser.id),
  username: apiUser.username,
  email: apiUser.email,
  name: apiUser.profile?.full_name || apiUser.username,
  role: apiUser.role,
  profileComplete: apiUser.profile?.profile_complete,
  verified: apiUser.role === 'doctor' ? apiUser.profile?.verification_status === 'approved' : undefined,
  verificationStatus: apiUser.role === 'doctor' ? apiUser.profile?.verification_status : undefined,
});

export const getDashboardPath = (role: UserRole) => {
  if (role === 'patient') return '/patient/dashboard';
  if (role === 'doctor') return '/doctor/dashboard';
  return '/admin/dashboard';
};

const parseApiResponse = async (response: Response): Promise<any> => {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  const text = await response.text();
  throw new Error(text.startsWith('<!DOCTYPE') ? 'Server returned an unexpected response.' : text);
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [authState, setAuthState] = useState<{ user: User | null; token: string | null }>({
    user: null,
    token: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const { user, token } = authState;

  useEffect(() => {
    let isCancelled = false;

    const restoreSession = async () => {
      try {
        const response = await fetch(`${API_BASE}/profile/me`, {
          credentials: 'include',
        });

        if (!response.ok) {
          if (!isCancelled) {
            setAuthState({ user: null, token: null });
          }
          return;
        }

        const data = await parseApiResponse(response);
        const nextUser = mapApiUserToUser((data as AuthApiResponse).user);

        if (!isCancelled) {
          setAuthState({ user: nextUser, token: SESSION_TOKEN_PLACEHOLDER });
        }
      } catch {
        if (!isCancelled) {
          setAuthState({ user: null, token: null });
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    restoreSession();

    return () => {
      isCancelled = true;
    };
  }, []);

  const login = async (email: string, password: string, role: UserRole) => {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password, role }),
    });

    const data = await parseApiResponse(response);
    if (!response.ok) {
      throw new Error(data?.error || 'Login failed');
    }

    const nextUser = mapApiUserToUser((data as AuthApiResponse).user);
    setAuthState({ user: nextUser, token: SESSION_TOKEN_PLACEHOLDER });
  };

  const register = async (
    email: string,
    password: string,
    name: string,
    role: UserRole,
    extra?: {
      specialty?: string;
      licenseNumber?: string;
      clinicAddress?: string;
      verificationDocuments?: string[];
    }
  ) => {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        email,
        password,
        name,
        role,
        ...extra,
      }),
    });

    const data = await parseApiResponse(response);
    if (!response.ok) {
      throw new Error(data?.error || 'Registration failed');
    }

    const nextUser = mapApiUserToUser((data as AuthApiResponse).user);
    setAuthState({ user: nextUser, token: SESSION_TOKEN_PLACEHOLDER });
  };

  const logout = async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
    } catch {
      // Intentionally ignored: local logout should still always proceed.
    }

    disconnectSocket();
    setAuthState({ user: null, token: null });
  };

  const updateUser = (updates: Partial<User>) => {
    if (!user) return;
    const updatedUser = { ...user, ...updates };
    setAuthState((prev) => ({ ...prev, user: updatedUser, token: SESSION_TOKEN_PLACEHOLDER }));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(user),
        isLoading,
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
