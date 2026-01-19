import type { RawAttendance, RawClassSection, RawContact, RawEnrollment, RawGrade, RawGuardian, RawAssignment, RawStudent } from '../../interfaces';
/**
 * Maps PowerSchool payloads into raw SIS types.
 * Keeps vendor-specific fields in metadata for downstream consumers.
 */
export declare class PowerSchoolMapper {
    mapStudent(payload: any): RawStudent;
    mapEnrollment(payload: any): RawEnrollment;
    mapGuardian(payload: any): RawGuardian;
    mapContact(payload: any): RawContact;
    mapClassSection(payload: any): RawClassSection;
    mapGrade(payload: any): RawGrade;
    mapAttendance(payload: any): RawAttendance;
    mapAssignment(payload: any): RawAssignment;
    private normalizeStatus;
    private normalizeAttendanceCode;
}
//# sourceMappingURL=powerschool.mapper.d.ts.map