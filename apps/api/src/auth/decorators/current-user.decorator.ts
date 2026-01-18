/**
 * Current User Decorator
 *
 * Extracts the authenticated user from the request.
 */

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedUser } from '../auth.service';

export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user: AuthenticatedUser = request.user;

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  },
);
