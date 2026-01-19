/**
 * React Query Hooks for SchoolOS
 * 
 * Provides type-safe data fetching hooks using TanStack Query.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi, User, LoginDto, RegisterDto } from '../api/auth';
import { usersApi, UserListParams, CreateUserDto, UpdateUserDto, UpdateUserStatusDto } from '../api/users';
import { knowledgeApi, KnowledgeListParams, SearchParams, UpdateKnowledgeDto, ReviewDecisionDto } from '../api/knowledge';
import { relationshipsApi, RelationshipListParams, CreateRelationshipDto, UpdateRelationshipDto } from '../api/relationships';

// Query Keys
export const queryKeys = {
  // Auth
  currentUser: ['currentUser'] as const,
  
  // Users
  users: (params?: UserListParams) => ['users', params] as const,
  user: (id: string) => ['user', id] as const,
  
  // Knowledge
  knowledgeSources: (params?: KnowledgeListParams) => ['knowledgeSources', params] as const,
  knowledgeSource: (id: string) => ['knowledgeSource', id] as const,
  knowledgeChunks: (id: string) => ['knowledgeChunks', id] as const,
  knowledgeSearch: (params: SearchParams) => ['knowledgeSearch', params] as const,
  pendingReviews: ['pendingReviews'] as const,
  freshnessStatus: ['freshnessStatus'] as const,
  expiringSoon: (days?: number) => ['expiringSoon', days] as const,
  
  // Relationships
  relationships: (params?: RelationshipListParams) => ['relationships', params] as const,
  myRelationships: ['myRelationships'] as const,
  relationship: (id: string) => ['relationship', id] as const,
  userRelationships: (userId: string) => ['userRelationships', userId] as const,
};

// ==================== AUTH HOOKS ====================

export function useCurrentUser() {
  return useQuery({
    queryKey: queryKeys.currentUser,
    queryFn: () => authApi.me(),
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: LoginDto) => authApi.login(data),
    onSuccess: (response) => {
      queryClient.setQueryData(queryKeys.currentUser, response.user);
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: RegisterDto) => authApi.register(data),
    onSuccess: (response) => {
      queryClient.setQueryData(queryKeys.currentUser, response.user);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (params?: { refreshToken?: string; allDevices?: boolean }) =>
      authApi.logout(params?.refreshToken, params?.allDevices),
    onSuccess: () => {
      queryClient.clear();
    },
  });
}

// ==================== USERS HOOKS ====================

export function useUsers(params?: UserListParams) {
  return useQuery({
    queryKey: queryKeys.users(params),
    queryFn: () => usersApi.list(params),
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: queryKeys.user(id),
    queryFn: () => usersApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateUserDto) => usersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserDto }) => usersApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.user(id) });
    },
  });
}

export function useUpdateUserStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserStatusDto }) => usersApi.updateStatus(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.user(id) });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => usersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

// ==================== KNOWLEDGE HOOKS ====================

export function useKnowledgeSources(params?: KnowledgeListParams) {
  return useQuery({
    queryKey: queryKeys.knowledgeSources(params),
    queryFn: () => knowledgeApi.list(params),
  });
}

export function useKnowledgeSource(id: string) {
  return useQuery({
    queryKey: queryKeys.knowledgeSource(id),
    queryFn: () => knowledgeApi.getById(id),
    enabled: !!id,
  });
}

export function useKnowledgeChunks(id: string) {
  return useQuery({
    queryKey: queryKeys.knowledgeChunks(id),
    queryFn: () => knowledgeApi.getChunks(id),
    enabled: !!id,
  });
}

export function useKnowledgeSearch(params: SearchParams, enabled = true) {
  return useQuery({
    queryKey: queryKeys.knowledgeSearch(params),
    queryFn: () => knowledgeApi.search(params),
    enabled: enabled && !!params.query,
  });
}

export function usePendingReviews() {
  return useQuery({
    queryKey: queryKeys.pendingReviews,
    queryFn: () => knowledgeApi.getPendingReviews(),
  });
}

export function useFreshnessStatus() {
  return useQuery({
    queryKey: queryKeys.freshnessStatus,
    queryFn: () => knowledgeApi.getFreshnessStatus(),
  });
}

export function useExpiringSoon(days?: number) {
  return useQuery({
    queryKey: queryKeys.expiringSoon(days),
    queryFn: () => knowledgeApi.getExpiringSoon(days),
  });
}

export function useUploadKnowledge() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ file, metadata }: { file: File; metadata: { title?: string; category?: string; tags?: string[] } }) =>
      knowledgeApi.upload(file, metadata),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledgeSources'] });
    },
  });
}

export function useUpdateKnowledge() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateKnowledgeDto }) => knowledgeApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['knowledgeSources'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.knowledgeSource(id) });
    },
  });
}

export function useDeleteKnowledge() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => knowledgeApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledgeSources'] });
    },
  });
}

export function usePublishKnowledge() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => knowledgeApi.publish(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledgeSources'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.pendingReviews });
    },
  });
}

export function useApproveKnowledge() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: ReviewDecisionDto }) => knowledgeApi.approve(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledgeSources'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.pendingReviews });
    },
  });
}

export function useRejectKnowledge() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: ReviewDecisionDto }) => knowledgeApi.reject(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledgeSources'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.pendingReviews });
    },
  });
}

// ==================== RELATIONSHIPS HOOKS ====================

export function useRelationships(params?: RelationshipListParams) {
  return useQuery({
    queryKey: queryKeys.relationships(params),
    queryFn: () => relationshipsApi.list(params),
  });
}

export function useMyRelationships() {
  return useQuery({
    queryKey: queryKeys.myRelationships,
    queryFn: () => relationshipsApi.getMyRelationships(),
  });
}

export function useRelationship(id: string) {
  return useQuery({
    queryKey: queryKeys.relationship(id),
    queryFn: () => relationshipsApi.getById(id),
    enabled: !!id,
  });
}

export function useUserRelationships(userId: string) {
  return useQuery({
    queryKey: queryKeys.userRelationships(userId),
    queryFn: () => relationshipsApi.getByUserId(userId),
    enabled: !!userId,
  });
}

export function useCreateRelationship() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateRelationshipDto) => relationshipsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['relationships'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.myRelationships });
    },
  });
}

export function useUpdateRelationship() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRelationshipDto }) => relationshipsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['relationships'] });
    },
  });
}

export function useVerifyRelationship() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => relationshipsApi.verify(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['relationships'] });
    },
  });
}

export function useRevokeRelationship() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => relationshipsApi.revoke(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['relationships'] });
    },
  });
}
