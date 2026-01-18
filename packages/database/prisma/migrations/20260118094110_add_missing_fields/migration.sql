-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UserStatus" ADD VALUE 'PENDING_VERIFICATION';
ALTER TYPE "UserStatus" ADD VALUE 'INACTIVE';

-- AlterTable
ALTER TABLE "user_relationships" ADD COLUMN     "is_primary" BOOLEAN DEFAULT false,
ADD COLUMN     "verified_at" TIMESTAMP(3),
ADD COLUMN     "verified_by" UUID;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "email_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "school_id" UUID;

-- CreateIndex
CREATE INDEX "users_school_id_idx" ON "users"("school_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE SET NULL ON UPDATE CASCADE;
