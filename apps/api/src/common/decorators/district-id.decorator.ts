/**
 * District ID Decorator
 *
 * Extracts the district ID from the request.
 * First checks the user object (for authenticated users),
 * then falls back to the x-district-id header.
 */

import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';

export const DistrictId = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest();

  // First try to get from authenticated user
  const user = request.user;
  if (user?.districtId) {
    return user.districtId;
  }

  // Fallback to header
  const districtId = request.headers['x-district-id'];
  if (districtId) {
    return districtId as string;
  }

  throw new UnauthorizedException('District ID is required');
});
