/**
 * District Guard
 *
 * Ensures users can only access resources within their district.
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { AuthenticatedUser } from '../auth.service';
import { DISTRICT_KEY } from '../decorators/district.decorator';

@Injectable()
export class DistrictGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Check if district validation is required
    const enforceDistrict = this.reflector.getAllAndOverride<boolean>(
      DISTRICT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!enforceDistrict) {
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

    // Get district ID from request params, query, or body
    const districtId = this.extractDistrictId(request);

    if (!districtId) {
      // No district in request, allow (will be filtered by service layer)
      return true;
    }

    // Check if user's district matches the requested district
    if (user.districtId !== districtId) {
      throw new ForbiddenException({
        code: 'DISTRICT_ACCESS_DENIED',
        message: 'You do not have access to resources in this district',
      });
    }

    return true;
  }

  private extractDistrictId(request: {
    params?: Record<string, unknown>;
    query?: Record<string, unknown>;
    body?: Record<string, unknown>;
    headers?: Record<string, unknown>;
  }): string | undefined {
    // Check headers first (X-District-ID)
    if (request.headers?.['x-district-id']) {
      return request.headers['x-district-id'] as string;
    }

    // Check params
    if (request.params?.['districtId']) {
      return request.params['districtId'] as string;
    }

    // Check query
    if (request.query?.['districtId']) {
      return request.query['districtId'] as string;
    }

    // Check body
    if (request.body?.['districtId']) {
      return request.body['districtId'] as string;
    }

    return undefined;
  }
}
