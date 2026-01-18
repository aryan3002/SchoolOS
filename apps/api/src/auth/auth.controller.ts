/**
 * Authentication Controller
 *
 * Handles authentication endpoints.
 */

import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { AuthService, AuthResponse, TokenPair } from './auth.service';
import {
  LoginDto,
  RegisterDto,
  RefreshTokenDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
  VerifyEmailDto,
  LogoutDto,
} from './dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { AuthenticatedUser } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Register a new user
   */
  @Post('register')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto): Promise<AuthResponse> {
    return this.authService.register(dto);
  }

  /**
   * Login with email and password
   */
  @Post('login')
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto): Promise<AuthResponse> {
    return this.authService.login(dto);
  }

  /**
   * Refresh access token
   */
  @Post('refresh')
  @Public()
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 requests per minute
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto): Promise<TokenPair> {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  /**
   * Logout (revoke tokens)
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: LogoutDto,
  ): Promise<void> {
    await this.authService.logout(user.id, dto.refreshToken, dto.allDevices);
  }

  /**
   * Get current user profile
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: AuthenticatedUser): Promise<AuthenticatedUser> {
    return user;
  }

  /**
   * Request password reset
   */
  @Post('forgot-password')
  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 requests per minute
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<{ message: string }> {
    await this.authService.forgotPassword(dto);
    return {
      message: 'If an account exists with that email, a password reset link has been sent',
    };
  }

  /**
   * Reset password with token
   */
  @Post('reset-password')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<{ message: string }> {
    await this.authService.resetPassword(dto);
    return { message: 'Password has been reset successfully' };
  }

  /**
   * Change password (authenticated)
   */
  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    await this.authService.changePassword(user.id, dto);
    return { message: 'Password has been changed successfully' };
  }

  /**
   * Verify email address
   */
  @Post('verify-email')
  @Public()
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() dto: VerifyEmailDto): Promise<{ message: string }> {
    await this.authService.verifyEmail(dto.token);
    return { message: 'Email has been verified successfully' };
  }
}
