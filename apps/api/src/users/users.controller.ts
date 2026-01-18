/**
 * Users Controller
 *
 * Handles user management endpoints.
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { UserRole, UserStatus } from '@prisma/client';

import { UsersService, UserProfile } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { DistrictGuard } from '../auth/guards/district.guard';
import { RelationshipGuard } from '../auth/guards/relationship.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AdminOnly } from '../auth/decorators/roles.decorator';
import { EnforceDistrict } from '../auth/decorators/district.decorator';
import { RequireAnyRelationship } from '../auth/decorators/relationship.decorator';
import { AuthenticatedUser } from '../auth/auth.service';
import {
  CreateUserDto,
  UpdateUserDto,
  ListUsersQueryDto,
  UpdateUserStatusDto,
} from './dto/users.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard, DistrictGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * List users (admin only)
   */
  @Get()
  @AdminOnly()
  @EnforceDistrict()
  async listUsers(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListUsersQueryDto,
  ): Promise<{
    items: UserProfile[];
    pagination: {
      page: number;
      pageSize: number;
      totalItems: number;
      totalPages: number;
      hasMore: boolean;
    };
  }> {
    const result = await this.usersService.findMany({
      districtId: user.districtId,
      schoolId: query.schoolId,
      role: query.role as UserRole | undefined,
      status: query.status as UserStatus | undefined,
      search: query.search,
      page: query.page,
      pageSize: query.pageSize,
    });

    return {
      items: result.users,
      pagination: {
        page: result.page,
        pageSize: result.pageSize,
        totalItems: result.total,
        totalPages: result.totalPages,
        hasMore: result.page < result.totalPages,
      },
    };
  }

  /**
   * Get user by ID
   */
  @Get(':id')
  @UseGuards(RelationshipGuard)
  @RequireAnyRelationship('id')
  async getUser(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UserProfile> {
    const foundUser = await this.usersService.findById(id, user.districtId);

    if (!foundUser) {
      throw new Error('User not found');
    }

    return foundUser;
  }

  /**
   * Create user (admin only)
   */
  @Post()
  @AdminOnly()
  @EnforceDistrict()
  @HttpCode(HttpStatus.CREATED)
  async createUser(
    @Body() dto: CreateUserDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UserProfile> {
    return this.usersService.create({
      ...dto,
      districtId: user.districtId,
    });
  }

  /**
   * Update user (admin only)
   */
  @Put(':id')
  @AdminOnly()
  @EnforceDistrict()
  async updateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UserProfile> {
    return this.usersService.update(id, dto, user.districtId);
  }

  /**
   * Update user status (admin only)
   */
  @Put(':id/status')
  @AdminOnly()
  @EnforceDistrict()
  async updateUserStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UserProfile> {
    return this.usersService.updateStatus(id, dto.status, user.districtId);
  }

  /**
   * Delete user (admin only)
   */
  @Delete(':id')
  @AdminOnly()
  @EnforceDistrict()
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUser(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.usersService.delete(id, user.districtId);
  }
}
