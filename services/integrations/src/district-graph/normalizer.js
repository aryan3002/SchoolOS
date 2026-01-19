"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DistrictGraphNormalizer = void 0;
const tslib_1 = require("tslib");
const crypto_1 = tslib_1.__importDefault(require("crypto"));
/**
 * DistrictGraphNormalizer
 *
 * Converts vendor-specific raw records into SchoolOS unified graph nodes.
 */
class DistrictGraphNormalizer {
    /**
     * Normalize a student from any vendor to DistrictGraph format.
     */
    async normalizeStudent(vendor, rawStudent, districtId) {
        const schoolOSId = this.generateId('student', vendor, rawStudent.id);
        return {
            id: schoolOSId,
            externalId: rawStudent.id,
            vendor,
            districtId,
            profile: {
                studentNumber: rawStudent.studentNumber,
                firstName: this.cleanName(rawStudent.firstName),
                lastName: this.cleanName(rawStudent.lastName),
                middleName: this.cleanName(rawStudent.middleName),
                preferredName: rawStudent.preferredName || rawStudent.firstName,
                dateOfBirth: rawStudent.dateOfBirth,
                grade: this.normalizeGrade(rawStudent.grade),
                gradeYear: this.calculateGradeYear(rawStudent.grade),
                email: this.normalizeEmail(rawStudent.email),
                phoneNumber: this.normalizePhone(rawStudent.phoneNumber),
                photoUrl: rawStudent.photoUrl,
                schoolId: rawStudent.schoolId,
            },
            metadata: {
                lastSyncedAt: new Date(),
                sourceVendor: vendor,
                rawData: rawStudent.metadata,
            },
        };
    }
    /**
     * Normalize guardian/parent data.
     */
    async normalizeGuardian(vendor, rawGuardian, districtId) {
        const guardianId = this.generateId('guardian', vendor, rawGuardian.id);
        return {
            id: guardianId,
            externalId: rawGuardian.id,
            vendor,
            districtId,
            profile: {
                firstName: this.cleanName(rawGuardian.firstName),
                lastName: this.cleanName(rawGuardian.lastName),
                relationship: rawGuardian.relationship,
                email: this.normalizeEmail(rawGuardian.email),
                phone: this.normalizePhone(rawGuardian.phone),
                address: this.normalizeAddress(rawGuardian.address),
            },
            preferences: {
                receiveCommunications: rawGuardian.receiveCommunications,
                isPrimary: rawGuardian.isPrimary,
                canPickup: rawGuardian.canPickup,
            },
            metadata: {
                lastSyncedAt: new Date(),
                sourceVendor: vendor,
                rawData: rawGuardian.metadata,
            },
        };
    }
    /**
     * Normalize enrollment data for the graph.
     */
    async normalizeEnrollment(vendor, rawEnrollment, districtId) {
        return {
            studentId: this.generateId('student', vendor, rawEnrollment.studentId),
            externalStudentId: rawEnrollment.studentId,
            schoolId: rawEnrollment.schoolId,
            grade: this.normalizeGrade(rawEnrollment.grade),
            status: rawEnrollment.status,
            entryDate: rawEnrollment.entryDate,
            exitDate: rawEnrollment.exitDate,
            schoolYear: rawEnrollment.schoolYear,
        };
    }
    /**
     * Create parent-child relationship.
     */
    async createRelationship(parentId, studentId, relationshipType, isPrimary) {
        return {
            parentId,
            studentId,
            relationshipType,
            isPrimary,
            metadata: { createdBy: 'integration' },
            createdAt: new Date(),
        };
    }
    // ==================== HELPER METHODS ====================
    normalizeGrade(grade) {
        if (grade === 'K' || grade === 'KG')
            return 0;
        if (grade === 'PK')
            return -1;
        if (typeof grade === 'string') {
            const parsed = parseInt(grade, 10);
            return Number.isNaN(parsed) ? 0 : parsed;
        }
        return grade;
    }
    calculateGradeYear(currentGrade) {
        const normalizedGrade = this.normalizeGrade(currentGrade);
        const currentYear = new Date().getFullYear();
        const yearsToGraduation = 12 - normalizedGrade;
        return currentYear + yearsToGraduation;
    }
    cleanName(name) {
        if (!name)
            return '';
        return name.trim().replace(/\s+/g, ' ');
    }
    normalizeEmail(email) {
        if (!email)
            return null;
        const trimmed = email.toLowerCase().trim();
        return this.isValidEmail(trimmed) ? trimmed : null;
    }
    normalizePhone(phone) {
        if (!phone)
            return null;
        const digits = phone.replace(/\D/g, '');
        if (digits.length < 7)
            return null;
        if (digits.length === 10) {
            return `+1${digits}`;
        }
        if (digits.startsWith('1') && digits.length === 11) {
            return `+${digits}`;
        }
        return `+${digits}`;
    }
    normalizeAddress(address) {
        if (!address)
            return undefined;
        return {
            street: this.cleanName(address.street),
            city: this.cleanName(address.city),
            state: this.cleanName(address.state),
            zip: address.zip?.trim() ?? '',
        };
    }
    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }
    generateId(entity, vendor, externalId) {
        const hash = crypto_1.default
            .createHash('sha256')
            .update(`${entity}:${vendor}:${externalId}`)
            .digest('hex');
        return `${entity}_${vendor}_${hash.slice(0, 24)}`;
    }
}
exports.DistrictGraphNormalizer = DistrictGraphNormalizer;
//# sourceMappingURL=normalizer.js.map