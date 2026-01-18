/**
 * Relationship Helper Utilities
 *
 * Functions for working with user relationships (parent-child, teacher-student).
 * Critical for relationship-based access control.
 */

import {
  PrismaClient,
  RelationshipType,
  RelationshipStatus,
  UserRole,
} from '@prisma/client';

export interface RelationshipContext {
  /** Children IDs for parents */
  childrenIds: string[];
  /** Student IDs for teachers */
  studentIds: string[];
  /** Section IDs for teachers */
  sectionIds: string[];
  /** All accessible student IDs (combined) */
  accessibleStudentIds: string[];
}

/**
 * Gets the relationship context for a user.
 * This determines what data the user can access.
 *
 * @param prisma - Prisma client
 * @param userId - User ID
 * @param districtId - District ID
 * @returns Relationship context
 */
export async function getRelationshipContext(
  prisma: PrismaClient,
  userId: string,
  districtId: string,
): Promise<RelationshipContext> {
  // Get all active relationships where user is the primary party
  const relationships = await prisma.userRelationship.findMany({
    where: {
      districtId,
      userId,
      status: RelationshipStatus.ACTIVE,
      deletedAt: null,
      // Ensure relationship hasn't expired
      OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
    },
    select: {
      relatedUserId: true,
      relationshipType: true,
      sectionId: true,
    },
  });

  const childrenIds: string[] = [];
  const studentIds: string[] = [];
  const sectionIds: string[] = [];

  for (const rel of relationships) {
    switch (rel.relationshipType) {
      case RelationshipType.PARENT_OF:
      case RelationshipType.GUARDIAN_OF:
        childrenIds.push(rel.relatedUserId);
        break;

      case RelationshipType.TEACHER_OF:
      case RelationshipType.COTEACHER_OF:
        studentIds.push(rel.relatedUserId);
        if (rel.sectionId) {
          sectionIds.push(rel.sectionId);
        }
        break;

      case RelationshipType.COUNSELOR_OF:
        studentIds.push(rel.relatedUserId);
        break;

      case RelationshipType.ADMIN_OF:
        // Admins have broader access, handled separately
        break;
    }
  }

  // Deduplicate
  const uniqueChildrenIds = [...new Set(childrenIds)];
  const uniqueStudentIds = [...new Set(studentIds)];
  const uniqueSectionIds = [...new Set(sectionIds)];
  const accessibleStudentIds = [
    ...new Set([...uniqueChildrenIds, ...uniqueStudentIds]),
  ];

  return {
    childrenIds: uniqueChildrenIds,
    studentIds: uniqueStudentIds,
    sectionIds: uniqueSectionIds,
    accessibleStudentIds,
  };
}

/**
 * Verifies that a parent-child relationship exists.
 *
 * @param prisma - Prisma client
 * @param parentId - Parent user ID
 * @param childId - Child user ID
 * @param districtId - District ID
 * @returns True if relationship exists
 */
export async function verifyParentChildRelationship(
  prisma: PrismaClient,
  parentId: string,
  childId: string,
  districtId: string,
): Promise<boolean> {
  const relationship = await prisma.userRelationship.findFirst({
    where: {
      districtId,
      userId: parentId,
      relatedUserId: childId,
      relationshipType: {
        in: [RelationshipType.PARENT_OF, RelationshipType.GUARDIAN_OF],
      },
      status: RelationshipStatus.ACTIVE,
      deletedAt: null,
      OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
    },
  });

  return relationship !== null;
}

/**
 * Verifies that a teacher-student relationship exists.
 *
 * @param prisma - Prisma client
 * @param teacherId - Teacher user ID
 * @param studentId - Student user ID
 * @param districtId - District ID
 * @param sectionId - Optional section ID to check specific class
 * @returns True if relationship exists
 */
export async function verifyTeacherStudentRelationship(
  prisma: PrismaClient,
  teacherId: string,
  studentId: string,
  districtId: string,
  sectionId?: string,
): Promise<boolean> {
  const whereClause: Record<string, unknown> = {
    districtId,
    userId: teacherId,
    relatedUserId: studentId,
    relationshipType: {
      in: [RelationshipType.TEACHER_OF, RelationshipType.COTEACHER_OF],
    },
    status: RelationshipStatus.ACTIVE,
    deletedAt: null,
    OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
  };

  if (sectionId) {
    whereClause['sectionId'] = sectionId;
  }

  const relationship = await prisma.userRelationship.findFirst({
    where: whereClause,
  });

  return relationship !== null;
}

