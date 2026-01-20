/**
 * API Hooks - Conversation
 *
 * React Query hooks for AI chat interactions
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '../lib/api';

// Types
export interface Message {
  id: string;
  conversationId: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: Date;
  citations?: Citation[];
  followUpQuestions?: string[];
  confidenceScore?: number;
  metadata?: Record<string, unknown>;
}

export interface Citation {
  id: string;
  title: string;
  source: string;
  url?: string;
  snippet?: string;
}

export interface Conversation {
  id: string;
  title?: string;
  childId: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SendMessageInput {
  conversationId?: string;
  content: string;
  childId: string;
}

export interface SendMessageResponse {
  message: Message;
  conversationId: string;
}

// API functions
async function fetchConversation(conversationId: string): Promise<Conversation> {
  return apiGet<Conversation>(`/chat/conversations/${conversationId}`);
}

async function fetchConversations(childId?: string): Promise<Conversation[]> {
  const url = childId
    ? `/chat/conversations?childId=${childId}`
    : `/chat/conversations`;

  return apiGet<Conversation[]>(url);
}

async function sendMessage(input: SendMessageInput): Promise<SendMessageResponse> {
  return apiPost<SendMessageResponse>('/chat/message', input);
}

// Hooks
export function useConversation(conversationId: string | undefined) {
  return useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: () => fetchConversation(conversationId!),
    enabled: !!conversationId,
  });
}

export function useConversations(childId?: string) {
  return useQuery({
    queryKey: ['conversations', childId],
    queryFn: () => fetchConversations(childId),
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: sendMessage,
    onSuccess: (data, variables) => {
      // Update conversation cache
      queryClient.invalidateQueries({
        queryKey: ['conversation', data.conversationId],
      });
      
      // Update conversations list
      queryClient.invalidateQueries({
        queryKey: ['conversations'],
      });
    },
  });
}

// Streaming support for real-time responses
export function useStreamingMessage() {
  return useMutation({
    mutationFn: async (input: SendMessageInput) => {
      // Note: Streaming requires custom handling - using apiPost would read the full response
      // For streaming, we need direct fetch with auth headers
      const { useAppStore } = await import('../store/appStore');
      const token = useAppStore.getState().token;
      const { API_BASE } = await import('../lib/api');
      
      const response = await fetch(`${API_BASE}/chat/message/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        if (response.status === 401) {
          useAppStore.getState().logout();
          throw new Error('Session expired. Please log in again.');
        }
        throw new Error('Failed to start streaming');
      }

      return response;
    },
  });
}
