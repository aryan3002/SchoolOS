/**
 * Relationships Controller
 *
 * Handles relationship management endpoints.
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
import { RelationshipType, RelationshipStatus } from '@prisma/client';

import { RelationshipsService, RelationshipRecord } from './relationships.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { DistrictGuard } from '../auth/guards/district.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AdminOnly, Roles } from '../auth/decorators/roles.decorator';
import { EnforceDistrict } from '../auth/decorators/district.decorator';
import { AuthenticatedUser } from '../auth/auth.service';
import { UserRole } from '@prisma/client';
import {
  CreateRelationshipDto,
  UpdateRelationshipDto,
  ListRelationshipsQueryDto,
  BulkCreateRelationshipsDto,
} from './dto/relationships.dto';

@Controller('relationships')
@UseGuards(JwtAuthGuard, RolesGuard, DistrictGuard)
export class RelationshipsController {
  constructor(private readonly relationshipsService: RelationshipsService) {}

  /**
   * List relationships
   */
  @Get()
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @EnforceDistrict()
  async listRelationships(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListRelationshipsQueryDto,
  ): Promise<{
    items: RelationshipRecord[];
    pagination: {
      page: number;
      pageSize: number;
      totalItems: number;
      totalPages: number;
      hasMore: boolean;
    };
  }> {
    const result = await this.relationshipsService.findMany({
      districtId: user.districtId,
      userId: query.userId,
      relationshipType: query.relationshipType as RelationshipType | undefined,
      status: query.status as RelationshipStatus | undefined,
      page: query.page,
      pageSize: query.pageSize,
    });

    return {
      items: result.relationships,
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
   * Get my relationships
   */
  @Get('me')
  async getMyRelationships(
    @CurrentUser() user: AuthenticatedUser,
    @Query('type') type?: RelationshipType,
  ): Promise<RelationshipRecord[]> {
    return this.relationshipsService.findForUser(
      user.id,
      user.districtId,
      type,
    );
  }

  /**
   * Get relationship by ID
   */
  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @EnforceDistrict()
  async getRelationship(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<RelationshipRecord> {
    const relationship = await this.relationshipsService.findById(
      id,
      user.districtId,
    );

    if (!relationship) {
      throw new Error('Relationship not found');
    }

    return relationship;
  }

  /**
   * Get relationships for a specific user
   */
  @Get('user/:userId')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @EnforceDistrict()
  async getRelationshipsForUser(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('type') type?: RelationshipType,
  ): Promise<RelationshipRecord[]> {
    return this.relationshipsService.findForUser(
      userId,
      user.districtId,
      type,
    );
  }

  /**
   * Create relationship (admin only)
   */
  @Post()
  @AdminOnly()
  @EnforceDistrict()
  @HttpCode(HttpStatus.CREATED)
  async createRelationship(
    @Body() dto: CreateRelationshipDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<RelationshipRecord> {
    return this.relationshipsService.create({
      ...dto,
      districtId: user.districtId,
    });
  }

  /**
   * Bulk create relationships (admin only, for SIS sync)
   */
  @Post('bulk')
  @AdminOnly()
  @EnforceDistrict()
  async bulkCreateRelationships(
    @Body() dto: BulkCreateRelationshipsDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ created: number; skipped: number; errors: string[] }> {
    const relationships = dto.relationships.map((rel) => ({
      ...rel,
      districtId: user.districtId,
    }));

    return this.relationshipsService.bulkCreate(relationships);
  }

  /**
   * Update relationship (admin only)
   */
  @Put(':id')
  @AdminOnly()
  @EnforceDistrict()
  async updateRelationship(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRelationshipDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<RelationshipRecord> {
    return this.relationshipsService.update(id, dto, user.districtId, user.id);
  }

  /**
   * Verify relationship (admin only)
   */
  @Post(':id/verify')
  @AdminOnly()
  @EnforceDistrict()
  async verifyRelationship(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<RelationshipRecord> {
    return this.relationshipsService.verify(id, user.districtId, user.id);
  }

  /**
   * Revoke relationship (admin only)
   */
  @Post(':id/revoke')
  @AdminOnly()
  @EnforceDistrict()
  async revokeRelationship(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<RelationshipRecord> {
    return this.relationshipsService.revoke(id, user.districtId);
  }

  /**
   * Delete relationship (admin only)
   */
  @Delete(':id')
  @AdminOnly()
  @EnforceDistrict()
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRelationship(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.relationshipsService.delete(id, user.districtId);
  }
}
