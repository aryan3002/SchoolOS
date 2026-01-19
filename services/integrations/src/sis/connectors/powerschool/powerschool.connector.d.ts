import { PrismaClient } from '@prisma/client';
import { Logger } from '../../../types';
import type { PaginatedResult, QueryOptions, RawAttendance, RawClassSection, RawContact, RawEnrollment, RawGrade, RawGuardian, RawRoster, RawStudent, RawAssignment, HealthCheckResult, SISChange, SISConnection, SISConnector, SISCredentials, SyncOptions, SyncResult } from '../../interfaces';
/**
 * PowerSchool Connector implementation.
 * Handles OAuth, rate limiting, pagination, and mapping to raw SIS types.
 */
export declare class PowerSchoolConnector implements SISConnector {
    private credentials;
    private readonly prisma;
    private readonly logger;
    private client;
    private readonly mapper;
    constructor(credentials: SISCredentials, prisma: PrismaClient, logger: Logger);
    authenticate(credentials: SISCredentials): Promise<SISConnection>;
    testConnection(): Promise<HealthCheckResult>;
    getStudent(studentId: string): Promise<RawStudent>;
    getStudents(schoolId: string, options?: QueryOptions): Promise<PaginatedResult<RawStudent>>;
    getStudentsByIds(studentIds: string[]): Promise<RawStudent[]>;
    getStudentEnrollment(studentId: string): Promise<RawEnrollment>;
    getStudentGuardians(studentId: string): Promise<RawGuardian[]>;
    getStudentContacts(studentId: string): Promise<RawContact[]>;
    getStudentSchedule(studentId: string, termId?: string): Promise<RawClassSection[]>;
    getStudentGrades(studentId: string, termId?: string): Promise<RawGrade[]>;
    getStudentAttendance(studentId: string, dateRange: {
        start: Date;
        end: Date;
    }): Promise<RawAttendance[]>;
    getStudentAssignments(studentId: string): Promise<RawAssignment[]>;
    getTeacherRoster(teacherId: string, termId?: string): Promise<RawRoster>;
    getSectionStudents(sectionId: string): Promise<RawStudent[]>;
    syncDistrict(districtId: string, options: SyncOptions): Promise<SyncResult>;
    getChanges(lastSyncTime: Date, entityTypes?: string[]): Promise<SISChange[]>;
}
//# sourceMappingURL=powerschool.connector.d.ts.map