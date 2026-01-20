/**
 * Jest Setup File - Runs BEFORE any tests or module loading
 * 
 * This file forces stub mode for all E2E tests by removing the OPENAI_API_KEY
 * environment variable before NestJS ConfigModule can read it.
 */

// Force stub mode for all tests - must happen before ConfigModule loads .env
delete process.env.OPENAI_API_KEY;
process.env.OPENAI_API_KEY = '';

// Ensure we're in test mode
process.env.NODE_ENV = 'test';

console.log('[Jest Setup] Forced stub mode: OPENAI_API_KEY removed');
