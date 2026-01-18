/**
 * JWT Auth Guard
 *
 * Guards routes requiring JWT authentication.
 */

import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';

import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  override canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context) as boolean | Promise<boolean>;
  }

  override handleRequest<TUser>(
    err: Error | null,
    user: TUser | false,
    info: { message?: string } | undefined,
  ): TUser {
    if (err) {
      throw err;
    }

    if (!user) {
      const message = info?.message ?? 'Authentication required';
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message,
      });
    }

    return user;
  }
}
