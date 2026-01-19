import { Queue } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { DistrictGraphNormalizer } from '../../district-graph';
import type { SyncJob, SyncResult } from '../interfaces';
import { SISConnectorFactory } from '../connectors';
import { Logger } from '../../types';
/**
 * SISSyncService orchestrates full and incremental sync jobs.
 */
export declare class SISSyncService {
    private readonly connectorFactory;
    private readonly normalizer;
    private readonly prisma;
    private readonly queue;
    private readonly logger;
    constructor(connectorFactory: SISConnectorFactory, normalizer: DistrictGraphNormalizer, prisma: PrismaClient, queue: Queue | null, logger: Logger);
    /**
     * Schedule a sync job for a district.
     */
    scheduleSync(districtId: string, syncType: 'full' | 'incremental'): Promise<void>;
    /**
     * Execute a sync job immediately.
     */
    executeSync(job: SyncJob): Promise<SyncResult>;
    /**
     * Perform incremental sync by processing change feed.
     */
    private incrementalSync;
    /**
     * Full sync - walk all records.
     */
    private fullSync;
    private processChange;
    private persistStudent;
    private persistGuardian;
    private persistEnrollment;
    private persistRelationship;
    private buildFallbackEmail;
    private extractCredentials;
    private extractSchoolIds;
    private getLastSyncTime;
    private updateLastSyncTime;
    private calculateNextSync;
    private mergeMetadata;
    private mapRelationshipType;
    private isUuid;
}
//# sourceMappingURL=sync.service.d.ts.map