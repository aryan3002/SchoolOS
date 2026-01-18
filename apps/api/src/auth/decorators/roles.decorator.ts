/**
 * Roles Decorator
 *
 * Specifies required roles for a route.
 */

import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

// Convenience decorators for specific roles
export const AdminOnly = () => Roles(UserRole.ADMIN);
export const TeachersAndAdmin = () => Roles(UserRole.ADMIN, UserRole.TEACHER);
export const StaffOnly = () => Roles(UserRole.ADMIN, UserRole.TEACHER);
export const ParentsAndAbove = () => Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.PARENT);
