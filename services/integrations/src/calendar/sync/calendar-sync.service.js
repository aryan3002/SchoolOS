"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalendarSyncService = void 0;
/**
 * CalendarSyncService orchestrates calendar syncs.
 */
class CalendarSyncService {
    connector;
    logger;
    constructor(connector, logger) {
        this.connector = connector;
        this.logger = logger;
    }
    async sync(calendarId, options) {
        this.logger.info('Starting calendar sync', { calendarId });
        const events = await this.connector.syncCalendar(calendarId, options);
        this.logger.info('Calendar sync complete', { calendarId, count: events.length });
        return events;
    }
}
exports.CalendarSyncService = CalendarSyncService;
//# sourceMappingURL=calendar-sync.service.js.map