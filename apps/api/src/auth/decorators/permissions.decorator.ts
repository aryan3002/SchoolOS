/**
 * Permissions Decorator
 *
 * Specifies required permissions for a route.
 */

import { SetMetadata } from '@nestjs/common';

// Temporary permission type until @schoolos/auth is fixed
export type Permission = string;

export const PERMISSIONS_KEY = 'permissions';

/**
 * Requires specific permissions to access the route.
 * User must have at least one of the specified permissions.
 *
 * @param permissions - Required permissions (any of)
 */
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

// Convenience decorators for common permission combinations
export const CanReadUsers = () => RequirePermissions('users:read');
export const CanWriteUsers = () => RequirePermissions('users:write');
export const CanDeleteUsers = () => RequirePermissions('users:delete');

export const CanReadKnowledge = () => RequirePermissions('knowledge:read');
export const CanWriteKnowledge = () => RequirePermissions('knowledge:write');

export const CanChat = () => RequirePermissions('chat:own');
export const CanViewAllChats = () => RequirePermissions('chat:all');

export const CanManageRelationships = () => RequirePermissions('relationships:write');
