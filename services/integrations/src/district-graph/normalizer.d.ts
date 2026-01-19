import type { RawEnrollment, RawGuardian, RawStudent } from '../sis';
import { NormalizedGuardian, NormalizedEnrollment, NormalizedRelationship, NormalizedStudent } from './types';
/**
 * DistrictGraphNormalizer
 *
 * Converts vendor-specific raw records into SchoolOS unified graph nodes.
 */
export declare class DistrictGraphNormalizer {
    /**
     * Normalize a student from any vendor to DistrictGraph format.
     */
    normalizeStudent(vendor: string, rawStudent: RawStudent, districtId: string): Promise<NormalizedStudent>;
    /**
     * Normalize guardian/parent data.
     */
    normalizeGuardian(vendor: string, rawGuardian: RawGuardian, districtId: string): Promise<NormalizedGuardian>;
    /**
     * Normalize enrollment data for the graph.
     */
    normalizeEnrollment(vendor: string, rawEnrollment: RawEnrollment, districtId: string): Promise<NormalizedEnrollment>;
    /**
     * Create parent-child relationship.
     */
    createRelationship(parentId: string, studentId: string, relationshipType: string, isPrimary: boolean): Promise<NormalizedRelationship>;
    private normalizeGrade;
    private calculateGradeYear;
    private cleanName;
    private normalizeEmail;
    private normalizePhone;
    private normalizeAddress;
    private isValidEmail;
    private generateId;
}
//# sourceMappingURL=normalizer.d.ts.map