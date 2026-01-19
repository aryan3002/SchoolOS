import { Queue } from 'bullmq';
import { Logger } from '../../types';
/**
 * Scheduler utility for recurring SIS syncs.
 */
export declare class SISScheduler {
    private readonly queue;
    private readonly logger;
    constructor(queue: Queue, logger: Logger);
    scheduleIncremental(districtId: string, cronExpression: string): Promise<void>;
}
//# sourceMappingURL=sync.scheduler.d.ts.map