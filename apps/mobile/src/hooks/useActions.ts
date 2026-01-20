/**
 * API Hooks - Actions
 *
 * React Query hooks for action items (permissions, payments, forms, etc.)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '../lib/api';

// Types
export type ActionUrgency = 'low' | 'medium' | 'high' | 'critical';
export type ActionType = 'form' | 'payment' | 'permission' | 'meeting' | 'document' | 'other';
export type ActionStatus = 'pending' | 'in_progress' | 'completed' | 'expired' | 'cancelled';

export interface ActionItem {
  id: string;
  title: string;
  description?: string;
  urgency: ActionUrgency;
  type: ActionType;
  status: ActionStatus;
  deadline?: Date;
  childId: string;
  childName?: string;
  createdAt: Date;
  completedAt?: Date;
  quickActions?: QuickAction[];
  formUrl?: string;
  paymentAmount?: number;
  metadata?: Record<string, unknown>;
}

export interface QuickAction {
  id: string;
  label: string;
  variant: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  action: string;
}

export interface ActionFilters {
  childId?: string;
  status?: ActionStatus;
  urgency?: ActionUrgency[];
  type?: ActionType[];
}

// API functions
async function fetchActions(filters: ActionFilters): Promise<ActionItem[]> {
  const params = new URLSearchParams();
  
  if (filters.childId) params.append('childId', filters.childId);
  if (filters.status) params.append('status', filters.status);
  if (filters.urgency) filters.urgency.forEach((u) => params.append('urgency', u));
  if (filters.type) filters.type.forEach((t) => params.append('type', t));

  const data = await apiGet<any[]>(`/actions?${params.toString()}`);
  
  // Parse dates
  return data.map((action: any) => ({
    ...action,
    deadline: action.deadline ? new Date(action.deadline) : undefined,
    createdAt: new Date(action.createdAt),
    completedAt: action.completedAt ? new Date(action.completedAt) : undefined,
  }));
}

async function fetchAction(actionId: string): Promise<ActionItem> {
  const data = await apiGet<any>(`/actions/${actionId}`);
  return {
    ...data,
    deadline: data.deadline ? new Date(data.deadline) : undefined,
    createdAt: new Date(data.createdAt),
    completedAt: data.completedAt ? new Date(data.completedAt) : undefined,
  };
}

async function completeAction(actionId: string): Promise<ActionItem> {
  const data = await apiPost<any>(`/actions/${actionId}/complete`);
  return {
    ...data,
    deadline: data.deadline ? new Date(data.deadline) : undefined,
    createdAt: new Date(data.createdAt),
    completedAt: data.completedAt ? new Date(data.completedAt) : undefined,
  };
}

async function dismissAction(actionId: string): Promise<void> {
  await apiPost(`/actions/${actionId}/dismiss`);
}

// Hooks
export function useActions(filters: ActionFilters = {}) {
  return useQuery({
    queryKey: ['actions', filters],
    queryFn: () => fetchActions(filters),
  });
}

export function useAction(actionId: string | undefined) {
  return useQuery({
    queryKey: ['action', actionId],
    queryFn: () => fetchAction(actionId!),
    enabled: !!actionId,
  });
}

export function usePendingActions(childId?: string) {
  return useActions({
    childId,
    status: 'pending',
  });
}

export function useUrgentActions(childId?: string) {
  return useActions({
    childId,
    status: 'pending',
    urgency: ['high', 'critical'],
  });
}

export function useCompleteAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      actionId,
      quickActionId,
    }: {
      actionId: string;
      quickActionId?: string;
    }) => completeAction(actionId, quickActionId),
    onSuccess: (data, variables) => {
      // Update action cache
      queryClient.invalidateQueries({
        queryKey: ['action', variables.actionId],
      });
      
      // Update actions list
      queryClient.invalidateQueries({
        queryKey: ['actions'],
      });
    },
  });
}

export function useDismissAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: dismissAction,
    onSuccess: (_, actionId) => {
      // Invalidate all action queries
      queryClient.invalidateQueries({
        queryKey: ['actions'],
      });
      
      queryClient.removeQueries({
        queryKey: ['action', actionId],
      });
    },
  });
}

// Helper hook for home screen - combines urgent actions for all children
export function useHomeActions() {
  const { data: allActions, isLoading, error, refetch } = useActions({
    status: 'pending',
  });

  // Sort by urgency and deadline
  const sortedActions = allActions?.sort((a, b) => {
    const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const urgencyDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    
    if (urgencyDiff !== 0) return urgencyDiff;
    
    // Then by deadline (sooner first)
    if (a.deadline && b.deadline) {
      return a.deadline.getTime() - b.deadline.getTime();
    }
    if (a.deadline) return -1;
    if (b.deadline) return 1;
    
    return 0;
  });

  const criticalActions = sortedActions?.filter(
    (a) => a.urgency === 'critical' || a.urgency === 'high'
  );

  const otherActions = sortedActions?.filter(
    (a) => a.urgency === 'medium' || a.urgency === 'low'
  );

  return {
    allActions: sortedActions,
    criticalActions,
    otherActions,
    totalCount: allActions?.length || 0,
    criticalCount: criticalActions?.length || 0,
    isLoading,
    error,
    refetch,
  };
}
