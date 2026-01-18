/**
 * Calendar Query Tool
 *
 * Queries school calendar for events, holidays, schedules,
 * and important dates.
 *
 * @module @schoolos/ai/tools
 */

import {
  ToolDefinition,
  ToolParams,
  ToolResult,
  Permission,
  IntentCategory,
} from '../types';
import { BaseTool } from './base-tool';

// ============================================================
// TYPES
// ============================================================

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  allDay: boolean;
  location?: string;
  eventType: string; // 'holiday', 'conference', 'meeting', 'deadline', 'event'
  schoolIds?: string[]; // If empty, applies to whole district
  gradeLevel?: string;
  recurring?: boolean;
  metadata?: Record<string, unknown>;
}

export interface CalendarQueryParams extends ToolParams {
  /** Start date for query range */
  startDate?: Date;

  /** End date for query range */
  endDate?: Date;

  /** Filter by event types */
  eventTypes?: string[];

  /** Filter by school ID */
  schoolId?: string;

  /** Filter by grade level */
  gradeLevel?: string;

  /** Maximum events to return */
  limit?: number;
}

export interface CalendarService {
  queryEvents(options: {
    districtId: string;
    startDate: Date;
    endDate: Date;
    eventTypes?: string[];
    schoolIds?: string[];
    gradeLevel?: string;
    limit: number;
  }): Promise<CalendarEvent[]>;
}

// ============================================================
// CALENDAR QUERY TOOL
// ============================================================

export class CalendarQueryTool extends BaseTool {
  readonly definition: ToolDefinition = {
    name: 'calendar_query',
    description: 'Queries school calendar for events, holidays, conferences, and important dates',
    requiredPermissions: [Permission.READ_CALENDAR],
    handlesIntents: [IntentCategory.CALENDAR_QUERY, IntentCategory.OPERATIONAL],
    timeoutMs: 5000,
  };

  constructor(private readonly calendarService: CalendarService) {
    super();
  }

  protected async executeImpl(
    params: CalendarQueryParams,
  ): Promise<Omit<ToolResult, 'toolName' | 'executionTimeMs'>> {
    const { context, intent } = params;

    // Parse date range from intent or use defaults
    const dateRange = this.parseDateRange(intent.entities, params);

    // Determine school filter
    const schoolIds = params.schoolId
      ? [params.schoolId]
      : context.schoolIds && context.schoolIds.length > 0
        ? context.schoolIds
        : undefined;

    // Query calendar
    const events = await this.calendarService.queryEvents({
      districtId: context.districtId,
      startDate: dateRange.start,
      endDate: dateRange.end,
      eventTypes: params.eventTypes || this.inferEventTypes(intent.entities),
      schoolIds,
      gradeLevel: params.gradeLevel || intent.entities.gradeLevel,
      limit: params.limit || 10,
    });

    if (events.length === 0) {
      return {
        success: true,
        content: `No events found for the specified period (${this.formatDateRange(dateRange)}).`,
        confidence: 0.7,
        data: { eventCount: 0 },
      };
    }

    // Format events for response
    const formattedEvents = events.map((event) => this.formatEvent(event)).join('\n\n');

    return this.createSuccessResult(formattedEvents, {
      data: {
        eventCount: events.length,
        dateRange: {
          start: dateRange.start.toISOString(),
          end: dateRange.end.toISOString(),
        },
        events: events.map((e) => ({
          id: e.id,
          title: e.title,
          date: e.startDate.toISOString(),
          type: e.eventType,
        })),
      },
      confidence: 0.95,
    });
  }

  /**
   * Parse date range from intent entities and params
   */
  private parseDateRange(
    entities: ToolParams['intent']['entities'],
    params: CalendarQueryParams,
  ): { start: Date; end: Date } {
    const now = new Date();

    // Use explicit params if provided
    if (params.startDate && params.endDate) {
      return { start: params.startDate, end: params.endDate };
    }

    // Parse from entities
    if (entities.date) {
      const date = new Date(entities.date);
      return { start: date, end: date };
    }

    if (entities.dateRange) {
      return {
        start: new Date(entities.dateRange.start),
        end: new Date(entities.dateRange.end),
      };
    }

    // Parse time references
    if (entities.timeReference) {
      return this.parseTimeReference(entities.timeReference, now);
    }

    // Default: next 30 days
    const defaultEnd = new Date(now);
    defaultEnd.setDate(defaultEnd.getDate() + 30);
    return { start: now, end: defaultEnd };
  }

  /**
   * Parse relative time references
   */
  private parseTimeReference(reference: string, now: Date): { start: Date; end: Date } {
    const lower = reference.toLowerCase();
    const start = new Date(now);
    const end = new Date(now);

    if (lower.includes('today')) {
      end.setHours(23, 59, 59, 999);
    } else if (lower.includes('tomorrow')) {
      start.setDate(start.getDate() + 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() + 1);
      end.setHours(23, 59, 59, 999);
    } else if (lower.includes('this week')) {
      const dayOfWeek = now.getDay();
      start.setDate(start.getDate() - dayOfWeek);
      start.setHours(0, 0, 0, 0);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else if (lower.includes('next week')) {
      const dayOfWeek = now.getDay();
      start.setDate(start.getDate() + (7 - dayOfWeek));
      start.setHours(0, 0, 0, 0);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else if (lower.includes('this month')) {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(end.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
    } else if (lower.includes('next month')) {
      start.setMonth(start.getMonth() + 1, 1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(end.getMonth() + 2, 0);
      end.setHours(23, 59, 59, 999);
    } else {
      // Default: next 14 days
      end.setDate(end.getDate() + 14);
    }

    return { start, end };
  }

  /**
   * Infer event types from entities
   */
  private inferEventTypes(entities: ToolParams['intent']['entities']): string[] | undefined {
    if (entities.eventType) {
      const lower = entities.eventType.toLowerCase();
      
      if (lower.includes('conference') || lower.includes('parent-teacher')) {
        return ['conference', 'parent_teacher_conference'];
      }
      if (lower.includes('holiday') || lower.includes('break')) {
        return ['holiday', 'break', 'no_school'];
      }
      if (lower.includes('deadline')) {
        return ['deadline', 'due_date'];
      }
      if (lower.includes('meeting')) {
        return ['meeting'];
      }
      
      return [entities.eventType];
    }
    
    return undefined; // Return all types
  }

  /**
   * Format a calendar event for display
   */
  private formatEvent(event: CalendarEvent): string {
    const dateStr = event.allDay
      ? this.formatDate(event.startDate)
      : `${this.formatDate(event.startDate)} at ${this.formatTime(event.startDate)}`;

    const endStr = event.allDay
      ? event.startDate.toDateString() !== event.endDate.toDateString()
        ? ` - ${this.formatDate(event.endDate)}`
        : ''
      : ` - ${this.formatTime(event.endDate)}`;

    let text = `**${event.title}**\n📅 ${dateStr}${endStr}`;

    if (event.location) {
      text += `\n📍 ${event.location}`;
    }

    if (event.description) {
      text += `\n${event.description}`;
    }

    return text;
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }

  private formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  private formatDateRange(range: { start: Date; end: Date }): string {
    return `${this.formatDate(range.start)} to ${this.formatDate(range.end)}`;
  }
}
