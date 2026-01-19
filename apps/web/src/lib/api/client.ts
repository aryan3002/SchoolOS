/**
 * API Client for SchoolOS Web Application
 * 
 * Handles all HTTP requests to the backend API with proper
 * authentication, error handling, and type safety.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_VERSION = 'v1';

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiResponse<T> {
  data: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

export class ApiClientError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

// Token storage (in production, use httpOnly cookies)
let accessToken: string | null = null;
let refreshToken: string | null = null;

export function setTokens(access: string, refresh: string) {
  accessToken = access;
  refreshToken = refresh;
  // Also store in localStorage for persistence
  if (typeof window !== 'undefined') {
    localStorage.setItem('accessToken', access);
    localStorage.setItem('refreshToken', refresh);
  }
}

export function getTokens() {
  if (typeof window !== 'undefined' && !accessToken) {
    accessToken = localStorage.getItem('accessToken');
    refreshToken = localStorage.getItem('refreshToken');
  }
  return { accessToken, refreshToken };
}

export function clearTokens() {
  accessToken = null;
  refreshToken = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('districtId');
  }
}

// Get stored district ID
export function getDistrictId(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('districtId');
  }
  return null;
}

export function setDistrictId(districtId: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('districtId', districtId);
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorData: ApiError;
    try {
      const data = await response.json();
      errorData = data.error || data;
    } catch {
      errorData = {
        code: 'UNKNOWN_ERROR',
        message: response.statusText || 'An unknown error occurred',
      };
    }
    throw new ApiClientError(
      errorData.code,
      errorData.message,
      response.status,
      errorData.details
    );
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  const data = await response.json();
  return data.data !== undefined ? data.data : data;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const { accessToken: token } = getTokens();
  const districtId = getDistrictId();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(districtId && { 'X-District-ID': districtId }),
    ...options.headers,
  };

  const url = `${API_BASE_URL}/api/${API_VERSION}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  // Handle token refresh on 401
  if (response.status === 401 && refreshToken) {
    try {
      const refreshResponse = await fetch(`${API_BASE_URL}/api/${API_VERSION}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (refreshResponse.ok) {
        const { accessToken: newAccess, refreshToken: newRefresh } = await refreshResponse.json();
        setTokens(newAccess, newRefresh);

        // Retry original request
        const retryResponse = await fetch(url, {
          ...options,
          headers: {
            ...headers,
            Authorization: `Bearer ${newAccess}`,
          },
          credentials: 'include',
        });

        return handleResponse<T>(retryResponse);
      }
    } catch {
      // Refresh failed, clear tokens
      clearTokens();
    }
  }

  return handleResponse<T>(response);
}

// Convenience methods
export const api = {
  get: <T>(endpoint: string, options?: RequestInit) =>
    apiRequest<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, data?: unknown, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T>(endpoint: string, data?: unknown, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),

  patch: <T>(endpoint: string, data?: unknown, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T>(endpoint: string, options?: RequestInit) =>
    apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),
};
