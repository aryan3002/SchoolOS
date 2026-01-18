/**
 * Permission Definitions
 *
 * Defines all permissions, roles, and the role-permission matrix.
 * This is the central source of truth for authorization.
 */

import { UserRole, Resource, Action, Permission } from '@schoolos/types';

/**
 * All available permissions
 */
export const PERMISSIONS = {
  // Student records
  STUDENT_RECORD_READ: 'student_record:read' as Permission,
  STUDENT_RECORD_CREATE: 'student_record:create' as Permission,
  STUDENT_RECORD_UPDATE: 'student_record:update' as Permission,
  STUDENT_RECORD_DELETE: 'student_record:delete' as Permission,

  // Grades
  GRADE_READ: 'grade:read' as Permission,
  GRADE_CREATE: 'grade:create' as Permission,
  GRADE_UPDATE: 'grade:update' as Permission,
  GRADE_DELETE: 'grade:delete' as Permission,

  // Attendance
  ATTENDANCE_READ: 'attendance:read' as Permission,
  ATTENDANCE_CREATE: 'attendance:create' as Permission,
  ATTENDANCE_UPDATE: 'attendance:update' as Permission,
  ATTENDANCE_DELETE: 'attendance:delete' as Permission,

  // Policy documents
  POLICY_DOCUMENT_READ: 'policy_document:read' as Permission,
  POLICY_DOCUMENT_CREATE: 'policy_document:create' as Permission,
  POLICY_DOCUMENT_UPDATE: 'policy_document:update' as Permission,
  POLICY_DOCUMENT_DELETE: 'policy_document:delete' as Permission,

  // Knowledge sources
  KNOWLEDGE_SOURCE_READ: 'knowledge_source:read' as Permission,
  KNOWLEDGE_SOURCE_CREATE: 'knowledge_source:create' as Permission,
  KNOWLEDGE_SOURCE_UPDATE: 'knowledge_source:update' as Permission,
  KNOWLEDGE_SOURCE_DELETE: 'knowledge_source:delete' as Permission,

  // Conversations
  CONVERSATION_READ: 'conversation:read' as Permission,
  CONVERSATION_CREATE: 'conversation:create' as Permission,
  CONVERSATION_UPDATE: 'conversation:update' as Permission,
  CONVERSATION_DELETE: 'conversation:delete' as Permission,

  // Users
  USER_READ: 'user:read' as Permission,
  USER_CREATE: 'user:create' as Permission,
  USER_UPDATE: 'user:update' as Permission,
  USER_DELETE: 'user:delete' as Permission,
  USER_MANAGE: 'user:manage' as Permission,

  // District
  DISTRICT_READ: 'district:read' as Permission,
  DISTRICT_UPDATE: 'district:update' as Permission,
  DISTRICT_MANAGE: 'district:manage' as Permission,

  // Relationships
  RELATIONSHIP_READ: 'relationship:read' as Permission,
  RELATIONSHIP_CREATE: 'relationship:create' as Permission,
  RELATIONSHIP_UPDATE: 'relationship:update' as Permission,
  RELATIONSHIP_DELETE: 'relationship:delete' as Permission,
} as const;

/**
 * Role-based permission matrix
 *
 * Defines which permissions each role has by default.
 * Note: Some permissions are relationship-based and require additional checks.
 */
