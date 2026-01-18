-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PARENT', 'TEACHER', 'STUDENT', 'ADMIN', 'STAFF');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RelationshipType" AS ENUM ('PARENT_OF', 'GUARDIAN_OF', 'TEACHER_OF', 'COTEACHER_OF', 'COUNSELOR_OF', 'ADMIN_OF');

-- CreateEnum
CREATE TYPE "RelationshipStatus" AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "KnowledgeSourceType" AS ENUM ('PDF', 'WEB_PAGE', 'POLICY_DOCUMENT', 'HANDBOOK', 'ANNOUNCEMENT', 'FAQ', 'FORM', 'CALENDAR');

-- CreateEnum
CREATE TYPE "KnowledgeSourceStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'ARCHIVED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('ACTIVE', 'RESOLVED', 'ESCALATED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'PERMISSION_DENIED', 'EXPORT', 'BULK_OPERATION');

-- CreateEnum
CREATE TYPE "TokenType" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET', 'MAGIC_LINK', 'REFRESH_TOKEN');

-- CreateTable
CREATE TABLE "districts" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "domain" VARCHAR(255),
    "timezone" VARCHAR(50) NOT NULL DEFAULT 'America/New_York',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "features" JSONB NOT NULL DEFAULT '{}',
    "branding" JSONB NOT NULL DEFAULT '{}',
    "max_users" INTEGER NOT NULL DEFAULT 10000,
    "max_storage_gb" INTEGER NOT NULL DEFAULT 100,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "districts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schools" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "district_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "address" JSONB,
    "phone" VARCHAR(20),
    "principal" VARCHAR(255),
    "settings" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "schools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sections" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "school_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "subject" VARCHAR(100),
    "grade_level" VARCHAR(20),
    "period" VARCHAR(20),
    "room" VARCHAR(50),
    "school_year" VARCHAR(20) NOT NULL,
    "semester" VARCHAR(20),
    "sis_id" VARCHAR(100),
    "lms_id" VARCHAR(100),
    "settings" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "district_id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone_number" VARCHAR(20),
    "password_hash" VARCHAR(255),
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "preferred_name" VARCHAR(100),
    "avatar_url" VARCHAR(500),
    "role" "UserRole" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING',
    "sis_id" VARCHAR(100),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "preferences" JSONB NOT NULL DEFAULT '{}',
    "last_login_at" TIMESTAMP(3),
    "failed_login_count" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "email_verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_relationships" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "district_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "related_user_id" UUID NOT NULL,
    "relationship_type" "RelationshipType" NOT NULL,
    "status" "RelationshipStatus" NOT NULL DEFAULT 'PENDING',
    "section_id" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "start_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "end_date" TIMESTAMP(3),
    "approved_by" UUID,
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "user_relationships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tokens" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "district_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "TokenType" NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "device_info" JSONB,
    "ip_address" VARCHAR(45),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_sources" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "district_id" UUID NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "source_type" "KnowledgeSourceType" NOT NULL,
    "content" TEXT,
    "original_url" VARCHAR(1000),
    "file_url" VARCHAR(1000),
    "file_mime_type" VARCHAR(100),
    "file_size" INTEGER,
    "version" INTEGER NOT NULL DEFAULT 1,
    "parent_id" UUID,
    "status" "KnowledgeSourceStatus" NOT NULL DEFAULT 'DRAFT',
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "visible_to_roles" "UserRole"[] DEFAULT ARRAY[]::"UserRole"[],
    "published_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "category" VARCHAR(100),
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "processed_at" TIMESTAMP(3),
    "processing_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID,

    CONSTRAINT "knowledge_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_chunks" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "source_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" vector(1536),
    "chunk_index" INTEGER NOT NULL,
    "start_offset" INTEGER,
    "end_offset" INTEGER,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "district_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "child_id" UUID,
    "status" "ConversationStatus" NOT NULL DEFAULT 'ACTIVE',
    "title" VARCHAR(255),
    "summary" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "closed_at" TIMESTAMP(3),

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "conversation_id" UUID NOT NULL,
    "user_id" UUID,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "model_used" VARCHAR(100),
    "prompt_tokens" INTEGER,
    "completion_tokens" INTEGER,
    "latency_ms" INTEGER,
    "tool_calls" JSONB,
    "rating" INTEGER,
    "feedback" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_sources" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "message_id" UUID NOT NULL,
    "chunk_id" UUID NOT NULL,
    "relevance_score" DOUBLE PRECISION NOT NULL,
    "used_in_response" BOOLEAN NOT NULL DEFAULT true,
    "citation" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "district_id" UUID NOT NULL,
    "user_id" UUID,
    "action" "AuditAction" NOT NULL,
    "entity_type" VARCHAR(100) NOT NULL,
    "entity_id" VARCHAR(100),
    "changes" JSONB,
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(500),
    "request_id" VARCHAR(100),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "districts_slug_key" ON "districts"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "districts_domain_key" ON "districts"("domain");

-- CreateIndex
CREATE INDEX "districts_slug_idx" ON "districts"("slug");

-- CreateIndex
CREATE INDEX "districts_domain_idx" ON "districts"("domain");

-- CreateIndex
CREATE INDEX "districts_deleted_at_idx" ON "districts"("deleted_at");

-- CreateIndex
CREATE INDEX "schools_district_id_idx" ON "schools"("district_id");

-- CreateIndex
CREATE INDEX "schools_deleted_at_idx" ON "schools"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "schools_district_id_code_key" ON "schools"("district_id", "code");

-- CreateIndex
CREATE INDEX "sections_school_id_idx" ON "sections"("school_id");

-- CreateIndex
CREATE INDEX "sections_sis_id_idx" ON "sections"("sis_id");

