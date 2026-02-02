-- AlterTable
ALTER TABLE "career_stories" ADD COLUMN     "framework" TEXT NOT NULL DEFAULT 'STAR',
ADD COLUMN     "isPublished" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "visibility" TEXT NOT NULL DEFAULT 'private';

-- CreateIndex
CREATE INDEX "career_stories_isPublished_idx" ON "career_stories"("isPublished");

-- CreateIndex
CREATE INDEX "career_stories_visibility_idx" ON "career_stories"("visibility");

-- CreateIndex
CREATE INDEX "career_stories_isPublished_visibility_idx" ON "career_stories"("isPublished", "visibility");
