-- AlterTable
ALTER TABLE "story_annotations" ADD COLUMN     "derivationId" TEXT,
ALTER COLUMN "storyId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "story_annotations_derivationId_idx" ON "story_annotations"("derivationId");

-- AddForeignKey
ALTER TABLE "story_annotations" ADD CONSTRAINT "story_annotations_derivationId_fkey" FOREIGN KEY ("derivationId") REFERENCES "story_derivations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Check constraint: exactly one of storyId/derivationId must be non-null
ALTER TABLE "story_annotations" ADD CONSTRAINT "story_annotations_owner_check"
  CHECK (
    ("storyId" IS NOT NULL AND "derivationId" IS NULL) OR
    ("storyId" IS NULL AND "derivationId" IS NOT NULL)
  );
