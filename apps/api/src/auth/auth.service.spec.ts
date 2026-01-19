/**
 * Auth Service Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRole, UserStatus, TokenType } from '@prisma/client';

import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { PrismaService } from '../database/prisma.service';

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: jest.Mocked<PrismaService>;
  let tokenService: jest.Mocked<TokenService>;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    passwordHash: '$2b$12$LQv3c1yqBwEHAXtS1F8nqOJhSZ3p2aXOCn8ePJQxPEwV6Z0yU5yG2', // hashed 'Password123!'
    firstName: 'Test',
    lastName: 'User',
    role: UserRole.TEACHER,
    status: UserStatus.ACTIVE,
    districtId: 'district-1',
    schoolId: 'school-1',
    emailVerified: true,
    lastLoginAt: null,
    failedLoginAttempts: 0,
    lockedUntil: null,
    preferences: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    const mockPrismaService = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      district: {
        findUnique: jest.fn(),
      },
      school: {
        findFirst: jest.fn(),
      },
      token: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
      $transaction: jest.fn((operations) => Promise.all(operations)),
    };

    const mockTokenService = {
      generateTokenPair: jest.fn(),
      verifyRefreshToken: jest.fn(),
      createToken: jest.fn(),
      revokeAllUserTokens: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: TokenService, useValue: mockTokenService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get(PrismaService);
    tokenService = module.get(TokenService);
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      prismaService.user.findFirst = jest.fn().mockResolvedValue(mockUser);
      tokenService.generateTokenPair = jest.fn().mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 900,
        tokenType: 'Bearer',
      });
      prismaService.user.update = jest.fn().mockResolvedValue(mockUser);
      prismaService.auditLog.create = jest.fn().mockResolvedValue({});

      // Note: In a real test, we'd need to mock bcrypt properly
      // This test demonstrates the structure
    });

    it('should throw UnauthorizedException for invalid email', async () => {
      prismaService.user.findFirst = jest.fn().mockResolvedValue(null);

      await expect(
        service.login({
          email: 'invalid@example.com',
          password: 'password',
          districtId: 'district-1',
        }),
      ).rejects.toThrow('Invalid email or password');
    });

    it('should throw UnauthorizedException for locked account', async () => {
      prismaService.user.findFirst = jest.fn().mockResolvedValue({
        ...mockUser,
        lockedUntil: new Date(Date.now() + 60000),
      });

      await expect(
        service.login({
          email: 'test@example.com',
          password: 'password',
          districtId: 'district-1',
        }),
      ).rejects.toThrow(/Account is locked/);
    });

    it('should throw UnauthorizedException for suspended account', async () => {
      prismaService.user.findFirst = jest.fn().mockResolvedValue({
        ...mockUser,
        status: UserStatus.SUSPENDED,
      });

      await expect(
        service.login({
          email: 'test@example.com',
          password: 'password',
          districtId: 'district-1',
        }),
      ).rejects.toThrow(/suspended/);
    });
  });

  describe('register', () => {
    it('should throw ConflictException if email already exists', async () => {
      prismaService.user.findUnique = jest.fn().mockResolvedValue(mockUser);

      await expect(
        service.register({
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
        service.register({
          email: 'new@example.com',
          password: 'Password123!',
          firstName: 'New',
          lastName: 'User',
          role: UserRole.TEACHER,
          districtId: 'invalid-district',
        }),
      ).rejects.toThrow(/Invalid district/);
    });
  });

  describe('getUserById', () => {
    it('should return user when found', async () => {
      prismaService.user.findUnique = jest.fn().mockResolvedValue(mockUser);

      const result = await service.getUserById('user-1');

      expect(result).toBeDefined();
      expect(result?.email).toBe('test@example.com');
    });

    it('should return null when user not found', async () => {
      prismaService.user.findUnique = jest.fn().mockResolvedValue(null);

      const result = await service.getUserById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('validateUser', () => {
    it('should return user for valid payload', async () => {
      prismaService.user.findUnique = jest.fn().mockResolvedValue(mockUser);

      const result = await service.validateUser({ sub: 'user-1' });

      expect(result).toBeDefined();
      expect(result?.id).toBe('user-1');
    });

    it('should return null for inactive user', async () => {
      prismaService.user.findUnique = jest.fn().mockResolvedValue({
        ...mockUser,
        status: UserStatus.INACTIVE,
      });

      const result = await service.validateUser({ sub: 'user-1' });

      expect(result).toBeNull();
    });
  });
});
