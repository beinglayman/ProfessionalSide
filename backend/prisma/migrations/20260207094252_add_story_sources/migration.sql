-- AlterTable
ALTER TABLE "career_stories" ADD COLUMN     "lastGenerationPrompt" TEXT,
ADD COLUMN     "wizardAnswers" JSONB;

-- CreateTable
CREATE TABLE "story_sources" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "sectionKey" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "activityId" TEXT,
    "label" TEXT NOT NULL,
    "content" TEXT,
    "url" TEXT,
    "annotation" TEXT,
    "toolType" TEXT,
    "role" TEXT,
    "questionId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "excludedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "story_sources_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "story_sources_storyId_idx" ON "story_sources"("storyId");

-- CreateIndex
CREATE INDEX "story_sources_storyId_sectionKey_idx" ON "story_sources"("storyId", "sectionKey");

-- CreateIndex
CREATE INDEX "story_sources_activityId_idx" ON "story_sources"("activityId");

-- AddForeignKey
ALTER TABLE "story_sources" ADD CONSTRAINT "story_sources_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "tool_activities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_sources" ADD CONSTRAINT "story_sources_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "career_stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
