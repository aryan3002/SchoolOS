"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ICalConnector = void 0;
const tslib_1 = require("tslib");
const axios_1 = tslib_1.__importDefault(require("axios"));
/**
 * iCal/ICS connector for districts publishing public calendars.
 */
class ICalConnector {
    logger;
    constructor(logger) {
        this.logger = logger;
    }
    async syncCalendar(icalUrl, options) {
        const response = await axios_1.default.get(icalUrl, { timeout: 15_000 });
        const events = this.parseICS(response.data).filter((event) => event.startDate >= options.startDate && event.endDate <= options.endDate);
        this.logger.info('iCal calendar synced', {
            source: icalUrl,
            count: events.length,
        });
        return events;
    }
    async testConnection() {
        return { healthy: true, latency: 0 };
    }
    parseICS(data) {
        const events = [];
        const blocks = data.split('BEGIN:VEVENT').slice(1);
        for (const block of blocks) {
            const lines = block.split(/\r?\n/);
            const getValue = (prefix) => {
                const line = lines.find((l) => l.startsWith(prefix));
                if (!line)
                    return undefined;
                return line.split(':').slice(1).join(':').trim();
            };
            const uid = getValue('UID') ?? cryptoRandomId();
            const summary = getValue('SUMMARY') ?? 'Untitled Event';
            const description = getValue('DESCRIPTION');
            const location = getValue('LOCATION');
            const startRaw = getValue('DTSTART');
            const endRaw = getValue('DTEND');
            if (!startRaw || !endRaw) {
                continue;
            }
            const startDate = this.parseICSDate(startRaw);
            const endDate = this.parseICSDate(endRaw);
            const isAllDay = startRaw.length === 8 || !startRaw.includes('T');
            events.push({
                id: uid,
                title: summary,
                description,
                location,
                startDate,
                endDate,
                isAllDay,
                type: this.inferEventType(summary),
                audience: 'ALL',
                metadata: {},
            });
        }
        return events;
    }
    parseICSDate(value) {
        if (value.length === 8) {
            const year = Number(value.slice(0, 4));
            const month = Number(value.slice(4, 6)) - 1;
            const day = Number(value.slice(6, 8));
            return new Date(Date.UTC(year, month, day));
        }
        return new Date(value);
    }
    inferEventType(summary) {
        const lower = summary.toLowerCase();
        if (lower.includes('no school') || lower.includes('holiday'))
            return 'NO_SCHOOL';
        if (lower.includes('early release'))
            return 'EARLY_RELEASE';
        if (lower.includes('meeting') || lower.includes('conference'))
            return 'MEETING';
        return 'SCHOOL_EVENT';
    }
}
exports.ICalConnector = ICalConnector;
const cryptoRandomId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
//# sourceMappingURL=ical.connector.js.map