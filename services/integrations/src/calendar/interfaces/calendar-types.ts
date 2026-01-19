export type CalendarEventType =
  | 'NO_SCHOOL'
  | 'EARLY_RELEASE'
  | 'SCHOOL_EVENT'
  | 'HOLIDAY'
  | 'MEETING';

export type CalendarAudience = 'ALL' | 'PARENTS' | 'STUDENTS' | 'STAFF';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  isAllDay: boolean;
  type: CalendarEventType;
  location?: string;
  audience?: CalendarAudience;
  metadata?: Record<string, unknown>;
}

export interface CalendarSyncOptions {
  startDate: Date;
  endDate: Date;
  maxResults?: number;
}
