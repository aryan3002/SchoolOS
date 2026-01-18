/**
 * Password Utilities
 *
 * Secure password hashing and validation utilities.
 */

import * as bcrypt from 'bcrypt';

/**
 * Default bcrypt rounds for password hashing
 */
export const DEFAULT_BCRYPT_ROUNDS = 12;

/**
 * Password requirements configuration
 */
export interface PasswordRequirements {
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  specialChars: string;
}

/**
 * Default password requirements
 */
export const DEFAULT_PASSWORD_REQUIREMENTS: PasswordRequirements = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?',
};

/**
 * Password validation result
 */
export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates a password against requirements
 *
 * @param password - Password to validate
 * @param requirements - Password requirements (uses defaults if not provided)
 * @returns Validation result with any errors
 */
export function validatePassword(
  password: string,
  requirements: PasswordRequirements = DEFAULT_PASSWORD_REQUIREMENTS,
): PasswordValidationResult {
  const errors: string[] = [];

  if (password.length < requirements.minLength) {
    errors.push(`Password must be at least ${requirements.minLength} characters long`);
  }

  if (password.length > requirements.maxLength) {
    errors.push(`Password must be no more than ${requirements.maxLength} characters long`);
  }

  if (requirements.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (requirements.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (requirements.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (requirements.requireSpecialChars) {
    const specialCharsRegex = new RegExp(
      `[${requirements.specialChars.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`,
    );
    if (!specialCharsRegex.test(password)) {
      errors.push(
        `Password must contain at least one special character (${requirements.specialChars})`,
      );
    }
  }

  // Check for common weak patterns
  const weakPatterns = [
    /^(.)\1+$/, // All same character
    /^(012|123|234|345|456|567|678|789|890)+$/, // Sequential numbers
    /^(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)+$/i, // Sequential letters
  ];

  for (const pattern of weakPatterns) {
    if (pattern.test(password)) {
      errors.push('Password contains a weak pattern');
      break;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Hashes a password using bcrypt
 *
 * @param password - Plain text password
 * @param rounds - Bcrypt rounds (defaults to DEFAULT_BCRYPT_ROUNDS)
 * @returns Hashed password
 */
export async function hashPassword(
  password: string,
  rounds: number = DEFAULT_BCRYPT_ROUNDS,
): Promise<string> {
  return bcrypt.hash(password, rounds);
}

/**
 * Verifies a password against a hash
 *
 * @param password - Plain text password to verify
 * @param hash - Bcrypt hash to verify against
 * @returns True if password matches hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generates a secure random password
 *
 * @param length - Length of password (default: 16)
 * @param requirements - Password requirements to ensure generation meets them
 * @returns Generated password
 */
export function generateSecurePassword(
  length: number = 16,
  requirements: PasswordRequirements = DEFAULT_PASSWORD_REQUIREMENTS,
): string {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const special = requirements.specialChars;

  let chars = '';
  const password: string[] = [];

  // Ensure at least one of each required type
  if (requirements.requireLowercase) {
    chars += lowercase;
    password.push(lowercase[Math.floor(Math.random() * lowercase.length)] ?? 'a');
  }

  if (requirements.requireUppercase) {
    chars += uppercase;
    password.push(uppercase[Math.floor(Math.random() * uppercase.length)] ?? 'A');
  }

  if (requirements.requireNumbers) {
    chars += numbers;
    password.push(numbers[Math.floor(Math.random() * numbers.length)] ?? '0');
  }

  if (requirements.requireSpecialChars) {
    chars += special;
    password.push(special[Math.floor(Math.random() * special.length)] ?? '!');
  }

  // Fill the rest with random characters
  while (password.length < length) {
    password.push(chars[Math.floor(Math.random() * chars.length)] ?? 'x');
  }

  // Shuffle the password
  for (let i = password.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = password[i];
    password[i] = password[j] ?? '';
    password[j] = temp ?? '';
  }

  return password.join('');
}

/**
 * Checks if a password has been compromised (placeholder for HaveIBeenPwned API)
 *
 * @param password - Password to check
 * @returns True if password appears to be compromised
 */
export async function isPasswordCompromised(_password: string): Promise<boolean> {
  // TODO: Implement HaveIBeenPwned API check
  // This is a placeholder that always returns false
  // In production, use the k-anonymity API: https://haveibeenpwned.com/API/v3#PwnedPasswords
  return false;
}
