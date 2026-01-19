"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PowerSchoolConnector = void 0;
const client_1 = require("@prisma/client");
const powerschool_client_1 = require("./powerschool.client");
const powerschool_mapper_1 = require("./powerschool.mapper");
/**
 * PowerSchool Connector implementation.
 * Handles OAuth, rate limiting, pagination, and mapping to raw SIS types.
 */
class PowerSchoolConnector {
    credentials;
    prisma;
    logger;
    client;
    mapper;
    constructor(credentials, prisma, logger) {
        this.credentials = credentials;
        this.prisma = prisma;
        this.logger = logger;
        this.mapper = new powerschool_mapper_1.PowerSchoolMapper();
        this.client = new powerschool_client_1.PowerSchoolClient(credentials, logger.child ? logger.child({ vendor: 'powerschool' }) : logger);
    }
    async authenticate(credentials) {
        this.credentials = credentials;
        this.client = new powerschool_client_1.PowerSchoolClient(credentials, this.logger.child ? this.logger.child({ vendor: 'powerschool' }) : this.logger);
        return this.client.authenticate();
    }
    async testConnection() {
        const start = Date.now();
        try {
            await this.client.listSchools();
            return {
                healthy: true,
                latency: Date.now() - start,
                lastSuccessfulSync: new Date(),
            };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return { healthy: false, latency: Date.now() - start, error: message };
        }
    }
    async getStudent(studentId) {
        const student = await this.client.getStudent(studentId);
        return this.mapper.mapStudent(student);
    }
    async getStudents(schoolId, options) {
        const response = await this.client.listStudents(schoolId, options);
        return {
            items: response.items.map((student) => this.mapper.mapStudent(student)),
            nextPageToken: response.nextPageToken,
            total: response.total,
        };
    }
    async getStudentsByIds(studentIds) {
        const results = [];
        for (const id of studentIds) {
            results.push(await this.getStudent(id));
        }
        return results;
    }
    async getStudentEnrollment(studentId) {
        const enrollment = await this.client.getEnrollment(studentId);
        return this.mapper.mapEnrollment(enrollment);
    }
    async getStudentGuardians(studentId) {
        const guardians = await this.client.getGuardians(studentId);
        return guardians.map((guardian) => this.mapper.mapGuardian(guardian));
    }
    async getStudentContacts(studentId) {
        const contacts = await this.client.getContacts(studentId);
        return contacts.map((contact) => this.mapper.mapContact(contact));
    }
    async getStudentSchedule(studentId, termId) {
        const schedule = await this.client.getSchedule(studentId, termId);
        return schedule.map((section) => this.mapper.mapClassSection(section));
    }
    async getStudentGrades(studentId, termId) {
        const grades = await this.client.getGrades(studentId, termId);
        return grades.map((grade) => this.mapper.mapGrade(grade));
    }
    async getStudentAttendance(studentId, dateRange) {
        const attendance = await this.client.getAttendance(studentId, dateRange);
        return attendance.map((att) => this.mapper.mapAttendance(att));
    }
    async getStudentAssignments(studentId) {
        const assignments = await this.client.getAssignments(studentId);
        return assignments.map((assignment) => this.mapper.mapAssignment(assignment));
    }
    async getTeacherRoster(teacherId, termId) {
        const roster = await this.client.getRoster(teacherId, termId);
        return {
            teacherId,
            sections: Array.isArray(roster?.sections)
                ? roster.sections.map((section) => ({
                    sectionId: String(section.sectionid ?? section.id ?? ''),
                    studentIds: Array.isArray(section.students)
                        ? section.students.map((s) => String(s.id ?? s.studentid))
                        : [],
                }))
                : [],
        };
    }
    async getSectionStudents(sectionId) {
        const students = await this.client.getSectionStudents(sectionId);
        return students.map((student) => this.mapper.mapStudent(student));
    }
    async syncDistrict(districtId, options) {
        const start = Date.now();
        const stats = {
            studentsProcessed: 0,
            guardiansProcessed: 0,
            enrollmentsProcessed: 0,
            relationshipsCreated: 0,
            errors: 0,
        };
        const errors = [];
        const schools = options.schoolIds && options.schoolIds.length > 0
            ? options.schoolIds.map((id) => ({ id }))
            : await this.client.listSchools();
        for (const school of schools) {
            let nextPageToken;
            do {
                try {
                    const page = await this.getStudents(school.id, {
                        pageSize: options.pageSize,
                        pageToken: nextPageToken,
                    });
                    for (const student of page.items) {
                        stats.studentsProcessed += 1;
                        await options.onStudent?.(student);
                        try {
                            const enrollment = await this.getStudentEnrollment(student.id);
                            stats.enrollmentsProcessed += 1;
                            await options.onEnrollment?.(enrollment);
                        }
                        catch (error) {
                            errors.push({
                                entity: 'enrollment',
                                id: student.id,
                                error: error instanceof Error ? error.message : 'Unknown error',
                                timestamp: new Date(),
                            });
                            stats.errors += 1;
                        }
                        try {
                            const guardians = await this.getStudentGuardians(student.id);
                            for (const guardian of guardians) {
                                stats.guardiansProcessed += 1;
                                await options.onGuardian?.(student.id, guardian);
                                await options.onRelationship?.(student.id, guardian);
                                stats.relationshipsCreated += 1;
                            }
                        }
                        catch (error) {
                            errors.push({
                                entity: 'guardian',
                                id: student.id,
                                error: error instanceof Error ? error.message : 'Unknown error',
                                timestamp: new Date(),
                            });
                            stats.errors += 1;
                        }
                    }
                    nextPageToken = page.nextPageToken;
                }
                catch (error) {
                    errors.push({
                        entity: 'student',
                        id: school.id,
                        error: error instanceof Error ? error.message : 'Unknown error',
                        timestamp: new Date(),
                    });
                    stats.errors += 1;
                    nextPageToken = undefined;
                }
            } while (nextPageToken);
        }
        const result = {
            success: errors.length === 0,
            duration: Date.now() - start,
            stats,
            errors,
            nextSyncRecommendedAt: new Date(Date.now() + 15 * 60 * 1000),
        };
        await this.prisma.auditLog.create({
            data: {
                districtId,
                userId: null,
                action: client_1.AuditAction.BULK_OPERATION,
                entityType: 'SIS_SYNC',
                entityId: districtId,
                changes: null,
                ipAddress: null,
                userAgent: null,
                requestId: null,
                metadata: {
                    vendor: 'powerschool',
                    stats,
                    errors: errors.map((e) => ({
                        entity: e.entity,
                        id: e.id,
                        error: e.error,
                    })),
                },
            },
        });
        return result;
    }
    async getChanges(lastSyncTime, entityTypes) {
        const changes = await this.client.getChanges(lastSyncTime, entityTypes);
        return changes.map((change) => ({
            entityType: change.entity ?? change.type,
            entityId: String(change.id ?? change.entityid ?? ''),
            operation: change.action ?? change.operation ?? 'update',
            changedAt: change.changed_at
                ? new Date(change.changed_at)
                : change.date
                    ? new Date(change.date)
                    : new Date(),
            data: change,
        }));
    }
}
exports.PowerSchoolConnector = PowerSchoolConnector;
//# sourceMappingURL=powerschool.connector.js.map