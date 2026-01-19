import { Logger } from '../../types';
import type {
  CalendarConnector,
  CalendarEvent,
  CalendarSyncOptions,
} from '../interfaces';

/**
 * CalendarSyncService orchestrates calendar syncs.
 */
export class CalendarSyncService {
  constructor(
    private readonly connector: CalendarConnector,
    private readonly logger: Logger,
  ) {}

  async sync(calendarId: string, options: CalendarSyncOptions): Promise<CalendarEvent[]> {
    this.logger.info('Starting calendar sync', { calendarId });
    const events = await this.connector.syncCalendar(calendarId, options);
    this.logger.info('Calendar sync complete', { calendarId, count: events.length });
    return events;
  }
}
