/**
 * Users Service Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { UserRole, UserStatus } from '@prisma/client';

import { UsersService } from './users.service';
import { PrismaService } from '../database/prisma.service';

describe('UsersService', () => {
  let service: UsersService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: UserRole.TEACHER,
    status: UserStatus.ACTIVE,
    districtId: 'district-1',
    schoolId: 'school-1',
    emailVerified: true,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    const mockPrismaService = {
      user: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      district: {
        findUnique: jest.fn(),
      },
      school: {
        findFirst: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prismaService = module.get(PrismaService);
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      prismaService.user.findFirst = jest.fn().mockResolvedValue(mockUser);

      const result = await service.findById('user-1', 'district-1');

      expect(result).toBeDefined();
      expect(result?.id).toBe('user-1');
    });

    it('should return null when not found', async () => {
      prismaService.user.findFirst = jest.fn().mockResolvedValue(null);

      const result = await service.findById('non-existent');

      expect(result).toBeNull();
    });

    it('should filter by district when provided', async () => {
      prismaService.user.findFirst = jest.fn().mockResolvedValue(mockUser);

      await service.findById('user-1', 'district-1');

      expect(prismaService.user.findFirst).toHaveBeenCalledWith({
        where: { id: 'user-1', districtId: 'district-1' },
        select: expect.any(Object),
      });
    });
  });

  describe('findByEmail', () => {
    it('should return user when found', async () => {
      prismaService.user.findUnique = jest.fn().mockResolvedValue(mockUser);

      const result = await service.findByEmail('test@example.com');

      expect(result).toBeDefined();
      expect(result?.email).toBe('test@example.com');
    });

    it('should lowercase email for search', async () => {
      prismaService.user.findUnique = jest.fn().mockResolvedValue(mockUser);

      await service.findByEmail('TEST@Example.COM');

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        select: expect.any(Object),
      });
    });
  });

  describe('findMany', () => {
    it('should return paginated results', async () => {
      prismaService.user.findMany = jest.fn().mockResolvedValue([mockUser]);
      prismaService.user.count = jest.fn().mockResolvedValue(1);

      const result = await service.findMany({
        districtId: 'district-1',
        page: 1,
        pageSize: 20,
      });

      expect(result.users).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
      expect(result.totalPages).toBe(1);
    });

    it('should filter by role when provided', async () => {
      prismaService.user.findMany = jest.fn().mockResolvedValue([]);
      prismaService.user.count = jest.fn().mockResolvedValue(0);

      await service.findMany({
        districtId: 'district-1',
        role: UserRole.TEACHER,
      });

      expect(prismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            role: UserRole.TEACHER,
          }),
        }),
      );
    });

    it('should search by name or email', async () => {
      prismaService.user.findMany = jest.fn().mockResolvedValue([]);
      prismaService.user.count = jest.fn().mockResolvedValue(0);

      await service.findMany({
        districtId: 'district-1',
        search: 'test',
      });

      expect(prismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ email: expect.any(Object) }),
              expect.objectContaining({ firstName: expect.any(Object) }),
              expect.objectContaining({ lastName: expect.any(Object) }),
            ]),
          }),
        }),
      );
    });
  });

  describe('create', () => {
    it('should throw ConflictException if email exists', async () => {
      prismaService.user.findUnique = jest.fn().mockResolvedValue(mockUser);

      await expect(
        service.create({
          email: 'test@example.com',
          password: 'Password123!',
          firstName: 'Test',
          lastName: 'User',
          role: UserRole.TEACHER,
          districtId: 'district-1',
        }),
      ).rejects.toThrow(/already exists/);
    });

    it('should throw BadRequestException for invalid district', async () => {
      prismaService.user.findUnique = jest.fn().mockResolvedValue(null);
      prismaService.district.findUnique = jest.fn().mockResolvedValue(null);

      await expect(
        service.create({
          email: 'new@example.com',
          password: 'Password123!',
          firstName: 'New',
          lastName: 'User',
          role: UserRole.TEACHER,
          districtId: 'invalid-district',
        }),
      ).rejects.toThrow(/Invalid district/);
    });

    it('should throw BadRequestException for invalid school', async () => {
      prismaService.user.findUnique = jest.fn().mockResolvedValue(null);
      prismaService.district.findUnique = jest.fn().mockResolvedValue({ id: 'district-1' });
      prismaService.school.findFirst = jest.fn().mockResolvedValue(null);

      await expect(
        service.create({
          email: 'new@example.com',
          password: 'Password123!',
          firstName: 'New',
          lastName: 'User',
          role: UserRole.TEACHER,
          districtId: 'district-1',
          schoolId: 'invalid-school',
        }),
      ).rejects.toThrow(/Invalid school/);
    });
  });

  describe('update', () => {
    it('should throw NotFoundException if user not found', async () => {
      prismaService.user.findFirst = jest.fn().mockResolvedValue(null);

      await expect(
        service.update('non-existent', { firstName: 'New' }, 'district-1'),
      ).rejects.toThrow(/not found/);
    });

    it('should update user successfully', async () => {
      prismaService.user.findFirst = jest.fn().mockResolvedValue(mockUser);
      prismaService.user.update = jest.fn().mockResolvedValue({
        ...mockUser,
        firstName: 'Updated',
      });

      const result = await service.update(
        'user-1',
        { firstName: 'Updated' },
        'district-1',
      );

      expect(result.firstName).toBe('Updated');
    });
  });

  describe('delete', () => {
    it('should soft delete user', async () => {
      prismaService.user.findFirst = jest.fn().mockResolvedValue(mockUser);
      prismaService.user.update = jest.fn().mockResolvedValue({
        ...mockUser,
        deletedAt: new Date(),
        status: UserStatus.INACTIVE,
      });

      await service.delete('user-1', 'district-1');

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          deletedAt: expect.any(Date),
          status: UserStatus.INACTIVE,
        },
      });
    });
  });
});
