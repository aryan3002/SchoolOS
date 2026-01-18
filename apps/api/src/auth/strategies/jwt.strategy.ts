/**
 * JWT Strategy
 *
 * Passport strategy for JWT authentication with RS256.
 */

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

import { AuthService, AuthenticatedUser } from '../auth.service';
import { JwtPayload } from '../token.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly authService: AuthService,
    configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_PUBLIC_KEY'),
      algorithms: ['RS256'],
      issuer: 'schoolos',
      audience: 'schoolos-api',
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    // Verify token type
    if (payload.type !== 'access') {
      throw new UnauthorizedException({
        code: 'INVALID_TOKEN_TYPE',
        message: 'Invalid token type',
      });
    }

    const user = await this.authService.validateUser(payload);

    if (!user) {
      throw new UnauthorizedException({
        code: 'USER_NOT_FOUND',
        message: 'User not found or inactive',
      });
    }

    return user;
  }
}
