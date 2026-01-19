/**
 * Relationships Service Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { UserRole, RelationshipType, RelationshipStatus } from '@prisma/client';

import { RelationshipsService } from './relationships.service';
import { RelationshipCacheService } from './relationship-cache.service';
import { PrismaService } from '../database/prisma.service';

describe('RelationshipsService', () => {
  let service: RelationshipsService;
  let prismaService: jest.Mocked<PrismaService>;
  let cacheService: jest.Mocked<RelationshipCacheService>;

  const mockParent = {
    id: 'parent-1',
    firstName: 'Parent',
    lastName: 'User',
    email: 'parent@example.com',
    role: UserRole.PARENT,
    districtId: 'district-1',
  };

  const mockStudent = {
    id: 'student-1',
    firstName: 'Student',
    lastName: 'User',
    email: 'student@example.com',
    role: UserRole.STUDENT,
    districtId: 'district-1',
  };

  const mockRelationship = {
    id: 'rel-1',
    primaryUserId: 'parent-1',
    relatedUserId: 'student-1',
    relationshipType: RelationshipType.PARENT_OF,
    status: RelationshipStatus.ACTIVE,
    isPrimary: true,
    metadata: {},
    verifiedAt: new Date(),
    verifiedBy: 'admin-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    primaryUser: mockParent,
    relatedUser: mockStudent,
  };

  beforeEach(async () => {
    const mockPrismaService = {
      user: {
        findFirst: jest.fn(),
      },
      userRelationship: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
    };

    const mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      deletePattern: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RelationshipsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RelationshipCacheService, useValue: mockCacheService },
      ],
    }).compile();

    service = module.get<RelationshipsService>(RelationshipsService);
    prismaService = module.get(PrismaService);
    cacheService = module.get(RelationshipCacheService);
  });

  describe('findById', () => {
    it('should return relationship when found', async () => {
      prismaService.userRelationship.findFirst = jest
        .fn()
        .mockResolvedValue(mockRelationship);

      const result = await service.findById('rel-1', 'district-1');

      expect(result).toBeDefined();
      expect(result?.id).toBe('rel-1');
    });

    it('should return null when not found', async () => {
      prismaService.userRelationship.findFirst = jest
        .fn()
        .mockResolvedValue(null);

      const result = await service.findById('non-existent', 'district-1');

      expect(result).toBeNull();
    });
  });

  describe('findForUser', () => {
    it('should return cached result if available', async () => {
      cacheService.get = jest.fn().mockResolvedValue([mockRelationship]);

      const result = await service.findForUser('parent-1', 'district-1');

      expect(result).toHaveLength(1);
      expect(cacheService.get).toHaveBeenCalled();
      expect(prismaService.userRelationship.findMany).not.toHaveBeenCalled();
    });

    it('should query database and cache result if not cached', async () => {
      cacheService.get = jest.fn().mockResolvedValue(null);
      prismaService.userRelationship.findMany = jest
        .fn()
        .mockResolvedValue([mockRelationship]);

      const result = await service.findForUser('parent-1', 'district-1');

      expect(result).toHaveLength(1);
      expect(cacheService.set).toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('should create relationship with valid data', async () => {
      prismaService.user.findFirst = jest
        .fn()
        .mockResolvedValueOnce(mockParent)
        .mockResolvedValueOnce(mockStudent);
      prismaService.userRelationship.findFirst = jest
        .fn()
        .mockResolvedValue(null);
      prismaService.userRelationship.create = jest
        .fn()
        .mockResolvedValue(mockRelationship);

      const result = await service.create({
        userId: 'parent-1',
        relatedUserId: 'student-1',
        relationshipType: RelationshipType.PARENT_OF,
        districtId: 'district-1',
      });

      expect(result).toBeDefined();
      expect(cacheService.deletePattern).toHaveBeenCalled();
    });

    it('should throw error for invalid relationship type', async () => {
      prismaService.user.findFirst = jest
        .fn()
        .mockResolvedValueOnce(mockStudent) // Wrong role for primary
        .mockResolvedValueOnce(mockParent); // Wrong role for related

      await expect(
        service.create({
        userId: 'student-1',
        relatedUserId: 'parent-1',
        relationshipType: RelationshipType.PARENT_OF,
        districtId: 'district-1',
        }),
      ).rejects.toThrow();
    });

    it('should throw conflict error if relationship exists', async () => {
      prismaService.user.findFirst = jest
        .fn()
        .mockResolvedValueOnce(mockParent)
        .mockResolvedValueOnce(mockStudent);
      prismaService.userRelationship.findFirst = jest
        .fn()
        .mockResolvedValue(mockRelationship);

      await expect(
        service.create({
        userId: 'parent-1',
        relatedUserId: 'student-1',
        relationshipType: RelationshipType.PARENT_OF,
        districtId: 'district-1',
        }),
      ).rejects.toThrow(/already exists/);
    });
  });

  describe('hasRelationship', () => {
    it('should return true when relationship exists', async () => {
      prismaService.userRelationship.findFirst = jest
        .fn()
        .mockResolvedValue(mockRelationship);

      const result = await service.hasRelationship('parent-1', 'student-1');

      expect(result).toBe(true);
    });

    it('should return false when no relationship exists', async () => {
      prismaService.userRelationship.findFirst = jest
        .fn()
        .mockResolvedValue(null);

      const result = await service.hasRelationship('user-1', 'user-2');

      expect(result).toBe(false);
    });
  });
});
