import axios from 'axios';

import { Logger } from '../../../types';
import type {
  CalendarConnector,
  CalendarEvent,
  CalendarEventType,
  CalendarSyncOptions,
} from '../../interfaces';

/**
 * iCal/ICS connector for districts publishing public calendars.
 */
export class ICalConnector implements CalendarConnector {
  constructor(private readonly logger: Logger) {}

  async syncCalendar(
    icalUrl: string,
    options: CalendarSyncOptions,
  ): Promise<CalendarEvent[]> {
    const response = await axios.get<string>(icalUrl, { timeout: 15_000 });
    const events = this.parseICS(response.data).filter(
      (event) =>
        event.startDate >= options.startDate && event.endDate <= options.endDate,
    );

    this.logger.info('iCal calendar synced', {
      source: icalUrl,
      count: events.length,
    });

    return events;
  }

  async testConnection(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
    return { healthy: true, latency: 0 };
  }

  private parseICS(data: string): CalendarEvent[] {
    const events: CalendarEvent[] = [];
    const blocks = data.split('BEGIN:VEVENT').slice(1);

    for (const block of blocks) {
      const lines = block.split(/\r?\n/);
      const getValue = (prefix: string): string | undefined => {
        const line = lines.find((l) => l.startsWith(prefix));
        if (!line) return undefined;
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

  private parseICSDate(value: string): Date {
    if (value.length === 8) {
      const year = Number(value.slice(0, 4));
      const month = Number(value.slice(4, 6)) - 1;
      const day = Number(value.slice(6, 8));
      return new Date(Date.UTC(year, month, day));
    }
    return new Date(value);
  }

  private inferEventType(summary: string): CalendarEventType {
    const lower = summary.toLowerCase();
    if (lower.includes('no school') || lower.includes('holiday')) return 'NO_SCHOOL';
    if (lower.includes('early release')) return 'EARLY_RELEASE';
    if (lower.includes('meeting') || lower.includes('conference')) return 'MEETING';
    return 'SCHOOL_EVENT';
  }
}

const cryptoRandomId = (): string =>
  Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
