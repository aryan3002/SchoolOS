import { describe, it, expect, vi } from 'vitest';

import { GoogleCalendarConnector } from '../calendar/connectors/google/google-calendar.connector';
import { ConsoleLogger } from '../types';
import type { GoogleCalendarClient } from '../calendar/connectors/google/google-calendar.client';

const mockList = vi.fn().mockResolvedValue({
  data: {
    items: [
      {
        id: 'evt-1',
        summary: 'No School - Holiday',
        start: { date: '2024-09-01' },
        end: { date: '2024-09-02' },
      },
    ],
  },
});

const mockCalendarList = vi.fn().mockResolvedValue({ data: { items: [] } });

const mockClient: Partial<GoogleCalendarClient> = {
  calendar: () =>
    ({
      events: { list: mockList },
      calendarList: { list: mockCalendarList },
    }) as any,
};

describe('GoogleCalendarConnector', () => {
  it('maps Google Calendar events', async () => {
    const connector = new GoogleCalendarConnector(
      {
        clientEmail: 'test@example.com',
        privateKey: 'key',
      },
      new ConsoleLogger(),
      mockClient as GoogleCalendarClient,
    );

    const events = await connector.syncCalendar('calendar', {
      startDate: new Date('2024-08-01'),
      endDate: new Date('2024-10-01'),
    });

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('NO_SCHOOL');
    expect(events[0].isAllDay).toBe(true);
  });
});
