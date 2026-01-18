/**
 * Relationship Decorator
 *
 * Specifies required relationships for accessing user resources.
 */

import { SetMetadata } from '@nestjs/common';
import { RelationshipType } from '@prisma/client';

export const RELATIONSHIP_KEY = 'relationship';

export interface RelationshipMetadata {
  types?: RelationshipType[];
  paramName?: string;
}

/**
 * Requires a specific relationship to access the resource.
 *
 * @param types - Required relationship types (any of)
 * @param paramName - Parameter name containing the target user ID (default: 'userId')
 */
export const RequireRelationship = (
  types?: RelationshipType[],
  paramName?: string,
) => SetMetadata(RELATIONSHIP_KEY, { types, paramName } as RelationshipMetadata);

// Convenience decorators
export const RequireParentRelationship = (paramName?: string) =>
  RequireRelationship([RelationshipType.PARENT_OF], paramName);

export const RequireTeacherRelationship = (paramName?: string) =>
  RequireRelationship([RelationshipType.TEACHER_OF], paramName);

export const RequireCounselorRelationship = (paramName?: string) =>
  RequireRelationship([RelationshipType.COUNSELOR_OF], paramName);

export const RequireGuardianRelationship = (paramName?: string) =>
  RequireRelationship([RelationshipType.GUARDIAN_OF], paramName);

export const RequireAnyRelationship = (paramName?: string) =>
  RequireRelationship(undefined, paramName);
