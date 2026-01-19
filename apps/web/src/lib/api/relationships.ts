/**
 * Relationships API types and functions
 */

import { api } from './client';
import type { User } from './auth';

// Types
export type RelationshipType = 
  | 'PARENT_OF'
  | 'GUARDIAN_OF'
  | 'TEACHER_OF'
  | 'COTEACHER_OF'
  | 'COUNSELOR_OF'
  | 'ADMIN_OF';

export type RelationshipStatus = 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'REVOKED';

export interface UserRelationship {
  id: string;
  districtId: string;
  userId: string;
  relatedUserId: string;
  relationshipType: RelationshipType;
  status: RelationshipStatus;
  isPrimary: boolean | null;
  sectionId: string | null;
  metadata: Record<string, unknown>;
  startDate: string;
  endDate: string | null;
  verifiedBy: string | null;
  verifiedAt: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  // Populated relations
  user?: User;
  relatedUser?: User;
}

export interface RelationshipListParams {
  page?: number;
  limit?: number;
  relationshipType?: RelationshipType;
  status?: RelationshipStatus;
  userId?: string;
}

export interface RelationshipListResponse {
  relationships: UserRelationship[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateRelationshipDto {
  userId: string;
  relatedUserId: string;
  relationshipType: RelationshipType;
  isPrimary?: boolean;
  sectionId?: string;
  metadata?: Record<string, unknown>;
  startDate?: string;
  endDate?: string;
}

export interface UpdateRelationshipDto {
  isPrimary?: boolean;
  metadata?: Record<string, unknown>;
  endDate?: string;
}

// Relationships API functions
export const relationshipsApi = {
  list: async (params?: RelationshipListParams): Promise<RelationshipListResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.relationshipType) searchParams.set('relationshipType', params.relationshipType);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.userId) searchParams.set('userId', params.userId);

    const query = searchParams.toString();
    return api.get<RelationshipListResponse>(`/relationships${query ? `?${query}` : ''}`);
  },

  getMyRelationships: async (): Promise<UserRelationship[]> => {
    return api.get<UserRelationship[]>('/relationships/me');
  },

  getById: async (id: string): Promise<UserRelationship> => {
    return api.get<UserRelationship>(`/relationships/${id}`);
  },

  getByUserId: async (userId: string): Promise<UserRelationship[]> => {
    return api.get<UserRelationship[]>(`/relationships/user/${userId}`);
  },

  create: async (data: CreateRelationshipDto): Promise<UserRelationship> => {
    return api.post<UserRelationship>('/relationships', data);
  },

  createBulk: async (relationships: CreateRelationshipDto[]): Promise<{
    created: number;
    failed: number;
    errors: Array<{ index: number; error: string }>;
  }> => {
    return api.post('/relationships/bulk', { relationships });
  },

  update: async (id: string, data: UpdateRelationshipDto): Promise<UserRelationship> => {
    return api.put<UserRelationship>(`/relationships/${id}`, data);
  },

  verify: async (id: string): Promise<UserRelationship> => {
    return api.post<UserRelationship>(`/relationships/${id}/verify`);
  },

  revoke: async (id: string, reason?: string): Promise<UserRelationship> => {
    return api.post<UserRelationship>(`/relationships/${id}/revoke`, { reason });
  },

  delete: async (id: string): Promise<void> => {
    return api.delete(`/relationships/${id}`);
  },
};
