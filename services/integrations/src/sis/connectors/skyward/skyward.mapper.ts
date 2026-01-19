import type {
  RawAttendance,
  RawClassSection,
  RawContact,
  RawEnrollment,
  RawGrade,
  RawGuardian,
  RawStudent,
} from '../../interfaces';

const toDate = (value?: string | number | Date | null): Date => {
  if (!value) throw new Error('Missing date value');
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date: ${String(value)}`);
  }
  return parsed;
};

const clean = (value?: string | null): string | undefined =>
  value ? value.trim() : undefined;

export class SkywardMapper {
  mapStudent(payload: any): RawStudent {
    const student = payload?.student ?? payload;
    if (!student?.id && !student?.StudentID) {
      throw new Error('Invalid student payload');
    }

    return {
      id: String(student.id ?? student.StudentID),
      studentNumber: String(
        student.studentNumber ?? student.StudentNumber ?? student.StudentID,
      ),
      firstName: clean(student.firstName ?? student.FirstName) ?? '',
      lastName: clean(student.lastName ?? student.LastName) ?? '',
      middleName: clean(student.middleName ?? student.MiddleName),
      preferredName: clean(
        student.preferredName ?? student.NickName ?? student.PreferredName,
      ),
      dateOfBirth: toDate(student.dob ?? student.BirthDate),
      grade: student.grade ?? student.GradeLevel ?? student.Grade,
      gender: clean(student.gender ?? student.Gender),
      email: clean(student.email ?? student.PrimaryEmail),
      phoneNumber: clean(student.phone ?? student.MobilePhone),
      photoUrl: clean(student.photoUrl ?? student.PhotoUrl),
      schoolId: student.schoolId
        ? String(student.schoolId)
        : student.SchoolId
          ? String(student.SchoolId)
          : undefined,
      metadata: student,
    };
  }

  mapEnrollment(payload: any): RawEnrollment {
    const enrollment = payload?.enrollment ?? payload;
    if (!enrollment?.studentId && !enrollment?.StudentId) {
      throw new Error('Invalid enrollment payload');
    }

    return {
      studentId: String(enrollment.studentId ?? enrollment.StudentId),
      schoolId: String(enrollment.schoolId ?? enrollment.SchoolId ?? ''),
      grade: enrollment.grade ?? enrollment.GradeLevel ?? enrollment.Grade,
      status: this.mapStatus(enrollment.status ?? enrollment.Status),
      entryDate: toDate(enrollment.entryDate ?? enrollment.EntryDate),
      exitDate: enrollment.exitDate
        ? toDate(enrollment.exitDate)
        : enrollment.ExitDate
          ? toDate(enrollment.ExitDate)
          : undefined,
      schoolYear: String(
        enrollment.schoolYear ??
          enrollment.SchoolYear ??
          new Date().getFullYear(),
      ),
      homeroom: clean(enrollment.homeroom ?? enrollment.Homeroom),
      metadata: enrollment,
    };
  }

  mapGuardian(payload: any): RawGuardian {
    const guardian = payload?.guardian ?? payload;
    if (!guardian?.id && !guardian?.GuardianId) {
      throw new Error('Invalid guardian payload');
    }

    return {
      id: String(guardian.id ?? guardian.GuardianId),
      firstName: clean(guardian.firstName ?? guardian.FirstName) ?? '',
      lastName: clean(guardian.lastName ?? guardian.LastName) ?? '',
      relationship:
        clean(guardian.relationship ?? guardian.Relationship) ?? 'guardian',
      email: clean(guardian.email ?? guardian.Email),
      phone: clean(guardian.phone ?? guardian.PhoneNumber),
      address: guardian.Address
        ? {
            street: clean(guardian.Address.Street) ?? '',
            city: clean(guardian.Address.City) ?? '',
            state: clean(guardian.Address.State) ?? '',
            zip: clean(guardian.Address.Zip) ?? '',
          }
        : undefined,
      isPrimary: Boolean(
        guardian.isPrimary ??
          guardian.PrimaryGuardian ??
          guardian.IsPrimary ??
          false,
      ),
      canPickup: Boolean(guardian.CanPickup ?? guardian.canPickup ?? true),
      receiveCommunications: Boolean(
        guardian.ReceiveCommunications ?? guardian.receiveCommunications ?? true,
      ),
      metadata: guardian,
    };
  }

  mapContact(payload: any): RawContact {
    const contact = payload?.contact ?? payload;
    if (!contact?.id && !contact?.ContactId) {
      throw new Error('Invalid contact payload');
    }

    return {
      id: String(contact.id ?? contact.ContactId),
      firstName: clean(contact.firstName ?? contact.FirstName) ?? '',
      lastName: clean(contact.lastName ?? contact.LastName) ?? '',
      phone: clean(contact.phone ?? contact.Phone),
      email: clean(contact.email ?? contact.Email),
      relationship: clean(contact.relationship ?? contact.Relationship),
      priority: contact.Priority ? Number(contact.Priority) : undefined,
      metadata: contact,
    };
  }

  mapClassSection(payload: any): RawClassSection {
    const section = payload?.section ?? payload;
    if (!section?.id && !section?.SectionId) {
      throw new Error('Invalid class section payload');
    }

    return {
      id: String(section.id ?? section.SectionId),
      courseId: String(section.CourseId ?? section.CourseCode ?? ''),
      courseName: clean(section.CourseName ?? section.Name) ?? '',
      teacherId: String(section.TeacherId ?? section.teacherId ?? ''),
      termId: section.TermId ? String(section.TermId) : undefined,
      periodId: section.Period ? String(section.Period) : undefined,
      room: clean(section.Room),
      schedule: Array.isArray(section.Schedule) ? section.Schedule : undefined,
      startDate: section.StartDate ? toDate(section.StartDate) : undefined,
      endDate: section.EndDate ? toDate(section.EndDate) : undefined,
      metadata: section,
    };
  }

  mapGrade(payload: any): RawGrade {
    const grade = payload?.grade ?? payload;
    if (!grade?.StudentId && !grade?.studentId) {
      throw new Error('Invalid grade payload');
    }

    return {
      studentId: String(grade.StudentId ?? grade.studentId),
      courseId: String(grade.CourseId ?? grade.courseId ?? ''),
      courseName: clean(grade.CourseName ?? grade.courseName) ?? '',
      teacherId: String(grade.TeacherId ?? grade.teacherId ?? ''),
      termId: String(grade.TermId ?? grade.termId ?? ''),
      grade: String(grade.Grade ?? grade.score ?? ''),
      percentage: grade.Percentage
        ? Number(grade.Percentage)
        : grade.score
          ? Number(grade.score)
          : undefined,
      letterGrade: clean(grade.LetterGrade ?? grade.letter),
      comment: clean(grade.Comment ?? grade.comment),
      lastUpdated: toDate(grade.LastUpdated ?? grade.lastUpdated ?? new Date()),
      metadata: grade,
    };
  }

  mapAttendance(payload: any): RawAttendance {
    const attendance = payload?.attendance ?? payload;
    if (!attendance?.StudentId && !attendance?.studentId) {
      throw new Error('Invalid attendance payload');
    }

    return {
      studentId: String(attendance.StudentId ?? attendance.studentId),
      date: toDate(attendance.Date ?? attendance.date),
      status: this.mapAttendanceCode(
        attendance.Status ?? attendance.status ?? attendance.Code,
      ),
      periodId: attendance.Period ? String(attendance.Period) : undefined,
      comment: clean(attendance.Comment ?? attendance.comment),
      metadata: attendance,
    };
  }

  private mapStatus(status?: string): RawEnrollment['status'] {
    const normalized = (status ?? '').toLowerCase();
    if (normalized.includes('inactive')) return 'inactive';
    if (normalized.includes('grad')) return 'graduated';
    if (normalized.includes('transfer')) return 'transferred';
    return 'active';
  }

  private mapAttendanceCode(code?: string): RawAttendance['status'] {
    const normalized = (code ?? '').toLowerCase();
    if (normalized.startsWith('t')) return 'tardy';
    if (normalized.startsWith('e')) return 'excused';
    if (normalized.startsWith('a')) return 'absent';
    return 'present';
  }
}