/**
 * Gets all children for a parent.
 *
 * @param prisma - Prisma client
 * @param parentId - Parent user ID
 * @param districtId - District ID
 * @returns Array of child user objects
 */
export async function getChildrenForParent(
  prisma: PrismaClient,
  parentId: string,
  districtId: string,
): Promise<
  Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    metadata: unknown;
    relationshipMetadata: unknown;
  }>
> {
  const relationships = await prisma.userRelationship.findMany({
    where: {
      districtId,
      userId: parentId,
      relationshipType: {
        in: [RelationshipType.PARENT_OF, RelationshipType.GUARDIAN_OF],
      },
      status: RelationshipStatus.ACTIVE,
      deletedAt: null,
      OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
    },
    include: {
      relatedUser: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          metadata: true,
        },
      },
    },
  });

  return relationships.map((rel) => ({
    ...rel.relatedUser,
    relationshipMetadata: rel.metadata,
  }));
}

/**
 * Gets all students for a teacher.
 *
 * @param prisma - Prisma client
 * @param teacherId - Teacher user ID
 * @param districtId - District ID
 * @param sectionId - Optional section ID to filter by
 * @returns Array of student user objects
 */
export async function getStudentsForTeacher(
  prisma: PrismaClient,
  teacherId: string,
  districtId: string,
  sectionId?: string,
): Promise<
  Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    metadata: unknown;
    sectionId: string | null;
  }>
> {
  const whereClause: Record<string, unknown> = {
    districtId,
    userId: teacherId,
    relationshipType: {
      in: [RelationshipType.TEACHER_OF, RelationshipType.COTEACHER_OF],
    },
    status: RelationshipStatus.ACTIVE,
    deletedAt: null,
    OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
  };

  if (sectionId) {
    whereClause['sectionId'] = sectionId;
  }

  const relationships = await prisma.userRelationship.findMany({
    where: whereClause,
    include: {
      relatedUser: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          metadata: true,
        },
      },
    },
  });

  return relationships.map((rel) => ({
    ...rel.relatedUser,
    sectionId: rel.sectionId,
  }));
}

/**
 * Checks if a user can access data for a specific student.
 *
 * @param prisma - Prisma client
 * @param userId - User ID requesting access
 * @param userRole - User's role
 * @param studentId - Target student ID
 * @param districtId - District ID
 * @returns True if access is allowed
 */
export async function canAccessStudentData(
  prisma: PrismaClient,
  userId: string,
  userRole: UserRole,
  studentId: string,
  districtId: string,
): Promise<boolean> {
  // Students can only access their own data
  if (userRole === UserRole.STUDENT) {
    return userId === studentId;
  }

  // Admins can access all students in their district
  if (userRole === UserRole.ADMIN) {
    // Verify student belongs to same district
    const student = await prisma.user.findFirst({
      where: {
        id: studentId,
        districtId,
        deletedAt: null,
      },
    });
    return student !== null;
  }

  // Parents can access their children's data
  if (userRole === UserRole.PARENT) {
    return verifyParentChildRelationship(prisma, userId, studentId, districtId);
  }

  // Teachers can access their students' data
  if (userRole === UserRole.TEACHER) {
    return verifyTeacherStudentRelationship(
      prisma,
      userId,
      studentId,
      districtId,
    );
  }

  // Staff has limited access (depends on configuration)
  if (userRole === UserRole.STAFF) {
    // For now, staff cannot access student data by default
    // This can be extended based on specific staff roles
    return false;
  }

  return false;
}

/**
 * Gets all accessible student IDs for a user.
 *
 * @param prisma - Prisma client
 * @param userId - User ID
 * @param userRole - User's role
 * @param districtId - District ID
 * @returns Array of accessible student IDs
 */
export async function getAccessibleStudentIds(
  prisma: PrismaClient,
  userId: string,
  userRole: UserRole,
  districtId: string,
): Promise<string[]> {
  // Students can only access themselves
  if (userRole === UserRole.STUDENT) {
    return [userId];
  }

  // Admins can access all students in district
  if (userRole === UserRole.ADMIN) {
    const students = await prisma.user.findMany({
      where: {
        districtId,
        role: UserRole.STUDENT,
        deletedAt: null,
      },
      select: { id: true },
    });
    return students.map((s) => s.id);
  }

  // For parents and teachers, use relationship context
  const context = await getRelationshipContext(prisma, userId, districtId);
  return context.accessibleStudentIds;
}
