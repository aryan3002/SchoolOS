/**
 * Relationship Guard
 *
 * Guards routes based on user relationships.
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
import { RELATIONSHIP_KEY, RelationshipMetadata } from '../decorators/relationship.decorator';

@Injectable()
export class RelationshipGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const metadata = this.reflector.getAllAndOverride<RelationshipMetadata>(
      RELATIONSHIP_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!metadata) {
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

    // Extract target user ID from request
    const targetUserId = this.extractTargetUserId(request, metadata.paramName);

    if (!targetUserId) {
      // No target user specified, allow (will be handled by service layer)
      return true;
    }

    // Self-access is always allowed
    if (targetUserId === user.id) {
      return true;
    }

    // Check relationship
    const hasAccess = await this.authorizationService.hasRelationshipAccess(
      {
        userId: user.id,
        role: user.role,
        districtId: user.districtId,
        schoolId: user.schoolId,
      },
      targetUserId,
      metadata.types,
    );

    if (!hasAccess) {
      throw new ForbiddenException({
        code: 'RELATIONSHIP_ACCESS_DENIED',
        message: metadata.types
          ? `This action requires one of the following relationships: ${metadata.types.join(', ')}`
          : 'You do not have a relationship with this user',
      });
    }

    return true;
  }

  private extractTargetUserId(
    request: {
      params?: Record<string, unknown>;
      query?: Record<string, unknown>;
      body?: Record<string, unknown>;
    },
    paramName?: string,
  ): string | undefined {
    const key = paramName ?? 'userId';

    // Check params
    if (request.params?.[key]) {
      return request.params[key] as string;
    }

    // Check query
    if (request.query?.[key]) {
      return request.query[key] as string;
    }

    // Check body
    if (request.body?.[key]) {
      return request.body[key] as string;
    }

    // Also check for 'id' as a fallback for user routes
    if (request.params?.['id']) {
      return request.params['id'] as string;
    }

    return undefined;
  }
}
