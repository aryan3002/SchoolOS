/**
 * User Types
 */

import type { UserRole, UserStatus } from './auth';

/**
 * User profile
 */
export interface UserProfile {
  id: string;
  email: string;
  phoneNumber?: string;
  firstName: string;
  lastName: string;
  preferredName?: string;
  avatarUrl?: string;
  role: UserRole;
  status: UserStatus;
  districtId: string;
  metadata: UserMetadata;
  preferences: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User metadata varies by role
 */
export interface UserMetadata {
  // Common fields
  title?: string;

  // Student specific
  gradeLevel?: string;
  homeroom?: string;
  studentId?: string;
  enrollmentDate?: string;

  // Teacher specific
  department?: string;
  certifications?: string[];
  subjects?: string[];

  // Parent specific
  occupation?: string;
  preferredContact?: 'email' | 'phone' | 'text';

  // Staff specific
  position?: string;
  office?: string;

  // Extensible
  [key: string]: unknown;
}

/**
 * User preferences
 */
export interface UserPreferences {
  notifications: NotificationPreferences;
  locale?: string;
  timezone?: string;
  theme?: 'light' | 'dark' | 'system';
}

/**
 * Notification preferences
 */
export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  push?: boolean;
  grades?: boolean;
  attendance?: boolean;
  announcements?: boolean;
  emergencies?: boolean;
}

/**
 * User relationship
 */
export interface UserRelationship {
  id: string;
  userId: string;
  relatedUserId: string;
  relationshipType: string;
  status: string;
  sectionId?: string;
  metadata: RelationshipMetadata;
  startDate: Date;
  endDate?: Date;
  createdAt: Date;
}

/**
 * Relationship metadata
 */
export interface RelationshipMetadata {
  // Parent-child specific
  isPrimary?: boolean;
  canPickup?: boolean;
  emergencyContact?: boolean;
  relationship?: string; // "mother", "father", "guardian", etc.
  custodyNotes?: string;

  // Teacher-student specific
  role?: 'lead' | 'co-teacher' | 'aide';

  [key: string]: unknown;
}

/**
 * Student summary for parent view
 */
export interface StudentSummary {
  id: string;
  firstName: string;
  lastName: string;
  gradeLevel: string;
  school: {
    id: string;
    name: string;
  };
  homeroom?: string;
  avatarUrl?: string;
  relationshipType: string;
  isPrimary: boolean;
}

/**
 * Teacher's class roster entry
 */
export interface RosterEntry {
  studentId: string;
  studentName: string;
  email: string;
  gradeLevel: string;
  sectionId: string;
  sectionName: string;
}

/**
 * User update data
 */
export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  preferredName?: string;
  phoneNumber?: string;
  avatarUrl?: string;
  metadata?: Partial<UserMetadata>;
  preferences?: Partial<UserPreferences>;
}

/**
 * User creation data (admin)
 */
export interface CreateUserData {
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  role: UserRole;
  districtId: string;
  metadata?: UserMetadata;
  sendInviteEmail?: boolean;
}
