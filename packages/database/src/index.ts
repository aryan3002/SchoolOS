/**
 * SchoolOS Database Package
 *
 * Exports Prisma client, utilities, and middleware for tenant-isolated database access.
 */

export * from './client';
export * from './middleware/tenant-isolation';
export * from './middleware/soft-delete';
export * from './middleware/audit-log';
export * from './utils/tenant-context';
export * from './utils/relationship-helpers';
export * from './utils/pagination';
