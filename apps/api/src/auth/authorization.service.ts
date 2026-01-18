/**
 * Authorization Service
 *
 * Handles role-based and relationship-based access control.
 */

import { Injectable, Logger } from '@nestjs/common';
import { UserRole, RelationshipType, RelationshipStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';

// Temporary permission type until @schoolos/auth is fixed
export type Permission = string;

export interface AuthorizationContext {
  userId: string;
  role: UserRole;
  districtId: string;
  schoolId?: string | null;
}

export interface ResourceContext {
  type: string;
  id?: string;
  ownerId?: string;
  districtId?: string;
  schoolId?: string;
  targetUserId?: string;
}

@Injectable()
export class AuthorizationService {
  private readonly logger = new Logger(AuthorizationService.name);

  // Cache for relationship checks (user -> target -> relationship status)
  private relationshipCache = new Map<string, { result: boolean; expiry: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check if user has a specific permission
   */
  hasPermission(_role: UserRole, _permission: Permission): boolean {
    // TODO: Implement once @schoolos/auth is fixed
    return true;
  }

  /**
   * Check if user has any of the specified permissions
   */
  hasAnyPermission(_role: UserRole, _permissions: Permission[]): boolean {
    // TODO: Implement once @schoolos/auth is fixed
    return true;
  }

  /**
   * Check if user has all of the specified permissions
   */
  hasAllPermissions(_role: UserRole, _permissions: Permission[]): boolean {
    // TODO: Implement once @schoolos/auth is fixed
    return true;
  }

  /**
   * Get all permissions for a role
   */
  getPermissionsForRole(_role: UserRole): Permission[] {
    // TODO: Implement once @schoolos/auth is fixed
    return [];
  }

  /**
   * Check if user can access a resource in a district
   */
  canAccessDistrict(context: AuthorizationContext, targetDistrictId: string): boolean {
    // Users can only access resources in their own district
    return context.districtId === targetDistrictId;
  }

  /**
   * Check if user can access a resource in a school
   */
  canAccessSchool(context: AuthorizationContext, targetSchoolId: string): boolean {
    // District admins can access all schools in their district
    if (context.role === UserRole.ADMIN) {
      return true;
    }

    // School staff can only access their assigned school
    if (context.schoolId) {
      return context.schoolId === targetSchoolId;
    }

    // Users without a school assignment cannot access specific schools
    return false;
  }

  /**
   * Check if user has relationship-based access to another user
   */
  async hasRelationshipAccess(
    context: AuthorizationContext,
    targetUserId: string,
    requiredRelationships?: RelationshipType[],
  ): Promise<boolean> {
    // Users can always access themselves
    if (context.userId === targetUserId) {
      return true;
    }

    // Admins can access all users in their district
    if (context.role === UserRole.ADMIN) {
      const targetUser = await this.prisma.user.findUnique({
        where: { id: targetUserId },
        select: { districtId: true },
      });
      return targetUser?.districtId === context.districtId;
    }

    // Teachers can access students in their classes
    if (context.role === UserRole.TEACHER) {
      const hasTeacherStudentRelation = await this.checkRelationship(
        context.userId,
        targetUserId,
        [RelationshipType.TEACHER_OF],
      );
      if (hasTeacherStudentRelation) return true;
    }

    // Check cache first
    const cacheKey = `${context.userId}:${targetUserId}:${requiredRelationships?.join(',') ?? 'any'}`;
    const cached = this.relationshipCache.get(cacheKey);

    if (cached && cached.expiry > Date.now()) {
      return cached.result;
    }

    // Check relationship in database
    const result = await this.checkRelationship(
      context.userId,
      targetUserId,
      requiredRelationships,
    );

    // Cache the result
    this.relationshipCache.set(cacheKey, {
      result,
      expiry: Date.now() + this.CACHE_TTL,
    });

    return result;
  }

  /**
   * Check if a specific relationship exists between two users
   */
  private async checkRelationship(
    userId: string,
    targetUserId: string,
    types?: RelationshipType[],
  ): Promise<boolean> {
    const where: Prisma.UserRelationshipWhereInput = {
      status: RelationshipStatus.ACTIVE,
      OR: [
        { userId: userId, relatedUserId: targetUserId },
        { userId: targetUserId, relatedUserId: userId },
      ],
    };

    if (types && types.length > 0) {
      where.relationshipType = { in: types };
    }

    const relationship = await this.prisma.userRelationship.findFirst({ where });

    return relationship !== null;
  }

  /**
   * Get all users that a user has access to based on relationships
   */
  async getAccessibleUsers(context: AuthorizationContext): Promise<string[]> {
    // Always include self
    const userIds = new Set<string>([context.userId]);

    // Admins can access all users in their district
    if (context.role === UserRole.ADMIN) {
      const users = await this.prisma.user.findMany({
        where: { districtId: context.districtId },
        select: { id: true },
      });
      users.forEach((u) => userIds.add(u.id));
      return Array.from(userIds);
    }

    // Get users through relationships
    const relationships = await this.prisma.userRelationship.findMany({
      where: {
        status: RelationshipStatus.ACTIVE,
        OR: [
          { userId: context.userId },
          { relatedUserId: context.userId },
        ],
      },
      select: {
        userId: true,
        relatedUserId: true,
      },
    });

    relationships.forEach((rel) => {
      userIds.add(rel.userId);
      userIds.add(rel.relatedUserId);
    });

    return Array.from(userIds);
  }

  /**
   * Check if user can perform action on a resource
   */
  async canPerformAction(
    context: AuthorizationContext,
    resource: ResourceContext,
    action: Permission,
  ): Promise<boolean> {
    // Check basic permission
    if (!this.hasPermission(context.role, action)) {
      this.logger.debug(
        `User ${context.userId} lacks permission ${action} for role ${context.role}`,
      );
      return false;
    }

    // Check district scope
    if (resource.districtId && !this.canAccessDistrict(context, resource.districtId)) {
      this.logger.debug(
        `User ${context.userId} cannot access district ${resource.districtId}`,
      );
      return false;
    }

    // Check school scope if applicable
    if (
      resource.schoolId &&
      context.schoolId &&
      !this.canAccessSchool(context, resource.schoolId)
    ) {
      this.logger.debug(
        `User ${context.userId} cannot access school ${resource.schoolId}`,
      );
      return false;
    }

    // Check ownership or relationship for user resources
    if (resource.targetUserId && resource.targetUserId !== context.userId) {
      const hasAccess = await this.hasRelationshipAccess(
        context,
        resource.targetUserId,
      );
      if (!hasAccess) {
        this.logger.debug(
          `User ${context.userId} has no relationship access to ${resource.targetUserId}`,
        );
        return false;
      }
    }

    return true;
  }

  /**
   * Clear relationship cache for a user
   */
  clearCacheForUser(userId: string): void {
    for (const key of this.relationshipCache.keys()) {
      if (key.startsWith(`${userId}:`) || key.includes(`:${userId}:`)) {
        this.relationshipCache.delete(key);
      }
    }
  }

  /**
   * Clear entire relationship cache
   */
  clearCache(): void {
    this.relationshipCache.clear();
  }
}
