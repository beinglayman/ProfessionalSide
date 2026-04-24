-- Ship 3.1b: peer validation for career stories.
-- See docs/2026-04-24-evidence-layer-and-validation-design.md.

-- CreateEnum
CREATE TYPE "StoryValidationStatus" AS ENUM ('PENDING', 'APPROVED', 'EDIT_SUGGESTED', 'DISPUTED', 'INVALIDATED');

-- AlterEnum: NotificationType
ALTER TYPE "NotificationType" ADD VALUE 'STORY_VALIDATION_REQUESTED';
ALTER TYPE "NotificationType" ADD VALUE 'STORY_VALIDATION_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'STORY_VALIDATION_DISPUTED';
ALTER TYPE "NotificationType" ADD VALUE 'STORY_EDIT_SUGGESTED';
ALTER TYPE "NotificationType" ADD VALUE 'STORY_EDIT_ACCEPTED';
ALTER TYPE "NotificationType" ADD VALUE 'STORY_EDIT_REJECTED';
ALTER TYPE "NotificationType" ADD VALUE 'STORY_VALIDATION_INVALIDATED';
ALTER TYPE "NotificationType" ADD VALUE 'STORY_VALIDATION_REMINDER';

-- AlterEnum: EntityType
ALTER TYPE "EntityType" ADD VALUE 'CAREER_STORY';

-- CreateTable: story_validations
CREATE TABLE "story_validations" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "sectionKey" TEXT NOT NULL,
    "validatorId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "status" "StoryValidationStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "groundingActivityIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "story_validations_pkey" PRIMARY KEY ("id")
);

-- CreateTable: story_edit_suggestions
CREATE TABLE "story_edit_suggestions" (
    "id" TEXT NOT NULL,
    "validationId" TEXT NOT NULL,
    "suggestedText" TEXT NOT NULL,
    "authorVerdict" TEXT,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "story_edit_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: uniqueness + lookup indexes on story_validations
CREATE UNIQUE INDEX "story_validations_storyId_sectionKey_validatorId_key" ON "story_validations"("storyId", "sectionKey", "validatorId");
CREATE INDEX "story_validations_validatorId_status_idx" ON "story_validations"("validatorId", "status");
CREATE INDEX "story_validations_storyId_idx" ON "story_validations"("storyId");
CREATE INDEX "story_validations_authorId_idx" ON "story_validations"("authorId");

-- CreateIndex: unique 1:1 sidecar on story_edit_suggestions
CREATE UNIQUE INDEX "story_edit_suggestions_validationId_key" ON "story_edit_suggestions"("validationId");

-- AddForeignKey
ALTER TABLE "story_validations" ADD CONSTRAINT "story_validations_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "career_stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "story_validations" ADD CONSTRAINT "story_validations_validatorId_fkey" FOREIGN KEY ("validatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "story_validations" ADD CONSTRAINT "story_validations_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "story_edit_suggestions" ADD CONSTRAINT "story_edit_suggestions_validationId_fkey" FOREIGN KEY ("validationId") REFERENCES "story_validations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
