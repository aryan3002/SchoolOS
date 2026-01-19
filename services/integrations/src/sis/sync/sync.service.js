"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SISSyncService = void 0;
const client_1 = require("@prisma/client");
/**
 * SISSyncService orchestrates full and incremental sync jobs.
 */
class SISSyncService {
    connectorFactory;
    normalizer;
    prisma;
    queue;
    logger;
    constructor(connectorFactory, normalizer, prisma, queue, logger) {
        this.connectorFactory = connectorFactory;
        this.normalizer = normalizer;
        this.prisma = prisma;
        this.queue = queue;
        this.logger = logger;
    }
    /**
     * Schedule a sync job for a district.
     */
    async scheduleSync(districtId, syncType) {
        if (!this.queue) {
            await this.executeSync({ districtId, syncType, scheduledAt: new Date() });
            return;
        }
        await this.queue.add('sis-sync', {
            districtId,
            syncType,
            scheduledAt: new Date(),
        }, {
            priority: syncType === 'full' ? 1 : 5,
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 60_000,
            },
        });
    }
    /**
     * Execute a sync job immediately.
     */
    async executeSync(job) {
        const startTime = Date.now();
        const stats = {
            studentsProcessed: 0,
            guardiansProcessed: 0,
            enrollmentsProcessed: 0,
            relationshipsCreated: 0,
            errors: 0,
        };
        const errors = [];
        try {
            const district = await this.prisma.district.findUnique({
                where: { id: job.districtId },
            });
            if (!district) {
                throw new Error(`District ${job.districtId} not found`);
            }
            const credentials = this.extractCredentials(district);
            const connector = this.connectorFactory.create(credentials.vendor, credentials);
            await connector.authenticate(credentials);
            if (job.syncType === 'incremental') {
                await this.incrementalSync(connector, district, stats, errors);
            }
            else {
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
        }
        catch (error) {
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
    async incrementalSync(connector, district, stats, errors) {
        const lastSync = await this.getLastSyncTime(district.id);
        const changes = await connector.getChanges(lastSync);
        for (const change of changes) {
            try {
                await this.processChange(district, change, connector, stats);
            }
            catch (error) {
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
    async fullSync(connector, district, stats, errors) {
        const credentials = this.extractCredentials(district);
        const studentRecords = new Map();
        const syncOptions = {
            schoolIds: this.extractSchoolIds(district),
            pageSize: 200,
            onStudent: async (rawStudent) => {
                studentRecords.set(rawStudent.id, { student: rawStudent, guardians: [] });
            },
            onEnrollment: async (rawEnrollment) => {
                const existing = studentRecords.get(rawEnrollment.studentId);
                if (existing) {
                    existing.enrollment = rawEnrollment;
                }
                else {
                    studentRecords.set(rawEnrollment.studentId, {
                        student: {
                            id: rawEnrollment.studentId,
                            studentNumber: '',
                            firstName: '',
                            lastName: '',
                            dateOfBirth: new Date(0),
                            grade: rawEnrollment.grade,
                        },
                        enrollment: rawEnrollment,
                        guardians: [],
                    });
                }
            },
            onGuardian: async (studentExternalId, rawGuardian) => {
                const record = studentRecords.get(studentExternalId);
                if (record) {
                    record.guardians.push(rawGuardian);
                }
                else {
                    studentRecords.set(studentExternalId, {
                        student: {
                            id: studentExternalId,
                            studentNumber: '',
                            firstName: '',
                            lastName: '',
                            dateOfBirth: new Date(0),
                            grade: 0,
                        },
                        enrollment: undefined,
                        guardians: [rawGuardian],
                    });
                }
            },
        };
        const result = await connector.syncDistrict(district.id, syncOptions);
        errors.push(...result.errors);
        for (const record of studentRecords.values()) {
            try {
                await this.prisma.$transaction(async (tx) => {
                    const normalizedStudent = await this.normalizer.normalizeStudent(credentials.vendor, record.student, district.id);
                    const studentUserId = await this.persistStudent(normalizedStudent, district, tx);
                    stats.studentsProcessed += 1;
                    if (record.enrollment) {
                        const normalizedEnrollment = await this.normalizer.normalizeEnrollment(credentials.vendor, record.enrollment, district.id);
                        await this.persistEnrollment(normalizedEnrollment, district, tx);
                        stats.enrollmentsProcessed += 1;
                    }
                    for (const guardian of record.guardians) {
                        const normalizedGuardian = await this.normalizer.normalizeGuardian(credentials.vendor, guardian, district.id);
                        const guardianUserId = await this.persistGuardian(normalizedGuardian, district, tx);
                        stats.guardiansProcessed += 1;
                        await this.persistRelationship(guardianUserId, studentUserId, guardian.relationship, guardian.isPrimary, district, tx);
                        stats.relationshipsCreated += 1;
                    }
                });
            }
            catch (error) {
                errors.push({
                    entity: 'student',
                    id: record.student.id,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    timestamp: new Date(),
                });
                stats.errors += 1;
            }
        }
    }
    async processChange(district, change, connector, stats) {
        const credentials = this.extractCredentials(district);
        switch (change.entityType) {
            case 'student': {
                const rawStudent = await connector.getStudent(change.entityId);
                const normalized = await this.normalizer.normalizeStudent(credentials.vendor, rawStudent, district.id);
                await this.persistStudent(normalized, district);
                stats.studentsProcessed += 1;
                break;
            }
            case 'enrollment': {
                const enrollment = await connector.getStudentEnrollment(change.entityId);
                const normalized = await this.normalizer.normalizeEnrollment(credentials.vendor, enrollment, district.id);
                await this.persistEnrollment(normalized, district);
                stats.enrollmentsProcessed += 1;
                break;
            }
            default:
                break;
        }
    }
    async persistStudent(student, district, client = this.prisma) {
        const email = student.profile.email ??
            this.buildFallbackEmail(student.externalId, district.slug);
        const existing = await client.user.findFirst({
            where: {
                districtId: district.id,
                sisId: student.externalId,
                role: client_1.UserRole.STUDENT,
            },
        });
        if (existing) {
            const targetSchoolId = this.isUuid(student.profile.schoolId)
                ? student.profile.schoolId
                : existing.schoolId;
            const updated = await client.user.update({
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
                    status: client_1.UserStatus.ACTIVE,
                },
            });
            return updated.id;
        }
        const created = await client.user.create({
            data: {
                districtId: district.id,
                firstName: student.profile.firstName,
                lastName: student.profile.lastName,
                preferredName: student.profile.preferredName,
                email,
                phoneNumber: student.profile.phoneNumber,
                avatarUrl: student.profile.photoUrl,
                role: client_1.UserRole.STUDENT,
                status: client_1.UserStatus.ACTIVE,
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
    async persistGuardian(guardian, district, client = this.prisma) {
        const email = guardian.profile.email ??
            this.buildFallbackEmail(guardian.externalId, district.slug, 'guardian');
        const existing = await client.user.findFirst({
            where: {
                districtId: district.id,
                sisId: guardian.externalId,
                role: client_1.UserRole.PARENT,
            },
        });
        if (existing) {
            const updated = await client.user.update({
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
                    status: client_1.UserStatus.ACTIVE,
                },
            });
            return updated.id;
        }
        const created = await client.user.create({
            data: {
                districtId: district.id,
                firstName: guardian.profile.firstName,
                lastName: guardian.profile.lastName,
                email,
                phoneNumber: guardian.profile.phone,
                role: client_1.UserRole.PARENT,
                status: client_1.UserStatus.ACTIVE,
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
    async persistEnrollment(enrollment, district, client = this.prisma) {
        const student = await client.user.findFirst({
            where: {
                districtId: district.id,
                sisId: enrollment.externalStudentId,
                role: client_1.UserRole.STUDENT,
            },
        });
        if (!student)
            return;
        await client.user.update({
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
    async persistRelationship(guardianUserId, studentUserId, relationshipType, isPrimary, district, client = this.prisma) {
        const mappedRelationship = this.mapRelationshipType(relationshipType);
        const existing = await client.userRelationship.findFirst({
            where: {
                districtId: district.id,
                userId: guardianUserId,
                relatedUserId: studentUserId,
                relationshipType: mappedRelationship,
            },
        });
        if (existing) {
            await client.userRelationship.update({
                where: { id: existing.id },
                data: {
                    isPrimary,
                    status: client_1.RelationshipStatus.ACTIVE,
                    metadata: this.mergeMetadata(existing.metadata, {
                        relationshipType,
                        lastSyncedAt: new Date().toISOString(),
                    }),
                },
            });
            return;
        }
        await client.userRelationship.create({
            data: {
                districtId: district.id,
                userId: guardianUserId,
                relatedUserId: studentUserId,
                relationshipType: mappedRelationship,
                status: client_1.RelationshipStatus.ACTIVE,
                isPrimary,
                metadata: {
                    relationshipType,
                    createdBy: 'integration',
                    lastSyncedAt: new Date().toISOString(),
                },
            },
        });
    }
    buildFallbackEmail(externalId, districtSlug, prefix = 'student') {
        return `${prefix}-${externalId}@${districtSlug}.schoolos.invalid`;
    }
    extractCredentials(district) {
        const settings = district.settings;
        const parsed = (settings ?? {});
        if (!parsed.sisCredentials) {
            throw new Error('SIS credentials not configured');
        }
        return parsed.sisCredentials;
    }
    extractSchoolIds(district) {
        const settings = district.settings;
        const parsed = (settings ?? {});
        return Array.isArray(parsed.sisSchoolIds)
            ? parsed.sisSchoolIds.map((id) => String(id))
            : undefined;
    }
    async getLastSyncTime(districtId) {
        const district = await this.prisma.district.findUnique({
            where: { id: districtId },
            select: { features: true },
        });
        const features = district?.features;
        const lastSync = features?.sis?.lastSync;
        return lastSync ? new Date(lastSync) : new Date(0);
    }
    async updateLastSyncTime(districtId) {
        const district = await this.prisma.district.findUnique({
            where: { id: districtId },
            select: { features: true },
        });
        const features = (district?.features ?? {});
        const sisSettings = features['sis'] ?? {};
        const updatedFeatures = {
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
    calculateNextSync(syncType) {
        const minutes = syncType === 'full' ? 240 : 30;
        return new Date(Date.now() + minutes * 60 * 1000);
    }
    mergeMetadata(existing, incoming) {
        const current = existing ?? {};
        return { ...current, ...incoming };
    }
    mapRelationshipType(value) {
        const normalized = (value ?? '').toLowerCase();
        if (normalized.includes('guardian'))
            return client_1.RelationshipType.GUARDIAN_OF;
        if (normalized.includes('teacher'))
            return client_1.RelationshipType.TEACHER_OF;
        if (normalized.includes('coteacher'))
            return client_1.RelationshipType.COTEACHER_OF;
        if (normalized.includes('counselor'))
            return client_1.RelationshipType.COUNSELOR_OF;
        return client_1.RelationshipType.PARENT_OF;
    }
    isUuid(value) {
        return typeof value === 'string' && /^[0-9a-fA-F-]{8}-[0-9a-fA-F-]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(value);
    }
}
exports.SISSyncService = SISSyncService;
//# sourceMappingURL=sync.service.js.map