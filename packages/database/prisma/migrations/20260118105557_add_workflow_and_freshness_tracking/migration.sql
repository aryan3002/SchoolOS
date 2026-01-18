-- AlterTable
ALTER TABLE "knowledge_sources" ADD COLUMN     "approved_at" TIMESTAMP(3),
ADD COLUMN     "approved_by" UUID,
ADD COLUMN     "auto_update_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "check_frequency_days" INTEGER DEFAULT 30,
ADD COLUMN     "content_hash" VARCHAR(64),
ADD COLUMN     "last_checked_at" TIMESTAMP(3),
ADD COLUMN     "last_modified_at" TIMESTAMP(3),
ADD COLUMN     "review_notes" TEXT,
ADD COLUMN     "reviewed_at" TIMESTAMP(3),
ADD COLUMN     "reviewed_by" UUID;
