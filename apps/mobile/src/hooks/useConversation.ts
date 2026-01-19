/**
 * API Hooks - Conversation
 *
 * React Query hooks for AI chat interactions
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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

// API base URL - would come from env
const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api';

// API functions
async function fetchConversation(conversationId: string): Promise<Conversation> {
  const response = await fetch(`${API_BASE}/chat/conversations/${conversationId}`, {
    headers: {
      'Content-Type': 'application/json',
      // Auth header would be added by interceptor
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch conversation');
  }

  return response.json();
}

async function fetchConversations(childId?: string): Promise<Conversation[]> {
  const url = childId
    ? `${API_BASE}/chat/conversations?childId=${childId}`
    : `${API_BASE}/chat/conversations`;

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch conversations');
  }

  return response.json();
}

async function sendMessage(input: SendMessageInput): Promise<SendMessageResponse> {
  const response = await fetch(`${API_BASE}/chat/message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error('Failed to send message');
  }

  return response.json();
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
      const response = await fetch(`${API_BASE}/chat/message/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        throw new Error('Failed to start streaming');
      }

      return response;
    },
  });
}
