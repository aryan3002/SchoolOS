import type { CalendarEvent, CalendarSyncOptions } from './calendar-types';

/**
 * CalendarConnector interface for vendor-agnostic calendar ingestion.
 */
export interface CalendarConnector {
  /**
   * Sync calendar events within a date range.
   */
  syncCalendar(
    calendarId: string,
    options: CalendarSyncOptions,
  ): Promise<CalendarEvent[]>;

  /**
   * Health check for the connector.
   */
  testConnection(): Promise<{ healthy: boolean; latency?: number; error?: string }>;
}

export type { CalendarEvent, CalendarSyncOptions };
