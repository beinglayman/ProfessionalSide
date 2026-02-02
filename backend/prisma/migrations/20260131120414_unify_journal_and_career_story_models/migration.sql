/*
  Warnings:

  - You are about to drop the column `clusterId` on the `career_stories` table. All the data in the column will be lost.
  - Added the required column `userId` to the `career_stories` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "career_stories" DROP CONSTRAINT "career_stories_clusterId_fkey";

-- DropIndex
DROP INDEX "career_stories_clusterId_key";

-- AlterTable
ALTER TABLE "career_stories" DROP COLUMN "clusterId",
ADD COLUMN     "activityIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "generatedAt" TIMESTAMP(3),
ADD COLUMN     "needsRegeneration" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sourceMode" TEXT NOT NULL DEFAULT 'production',
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "journal_entries" ADD COLUMN     "clusterRef" TEXT,
ADD COLUMN     "sourceMode" TEXT NOT NULL DEFAULT 'production';

-- CreateIndex
CREATE INDEX "career_stories_userId_idx" ON "career_stories"("userId");

-- CreateIndex
CREATE INDEX "career_stories_userId_sourceMode_idx" ON "career_stories"("userId", "sourceMode");

-- CreateIndex
CREATE INDEX "journal_entries_authorId_sourceMode_idx" ON "journal_entries"("authorId", "sourceMode");

-- CreateIndex
CREATE INDEX "journal_entries_sourceMode_idx" ON "journal_entries"("sourceMode");

-- AddForeignKey
ALTER TABLE "career_stories" ADD CONSTRAINT "career_stories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
