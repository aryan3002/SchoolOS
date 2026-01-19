/**
 * Universal SIS Connector Interface
 *
 * All SIS vendor implementations must implement this interface.
 * This ensures vendor-agnostic integration in SchoolOS.
 */

import type {
  SISCredentials,
  SISConnection,
  HealthCheckResult,
  RawStudent,
  RawEnrollment,
  RawGuardian,
  RawGrade,
  RawAttendance,
  RawContact,
  RawClassSection,
  RawAssignment,
  RawRoster,
  SyncResult,
  SyncOptions,
  SISChange,
  QueryOptions,
  PaginatedResult,
  DateRange,
} from './sis-types';

export interface SISConnector {
  /**
   * Authenticate with the SIS.
   * Should cache any tokens needed for subsequent requests.
   */
  authenticate(credentials: SISCredentials): Promise<SISConnection>;

  /**
   * Test connection health.
   */
  testConnection(): Promise<HealthCheckResult>;

  /**
   * Get a single student by ID.
   */
  getStudent(studentId: string): Promise<RawStudent>;

  /**
   * Get all students for a school.
   * @param schoolId - School identifier.
   * @param options - Pagination, filters.
   */
  getStudents(
    schoolId: string,
    options?: QueryOptions,
  ): Promise<PaginatedResult<RawStudent>>;

  /**
   * Get students by IDs (batch fetch).
   */
  getStudentsByIds(studentIds: string[]): Promise<RawStudent[]>;

  /**
   * Get student's current enrollment (school, grade, status).
   */
  getStudentEnrollment(studentId: string): Promise<RawEnrollment>;

  /**
   * Get student's guardians/parents.
   */
  getStudentGuardians(studentId: string): Promise<RawGuardian[]>;

  /**
   * Get student's emergency contacts.
   */
  getStudentContacts(studentId: string): Promise<RawContact[]>;

  /**
   * Get student's current schedule (classes/sections).
   */
  getStudentSchedule(
    studentId: string,
    termId?: string,
  ): Promise<RawClassSection[]>;

  /**
   * Get student's grades.
   * @param studentId - Student identifier.
   * @param termId - Optional term/marking period.
   */
  getStudentGrades(studentId: string, termId?: string): Promise<RawGrade[]>;

  /**
   * Get student's attendance records.
   */
  getStudentAttendance(
    studentId: string,
    dateRange: DateRange,
  ): Promise<RawAttendance[]>;

  /**
   * Get student's assignments (if available).
   */
  getStudentAssignments?(studentId: string): Promise<RawAssignment[]>;

  /**
   * Get teacher's roster (all students in their classes).
   */
  getTeacherRoster(teacherId: string, termId?: string): Promise<RawRoster>;

  /**
   * Get all students in a specific class section.
   */
  getSectionStudents(sectionId: string): Promise<RawStudent[]>;

  /**
   * Sync entire district (full sync).
   * Use for initial setup or recovery.
   */
  syncDistrict(districtId: string, options: SyncOptions): Promise<SyncResult>;

  /**
   * Get changes since last sync (incremental).
   * Returns only records modified after lastSyncTime.
   */
  getChanges(lastSyncTime: Date, entityTypes?: string[]): Promise<SISChange[]>;
}

export type {
  SISCredentials,
  SISConnection,
  HealthCheckResult,
  RawStudent,
  RawEnrollment,
  RawGuardian,
  RawGrade,
  RawAttendance,
  RawContact,
  RawClassSection,
  RawAssignment,
  RawRoster,
  SyncResult,
  SyncOptions,
  SISChange,
  QueryOptions,
  PaginatedResult,
  DateRange,
};
