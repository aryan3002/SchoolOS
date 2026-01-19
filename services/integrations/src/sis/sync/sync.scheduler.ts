import { Queue } from 'bullmq';

import { Logger } from '../../types';
import { SyncJob } from '../interfaces';

/**
 * Scheduler utility for recurring SIS syncs.
 */
export class SISScheduler {
  constructor(
    private readonly queue: Queue,
    private readonly logger: Logger,
  ) {}

  async scheduleIncremental(
    districtId: string,
    cronExpression: string,
  ): Promise<void> {
    await this.queue.add(
      'sis-sync',
      {
        districtId,
        syncType: 'incremental',
        scheduledAt: new Date(),
      } satisfies SyncJob,
      {
        repeat: { cron: cronExpression },
        removeOnComplete: true,
        removeOnFail: true,
      },
    );

    this.logger.info('Scheduled incremental SIS sync', {
      districtId,
      cronExpression,
    });
  }
}
