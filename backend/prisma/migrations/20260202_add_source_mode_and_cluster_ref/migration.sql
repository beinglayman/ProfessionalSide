-- AlterTable: Add sourceMode and clusterRef to JournalEntry
-- This fixes the schema/code mismatch that was causing build failures

-- Add sourceMode column with default 'production'
ALTER TABLE "journal_entries" ADD COLUMN IF NOT EXISTS "sourceMode" TEXT NOT NULL DEFAULT 'production';

-- Add clusterRef column (nullable)
ALTER TABLE "journal_entries" ADD COLUMN IF NOT EXISTS "clusterRef" TEXT;

-- Create index for sourceMode queries
CREATE INDEX IF NOT EXISTS "journal_entries_sourceMode_idx" ON "journal_entries"("sourceMode");
