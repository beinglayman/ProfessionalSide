-- AlterTable
ALTER TABLE "career_stories" ADD COLUMN     "archetype" TEXT,
ADD COLUMN     "category" TEXT,
ADD COLUMN     "journalEntryId" TEXT,
ADD COLUMN     "role" TEXT;

-- CreateIndex
CREATE INDEX "career_stories_journalEntryId_idx" ON "career_stories"("journalEntryId");

-- AddForeignKey
ALTER TABLE "career_stories" ADD CONSTRAINT "career_stories_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
