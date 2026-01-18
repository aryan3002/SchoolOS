/**
 * Authentication Module
 *
 * Provides JWT-based authentication with RS256 signing.
 */

import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { DistrictGuard } from './guards/district.guard';
import { RelationshipGuard } from './guards/relationship.guard';
import { UsersModule } from '../users/users.module';
import { TokenService } from './token.service';
import { AuthorizationService } from './authorization.service';

@Module({
  imports: [
    PassportModule.register({
      defaultStrategy: 'jwt',
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const privateKey = configService.get<string>('JWT_PRIVATE_KEY');
        const publicKey = configService.get<string>('JWT_PUBLIC_KEY');
        
        if (!privateKey || !publicKey) {
          throw new Error('JWT_PRIVATE_KEY and JWT_PUBLIC_KEY must be configured');
        }
        
        return {
          privateKey,
          publicKey,
          signOptions: {
            algorithm: 'RS256' as const,
            expiresIn: configService.get<string>('JWT_ACCESS_EXPIRY') ?? '15m',
            issuer: 'schoolos',
            audience: 'schoolos-api',
          },
          verifyOptions: {
            algorithms: ['RS256'] as ('RS256')[],
            issuer: 'schoolos',
            audience: 'schoolos-api',
          },
        };
      },
    }),
    forwardRef(() => UsersModule),
  ],
  providers: [
    AuthService,
    TokenService,
    AuthorizationService,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
    DistrictGuard,
    RelationshipGuard,
  ],
  controllers: [AuthController],
  exports: [AuthService, TokenService, AuthorizationService, JwtAuthGuard, RolesGuard, DistrictGuard, RelationshipGuard],
})
export class AuthModule {}
