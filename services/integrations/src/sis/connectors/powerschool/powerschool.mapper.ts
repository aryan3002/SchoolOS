import type {
  RawAttendance,
  RawClassSection,
  RawContact,
  RawEnrollment,
  RawGrade,
  RawGuardian,
  RawAssignment,
  RawStudent,
} from '../../interfaces';

const toDate = (value?: string | number | Date | null): Date => {
  if (!value) {
    throw new Error('Missing required date value');
  }
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date: ${String(value)}`);
  }
  return parsed;
};

const cleanString = (value?: string | null): string | undefined => {
  if (!value) return undefined;
  return value.trim();
};

/**
 * Maps PowerSchool payloads into raw SIS types.
 * Keeps vendor-specific fields in metadata for downstream consumers.
 */
export class PowerSchoolMapper {
  mapStudent(payload: any): RawStudent {
    const student = payload?.student ?? payload;
    if (!student?.id || !student?.student_number) {
      throw new Error('Invalid student payload');
    }

    return {
      id: String(student.id),
      studentNumber: String(student.student_number),
      firstName: cleanString(student.first_name) ?? '',
      lastName: cleanString(student.last_name) ?? '',
      middleName: cleanString(student.middle_name),
      preferredName: cleanString(student.preferred_name) ?? cleanString(student.nickname),
      dateOfBirth: toDate(student.dob ?? student.birth_date),
      grade: student.grade_level ?? student.grade,
      gender: cleanString(student.gender),
      email: cleanString(student.email),
      phoneNumber: cleanString(student.phone),
      photoUrl: cleanString(student.photo) ?? cleanString(student.photo_url),
      schoolId: student.schoolid ? String(student.schoolid) : undefined,
      metadata: student,
    };
  }

  mapEnrollment(payload: any): RawEnrollment {
    const enrollment = Array.isArray(payload?.enrollment)
      ? payload.enrollment[0]
      : payload?.enrollment ?? payload;

    if (!enrollment?.studentid && !enrollment?.student_id) {
      throw new Error('Invalid enrollment payload');
    }

    return {
      studentId: String(enrollment.studentid ?? enrollment.student_id),
      schoolId: String(enrollment.schoolid ?? enrollment.school_id ?? ''),
      grade: enrollment.grade_level ?? enrollment.grade,
      status: this.normalizeStatus(enrollment.exitcode),
      entryDate: toDate(enrollment.entrydate ?? enrollment.entry_date),
      exitDate: enrollment.exitdate
        ? toDate(enrollment.exitdate ?? enrollment.exit_date)
        : undefined,
      schoolYear: String(
        enrollment.yearid ?? enrollment.school_year ?? new Date().getFullYear(),
      ),
      homeroom: cleanString(enrollment.homeroom),
      metadata: enrollment,
    };
  }

  mapGuardian(payload: any): RawGuardian {
    const guardian = payload?.contact ?? payload;
    if (!guardian?.id && !guardian?.contactid) {
      throw new Error('Invalid guardian payload');
    }

    return {
      id: String(guardian.id ?? guardian.contactid),
      firstName: cleanString(guardian.first_name ?? guardian.firstName) ?? '',
      lastName: cleanString(guardian.last_name ?? guardian.lastName) ?? '',
      relationship:
        cleanString(guardian.relationship) ??
        cleanString(guardian.relationship_to_student) ??
        'guardian',
      email: cleanString(guardian.email),
      phone: cleanString(guardian.phone ?? guardian.mobile_phone),
      address: guardian.address
        ? {
            street: cleanString(guardian.address.street) ?? '',
            city: cleanString(guardian.address.city) ?? '',
            state: cleanString(guardian.address.state) ?? '',
            zip: cleanString(guardian.address.zip) ?? '',
          }
        : undefined,
      isPrimary: Boolean(guardian.is_primary ?? guardian.primary_contact ?? false),
      canPickup: Boolean(guardian.can_pickup ?? guardian.pickup ?? false),
      receiveCommunications: Boolean(
        guardian.receive_communications ?? guardian.communications ?? true,
      ),
      metadata: guardian,
    };
  }

  mapContact(payload: any): RawContact {
    const contact = payload?.contact ?? payload;
    if (!contact?.id && !contact?.contactid) {
      throw new Error('Invalid contact payload');
    }

    return {
      id: String(contact.id ?? contact.contactid),
      firstName: cleanString(contact.first_name) ?? '',
      lastName: cleanString(contact.last_name) ?? '',
      phone: cleanString(contact.phone ?? contact.mobile_phone),
      email: cleanString(contact.email),
      relationship: cleanString(contact.relationship),
      priority: contact.priority ? Number(contact.priority) : undefined,
      metadata: contact,
    };
  }

  mapClassSection(payload: any): RawClassSection {
    const section = payload?.section ?? payload;
    if (!section?.id && !section?.sectionid) {
      throw new Error('Invalid class section payload');
    }

    return {
      id: String(section.id ?? section.sectionid),
      courseId: String(section.course_number ?? section.courseid ?? ''),
      courseName: cleanString(section.course_name ?? section.name) ?? '',
      teacherId: String(section.teacherid ?? section.teacher_id ?? ''),
      termId: section.termid ? String(section.termid) : undefined,
      periodId: section.period ? String(section.period) : undefined,
      room: cleanString(section.room),
      schedule: Array.isArray(section.schedule) ? section.schedule : undefined,
      startDate: section.start_date ? toDate(section.start_date) : undefined,
      endDate: section.end_date ? toDate(section.end_date) : undefined,
      metadata: section,
    };
  }

  mapGrade(payload: any): RawGrade {
    const grade = payload?.grade ?? payload;
    if (!grade?.studentid && !grade?.student_id) {
      throw new Error('Invalid grade payload');
    }

    return {
      studentId: String(grade.studentid ?? grade.student_id),
      courseId: String(grade.courseid ?? grade.course_id ?? ''),
      courseName: cleanString(grade.course_name ?? grade.name) ?? '',
      teacherId: String(grade.teacherid ?? grade.teacher_id ?? ''),
      termId: String(grade.termid ?? grade.term_id ?? ''),
      grade: String(grade.grade ?? grade.letter_grade ?? ''),
      percentage: grade.percent ? Number(grade.percent) : undefined,
      letterGrade:
        grade.letter_grade ?? (grade.percent ? String(grade.percent) : undefined),
      comment: cleanString(grade.comment),
      lastUpdated: toDate(grade.last_updated ?? grade.date),
      metadata: grade,
    };
  }

  mapAttendance(payload: any): RawAttendance {
    const attendance = payload?.attendance ?? payload;
    if (!attendance?.studentid && !attendance?.student_id) {
      throw new Error('Invalid attendance payload');
    }

    return {
      studentId: String(attendance.studentid ?? attendance.student_id),
      date: toDate(attendance.att_date ?? attendance.date),
      status: this.normalizeAttendanceCode(attendance.att_code ?? attendance.code),
      periodId: attendance.periodid ? String(attendance.periodid) : undefined,
      comment: cleanString(attendance.comment),
      metadata: attendance,
    };
  }

  mapAssignment(payload: any): RawAssignment {
    const assignment = payload?.assignment ?? payload;
    if (!assignment?.id && !assignment?.assignmentid) {
      throw new Error('Invalid assignment payload');
    }

    return {
      id: String(assignment.id ?? assignment.assignmentid),
      title: cleanString(assignment.title ?? assignment.name) ?? '',
      description: cleanString(assignment.description),
      dueDate: assignment.due_date ? toDate(assignment.due_date) : undefined,
      assignedDate: assignment.assigned_date
        ? toDate(assignment.assigned_date)
        : undefined,
      sectionId: String(assignment.sectionid ?? assignment.section_id ?? ''),
      pointsPossible: assignment.points_possible
        ? Number(assignment.points_possible)
        : undefined,
      status: cleanString(assignment.status),
      metadata: assignment,
    };
  }

  private normalizeStatus(exitCode?: string): RawEnrollment['status'] {
    const code = (exitCode ?? '').toString().toLowerCase();
    if (code.includes('grad')) return 'graduated';
    if (code.includes('transfer')) return 'transferred';
    if (code.includes('inactive')) return 'inactive';
    return 'active';
  }

  private normalizeAttendanceCode(code?: string): RawAttendance['status'] {
    const normalized = (code ?? '').toLowerCase();
    if (normalized.startsWith('t')) return 'tardy';
    if (normalized.startsWith('e')) return 'excused';
    if (normalized.startsWith('a')) return 'absent';
    return 'present';
  }
}
