import { calendar_v3 } from 'googleapis';

import { Logger } from '../../../types';
import type {
  CalendarConnector,
  CalendarEvent,
  CalendarEventType,
  CalendarSyncOptions,
} from '../../interfaces';
import { GoogleCalendarClient, GoogleCalendarAuthConfig } from './google-calendar.client';

/**
 * Google Calendar connector implementation.
 */
export class GoogleCalendarConnector implements CalendarConnector {
  private readonly client: GoogleCalendarClient;
  private readonly logger: Logger;

  constructor(
    config: GoogleCalendarAuthConfig,
    logger: Logger,
    client?: GoogleCalendarClient,
  ) {
    this.client = client ?? new GoogleCalendarClient(config);
    this.logger = logger.child ? logger.child({ vendor: 'google_calendar' }) : logger;
  }

  async syncCalendar(
    calendarId: string,
    options: CalendarSyncOptions,
  ): Promise<CalendarEvent[]> {
    const calendar = this.client.calendar();

    const response = await calendar.events.list({
      calendarId,
      timeMin: options.startDate.toISOString(),
      timeMax: options.endDate.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: options.maxResults ?? 2500,
    });

    const events = (response.data.items ?? []).map((event) =>
      this.mapToCalendarEvent(event),
    );

    this.logger.info('Google calendar synced', {
      calendarId,
      count: events.length,
    });

    return events;
  }

  async testConnection(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
    const start = Date.now();
    try {
      await this.client.calendar().calendarList.list({ maxResults: 1 });
      return { healthy: true, latency: Date.now() - start };
    } catch (error) {
      return {
        healthy: false,
        latency: Date.now() - start,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private mapToCalendarEvent(event: calendar_v3.Schema$Event): CalendarEvent {
    if (!event.id || !event.summary || !event.start || !event.end) {
      throw new Error('Invalid Google Calendar event payload');
    }

    const startDate = event.start.dateTime
      ? new Date(event.start.dateTime)
      : new Date(event.start.date ?? '');
    const endDate = event.end.dateTime
      ? new Date(event.end.dateTime)
      : new Date(event.end.date ?? '');

    return {
      id: event.id,
      title: event.summary,
      description: event.description ?? undefined,
      startDate,
      endDate,
      isAllDay: !event.start.dateTime,
      type: this.inferEventType(event.summary),
      location: event.location ?? undefined,
      audience: this.inferAudience(event),
      metadata: event,
    };
  }

  private inferEventType(title: string): CalendarEventType {
    const lower = title.toLowerCase();

    if (lower.includes('no school') || lower.includes('holiday')) {
      return 'NO_SCHOOL';
    }
    if (lower.includes('early release')) {
      return 'EARLY_RELEASE';
    }
    if (lower.includes('meeting') || lower.includes('conference')) {
      return 'MEETING';
    }
    return 'SCHOOL_EVENT';
  }

  private inferAudience(event: calendar_v3.Schema$Event): CalendarEvent['audience'] {
    const summary = (event.summary ?? '').toLowerCase();
    const description = (event.description ?? '').toLowerCase();
    const text = `${summary} ${description}`;

    if (text.includes('staff')) return 'STAFF';
    if (text.includes('parent')) return 'PARENTS';
    if (text.includes('student')) return 'STUDENTS';
    return 'ALL';
  }
}
