import React, { createContext, useContext, useState, ReactNode } from 'react';

export type UserRole = 'patient' | 'doctor' | 'admin';

export interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  role: UserRole;
  profileComplete?: boolean;
  verified?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
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
    }
  ) => Promise<void>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'utlwa_auth';
const API_BASE = '/api';

interface AuthApiResponse {
  token: string;
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
});

const saveAuthState = (user: User, token: string) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ user, token }));
};

const loadAuthState = (): { user: User | null; token: string | null } => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { user: null, token: null };

  try {
    const parsed = JSON.parse(raw);
    return {
      user: parsed.user || null,
      token: parsed.token || null,
    };
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return { user: null, token: null };
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [authState, setAuthState] = useState(() => loadAuthState());
  const { user, token } = authState;

  const login = async (email: string, password: string, role: UserRole) => {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, role }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error || 'Login failed');
    }

    const nextUser = mapApiUserToUser((data as AuthApiResponse).user);
    const nextToken = (data as AuthApiResponse).token;

    saveAuthState(nextUser, nextToken);
    setAuthState({ user: nextUser, token: nextToken });
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
    }
  ) => {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        name,
        role,
        ...extra,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error || 'Registration failed');
    }

    const nextUser = mapApiUserToUser((data as AuthApiResponse).user);
    const nextToken = (data as AuthApiResponse).token;

    saveAuthState(nextUser, nextToken);
    setAuthState({ user: nextUser, token: nextToken });
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setAuthState({ user: null, token: null });
  };

  const updateUser = (updates: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      if (token) {
        saveAuthState(updatedUser, token);
      }
      setAuthState((prev: { user: User | null; token: string | null }) => ({ ...prev, user: updatedUser }));
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, updateUser }}>
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
