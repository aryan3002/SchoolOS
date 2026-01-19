import { AuditAction, PrismaClient } from '@prisma/client';

import { Logger } from '../../../types';
import type {
  HealthCheckResult,
  PaginatedResult,
  QueryOptions,
  RawAttendance,
  RawClassSection,
  RawContact,
  RawEnrollment,
  RawGrade,
  RawGuardian,
  RawRoster,
  RawStudent,
  SISChange,
  SISConnection,
  SISConnector,
  SISCredentials,
  SyncError,
  SyncOptions,
  SyncResult,
} from '../../interfaces';
import { SkywardClient } from './skyward.client';
import { SkywardMapper } from './skyward.mapper';

/**
 * Skyward Connector implementation.
 */
export class SkywardConnector implements SISConnector {
  private readonly client: SkywardClient;
  private readonly mapper: SkywardMapper;

  constructor(
    private readonly credentials: SISCredentials,
    private readonly prisma: PrismaClient,
    private readonly logger: Logger,
  ) {
    this.mapper = new SkywardMapper();
    this.client = new SkywardClient(
      credentials,
      logger.child ? logger.child({ vendor: 'skyward' }) : logger,
    );
  }

  async authenticate(credentials: SISCredentials): Promise<SISConnection> {
    this.credentials.baseUrl = credentials.baseUrl;
    return this.client.authenticate();
  }

  async testConnection(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      await this.client.listCampuses();
      return {
        healthy: true,
        latency: Date.now() - start,
        lastSuccessfulSync: new Date(),
      };
    } catch (error) {
      return {
        healthy: false,
        latency: Date.now() - start,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async getStudent(studentId: string): Promise<RawStudent> {
    const student = await this.client.getStudent(studentId);
    return this.mapper.mapStudent(student);
  }

  async getStudents(
    schoolId: string,
    options?: QueryOptions,
  ): Promise<PaginatedResult<RawStudent>> {
    const response = await this.client.listStudents(schoolId, options);
    return {
      items: response.items.map((student) => this.mapper.mapStudent(student)),
      nextPageToken: response.nextPageToken,
      total: response.total,
    };
  }

  async getStudentsByIds(studentIds: string[]): Promise<RawStudent[]> {
    const results: RawStudent[] = [];
    for (const id of studentIds) {
      results.push(await this.getStudent(id));
    }
    return results;
  }

  async getStudentEnrollment(studentId: string): Promise<RawEnrollment> {
    const enrollment = await this.client.getEnrollment(studentId);
    return this.mapper.mapEnrollment(enrollment);
  }

  async getStudentGuardians(studentId: string): Promise<RawGuardian[]> {
    const guardians = await this.client.getGuardians(studentId);
    return guardians.map((guardian) => this.mapper.mapGuardian(guardian));
  }

  async getStudentContacts(studentId: string): Promise<RawContact[]> {
    const contacts = await this.client.getContacts(studentId);
    return contacts.map((contact) => this.mapper.mapContact(contact));
  }

  async getStudentSchedule(
    studentId: string,
    termId?: string,
  ): Promise<RawClassSection[]> {
    const schedule = await this.client.getSchedule(studentId, termId);
    return schedule.map((section) => this.mapper.mapClassSection(section));
  }

  async getStudentGrades(studentId: string, termId?: string): Promise<RawGrade[]> {
    const grades = await this.client.getGrades(studentId, termId);
    return grades.map((grade) => this.mapper.mapGrade(grade));
  }

  async getStudentAttendance(
    studentId: string,
    dateRange: { start: Date; end: Date },
  ): Promise<RawAttendance[]> {
    const attendance = await this.client.getAttendance(studentId, dateRange);
    return attendance.map((att) => this.mapper.mapAttendance(att));
  }

  async getTeacherRoster(teacherId: string, termId?: string): Promise<RawRoster> {
    const roster = await this.client.getRoster(teacherId, termId);
    return {
      teacherId,
      sections: Array.isArray(roster?.sections)
        ? roster.sections.map((section: any) => ({
            sectionId: String(section.sectionId ?? section.SectionId ?? ''),
            studentIds: Array.isArray(section.students)
              ? section.students.map((s: any) => String(s.id ?? s.StudentId))
              : [],
          }))
        : [],
    };
  }

  async getSectionStudents(sectionId: string): Promise<RawStudent[]> {
    const students = await this.client.getSectionStudents(sectionId);
    return students.map((student) => this.mapper.mapStudent(student));
  }

  async syncDistrict(
    districtId: string,
    options: SyncOptions,
  ): Promise<SyncResult> {
    const start = Date.now();
    const stats = {
      studentsProcessed: 0,
      guardiansProcessed: 0,
      enrollmentsProcessed: 0,
      relationshipsCreated: 0,
      errors: 0,
    };
    const errors: SyncError[] = [];

    const campuses =
      options.schoolIds && options.schoolIds.length > 0
        ? options.schoolIds.map((id) => ({ id }))
        : await this.client.listCampuses();

    for (const campus of campuses) {
      let nextPageToken: string | undefined;
      do {
        try {
          const page = await this.getStudents(campus.id, {
            pageToken: nextPageToken,
            pageSize: options.pageSize,
            updatedAfter: options.startDate,
          });

          for (const student of page.items) {
            stats.studentsProcessed += 1;
            await options.onStudent?.(student);
            try {
              const enrollment = await this.getStudentEnrollment(student.id);
              stats.enrollmentsProcessed += 1;
              await options.onEnrollment?.(enrollment);
            } catch (error) {
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
            } catch (error) {
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
        } catch (error) {
          errors.push({
            entity: 'student',
            id: campus.id,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date(),
          });
          stats.errors += 1;
          nextPageToken = undefined;
        }
      } while (nextPageToken);
    }

    const result: SyncResult = {
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
        action: AuditAction.BULK_OPERATION,
        entityType: 'SIS_SYNC',
        entityId: districtId,
        changes: null,
        ipAddress: null,
        userAgent: null,
        requestId: null,
        metadata: {
          vendor: 'skyward',
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

  async getChanges(lastSyncTime: Date, entityTypes?: string[]): Promise<SISChange[]> {
    const changes = await this.client.getChanges(lastSyncTime, entityTypes);
    return changes.map((change: any) => ({
      entityType: change.entityType ?? change.type ?? 'student',
      entityId: String(change.entityId ?? change.id ?? ''),
      operation: change.operation ?? change.action ?? 'update',
      changedAt: change.changedAt
        ? new Date(change.changedAt)
        : change.date
          ? new Date(change.date)
          : new Date(),
      data: change,
    }));
  }
}
