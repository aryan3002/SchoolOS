import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import Redis from 'ioredis';

import {
  CalendarEvent,
  CalendarSyncService,
  ConsoleLogger,
  DistrictGraphNormalizer,
  GoogleCalendarConnector,
  ICalConnector,
  SISConnectorFactory,
  SISSyncService,
} from '@schoolos/integrations';
import { PrismaService } from '../database/prisma.service';
import { CalendarSyncRequestDto, SisSyncRequestDto } from './dto';

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);
  private readonly queue: Queue | null;
  private readonly sisSyncService: SISSyncService;
  private readonly consoleLogger = new ConsoleLogger();

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const connectorFactory = new SISConnectorFactory(prisma, this.consoleLogger);
    const normalizer = new DistrictGraphNormalizer();

    const redisUrl = this.configService.get<string>('REDIS_URL');
    this.queue = redisUrl
      ? new Queue('sis-sync', {
          connection: new Redis(redisUrl),
        })
      : null;

    this.sisSyncService = new SISSyncService(
      connectorFactory,
      normalizer,
      prisma,
      this.queue,
      this.consoleLogger,
    );
  }

  async triggerSisSync(dto: SisSyncRequestDto): Promise<void> {
    this.logger.log(
      `Scheduling SIS ${dto.syncType} sync for district ${dto.districtId}`,
    );
    await this.sisSyncService.scheduleSync(dto.districtId, dto.syncType);
  }

  async getSyncStatus(districtId: string): Promise<{
    lastSync?: string;
    queueEnabled: boolean;
  }> {
    const district = await this.prisma.district.findUnique({
      where: { id: districtId },
      select: { features: true },
    });
    const lastSync =
      (district?.features as Record<string, any>)?.sis?.lastSync ?? null;

    return {
      lastSync: lastSync ?? undefined,
      queueEnabled: Boolean(this.queue),
    };
  }

  async syncCalendar(dto: CalendarSyncRequestDto): Promise<CalendarEvent[]> {
    const provider = dto.provider ?? 'google';
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (provider === 'google') {
      const connector = new GoogleCalendarConnector(
        this.getGoogleConfig(),
        this.consoleLogger,
      );
      const syncService = new CalendarSyncService(connector, this.consoleLogger);
      return syncService.sync(dto.calendarId, { startDate, endDate });
    }

    if (!dto.icalUrl) {
      throw new Error('icalUrl is required for iCal sync');
    }

    const connector = new ICalConnector(this.consoleLogger);
    const syncService = new CalendarSyncService(connector, this.consoleLogger);
    return syncService.sync(dto.icalUrl, { startDate, endDate });
  }

  async health(): Promise<{ sis: string; queue: boolean }> {
    return {
      sis: 'ok',
      queue: Boolean(this.queue),
    };
  }

  private getGoogleConfig() {
    const clientEmail = this.configService.get<string>(
      'GOOGLE_CALENDAR_CLIENT_EMAIL',
    );
    const privateKey = this.configService.get<string>(
      'GOOGLE_CALENDAR_PRIVATE_KEY',
    );

    if (!clientEmail || !privateKey) {
      throw new Error('Google Calendar credentials are not configured');
    }

    return {
      clientEmail,
      privateKey,
    };
  }
}
