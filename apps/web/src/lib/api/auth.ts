/**
 * Authentication API types and hooks
 */

import { api, setTokens, clearTokens, setDistrictId, getTokens } from './client';

// Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'PARENT' | 'TEACHER' | 'STUDENT' | 'ADMIN' | 'STAFF';
  status: 'PENDING' | 'PENDING_VERIFICATION' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'ARCHIVED';
  districtId: string;
  schoolId: string | null;
  emailVerified: boolean;
  lastLoginAt: string | null;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface AuthResponse {
  user: User;
  tokens: TokenPair;
}

export interface LoginDto {
  email: string;
  password: string;
  districtId: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: User['role'];
  districtId: string;
  schoolId?: string;
}

// Auth API functions
export const authApi = {
  login: async (data: LoginDto): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', data);
    setTokens(response.tokens.accessToken, response.tokens.refreshToken);
    setDistrictId(response.user.districtId);
    // Store user in localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(response.user));
    }
    return response;
  },

  register: async (data: RegisterDto): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/register', data);
    setTokens(response.tokens.accessToken, response.tokens.refreshToken);
    setDistrictId(response.user.districtId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(response.user));
    }
    return response;
  },

  logout: async (refreshToken?: string, allDevices?: boolean): Promise<void> => {
    try {
      const tokens = getTokens();
      await api.post('/auth/logout', {
        refreshToken: refreshToken || tokens.refreshToken,
        allDevices,
      });
    } finally {
      clearTokens();
    }
  },

  me: async (): Promise<User> => {
    return api.get<User>('/auth/me');
  },

  refreshTokens: async (refreshToken: string): Promise<TokenPair> => {
    const response = await api.post<TokenPair>('/auth/refresh', { refreshToken });
    setTokens(response.accessToken, response.refreshToken);
    return response;
  },

  forgotPassword: async (email: string, districtId: string): Promise<{ message: string }> => {
    return api.post<{ message: string }>('/auth/forgot-password', { email, districtId });
  },

  resetPassword: async (token: string, newPassword: string): Promise<{ message: string }> => {
    return api.post<{ message: string }>('/auth/reset-password', { token, newPassword });
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<{ message: string }> => {
    return api.post<{ message: string }>('/auth/change-password', { currentPassword, newPassword });
  },

  verifyEmail: async (token: string): Promise<{ message: string }> => {
    return api.post<{ message: string }>('/auth/verify-email', { token });
  },
};

// Helper to get current user from localStorage
export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') return null;
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

// Helper to check if user is authenticated
export function isAuthenticated(): boolean {
  const { accessToken } = getTokens();
  return !!accessToken;
}
