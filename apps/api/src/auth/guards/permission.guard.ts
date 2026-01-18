/**
 * Permission Guard
 *
 * Guards routes based on specific permissions.
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { AuthorizationService } from '../authorization.service';
import { AuthenticatedUser } from '../auth.service';
import { PERMISSIONS_KEY, Permission } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authorizationService: AuthorizationService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser = request.user;

    if (!user) {
      throw new ForbiddenException({
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication is required',
      });
    }

    const hasPermission = this.authorizationService.hasAnyPermission(
      user.role,
      requiredPermissions,
    );

    if (!hasPermission) {
      throw new ForbiddenException({
        code: 'INSUFFICIENT_PERMISSIONS',
        message: `This action requires one of the following permissions: ${requiredPermissions.join(', ')}`,
      });
    }

    return true;
  }
}
