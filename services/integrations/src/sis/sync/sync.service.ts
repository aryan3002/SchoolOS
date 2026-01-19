import { Queue } from 'bullmq';
import {
  District,
  Prisma,
  PrismaClient,
  RelationshipStatus,
  RelationshipType,
  UserRole,
  UserStatus,
} from '@prisma/client';

import { DistrictGraphNormalizer } from '../../district-graph';
import type {
  RawEnrollment,
  RawGuardian,
  RawStudent,
  SISConnector,
  SISCredentials,
  SyncError,
  SyncJob,
  SyncOptions,
  SyncResult,
  SyncStats,
} from '../interfaces';
import { SISConnectorFactory } from '../connectors';
import { Logger } from '../../types';

interface DistrictSettings {
  sisCredentials?: SISCredentials;
  sisSchoolIds?: string[];
  [key: string]: unknown;
}

/**
 * SISSyncService orchestrates full and incremental sync jobs.
 */
export class SISSyncService {
  constructor(
    private readonly connectorFactory: SISConnectorFactory,
    private readonly normalizer: DistrictGraphNormalizer,
    private readonly prisma: PrismaClient,
    private readonly queue: Queue | null,
    private readonly logger: Logger,
  ) {}

  /**
   * Schedule a sync job for a district.
   */
  async scheduleSync(
    districtId: string,
    syncType: 'full' | 'incremental',
  ): Promise<void> {
    if (!this.queue) {
      await this.executeSync({ districtId, syncType, scheduledAt: new Date() });
      return;
    }

    await this.queue.add(
      'sis-sync',
      {
        districtId,
        syncType,
        scheduledAt: new Date(),
      } satisfies SyncJob,
      {
        priority: syncType === 'full' ? 1 : 5,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 60_000,
        },
      },
    );
  }

  /**
   * Execute a sync job immediately.
   */
  async executeSync(job: SyncJob): Promise<SyncResult> {
    const startTime = Date.now();
    const stats: SyncStats = {
      studentsProcessed: 0,
      guardiansProcessed: 0,
      enrollmentsProcessed: 0,
      relationshipsCreated: 0,
      errors: 0,
    };
    const errors: SyncError[] = [];

    try {
      const district = await this.prisma.district.findUnique({
        where: { id: job.districtId },
      });

      if (!district) {
        throw new Error(`District ${job.districtId} not found`);
      }

      const credentials = this.extractCredentials(district);
      const connector = this.connectorFactory.create(
        credentials.vendor,
        credentials,
      );

      await connector.authenticate(credentials);

      if (job.syncType === 'incremental') {
        await this.incrementalSync(connector, district, stats, errors);
      } else {
        await this.fullSync(connector, district, stats, errors);
      }

      await this.updateLastSyncTime(job.districtId);

      return {
        success: errors.length === 0,
        duration: Date.now() - startTime,
        stats,
        errors,
        nextSyncRecommendedAt: this.calculateNextSync(job.syncType),
      };
    } catch (error) {
      this.logger.error('Sync failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        districtId: job.districtId,
      });
      throw error;
    }
  }

  /**
   * Perform incremental sync by processing change feed.
   */
  private async incrementalSync(
    connector: SISConnector,
    district: District,
    stats: SyncStats,
    errors: SyncError[],
  ): Promise<void> {
    const lastSync = await this.getLastSyncTime(district.id);
    const changes = await connector.getChanges(lastSync);

    for (const change of changes) {
      try {
        await this.processChange(district, change, connector, stats);
      } catch (error) {
        errors.push({
          entity: change.entityType,
          id: change.entityId,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date(),
        });
        stats.errors += 1;
      }
    }
  }

  /**
   * Full sync - walk all records.
   */
  private async fullSync(
    connector: SISConnector,
    district: District,
    stats: SyncStats,
    errors: SyncError[],
  ): Promise<void> {
    const credentials = this.extractCredentials(district);
    const studentIdMap = new Map<string, string>();
    const guardianIdMap = new Map<string, string>();

    const syncOptions: SyncOptions = {
      schoolIds: this.extractSchoolIds(district),
      pageSize: 200,
      onStudent: async (rawStudent: RawStudent) => {
        const normalized = await this.normalizer.normalizeStudent(
          credentials.vendor,
          rawStudent,
          district.id,
        );
        const userId = await this.persistStudent(normalized, district);
        studentIdMap.set(rawStudent.id, userId);
        stats.studentsProcessed += 1;
      },
      onEnrollment: async (rawEnrollment: RawEnrollment) => {
        const normalized = await this.normalizer.normalizeEnrollment(
          credentials.vendor,
          rawEnrollment,
          district.id,
        );
        await this.persistEnrollment(normalized, district);
        stats.enrollmentsProcessed += 1;
      },
      onGuardian: async (studentExternalId: string, rawGuardian: RawGuardian) => {
        const normalized = await this.normalizer.normalizeGuardian(
          credentials.vendor,
          rawGuardian,
          district.id,
        );
        const guardianId = await this.persistGuardian(normalized, district);
        guardianIdMap.set(rawGuardian.id, guardianId);
        stats.guardiansProcessed += 1;
      },
      onRelationship: async (studentExternalId: string, rawGuardian: RawGuardian) => {
        const guardianUserId = guardianIdMap.get(rawGuardian.id);
        const studentUserId = studentIdMap.get(studentExternalId);
        if (!guardianUserId || !studentUserId) {
          return;
        }
        await this.persistRelationship(
          guardianUserId,
          studentUserId,
          rawGuardian.relationship,
          rawGuardian.isPrimary,
          district,
        );
        stats.relationshipsCreated += 1;
      },
    };

    const result = await connector.syncDistrict(district.id, syncOptions);
    // Merge connector-reported stats
    stats.errors += result.stats.errors;
    stats.studentsProcessed = Math.max(stats.studentsProcessed, result.stats.studentsProcessed);
    stats.enrollmentsProcessed = Math.max(
      stats.enrollmentsProcessed,
      result.stats.enrollmentsProcessed,
    );
    stats.guardiansProcessed = Math.max(
      stats.guardiansProcessed,
      result.stats.guardiansProcessed,
    );
    stats.relationshipsCreated = Math.max(
      stats.relationshipsCreated,
      result.stats.relationshipsCreated,
    );
    errors.push(...result.errors);
  }

  private async processChange(
    district: District,
    change: NonNullable<Awaited<ReturnType<SISConnector['getChanges']>>>[number],
    connector: SISConnector,
    stats: SyncStats,
  ): Promise<void> {
    const credentials = this.extractCredentials(district);
    switch (change.entityType) {
      case 'student': {
        const rawStudent = await connector.getStudent(change.entityId);
        const normalized = await this.normalizer.normalizeStudent(
          credentials.vendor,
          rawStudent,
          district.id,
        );
        await this.persistStudent(normalized, district);
        stats.studentsProcessed += 1;
        break;
      }
      case 'enrollment': {
        const enrollment = await connector.getStudentEnrollment(change.entityId);
        const normalized = await this.normalizer.normalizeEnrollment(
          credentials.vendor,
          enrollment,
          district.id,
        );
        await this.persistEnrollment(normalized, district);
        stats.enrollmentsProcessed += 1;
        break;
      }
      default:
        break;
    }
  }

  private async persistStudent(
    student: Awaited<ReturnType<DistrictGraphNormalizer['normalizeStudent']>>,
    district: District,
  ): Promise<string> {
    const email =
      student.profile.email ??
      this.buildFallbackEmail(student.externalId, district.slug);
    const existing = await this.prisma.user.findFirst({
      where: {
        districtId: district.id,
        sisId: student.externalId,
        role: UserRole.STUDENT,
      },
    });

    if (existing) {
      const targetSchoolId = this.isUuid(student.profile.schoolId)
        ? student.profile.schoolId
        : existing.schoolId;

      const updated = await this.prisma.user.update({
        where: { id: existing.id },
        data: {
          firstName: student.profile.firstName,
          lastName: student.profile.lastName,
          preferredName: student.profile.preferredName,
          email,
          phoneNumber: student.profile.phoneNumber,
          schoolId: targetSchoolId,
          metadata: this.mergeMetadata(existing.metadata, {
            grade: student.profile.grade,
            gradeYear: student.profile.gradeYear,
            sourceVendor: student.vendor,
            lastSyncedAt: new Date().toISOString(),
            raw: student.metadata.rawData,
          }),
          status: UserStatus.ACTIVE,
        },
      });
      return updated.id;
    }

    const created = await this.prisma.user.create({
      data: {
        districtId: district.id,
        firstName: student.profile.firstName,
        lastName: student.profile.lastName,
        preferredName: student.profile.preferredName,
        email,
        phoneNumber: student.profile.phoneNumber,
        avatarUrl: student.profile.photoUrl,
        role: UserRole.STUDENT,
        status: UserStatus.ACTIVE,
        schoolId: this.isUuid(student.profile.schoolId)
          ? student.profile.schoolId
          : undefined,
        sisId: student.externalId,
        metadata: {
          grade: student.profile.grade,
          gradeYear: student.profile.gradeYear,
          sourceVendor: student.vendor,
          lastSyncedAt: new Date().toISOString(),
          raw: student.metadata.rawData,
        },
      },
    });

    return created.id;
  }

  private async persistGuardian(
    guardian: Awaited<ReturnType<DistrictGraphNormalizer['normalizeGuardian']>>,
    district: District,
  ): Promise<string> {
    const email =
      guardian.profile.email ??
      this.buildFallbackEmail(guardian.externalId, district.slug, 'guardian');

    const existing = await this.prisma.user.findFirst({
      where: {
        districtId: district.id,
        sisId: guardian.externalId,
        role: UserRole.PARENT,
      },
    });

    if (existing) {
      const updated = await this.prisma.user.update({
        where: { id: existing.id },
        data: {
          firstName: guardian.profile.firstName,
          lastName: guardian.profile.lastName,
          email,
          phoneNumber: guardian.profile.phone ?? existing.phoneNumber,
          metadata: this.mergeMetadata(existing.metadata, {
            relationship: guardian.profile.relationship,
            receiveCommunications: guardian.preferences.receiveCommunications,
            isPrimary: guardian.preferences.isPrimary,
            canPickup: guardian.preferences.canPickup,
            raw: guardian.metadata.rawData,
            lastSyncedAt: new Date().toISOString(),
          }),
          status: UserStatus.ACTIVE,
        },
      });
      return updated.id;
    }

    const created = await this.prisma.user.create({
      data: {
        districtId: district.id,
        firstName: guardian.profile.firstName,
        lastName: guardian.profile.lastName,
        email,
        phoneNumber: guardian.profile.phone,
        role: UserRole.PARENT,
        status: UserStatus.ACTIVE,
        sisId: guardian.externalId,
        metadata: {
          relationship: guardian.profile.relationship,
          receiveCommunications: guardian.preferences.receiveCommunications,
          isPrimary: guardian.preferences.isPrimary,
          canPickup: guardian.preferences.canPickup,
          raw: guardian.metadata.rawData,
          lastSyncedAt: new Date().toISOString(),
        },
      },
    });

    return created.id;
  }

  private async persistEnrollment(
    enrollment: Awaited<ReturnType<DistrictGraphNormalizer['normalizeEnrollment']>>,
    district: District,
  ): Promise<void> {
    const student = await this.prisma.user.findFirst({
      where: {
        districtId: district.id,
        sisId: enrollment.externalStudentId,
        role: UserRole.STUDENT,
      },
    });

    if (!student) return;

    await this.prisma.user.update({
      where: { id: student.id },
      data: {
        metadata: this.mergeMetadata(student.metadata, {
          enrollment: {
            status: enrollment.status,
            entryDate: enrollment.entryDate,
            exitDate: enrollment.exitDate,
            schoolYear: enrollment.schoolYear,
            externalSchoolId: enrollment.schoolId,
          },
          lastSyncedAt: new Date().toISOString(),
        }),
      },
    });
  }

  private async persistRelationship(
    guardianUserId: string,
    studentUserId: string,
    relationshipType: string,
    isPrimary: boolean,
    district: District,
  ): Promise<void> {
    const mappedRelationship = this.mapRelationshipType(relationshipType);
    const existing = await this.prisma.userRelationship.findFirst({
      where: {
        districtId: district.id,
        userId: guardianUserId,
        relatedUserId: studentUserId,
        relationshipType: mappedRelationship,
      },
    });

    if (existing) {
      await this.prisma.userRelationship.update({
        where: { id: existing.id },
        data: {
          isPrimary,
          status: RelationshipStatus.ACTIVE,
          metadata: this.mergeMetadata(existing.metadata, {
            relationshipType,
            lastSyncedAt: new Date().toISOString(),
          }),
        },
      });
      return;
    }

    await this.prisma.userRelationship.create({
      data: {
        districtId: district.id,
        userId: guardianUserId,
        relatedUserId: studentUserId,
        relationshipType: mappedRelationship,
        status: RelationshipStatus.ACTIVE,
        isPrimary,
        metadata: {
          relationshipType,
          createdBy: 'integration',
          lastSyncedAt: new Date().toISOString(),
        },
      },
    });
  }

  private buildFallbackEmail(
    externalId: string,
    districtSlug: string,
    prefix = 'student',
  ): string {
    return `${prefix}-${externalId}@${districtSlug}.schoolos.invalid`;
  }

  private extractCredentials(district: District): SISCredentials {
    const settings = district.settings as Prisma.JsonValue;
    const parsed = (settings ?? {}) as DistrictSettings;
    if (!parsed.sisCredentials) {
      throw new Error('SIS credentials not configured');
    }
    return parsed.sisCredentials;
  }

  private extractSchoolIds(district: District): string[] | undefined {
    const settings = district.settings as Prisma.JsonValue;
    const parsed = (settings ?? {}) as DistrictSettings;
    return Array.isArray(parsed.sisSchoolIds)
      ? parsed.sisSchoolIds.map((id) => String(id))
      : undefined;
  }

  private async getLastSyncTime(districtId: string): Promise<Date> {
    const district = await this.prisma.district.findUnique({
      where: { id: districtId },
      select: { features: true },
    });
    const features = district?.features as Prisma.JsonObject | null;
    const lastSync = (features?.sis as { lastSync?: string })?.lastSync;
    return lastSync ? new Date(lastSync) : new Date(0);
  }

  private async updateLastSyncTime(districtId: string): Promise<void> {
    const district = await this.prisma.district.findUnique({
      where: { id: districtId },
      select: { features: true },
    });

    const features = (district?.features ?? {}) as Prisma.JsonObject;
    const sisSettings = (features['sis'] as Record<string, unknown>) ?? {};
    const updatedFeatures: Prisma.InputJsonObject = {
      ...features,
      sis: {
        ...sisSettings,
        lastSync: new Date().toISOString(),
      },
    };

    await this.prisma.district.update({
      where: { id: districtId },
      data: {
        features: updatedFeatures,
      },
    });
  }

  private calculateNextSync(syncType: 'full' | 'incremental'): Date {
    const minutes = syncType === 'full' ? 240 : 30;
    return new Date(Date.now() + minutes * 60 * 1000);
  }

  private mergeMetadata(
    existing: Prisma.JsonValue,
    incoming: Record<string, unknown>,
  ): Prisma.InputJsonValue {
    const current = (existing as Record<string, unknown>) ?? {};
    return { ...current, ...incoming };
  }

  private mapRelationshipType(value: string): RelationshipType {
    const normalized = (value ?? '').toLowerCase();
    if (normalized.includes('guardian')) return RelationshipType.GUARDIAN_OF;
    if (normalized.includes('teacher')) return RelationshipType.TEACHER_OF;
    if (normalized.includes('coteacher')) return RelationshipType.COTEACHER_OF;
    if (normalized.includes('counselor')) return RelationshipType.COUNSELOR_OF;
    return RelationshipType.PARENT_OF;
  }

  private isUuid(value?: string): boolean {
    return typeof value === 'string' && /^[0-9a-fA-F-]{8}-[0-9a-fA-F-]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(value);
  }
}
