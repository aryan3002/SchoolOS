import { Logger } from '../../types';
import type { CalendarConnector, CalendarEvent, CalendarSyncOptions } from '../interfaces';
/**
 * CalendarSyncService orchestrates calendar syncs.
 */
export declare class CalendarSyncService {
    private readonly connector;
    private readonly logger;
    constructor(connector: CalendarConnector, logger: Logger);
    sync(calendarId: string, options: CalendarSyncOptions): Promise<CalendarEvent[]>;
}
//# sourceMappingURL=calendar-sync.service.d.ts.map