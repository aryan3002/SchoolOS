"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SISScheduler = void 0;
/**
 * Scheduler utility for recurring SIS syncs.
 */
class SISScheduler {
    queue;
    logger;
    constructor(queue, logger) {
        this.queue = queue;
        this.logger = logger;
    }
    async scheduleIncremental(districtId, cronExpression) {
        await this.queue.add('sis-sync', {
            districtId,
            syncType: 'incremental',
            scheduledAt: new Date(),
        }, {
            repeat: { cron: cronExpression },
            removeOnComplete: true,
            removeOnFail: true,
        });
        this.logger.info('Scheduled incremental SIS sync', {
            districtId,
            cronExpression,
        });
    }
}
exports.SISScheduler = SISScheduler;
//# sourceMappingURL=sync.scheduler.js.map