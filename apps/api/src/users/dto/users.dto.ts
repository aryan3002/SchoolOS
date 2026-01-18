/**
 * Users DTOs
 */

import {
  IsString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
  IsNumber,
  Min,
  Max,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { UserRole, UserStatus } from '@prisma/client';

export class CreateUserDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email!: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    {
      message:
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    },
  )
  password!: string;

  @IsString()
  @IsNotEmpty({ message: 'First name is required' })
  @MinLength(1)
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  firstName!: string;

  @IsString()
  @IsNotEmpty({ message: 'Last name is required' })
  @MinLength(1)
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  lastName!: string;

  @IsEnum(UserRole, { message: 'Invalid user role' })
  role!: UserRole;

  @IsOptional()
  @IsUUID('4', { message: 'Invalid school ID' })
  schoolId?: string;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  lastName?: string;

  @IsOptional()
  @IsEnum(UserRole, { message: 'Invalid user role' })
  role?: UserRole;

  @IsOptional()
  @IsUUID('4', { message: 'Invalid school ID' })
  schoolId?: string | null;
}

export class UpdateUserStatusDto {
  @IsEnum(UserStatus, { message: 'Invalid user status' })
  status!: UserStatus;
}

export class ListUsersQueryDto {
  @IsOptional()
  @IsUUID('4', { message: 'Invalid school ID' })
  schoolId?: string;

  @IsOptional()
  @IsEnum(UserRole, { message: 'Invalid user role' })
  role?: string;

  @IsOptional()
  @IsEnum(UserStatus, { message: 'Invalid user status' })
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}
