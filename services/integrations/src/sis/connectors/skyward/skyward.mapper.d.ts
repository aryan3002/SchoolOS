import type { RawAttendance, RawClassSection, RawContact, RawEnrollment, RawGrade, RawGuardian, RawStudent } from '../../interfaces';
export declare class SkywardMapper {
    mapStudent(payload: any): RawStudent;
    mapEnrollment(payload: any): RawEnrollment;
    mapGuardian(payload: any): RawGuardian;
    mapContact(payload: any): RawContact;
    mapClassSection(payload: any): RawClassSection;
    mapGrade(payload: any): RawGrade;
    mapAttendance(payload: any): RawAttendance;
    private mapStatus;
    private mapAttendanceCode;
}
//# sourceMappingURL=skyward.mapper.d.ts.map