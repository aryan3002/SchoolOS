import type { RawGuardian, RawStudent } from '../sis';

export interface NormalizedAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
}

export interface NormalizedStudent {
  id: string;
  externalId: string;
  vendor: string;
  districtId: string;
  profile: {
    studentNumber: string;
    firstName: string;
    lastName: string;
    middleName?: string;
    preferredName?: string;
    dateOfBirth: Date;
    grade: number;
    gradeYear: number;
    email: string | null;
    phoneNumber?: string | null;
    photoUrl?: string;
    schoolId?: string;
  };
  metadata: {
    lastSyncedAt: Date;
    sourceVendor: string;
    rawData?: Record<string, unknown>;
  };
}

export interface NormalizedGuardian {
  id: string;
  externalId: string;
  vendor: string;
  districtId: string;
  profile: {
    firstName: string;
    lastName: string;
    relationship: string;
    email: string | null;
    phone?: string | null;
    address?: NormalizedAddress;
  };
  preferences: {
    receiveCommunications: boolean;
    isPrimary: boolean;
    canPickup: boolean;
  };
  metadata: {
    lastSyncedAt: Date;
    sourceVendor: string;
    rawData?: Record<string, unknown>;
  };
}

export interface NormalizedRelationship {
  parentId: string;
  studentId: string;
  relationshipType: string;
  isPrimary: boolean;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface NormalizedEnrollment {
  studentId: string;
  externalStudentId: string;
  schoolId: string;
  grade: number;
  status: 'active' | 'inactive' | 'graduated' | 'transferred';
  entryDate: Date;
  exitDate?: Date;
  schoolYear: string;
}

export type NormalizationInput = RawStudent | RawGuardian;
