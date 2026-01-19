import crypto from 'crypto';

import type { RawEnrollment, RawGuardian, RawStudent } from '../sis';
import {
  NormalizedAddress,
  NormalizedGuardian,
  NormalizedEnrollment,
  NormalizedRelationship,
  NormalizedStudent,
} from './types';

/**
 * DistrictGraphNormalizer
 *
 * Converts vendor-specific raw records into SchoolOS unified graph nodes.
 */
export class DistrictGraphNormalizer {
  /**
   * Normalize a student from any vendor to DistrictGraph format.
   */
  async normalizeStudent(
    vendor: string,
    rawStudent: RawStudent,
    districtId: string,
  ): Promise<NormalizedStudent> {
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
  async normalizeGuardian(
    vendor: string,
    rawGuardian: RawGuardian,
    districtId: string,
  ): Promise<NormalizedGuardian> {
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
  async normalizeEnrollment(
    vendor: string,
    rawEnrollment: RawEnrollment,
    districtId: string,
  ): Promise<NormalizedEnrollment> {
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
  async createRelationship(
    parentId: string,
    studentId: string,
    relationshipType: string,
    isPrimary: boolean,
  ): Promise<NormalizedRelationship> {
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

  private normalizeGrade(grade: number | string): number {
    if (grade === 'K' || grade === 'KG') return 0;
    if (grade === 'PK') return -1;
    if (typeof grade === 'string') {
      const parsed = parseInt(grade, 10);
      return Number.isNaN(parsed) ? 0 : parsed;
    }
    return grade;
  }

  private calculateGradeYear(currentGrade: number | string): number {
    const normalizedGrade = this.normalizeGrade(currentGrade);
    const currentYear = new Date().getFullYear();
    const yearsToGraduation = 12 - normalizedGrade;
    return currentYear + yearsToGraduation;
  }

  private cleanName(name?: string): string {
    if (!name) return '';
    return name.trim().replace(/\s+/g, ' ');
  }

  private normalizeEmail(email?: string | null): string | null {
    if (!email) return null;
    const trimmed = email.toLowerCase().trim();
    return this.isValidEmail(trimmed) ? trimmed : null;
  }

  private normalizePhone(phone?: string | null): string | null {
    if (!phone) return null;
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 7) return null;
    if (digits.length === 10) {
      return `+1${digits}`;
    }
    if (digits.startsWith('1') && digits.length === 11) {
      return `+${digits}`;
    }
    return `+${digits}`;
  }

  private normalizeAddress(address?: RawGuardian['address']): NormalizedAddress | undefined {
    if (!address) return undefined;
    return {
      street: this.cleanName(address.street),
      city: this.cleanName(address.city),
      state: this.cleanName(address.state),
      zip: address.zip?.trim() ?? '',
    };
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private generateId(entity: string, vendor: string, externalId: string): string {
    const hash = crypto
      .createHash('sha256')
      .update(`${entity}:${vendor}:${externalId}`)
      .digest('hex');
    return `${entity}_${vendor}_${hash.slice(0, 24)}`;
  }
}
