import { Logger } from '../../../types';
import type { CalendarConnector, CalendarEvent, CalendarSyncOptions } from '../../interfaces';
import { GoogleCalendarClient, GoogleCalendarAuthConfig } from './google-calendar.client';
/**
 * Google Calendar connector implementation.
 */
export declare class GoogleCalendarConnector implements CalendarConnector {
    private readonly client;
    private readonly logger;
    constructor(config: GoogleCalendarAuthConfig, logger: Logger, client?: GoogleCalendarClient);
    syncCalendar(calendarId: string, options: CalendarSyncOptions): Promise<CalendarEvent[]>;
    testConnection(): Promise<{
        healthy: boolean;
        latency?: number;
        error?: string;
    }>;
    private mapToCalendarEvent;
    private inferEventType;
    private inferAudience;
}
//# sourceMappingURL=google-calendar.connector.d.ts.map