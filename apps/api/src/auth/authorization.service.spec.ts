/**
 * Authorization Service Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { UserRole, RelationshipType, RelationshipStatus } from '@prisma/client';

import { AuthorizationService } from './authorization.service';
import { PrismaService } from '../database/prisma.service';

describe('AuthorizationService', () => {
  let service: AuthorizationService;
  let prismaService: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const mockPrismaService = {
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      userRelationship: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthorizationService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AuthorizationService>(AuthorizationService);
    prismaService = module.get(PrismaService);
  });

  describe('hasPermission', () => {
    it('should return true for admin with any permission', () => {
      expect(service.hasPermission(UserRole.ADMIN, 'users:read')).toBe(true);
      expect(service.hasPermission(UserRole.ADMIN, 'users:write')).toBe(true);
      expect(service.hasPermission(UserRole.ADMIN, 'users:delete')).toBe(true);
    });

    it('should return true for teacher with appropriate permissions', () => {
      expect(service.hasPermission(UserRole.TEACHER, 'users:read')).toBe(true);
      expect(service.hasPermission(UserRole.TEACHER, 'chat:own')).toBe(true);
    });

    it('should return false for student with admin permissions', () => {
      expect(service.hasPermission(UserRole.STUDENT, 'users:delete')).toBe(false);
      expect(service.hasPermission(UserRole.STUDENT, 'users:write')).toBe(false);
    });

    it('should return true for parent with appropriate permissions', () => {
      expect(service.hasPermission(UserRole.PARENT, 'chat:own')).toBe(true);
      expect(service.hasPermission(UserRole.PARENT, 'relationships:read')).toBe(true);
    });
  });

  describe('hasAnyPermission', () => {
    it('should return true if user has at least one permission', () => {
      expect(
        service.hasAnyPermission(UserRole.STUDENT, [
          'users:delete',
          'chat:own',
        ]),
      ).toBe(true);
    });

    it('should return false if user has none of the permissions', () => {
      expect(
        service.hasAnyPermission(UserRole.STUDENT, [
          'users:delete',
          'users:write',
        ]),
      ).toBe(false);
    });
  });

  describe('hasAllPermissions', () => {
    it('should return true if user has all permissions', () => {
      expect(
        service.hasAllPermissions(UserRole.ADMIN, [
          'users:read',
          'users:write',
        ]),
      ).toBe(true);
    });

    it('should return false if user is missing any permission', () => {
      expect(
        service.hasAllPermissions(UserRole.STUDENT, [
          'chat:own',
          'users:delete',
        ]),
      ).toBe(false);
    });
  });

  describe('canAccessDistrict', () => {
    it('should return true for matching district', () => {
      expect(
        service.canAccessDistrict(
          { userId: 'user-1', role: UserRole.TEACHER, districtId: 'district-1' },
          'district-1',
        ),
      ).toBe(true);
    });

    it('should return false for different district', () => {
      expect(
        service.canAccessDistrict(
          { userId: 'user-1', role: UserRole.TEACHER, districtId: 'district-1' },
          'district-2',
        ),
      ).toBe(false);
    });
  });

  describe('canAccessSchool', () => {
    it('should return true for admin accessing any school', () => {
      expect(
        service.canAccessSchool(
          {
            userId: 'admin-1',
            role: UserRole.ADMIN,
            districtId: 'district-1',
            schoolId: null,
          },
          'school-1',
        ),
      ).toBe(true);
    });

    it('should return true for teacher accessing own school', () => {
      expect(
        service.canAccessSchool(
          {
            userId: 'teacher-1',
            role: UserRole.TEACHER,
            districtId: 'district-1',
            schoolId: 'school-1',
          },
          'school-1',
        ),
      ).toBe(true);
    });

    it('should return false for teacher accessing different school', () => {
      expect(
        service.canAccessSchool(
          {
            userId: 'teacher-1',
            role: UserRole.TEACHER,
            districtId: 'district-1',
            schoolId: 'school-1',
          },
          'school-2',
        ),
      ).toBe(false);
    });
  });

  describe('hasRelationshipAccess', () => {
    const adminContext = {
      userId: 'admin-1',
      role: UserRole.ADMIN,
      districtId: 'district-1',
    };

    const parentContext = {
      userId: 'parent-1',
      role: UserRole.PARENT,
      districtId: 'district-1',
    };

    it('should return true for self-access', async () => {
      const result = await service.hasRelationshipAccess(
        parentContext,
        'parent-1',
      );

      expect(result).toBe(true);
    });

    it('should return true for admin accessing user in same district', async () => {
      prismaService.user.findUnique = jest.fn().mockResolvedValue({
        id: 'user-1',
        districtId: 'district-1',
      });

      const result = await service.hasRelationshipAccess(
        adminContext,
        'user-1',
      );

      expect(result).toBe(true);
    });

    it('should return false for admin accessing user in different district', async () => {
      prismaService.user.findUnique = jest.fn().mockResolvedValue({
        id: 'user-1',
        districtId: 'district-2',
      });

      const result = await service.hasRelationshipAccess(
        adminContext,
        'user-1',
      );

      expect(result).toBe(false);
    });

    it('should check database for relationship when not admin', async () => {
      prismaService.userRelationship.findFirst = jest.fn().mockResolvedValue({
        id: 'rel-1',
        primaryUserId: 'parent-1',
        relatedUserId: 'student-1',
        status: RelationshipStatus.ACTIVE,
      });

      const result = await service.hasRelationshipAccess(
        parentContext,
        'student-1',
        [RelationshipType.PARENT_OF],
      );

      expect(result).toBe(true);
      expect(prismaService.userRelationship.findFirst).toHaveBeenCalled();
    });
  });

  describe('getAccessibleUsers', () => {
    it('should return all users in district for admin', async () => {
      prismaService.user.findMany = jest.fn().mockResolvedValue([
        { id: 'user-1' },
        { id: 'user-2' },
        { id: 'user-3' },
      ]);

      const result = await service.getAccessibleUsers({
        userId: 'admin-1',
        role: UserRole.ADMIN,
        districtId: 'district-1',
      });

      expect(result).toContain('admin-1');
      expect(result).toContain('user-1');
      expect(result).toContain('user-2');
    });

    it('should return related users for non-admin', async () => {
      prismaService.userRelationship.findMany = jest.fn().mockResolvedValue([
        { primaryUserId: 'parent-1', relatedUserId: 'student-1' },
        { primaryUserId: 'parent-1', relatedUserId: 'student-2' },
      ]);

      const result = await service.getAccessibleUsers({
        userId: 'parent-1',
        role: UserRole.PARENT,
        districtId: 'district-1',
      });

      expect(result).toContain('parent-1'); // self
      expect(result).toContain('student-1');
      expect(result).toContain('student-2');
    });
  });
});
