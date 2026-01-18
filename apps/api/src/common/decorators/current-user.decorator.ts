/**
 * Current User Decorator
 *
 * Extracts the current user from the request object.
 * Can optionally extract a specific property from the user object.
 */

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator((data: string | undefined, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  const user = request.user;

  if (!user) {
    return null;
  }

  if (data) {
    return user[data];
  }

  return user;
});
