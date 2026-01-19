declare module '@schoolos/integrations' {
  export type SyncOptions = Record<string, unknown>;

  export interface SyncResult {
    success: boolean;
    duration: number;
    stats: Record<string, number>;
    errors: Array<{ entity: string; id?: string; error: string; timestamp: Date }>;
    nextSyncRecommendedAt?: Date;
  }

  export interface CalendarEvent {
    id: string;
    title: string;
    description?: string;
    startDate: Date;
    endDate: Date;
    isAllDay?: boolean;
    type?: string;
    location?: string;
    audience?: string;
  }

  export class ConsoleLogger {
    info(message: string, meta?: Record<string, unknown>): void;
    warn(message: string, meta?: Record<string, unknown>): void;
    error(message: string, meta?: Record<string, unknown>): void;
    debug(message: string, meta?: Record<string, unknown>): void;
  }

  export class DistrictGraphNormalizer {
    normalizeStudent(...args: unknown[]): Promise<Record<string, unknown>>;
  }

  export class GoogleCalendarConnector {
    constructor(config: Record<string, unknown>, logger?: ConsoleLogger);
  }

  export class ICalConnector {
    constructor(logger?: ConsoleLogger);
  }

  export class CalendarSyncService {
    constructor(connector: unknown, logger?: ConsoleLogger);
    sync(calendarId: string, options: { startDate: Date; endDate: Date }): Promise<CalendarEvent[]>;
  }

  export class SISConnectorFactory {
    constructor(prisma: unknown, logger?: ConsoleLogger);
    create(vendor: string, credentials: Record<string, unknown>): unknown;
  }

  export class SISSyncService {
    constructor(
      connectorFactory: SISConnectorFactory,
      normalizer: DistrictGraphNormalizer,
      prisma: unknown,
      queue: unknown,
      logger?: ConsoleLogger,
    );
    scheduleSync(districtId: string, syncType: 'full' | 'incremental'): Promise<void>;
  }
}
