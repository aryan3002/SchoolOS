/**
 * Knowledge (Documents) API types and functions
 */

import { api } from './client';

// Types
export type KnowledgeSourceType = 
  | 'PDF'
  | 'WEB_PAGE'
  | 'POLICY_DOCUMENT'
  | 'HANDBOOK'
  | 'ANNOUNCEMENT'
  | 'FAQ'
  | 'FORM'
  | 'CALENDAR';

export type KnowledgeSourceStatus = 
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'PUBLISHED'
  | 'ARCHIVED'
  | 'EXPIRED';

export interface KnowledgeSource {
  id: string;
  districtId: string;
  title: string;
  description: string | null;
  sourceType: KnowledgeSourceType;
  content: string | null;
  originalUrl: string | null;
  fileUrl: string | null;
  fileMimeType: string | null;
  fileSize: number | null;
  version: number;
  status: KnowledgeSourceStatus;
  isPublic: boolean;
  visibleToRoles: string[];
  category: string | null;
  tags: string[];
  publishedAt: string | null;
  expiresAt: string | null;
  processedAt: string | null;
  processingError: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  _count?: {
    chunks: number;
  };
}

export interface KnowledgeChunk {
  id: string;
  sourceId: string;
  content: string;
  chunkIndex: number;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface KnowledgeListParams {
  page?: number;
  pageSize?: number;
  status?: KnowledgeSourceStatus;
  sourceType?: KnowledgeSourceType;
  category?: string;
  tags?: string;
  searchQuery?: string;
}

export interface KnowledgeListResponse {
  items: KnowledgeSource[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface SearchParams {
  query: string;
  limit?: number;
  threshold?: number;
  sourceTypes?: KnowledgeSourceType[];
  categories?: string[];
}

export interface SearchResult {
  chunk: KnowledgeChunk;
  source: KnowledgeSource;
  score: number;
  highlights: string[];
}

export interface UpdateKnowledgeDto {
  title?: string;
  description?: string;
  category?: string;
  tags?: string[];
  isPublic?: boolean;
  visibleToRoles?: string[];
  expiresAt?: string;
}

export interface ReviewDecisionDto {
  notes?: string;
}

// Knowledge API functions
export const knowledgeApi = {
  list: async (params?: KnowledgeListParams): Promise<KnowledgeListResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));
    if (params?.status) searchParams.set('status', params.status);
    if (params?.sourceType) searchParams.set('sourceType', params.sourceType);
    if (params?.category) searchParams.set('category', params.category);
    if (params?.tags) searchParams.set('tags', params.tags);
    if (params?.searchQuery) searchParams.set('searchQuery', params.searchQuery);

    const query = searchParams.toString();
    return api.get<KnowledgeListResponse>(`/knowledge/sources${query ? `?${query}` : ''}`);
  },

  getById: async (id: string): Promise<KnowledgeSource> => {
    return api.get<KnowledgeSource>(`/knowledge/sources/${id}`);
  },

  getChunks: async (id: string): Promise<KnowledgeChunk[]> => {
    return api.get<KnowledgeChunk[]>(`/knowledge/sources/${id}/chunks`);
  },

  upload: async (file: File, metadata: { title?: string; category?: string; tags?: string[] }): Promise<KnowledgeSource> => {
    const formData = new FormData();
    formData.append('file', file);
    if (metadata.title) formData.append('title', metadata.title);
    if (metadata.category) formData.append('category', metadata.category);
    if (metadata.tags) formData.append('tags', JSON.stringify(metadata.tags));

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/knowledge/sources/upload`, {
      method: 'POST',
      body: formData,
      headers: {
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        'X-District-ID': localStorage.getItem('districtId') || '',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Upload failed');
    }

    const data = await response.json();
    return data.data || data;
  },

  getStatus: async (id: string): Promise<{ status: string; progress?: number; error?: string }> => {
    return api.get(`/knowledge/sources/${id}/status`);
  },

  update: async (id: string, data: UpdateKnowledgeDto): Promise<KnowledgeSource> => {
    return api.put<KnowledgeSource>(`/knowledge/sources/${id}`, data);
  },

  delete: async (id: string): Promise<void> => {
    return api.delete(`/knowledge/sources/${id}`);
  },

  search: async (params: SearchParams): Promise<SearchResult[]> => {
    return api.post<SearchResult[]>('/knowledge/search', params);
  },

  // Workflow actions
  submitForReview: async (id: string): Promise<KnowledgeSource> => {
    return api.post<KnowledgeSource>(`/knowledge/sources/${id}/submit-review`);
  },

  approve: async (id: string, data?: ReviewDecisionDto): Promise<KnowledgeSource> => {
    return api.post<KnowledgeSource>(`/knowledge/sources/${id}/approve`, data);
  },

  reject: async (id: string, data?: ReviewDecisionDto): Promise<KnowledgeSource> => {
    return api.post<KnowledgeSource>(`/knowledge/sources/${id}/reject`, data);
  },

  publish: async (id: string): Promise<KnowledgeSource> => {
    return api.post<KnowledgeSource>(`/knowledge/sources/${id}/publish`);
  },

  unpublish: async (id: string): Promise<KnowledgeSource> => {
    return api.post<KnowledgeSource>(`/knowledge/sources/${id}/unpublish`);
  },

  archive: async (id: string): Promise<KnowledgeSource> => {
    return api.post<KnowledgeSource>(`/knowledge/sources/${id}/archive`);
  },

  // Bulk actions
  bulkPublish: async (ids: string[]): Promise<{ success: number; failed: number }> => {
    return api.post('/knowledge/bulk/publish', { ids });
  },

  bulkArchive: async (ids: string[]): Promise<{ success: number; failed: number }> => {
    return api.post('/knowledge/bulk/archive', { ids });
  },

  bulkDelete: async (ids: string[]): Promise<{ success: number; failed: number }> => {
    return api.post('/knowledge/bulk/delete', { ids });
  },

  // Review and freshness
  getPendingReviews: async (): Promise<KnowledgeSource[]> => {
    return api.get<KnowledgeSource[]>('/knowledge/pending-reviews');
  },

  getFreshnessStatus: async (): Promise<{
    total: number;
    fresh: number;
    stale: number;
    expiring: number;
  }> => {
    return api.get('/knowledge/freshness-status');
  },

  getExpiringSoon: async (days?: number): Promise<KnowledgeSource[]> => {
    const params = days ? `?days=${days}` : '';
    return api.get<KnowledgeSource[]>(`/knowledge/expiring-soon${params}`);
  },
};
