import { Logger, RetryOptions } from '../../../types';
import type { DateRange, PaginatedResult, QueryOptions, SISConnection, SISCredentials } from '../../interfaces';
/**
 * HTTP client for Skyward REST API.
 * Supports OAuth2, API key, and basic auth configurations.
 */
export declare class SkywardClient {
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
    getSectionStudents(sectionId: string): Promise<any[]>;
    getRoster(teacherId: string, termId?: string): Promise<any>;
    getChanges(lastSyncTime: Date, entityTypes?: string[]): Promise<any[]>;
    listCampuses(): Promise<{
        id: string;
        name?: string;
    }[]>;
    private request;
    private buildAuthHeaders;
    private refreshToken;
    private logSuccess;
    private shouldRetry;
    private computeBackoff;
}
//# sourceMappingURL=skyward.client.d.ts.map