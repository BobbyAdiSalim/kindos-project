import React, { createContext, useContext, useState, ReactNode } from 'react';

export type UserRole = 'patient' | 'doctor' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  profileComplete?: boolean;
  verified?: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, role: UserRole) => void;
  register: (email: string, password: string, name: string, role: UserRole) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  const login = (email: string, password: string, role: UserRole) => {
    // Mock login
    const mockUser: User = {
      id: Math.random().toString(36),
      email,
      name: email.split('@')[0],
      role,
      profileComplete: true,
      verified: role === 'doctor' ? true : undefined,
    };
    setUser(mockUser);
  };

  const register = (email: string, password: string, name: string, role: UserRole) => {
    // Mock registration
    const mockUser: User = {
      id: Math.random().toString(36),
      email,
      name,
      role,
      profileComplete: false,
      verified: role === 'doctor' ? false : undefined,
    };
    setUser(mockUser);
  };

  const logout = () => {
    setUser(null);
  };

  const updateUser = (updates: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...updates });
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateUser }}>
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
