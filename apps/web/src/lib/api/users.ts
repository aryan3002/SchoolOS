/**
 * Users API types and functions
 */

import { api } from './client';
import type { User } from './auth';

// Types
export interface UserListParams {
  page?: number;
  limit?: number;
  role?: User['role'];
  status?: User['status'];
  search?: string;
  schoolId?: string;
}

export interface UserListResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateUserDto {
  email: string;
  firstName: string;
  lastName: string;
  role: User['role'];
  schoolId?: string;
  password?: string;
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  preferredName?: string;
  phoneNumber?: string;
  schoolId?: string;
  metadata?: Record<string, unknown>;
  preferences?: Record<string, unknown>;
}

export interface UpdateUserStatusDto {
  status: User['status'];
  reason?: string;
}

// Users API functions
export const usersApi = {
  list: async (params?: UserListParams): Promise<UserListResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.role) searchParams.set('role', params.role);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.schoolId) searchParams.set('schoolId', params.schoolId);

    const query = searchParams.toString();
    return api.get<UserListResponse>(`/users${query ? `?${query}` : ''}`);
  },

  getById: async (id: string): Promise<User> => {
    return api.get<User>(`/users/${id}`);
  },

  create: async (data: CreateUserDto): Promise<User> => {
    return api.post<User>('/users', data);
  },

  update: async (id: string, data: UpdateUserDto): Promise<User> => {
    return api.put<User>(`/users/${id}`, data);
  },

  updateStatus: async (id: string, data: UpdateUserStatusDto): Promise<User> => {
    return api.put<User>(`/users/${id}/status`, data);
  },

  delete: async (id: string): Promise<void> => {
    return api.delete(`/users/${id}`);
  },
};
