/**
 * API Hooks - Calendar & Events
 *
 * React Query hooks for calendar and event data
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types
export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: Date;
  startTime?: string;
  endTime?: string;
  isAllDay?: boolean;
  type: 'school' | 'class' | 'meeting' | 'deadline' | 'holiday' | 'custom';
  location?: string;
  childId?: string;
  schoolId?: string;
  requiresAction?: boolean;
  actionId?: string;
  recurrence?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    endDate?: Date;
  };
  metadata?: Record<string, unknown>;
}

export interface CalendarFilters {
  childId?: string;
  startDate?: Date;
  endDate?: Date;
  types?: CalendarEvent['type'][];
}

// API base URL
const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api';

// API functions
async function fetchEvents(filters: CalendarFilters): Promise<CalendarEvent[]> {
  const params = new URLSearchParams();
  
  if (filters.childId) params.append('childId', filters.childId);
  if (filters.startDate) params.append('startDate', filters.startDate.toISOString());
  if (filters.endDate) params.append('endDate', filters.endDate.toISOString());
  if (filters.types) filters.types.forEach((type) => params.append('types', type));

  const response = await fetch(`${API_BASE}/calendar/events?${params.toString()}`, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch events');
  }

  const data = await response.json();
  
  // Parse dates
  return data.map((event: any) => ({
    ...event,
    date: new Date(event.date),
    recurrence: event.recurrence
      ? {
          ...event.recurrence,
          endDate: event.recurrence.endDate
            ? new Date(event.recurrence.endDate)
            : undefined,
        }
      : undefined,
  }));
}

async function fetchEvent(eventId: string): Promise<CalendarEvent> {
  const response = await fetch(`${API_BASE}/calendar/events/${eventId}`, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch event');
  }

  const data = await response.json();
  return {
    ...data,
    date: new Date(data.date),
  };
}

async function fetchUpcomingEvents(
  childId: string,
  limit = 10
): Promise<CalendarEvent[]> {
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 30);

  const params = new URLSearchParams({
    childId,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    limit: limit.toString(),
  });

  const response = await fetch(`${API_BASE}/calendar/events?${params.toString()}`, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch upcoming events');
  }

  const data = await response.json();
  return data.map((event: any) => ({
    ...event,
    date: new Date(event.date),
  }));
}

// Hooks
export function useCalendarEvents(filters: CalendarFilters) {
  return useQuery({
    queryKey: ['calendar-events', filters],
    queryFn: () => fetchEvents(filters),
  });
}

export function useCalendarEvent(eventId: string | undefined) {
  return useQuery({
    queryKey: ['calendar-event', eventId],
    queryFn: () => fetchEvent(eventId!),
    enabled: !!eventId,
  });
}

export function useUpcomingEvents(childId: string | undefined, limit = 10) {
  return useQuery({
    queryKey: ['upcoming-events', childId, limit],
    queryFn: () => fetchUpcomingEvents(childId!, limit),
    enabled: !!childId,
  });
}

export function useTodayEvents(childId: string | undefined) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return useCalendarEvents({
    childId,
    startDate: today,
    endDate: tomorrow,
  });
}

export function useWeekEvents(childId: string | undefined) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Start of week (Sunday)
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  
  // End of week (Saturday)
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);

  return useCalendarEvents({
    childId,
    startDate: startOfWeek,
    endDate: endOfWeek,
  });
}

export function useMonthEvents(childId: string | undefined, year: number, month: number) {
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0);

  return useCalendarEvents({
    childId,
    startDate,
    endDate,
  });
}
