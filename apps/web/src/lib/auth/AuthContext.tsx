'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, authApi, getCurrentUser, isAuthenticated, clearTokens } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, districtId: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Try to get user from localStorage first
        const storedUser = getCurrentUser();
        if (storedUser && isAuthenticated()) {
          setUser(storedUser);
          // Optionally verify with server
          try {
            const freshUser = await authApi.me();
            setUser(freshUser);
            localStorage.setItem('user', JSON.stringify(freshUser));
          } catch {
            // Token expired, clear everything
            clearTokens();
            setUser(null);
          }
        }
      } catch (error) {
        console.error('Auth init error:', error);
        clearTokens();
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string, districtId: string) => {
    const response = await authApi.login({ email, password, districtId });
    setUser(response.user);
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
    }
  };

  const refreshUser = async () => {
    try {
      const freshUser = await authApi.me();
      setUser(freshUser);
      localStorage.setItem('user', JSON.stringify(freshUser));
    } catch {
      clearTokens();
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshUser,
      }}
    >
      {children as any}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
