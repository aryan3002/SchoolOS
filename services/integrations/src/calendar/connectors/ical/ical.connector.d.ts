import { Logger } from '../../../types';
import type { CalendarConnector, CalendarEvent, CalendarSyncOptions } from '../../interfaces';
/**
 * iCal/ICS connector for districts publishing public calendars.
 */
export declare class ICalConnector implements CalendarConnector {
    private readonly logger;
    constructor(logger: Logger);
    syncCalendar(icalUrl: string, options: CalendarSyncOptions): Promise<CalendarEvent[]>;
    testConnection(): Promise<{
        healthy: boolean;
        latency?: number;
        error?: string;
    }>;
    private parseICS;
    private parseICSDate;
    private inferEventType;
}
//# sourceMappingURL=ical.connector.d.ts.map