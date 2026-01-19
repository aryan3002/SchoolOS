/**
 * Users Service
 *
 * Handles user CRUD operations and queries.
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { UserRole, UserStatus, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

import { PrismaService } from '../database/prisma.service';

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  districtId: string;
  schoolId: string | null;
  emailVerifiedAt: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  districtId: string;
  schoolId?: string;
}

export interface UpdateUserInput {
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  status?: UserStatus;
  schoolId?: string | null;
}

export interface UserQueryOptions {
  districtId: string;
  schoolId?: string | undefined;
  role?: UserRole | undefined;
  status?: UserStatus | undefined;
  search?: string | undefined;
  page?: number | undefined;
  pageSize?: number | undefined;
}

const SALT_ROUNDS = 12;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find user by ID
   */
  async findById(id: string, districtId?: string): Promise<UserProfile | null> {
    const where: { id: string; districtId?: string } = { id };
    if (districtId) {
      where.districtId = districtId;
    }

    const user = await this.prisma.user.findFirst({
      where,
      select: this.getUserSelect(),
    });

    return user;
  }

  /**
   * Find user by email (requires districtId for compound unique key)
   */
  async findByEmail(email: string, districtId: string): Promise<UserProfile | null> {
    const user = await this.prisma.user.findUnique({
      where: { 
        districtId_email: {
          districtId,
          email: email.toLowerCase()
        }
      },
      select: this.getUserSelect(),
    });

    return user;
  }

  /**
   * Get users with filtering and pagination
   */
  async findMany(options: UserQueryOptions): Promise<{
    users: UserProfile[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const {
      districtId,
      schoolId,
      role,
      status,
      search,
      page = 1,
      pageSize = 20,
    } = options;

    const where: Prisma.UserWhereInput = {
      districtId,
      deletedAt: null,
    };

    if (schoolId) {
      where.schoolId = schoolId;
    }

    if (role) {
      where.role = role;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: this.getUserSelect(),
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Create a new user
   */
  async create(input: CreateUserInput): Promise<UserProfile> {
    // Check for existing user in this district
    const existing = await this.prisma.user.findUnique({
      where: { 
        districtId_email: {
          districtId: input.districtId,
          email: input.email.toLowerCase()
        }
      },
    });

    if (existing) {
      throw new ConflictException({
        code: 'EMAIL_EXISTS',
        message: 'A user with this email already exists',
      });
    }

    // Verify district
    const district = await this.prisma.district.findUnique({
      where: { id: input.districtId },
    });

    if (!district) {
      throw new BadRequestException({
        code: 'INVALID_DISTRICT',
        message: 'Invalid district ID',
      });
    }

    // Verify school if provided
    if (input.schoolId) {
      const school = await this.prisma.school.findFirst({
        where: {
          id: input.schoolId,
          districtId: input.districtId,
        },
      });

      if (!school) {
        throw new BadRequestException({
          code: 'INVALID_SCHOOL',
          message: 'Invalid school ID for this district',
        });
      }
    }

    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        id: uuidv4(),
        email: input.email.toLowerCase(),
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        role: input.role,
        status: UserStatus.PENDING,
        districtId: input.districtId,
        schoolId: input.schoolId ?? null,
        preferences: {},
      },
      select: this.getUserSelect(),
    });

    this.logger.log(`User created: ${user.email}`);

    return user;
  }

  /**
   * Update user
   */
  async update(
    id: string,
    input: UpdateUserInput,
    districtId?: string,
  ): Promise<UserProfile> {
    const where: { id: string; districtId?: string } = { id };
    if (districtId) {
      where.districtId = districtId;
    }

    const existing = await this.prisma.user.findFirst({ where });

    if (!existing) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    // Verify school if being changed
    if (input.schoolId !== undefined) {
      if (input.schoolId !== null) {
        const school = await this.prisma.school.findFirst({
          where: {
            id: input.schoolId,
            districtId: existing.districtId,
          },
        });

        if (!school) {
          throw new BadRequestException({
            code: 'INVALID_SCHOOL',
            message: 'Invalid school ID for this district',
          });
        }
      }
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: input,
      select: this.getUserSelect(),
    });

    this.logger.log(`User updated: ${user.email}`);

    return user;
  }

  /**
   * Soft delete user
   */
  async delete(id: string, districtId?: string): Promise<void> {
    const where: { id: string; districtId?: string } = { id };
    if (districtId) {
      where.districtId = districtId;
    }

    const existing = await this.prisma.user.findFirst({ where });

    if (!existing) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    await this.prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: UserStatus.INACTIVE,
      },
    });

    this.logger.log(`User deleted: ${existing.email}`);
  }

  /**
   * Update user status
   */
  async updateStatus(
    id: string,
    status: UserStatus,
    districtId?: string,
  ): Promise<UserProfile> {
    return this.update(id, { status }, districtId);
  }

  /**
   * Get users by IDs
   */
  async findByIds(ids: string[], districtId?: string): Promise<UserProfile[]> {
    const where: Prisma.UserWhereInput = {
      id: { in: ids },
      deletedAt: null,
    };

    if (districtId) {
      where.districtId = districtId;
    }

    return this.prisma.user.findMany({
      where,
      select: this.getUserSelect(),
    });
  }

  /**
   * Get user select fields
   */
  private getUserSelect() {
    return {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      status: true,
      districtId: true,
      schoolId: true,
      emailVerifiedAt: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
    } as const;
  }
}
