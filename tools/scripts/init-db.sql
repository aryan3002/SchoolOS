-- SchoolOS PostgreSQL Initialization Script
-- This script runs when the database container is first created

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";  -- For RAG embeddings
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy text search

-- Create custom types for audit logging
DO $$ BEGIN
    CREATE TYPE audit_action AS ENUM ('CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create function for automatic updated_at timestamp
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function for soft delete cascade (optional utility)
CREATE OR REPLACE FUNCTION soft_delete_cascade()
RETURNS TRIGGER AS $$
BEGIN
    NEW.deleted_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for common query patterns (will be supplemented by Prisma migrations)
-- These are just placeholders - actual indexes will be created by Prisma

-- Grant permissions (for production, use more restrictive permissions)
-- In production, create separate users for API and migrations
GRANT ALL PRIVILEGES ON DATABASE schoolos TO schoolos;

-- Log that initialization completed
DO $$
BEGIN
    RAISE NOTICE 'SchoolOS database initialized successfully at %', NOW();
END $$;
