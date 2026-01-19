import { PrismaClient } from '@prisma/client';
import { Logger } from '../../../types';
import type { HealthCheckResult, PaginatedResult, QueryOptions, RawAttendance, RawClassSection, RawContact, RawEnrollment, RawGrade, RawGuardian, RawRoster, RawStudent, SISChange, SISConnection, SISConnector, SISCredentials, SyncOptions, SyncResult } from '../../interfaces';
/**
 * Skyward Connector implementation.
 */
export declare class SkywardConnector implements SISConnector {
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
    getTeacherRoster(teacherId: string, termId?: string): Promise<RawRoster>;
    getSectionStudents(sectionId: string): Promise<RawStudent[]>;
    syncDistrict(districtId: string, options: SyncOptions): Promise<SyncResult>;
    getChanges(lastSyncTime: Date, entityTypes?: string[]): Promise<SISChange[]>;
}
//# sourceMappingURL=skyward.connector.d.ts.map