-- CreateIndex
CREATE INDEX "sections_lms_id_idx" ON "sections"("lms_id");

-- CreateIndex
CREATE INDEX "sections_deleted_at_idx" ON "sections"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "sections_school_id_code_school_year_key" ON "sections"("school_id", "code", "school_year");

-- CreateIndex
CREATE INDEX "users_district_id_idx" ON "users"("district_id");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "users_sis_id_idx" ON "users"("sis_id");

-- CreateIndex
CREATE INDEX "users_deleted_at_idx" ON "users"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "users_district_id_email_key" ON "users"("district_id", "email");

-- CreateIndex
CREATE INDEX "user_relationships_district_id_idx" ON "user_relationships"("district_id");

-- CreateIndex
CREATE INDEX "user_relationships_user_id_idx" ON "user_relationships"("user_id");

-- CreateIndex
CREATE INDEX "user_relationships_related_user_id_idx" ON "user_relationships"("related_user_id");

-- CreateIndex
CREATE INDEX "user_relationships_relationship_type_idx" ON "user_relationships"("relationship_type");

-- CreateIndex
CREATE INDEX "user_relationships_status_idx" ON "user_relationships"("status");

-- CreateIndex
CREATE INDEX "user_relationships_section_id_idx" ON "user_relationships"("section_id");

-- CreateIndex
CREATE INDEX "user_relationships_deleted_at_idx" ON "user_relationships"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_relationships_user_id_related_user_id_relationship_typ_key" ON "user_relationships"("user_id", "related_user_id", "relationship_type", "section_id");

-- CreateIndex
CREATE UNIQUE INDEX "tokens_token_hash_key" ON "tokens"("token_hash");

-- CreateIndex
CREATE INDEX "tokens_district_id_idx" ON "tokens"("district_id");

-- CreateIndex
CREATE INDEX "tokens_user_id_idx" ON "tokens"("user_id");

-- CreateIndex
CREATE INDEX "tokens_type_idx" ON "tokens"("type");

-- CreateIndex
CREATE INDEX "tokens_expires_at_idx" ON "tokens"("expires_at");

-- CreateIndex
CREATE INDEX "knowledge_sources_district_id_idx" ON "knowledge_sources"("district_id");

-- CreateIndex
CREATE INDEX "knowledge_sources_source_type_idx" ON "knowledge_sources"("source_type");

-- CreateIndex
CREATE INDEX "knowledge_sources_status_idx" ON "knowledge_sources"("status");

-- CreateIndex
CREATE INDEX "knowledge_sources_category_idx" ON "knowledge_sources"("category");

-- CreateIndex
CREATE INDEX "knowledge_sources_tags_idx" ON "knowledge_sources"("tags");

-- CreateIndex
CREATE INDEX "knowledge_sources_deleted_at_idx" ON "knowledge_sources"("deleted_at");

-- CreateIndex
CREATE INDEX "knowledge_sources_published_at_idx" ON "knowledge_sources"("published_at");

-- CreateIndex
CREATE INDEX "knowledge_sources_expires_at_idx" ON "knowledge_sources"("expires_at");

-- CreateIndex
CREATE INDEX "knowledge_chunks_source_id_idx" ON "knowledge_chunks"("source_id");

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_chunks_source_id_chunk_index_key" ON "knowledge_chunks"("source_id", "chunk_index");

-- CreateIndex
CREATE INDEX "conversations_district_id_idx" ON "conversations"("district_id");

-- CreateIndex
CREATE INDEX "conversations_user_id_idx" ON "conversations"("user_id");

-- CreateIndex
CREATE INDEX "conversations_child_id_idx" ON "conversations"("child_id");

-- CreateIndex
CREATE INDEX "conversations_status_idx" ON "conversations"("status");

-- CreateIndex
CREATE INDEX "conversations_created_at_idx" ON "conversations"("created_at");

-- CreateIndex
CREATE INDEX "messages_conversation_id_idx" ON "messages"("conversation_id");

-- CreateIndex
CREATE INDEX "messages_role_idx" ON "messages"("role");

-- CreateIndex
CREATE INDEX "messages_created_at_idx" ON "messages"("created_at");

-- CreateIndex
CREATE INDEX "message_sources_message_id_idx" ON "message_sources"("message_id");

-- CreateIndex
CREATE INDEX "message_sources_chunk_id_idx" ON "message_sources"("chunk_id");

-- CreateIndex
CREATE UNIQUE INDEX "message_sources_message_id_chunk_id_key" ON "message_sources"("message_id", "chunk_id");

-- CreateIndex
CREATE INDEX "audit_logs_district_id_idx" ON "audit_logs"("district_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_idx" ON "audit_logs"("entity_type");

-- CreateIndex
CREATE INDEX "audit_logs_entity_id_idx" ON "audit_logs"("entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- AddForeignKey
ALTER TABLE "schools" ADD CONSTRAINT "schools_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sections" ADD CONSTRAINT "sections_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_relationships" ADD CONSTRAINT "user_relationships_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_relationships" ADD CONSTRAINT "user_relationships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_relationships" ADD CONSTRAINT "user_relationships_related_user_id_fkey" FOREIGN KEY ("related_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_relationships" ADD CONSTRAINT "user_relationships_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tokens" ADD CONSTRAINT "tokens_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tokens" ADD CONSTRAINT "tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_sources" ADD CONSTRAINT "knowledge_sources_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_sources" ADD CONSTRAINT "knowledge_sources_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "knowledge_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "knowledge_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_sources" ADD CONSTRAINT "message_sources_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_sources" ADD CONSTRAINT "message_sources_chunk_id_fkey" FOREIGN KEY ("chunk_id") REFERENCES "knowledge_chunks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
