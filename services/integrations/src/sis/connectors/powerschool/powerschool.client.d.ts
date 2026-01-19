import { Logger, RetryOptions } from '../../../types';
import type { DateRange, PaginatedResult, QueryOptions, SISConnection, SISCredentials } from '../../interfaces';
/**
 * Low-level HTTP client for PowerSchool REST API.
 * Handles OAuth, rate limiting, retries, and structured logging.
 */
export declare class PowerSchoolClient {
    private readonly credentials;
    private readonly logger;
    private readonly axiosInstance;
    private readonly limiter;
    private readonly retryOptions;
    private accessToken?;
    private tokenExpiresAt?;
    private failureCount;
    private breakerOpenUntil?;
    constructor(credentials: SISCredentials, logger: Logger, retryOptions?: Partial<RetryOptions>);
    authenticate(): Promise<SISConnection>;
    getStudent(studentId: string): Promise<any>;
    listStudents(schoolId: string, options?: QueryOptions): Promise<PaginatedResult<any>>;
    getGuardians(studentId: string): Promise<any[]>;
    getContacts(studentId: string): Promise<any[]>;
    getEnrollment(studentId: string): Promise<any>;
    getSchedule(studentId: string, termId?: string): Promise<any[]>;
    getGrades(studentId: string, termId?: string): Promise<any[]>;
    getAttendance(studentId: string, dateRange: DateRange): Promise<any[]>;
    getAssignments(studentId: string): Promise<any[]>;
    getSectionStudents(sectionId: string): Promise<any[]>;
    getRoster(teacherId: string, termId?: string): Promise<any>;
    getChanges(lastSyncTime: Date, entityTypes?: string[]): Promise<any[]>;
    listSchools(): Promise<{
        id: string;
        name?: string;
    }[]>;
    private request;
    private logSuccess;
    private shouldRetry;
    private calculateBackoff;
    private refreshToken;
}
//# sourceMappingURL=powerschool.client.d.ts.map