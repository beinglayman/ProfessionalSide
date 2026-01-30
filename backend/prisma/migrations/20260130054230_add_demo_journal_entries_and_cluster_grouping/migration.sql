-- AlterTable
ALTER TABLE "demo_story_clusters" ADD COLUMN     "groupingMethod" TEXT DEFAULT 'auto',
ADD COLUMN     "lastGroupingEditAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "demo_journal_entries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "fullContent" TEXT NOT NULL,
    "activityIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "groupingMethod" TEXT DEFAULT 'time',
    "lastGroupingEditAt" TIMESTAMP(3),
    "timeRangeStart" TIMESTAMP(3),
    "timeRangeEnd" TIMESTAMP(3),
    "generatedAt" TIMESTAMP(3),
    "lastEditedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "demo_journal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "demo_journal_entries_userId_idx" ON "demo_journal_entries"("userId");

-- AddForeignKey
ALTER TABLE "demo_journal_entries" ADD CONSTRAINT "demo_journal_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
