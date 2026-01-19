/**
 * Districts API types and functions
 */

import { api } from './client';

// Types
export interface District {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  timezone: string;
  settings: Record<string, unknown>;
  features: Record<string, unknown>;
  branding: {
    primaryColor?: string;
    logo?: string;
    [key: string]: unknown;
  };
  maxUsers: number;
  maxStorageGb: number;
  createdAt: string;
  updatedAt: string;
}

export interface School {
  id: string;
  districtId: string;
  name: string;
  code: string;
  type: string;
  address: Record<string, unknown> | null;
  phone: string | null;
  principal: string | null;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// Districts API functions (limited - mainly for login/selection)
export const districtsApi = {
  // Get district by slug (for login page)
  getBySlug: async (slug: string): Promise<District> => {
    return api.get<District>(`/districts/slug/${slug}`);
  },

  // Get current district (authenticated)
  getCurrent: async (): Promise<District> => {
    return api.get<District>('/districts/current');
  },

  // Get schools in current district
  getSchools: async (): Promise<School[]> => {
    return api.get<School[]>('/districts/current/schools');
  },
};
