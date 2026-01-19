/**
 * Shared SIS types used by all connectors.
 */
export type Vendor = 'powerschool' | 'skyward' | 'infinite_campus' | 'custom';
export interface SISCredentials {
    vendor: Vendor;
    baseUrl: string;
    clientId: string;
    clientSecret: string;
    authType: 'oauth2' | 'basic' | 'api_key';
    additionalConfig?: Record<string, unknown>;
}
export interface SISConnection {
    status: 'connected' | 'failed';
    vendor: string;
    expiresAt?: Date;
    metadata?: Record<string, unknown>;
}
export interface HealthCheckResult {
    healthy: boolean;
    latency?: number;
    lastSuccessfulSync?: Date;
    error?: string;
}
export interface DateRange {
    start: Date;
    end: Date;
}
export interface QueryOptions {
    pageToken?: string;
    pageSize?: number;
    updatedAfter?: Date;
    filter?: Record<string, string | number | boolean>;
}
export interface PaginatedResult<T> {
    items: T[];
    nextPageToken?: string;
    total?: number;
}
export interface RawStudent {
    id: string;
    studentNumber: string;
    firstName: string;
    lastName: string;
    middleName?: string;
    preferredName?: string;
    dateOfBirth: Date;
    grade: number | string;
    gender?: string;
    email?: string;
    phoneNumber?: string;
    photoUrl?: string;
    schoolId?: string;
    metadata?: Record<string, unknown>;
}
export interface RawEnrollment {
    studentId: string;
    schoolId: string;
    grade: number | string;
    status: 'active' | 'inactive' | 'graduated' | 'transferred';
    entryDate: Date;
    exitDate?: Date;
    schoolYear: string;
    homeroom?: string;
    metadata?: Record<string, unknown>;
}
export interface RawGuardian {
    id: string;
    firstName: string;
    lastName: string;
    relationship: string;
    email?: string;
    phone?: string;
    address?: {
        street: string;
        city: string;
        state: string;
        zip: string;
    };
    isPrimary: boolean;
    canPickup: boolean;
    receiveCommunications: boolean;
    metadata?: Record<string, unknown>;
}
export interface RawContact {
    id: string;
    firstName: string;
    lastName: string;
    phone?: string;
    email?: string;
    relationship?: string;
    priority?: number;
    metadata?: Record<string, unknown>;
}
export interface RawClassSection {
    id: string;
    courseId: string;
    courseName: string;
    teacherId: string;
    termId?: string;
    periodId?: string;
    room?: string;
    schedule?: string[];
    startDate?: Date;
    endDate?: Date;
    metadata?: Record<string, unknown>;
}
export interface RawAssignment {
    id: string;
    title: string;
    description?: string;
    dueDate?: Date;
    assignedDate?: Date;
    sectionId: string;
    pointsPossible?: number;
    status?: string;
    metadata?: Record<string, unknown>;
}
export interface RawGrade {
    studentId: string;
    courseId: string;
    courseName: string;
    teacherId: string;
    termId: string;
    grade: string;
    percentage?: number;
    letterGrade?: string;
    comment?: string;
    lastUpdated: Date;
    metadata?: Record<string, unknown>;
}
export interface RawAttendance {
    studentId: string;
    date: Date;
    status: 'present' | 'absent' | 'tardy' | 'excused';
    periodId?: string;
    comment?: string;
    metadata?: Record<string, unknown>;
}
export interface RawRoster {
    teacherId: string;
    sections: {
        sectionId: string;
        studentIds: string[];
    }[];
}
export interface SyncOptions {
    schoolIds?: string[];
    pageSize?: number;
    startDate?: Date;
    endDate?: Date;
    fullRefresh?: boolean;
    includeInactive?: boolean;
    concurrency?: number;
    onStudent?: (student: RawStudent) => Promise<void>;
    onGuardian?: (studentId: string, guardian: RawGuardian) => Promise<void>;
    onEnrollment?: (enrollment: RawEnrollment) => Promise<void>;
    onRelationship?: (studentId: string, guardian: RawGuardian) => Promise<void>;
}
export interface SyncError {
    entity: string;
    id?: string;
    error: string;
    timestamp: Date;
}
export interface SyncStats {
    studentsProcessed: number;
    guardiansProcessed: number;
    enrollmentsProcessed: number;
    relationshipsCreated: number;
    errors: number;
}
export interface SyncResult {
    success: boolean;
    duration: number;
    stats: SyncStats;
    errors: SyncError[];
    nextSyncRecommendedAt?: Date;
}
export interface SISChange {
    entityType: 'student' | 'enrollment' | 'grade' | 'attendance';
    entityId: string;
    operation: 'create' | 'update' | 'delete';
    changedAt: Date;
    data?: unknown;
}
export interface SyncJob {
    districtId: string;
    syncType: 'full' | 'incremental';
    scheduledAt: Date;
}
//# sourceMappingURL=sis-types.d.ts.map