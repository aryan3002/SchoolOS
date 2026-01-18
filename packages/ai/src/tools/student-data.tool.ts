/**
 * Student Data Fetch Tool
 *
 * Retrieves student-specific information like grades, attendance,
 * and progress with proper authorization checks.
 *
 * @module @schoolos/ai/tools
 */

import {
  ToolDefinition,
  ToolParams,
  ToolResult,
  Permission,
  IntentCategory,
  UserContext,
} from '../types';
import { BaseTool } from './base-tool';

// ============================================================
// TYPES
// ============================================================

export interface StudentInfo {
  id: string;
  firstName: string;
  lastName: string;
  gradeLevel: string;
  schoolId: string;
  schoolName: string;
  homeroom?: string;
  counselor?: string;
}

export interface StudentGrade {
  courseId: string;
  courseName: string;
  grade: string;
  percentage?: number;
  letterGrade: string;
  teacher: string;
  period?: string;
  lastUpdated: Date;
}

export interface StudentAttendance {
  totalDays: number;
  present: number;
  absent: number;
  tardy: number;
  excused: number;
  recentAbsences: Array<{
    date: Date;
    reason?: string;
    excused: boolean;
  }>;
}

export interface StudentAssignment {
  id: string;
  title: string;
  courseName: string;
  dueDate: Date;
  status: 'pending' | 'submitted' | 'graded' | 'late' | 'missing';
  grade?: string;
  points?: number;
  maxPoints?: number;
}

export interface StudentDataFetchParams extends ToolParams {
  /** Student ID to fetch data for */
  studentId?: string;

  /** Types of data to fetch */
  dataTypes?: Array<'grades' | 'attendance' | 'assignments' | 'schedule' | 'info'>;

  /** For grades/assignments, filter by course */
  courseId?: string;

  /** Date range for attendance/assignments */
  startDate?: Date;
  endDate?: Date;
}

export interface StudentDataService {
  getStudentInfo(studentId: string, districtId: string): Promise<StudentInfo | null>;
  getStudentGrades(studentId: string, districtId: string, courseId?: string): Promise<StudentGrade[]>;
  getStudentAttendance(
    studentId: string,
    districtId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<StudentAttendance>;
  getStudentAssignments(
    studentId: string,
    districtId: string,
    options?: {
      courseId?: string;
      status?: string[];
      limit?: number;
    },
  ): Promise<StudentAssignment[]>;
}

// ============================================================
// STUDENT DATA FETCH TOOL
// ============================================================

export class StudentDataFetchTool extends BaseTool {
  readonly definition: ToolDefinition = {
    name: 'student_data_fetch',
    description: 'Retrieves student-specific data including grades, attendance, and assignments',
    requiredPermissions: [Permission.READ_OWN_STUDENT],
    handlesIntents: [IntentCategory.STUDENT_SPECIFIC, IntentCategory.ASSIGNMENT_HELP],
    requiresStudentContext: true,
    timeoutMs: 8000,
  };

  constructor(private readonly studentDataService: StudentDataService) {
    super();
  }

  /**
   * Override canExecute to add relationship-based checks
   */
  override canExecute(context: UserContext): boolean {
    // Basic permission check
    if (!super.canExecute(context)) {
      return false;
    }

    // Parents need child relationship
    if (context.role === 'PARENT') {
      return (context.childIds?.length ?? 0) > 0;
    }

    // Students can only access their own data
    if (context.role === 'STUDENT') {
      return true; // Will be filtered to their own data
    }

    // Teachers and admins have broader access
    return true;
  }

  protected async executeImpl(
    params: StudentDataFetchParams,
  ): Promise<Omit<ToolResult, 'toolName' | 'executionTimeMs'>> {
    const { context, intent } = params;

    // Determine which student to query
    const studentId = this.resolveStudentId(params, context, intent);

    if (!studentId) {
      return {
        success: false,
        content: '',
        confidence: 0,
        error: 'NO_STUDENT_SPECIFIED: Could not determine which student to query',
      };
    }

    // Verify access
    if (!this.hasAccessToStudent(context, studentId)) {
      return {
        success: false,
        content: '',
        confidence: 0,
        error: 'ACCESS_DENIED: You do not have permission to view this student\'s data',
      };
    }

    // Determine what data to fetch
    const dataTypes = params.dataTypes || this.inferDataTypes(intent);

    // Fetch data in parallel
    const results = await this.fetchStudentData(
      studentId,
      context.districtId,
      dataTypes,
      params,
    );

    // Format response
    const formattedContent = this.formatStudentData(results);

    return this.createSuccessResult(formattedContent, {
      data: {
        studentId,
        dataTypes,
        ...results,
      },
      confidence: 0.95,
    });
  }

  /**
   * Resolve which student ID to query
   */
  private resolveStudentId(
    params: StudentDataFetchParams,
    context: UserContext,
    intent: ToolParams['intent'],
  ): string | undefined {
    // Explicit param
    if (params.studentId) {
      return params.studentId;
    }

    // From intent entities
    if (intent.entities.studentId) {
      return intent.entities.studentId;
    }

    // If student role, use their own ID
    if (context.role === 'STUDENT') {
      return context.userId;
    }

    // If parent with one child, use that child
    if (context.role === 'PARENT' && context.childIds?.length === 1) {
      return context.childIds[0];
    }

    return undefined;
  }