export const ROLE_PERMISSIONS: Record<UserRole, Set<Permission>> = {
  [UserRole.ADMIN]: new Set([
    // Admins have all permissions within their district
    ...Object.values(PERMISSIONS),
  ]),

  [UserRole.TEACHER]: new Set([
    // Teachers can read/update student records (for their students only - checked via relationship)
    PERMISSIONS.STUDENT_RECORD_READ,
    PERMISSIONS.STUDENT_RECORD_UPDATE,

    // Teachers can manage grades (for their students only)
    PERMISSIONS.GRADE_READ,
    PERMISSIONS.GRADE_CREATE,
    PERMISSIONS.GRADE_UPDATE,

    // Teachers can manage attendance (for their students only)
    PERMISSIONS.ATTENDANCE_READ,
    PERMISSIONS.ATTENDANCE_CREATE,
    PERMISSIONS.ATTENDANCE_UPDATE,

    // Teachers can read policy documents
    PERMISSIONS.POLICY_DOCUMENT_READ,

    // Teachers can read knowledge sources
    PERMISSIONS.KNOWLEDGE_SOURCE_READ,

    // Teachers can have conversations
    PERMISSIONS.CONVERSATION_READ,
    PERMISSIONS.CONVERSATION_CREATE,

    // Teachers can read their own user record
    PERMISSIONS.USER_READ,

    // Teachers can read district info
    PERMISSIONS.DISTRICT_READ,

    // Teachers can read relationships (their own)
    PERMISSIONS.RELATIONSHIP_READ,
  ]),

  [UserRole.PARENT]: new Set([
    // Parents can read student records (for their children only - checked via relationship)
    PERMISSIONS.STUDENT_RECORD_READ,

    // Parents can read grades (for their children only)
    PERMISSIONS.GRADE_READ,

    // Parents can read attendance (for their children only)
    PERMISSIONS.ATTENDANCE_READ,

    // Parents can read policy documents
    PERMISSIONS.POLICY_DOCUMENT_READ,

    // Parents can read knowledge sources
    PERMISSIONS.KNOWLEDGE_SOURCE_READ,

    // Parents can have conversations
    PERMISSIONS.CONVERSATION_READ,
    PERMISSIONS.CONVERSATION_CREATE,

    // Parents can read their own user record
    PERMISSIONS.USER_READ,

    // Parents can read district info
    PERMISSIONS.DISTRICT_READ,

    // Parents can read relationships (their own)
    PERMISSIONS.RELATIONSHIP_READ,
  ]),

  [UserRole.STUDENT]: new Set([
    // Students can read their own student record
    PERMISSIONS.STUDENT_RECORD_READ,

    // Students can read their own grades
    PERMISSIONS.GRADE_READ,

    // Students can read their own attendance
    PERMISSIONS.ATTENDANCE_READ,

    // Students can read policy documents
    PERMISSIONS.POLICY_DOCUMENT_READ,

    // Students can read knowledge sources
    PERMISSIONS.KNOWLEDGE_SOURCE_READ,

    // Students can have conversations
    PERMISSIONS.CONVERSATION_READ,
    PERMISSIONS.CONVERSATION_CREATE,

    // Students can read their own user record
    PERMISSIONS.USER_READ,

    // Students can read district info
    PERMISSIONS.DISTRICT_READ,
  ]),

  [UserRole.STAFF]: new Set([
    // Staff have limited permissions
    PERMISSIONS.POLICY_DOCUMENT_READ,
    PERMISSIONS.KNOWLEDGE_SOURCE_READ,
    PERMISSIONS.CONVERSATION_READ,
    PERMISSIONS.CONVERSATION_CREATE,
    PERMISSIONS.USER_READ,
    PERMISSIONS.DISTRICT_READ,
  ]),
};

/**
 * Permissions that require relationship verification
 * (e.g., parent can only access their children's data)
 */
export const RELATIONSHIP_REQUIRED_PERMISSIONS: Set<Permission> = new Set([
  PERMISSIONS.STUDENT_RECORD_READ,
  PERMISSIONS.STUDENT_RECORD_UPDATE,
  PERMISSIONS.GRADE_READ,
  PERMISSIONS.GRADE_CREATE,
  PERMISSIONS.GRADE_UPDATE,
  PERMISSIONS.ATTENDANCE_READ,
  PERMISSIONS.ATTENDANCE_CREATE,
  PERMISSIONS.ATTENDANCE_UPDATE,
]);

/**
 * Checks if a role has a specific permission
 *
 * @param role - User role
 * @param permission - Permission to check
 * @returns True if role has the permission
 */
export function roleHasPermission(role: UserRole, permission: Permission): boolean {
  const rolePermissions = ROLE_PERMISSIONS[role];
  return rolePermissions?.has(permission) ?? false;
}

/**
 * Gets all permissions for a role
 *
 * @param role - User role
 * @returns Set of permissions
 */
export function getPermissionsForRole(role: UserRole): Set<Permission> {
  return new Set(ROLE_PERMISSIONS[role] ?? []);
}

/**
 * Checks if a permission requires relationship verification
 *
 * @param permission - Permission to check
 * @returns True if relationship verification is required
 */
export function requiresRelationshipVerification(permission: Permission): boolean {
  return RELATIONSHIP_REQUIRED_PERMISSIONS.has(permission);
}

/**
 * Creates a permission string from resource and action
 *
 * @param resource - Resource type
 * @param action - Action type
 * @returns Permission string
 */
export function createPermission(resource: Resource, action: Action): Permission {
  return `${resource}:${action}` as Permission;
}

/**
 * Parses a permission string into resource and action
 *
 * @param permission - Permission string
 * @returns Object with resource and action
 */
export function parsePermission(permission: Permission): { resource: Resource; action: Action } {
  const [resource, action] = permission.split(':') as [Resource, Action];
  return { resource, action };
}

/**
 * Checks if a user can perform an action on a resource
 * (Does not check relationship - use authorization service for full check)
 *
 * @param userRole - User's role
 * @param resource - Target resource
 * @param action - Desired action
 * @returns True if permitted by role
 */
export function canPerformAction(
  userRole: UserRole,
  resource: Resource,
  action: Action,
): boolean {
  const permission = createPermission(resource, action);
  return roleHasPermission(userRole, permission);
}
