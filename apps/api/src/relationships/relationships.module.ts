/**
 * Relationships Module
 *
 * Manages user relationships (parent-child, teacher-student, etc.)
 */

import { Module } from '@nestjs/common';
import { RelationshipsService } from './relationships.service';
import { RelationshipsController } from './relationships.controller';
import { RelationshipCacheService } from './relationship-cache.service';

@Module({
  providers: [RelationshipsService, RelationshipCacheService],
  controllers: [RelationshipsController],
  exports: [RelationshipsService, RelationshipCacheService],
})
export class RelationshipsModule {}