  /**
   * Check if user has access to a specific student
   */
  private hasAccessToStudent(context: UserContext, studentId: string): boolean {
    // Admin/staff have broad access
    if (context.role === 'ADMIN' || context.role === 'STAFF') {
      return true;
    }

    // Teacher needs to verify section enrollment (simplified for now)
    if (context.role === 'TEACHER') {
      return true; // Would check section enrollment in production
    }

    // Parent must have relationship
    if (context.role === 'PARENT') {
      return context.childIds?.includes(studentId) ?? false;
    }

    // Student can only access their own
    if (context.role === 'STUDENT') {
      return context.userId === studentId;
    }

    return false;
  }

  /**
   * Infer what data types to fetch based on intent
   */
  private inferDataTypes(intent: ToolParams['intent']): Array<'grades' | 'attendance' | 'assignments' | 'info'> {
    const query = intent.originalQuery.toLowerCase();

    const types: Array<'grades' | 'attendance' | 'assignments' | 'info'> = [];

    if (query.includes('grade') || query.includes('score') || query.includes('gpa')) {
      types.push('grades');
    }

    if (query.includes('attend') || query.includes('absent') || query.includes('tardy')) {
      types.push('attendance');
    }

    if (query.includes('assignment') || query.includes('homework') || query.includes('due')) {
      types.push('assignments');
    }

    // Default to grades and info if nothing specific
    if (types.length === 0) {
      types.push('info', 'grades');
    }

    return types;
  }

  /**
   * Fetch student data based on requested types
   */
  private async fetchStudentData(
    studentId: string,
    districtId: string,
    dataTypes: Array<'grades' | 'attendance' | 'assignments' | 'schedule' | 'info'>,
    params: StudentDataFetchParams,
  ): Promise<{
    info?: StudentInfo | null;
    grades?: StudentGrade[];
    attendance?: StudentAttendance;
    assignments?: StudentAssignment[];
  }> {
    const results: {
      info?: StudentInfo | null;
      grades?: StudentGrade[];
      attendance?: StudentAttendance;
      assignments?: StudentAssignment[];
    } = {};

    const fetches: Promise<void>[] = [];

    if (dataTypes.includes('info')) {
      fetches.push(
        this.studentDataService.getStudentInfo(studentId, districtId).then((info) => {
          results.info = info;
        }),
      );
    }

    if (dataTypes.includes('grades')) {
      fetches.push(
        this.studentDataService
          .getStudentGrades(studentId, districtId, params.courseId)
          .then((grades) => {
            results.grades = grades;
          }),
      );
    }

    if (dataTypes.includes('attendance')) {
      fetches.push(
        this.studentDataService
          .getStudentAttendance(studentId, districtId, params.startDate, params.endDate)
          .then((attendance) => {
            results.attendance = attendance;
          }),
      );
    }

    if (dataTypes.includes('assignments')) {
      fetches.push(
        this.studentDataService
          .getStudentAssignments(studentId, districtId, {
            courseId: params.courseId,
            limit: 10,
          })
          .then((assignments) => {
            results.assignments = assignments;
          }),
      );
    }

    await Promise.all(fetches);

    return results;
  }

  /**
   * Format student data for response
   */
  private formatStudentData(data: {
    info?: StudentInfo | null;
    grades?: StudentGrade[];
    attendance?: StudentAttendance;
    assignments?: StudentAssignment[];
  }): string {
    const sections: string[] = [];

    if (data.info) {
      sections.push(
        `**Student Information**\n` +
          `Name: ${data.info.firstName} ${data.info.lastName}\n` +
          `Grade: ${data.info.gradeLevel}\n` +
          `School: ${data.info.schoolName}`,
      );
    }

    if (data.grades && data.grades.length > 0) {
      const gradesText = data.grades
        .map(
          (g) =>
            `- ${g.courseName}: ${g.letterGrade}${g.percentage ? ` (${g.percentage}%)` : ''}`,
        )
        .join('\n');
      sections.push(`**Current Grades**\n${gradesText}`);
    }

    if (data.attendance) {
      const att = data.attendance;
      const attendanceRate = ((att.present / att.totalDays) * 100).toFixed(1);
      sections.push(
        `**Attendance Summary**\n` +
          `Attendance Rate: ${attendanceRate}%\n` +
          `Present: ${att.present} days | Absent: ${att.absent} days | Tardy: ${att.tardy}`,
      );
    }

    if (data.assignments && data.assignments.length > 0) {
      const assignmentsText = data.assignments
        .map((a) => {
          const dueDate = a.dueDate.toLocaleDateString();
          const status = a.status.toUpperCase();
          return `- ${a.title} (${a.courseName}) - Due: ${dueDate} [${status}]`;
        })
        .join('\n');
      sections.push(`**Upcoming Assignments**\n${assignmentsText}`);
    }

    return sections.join('\n\n');
  }
}
