-- Add network entry fields to JournalEntry table
-- These fields support dual-view entries (workspace vs network)

-- Network content (sanitized/IPR-stripped version for public profile)
ALTER TABLE "journal_entries" ADD COLUMN IF NOT EXISTS "networkContent" TEXT;
ALTER TABLE "journal_entries" ADD COLUMN IF NOT EXISTS "networkTitle" TEXT;
ALTER TABLE "journal_entries" ADD COLUMN IF NOT EXISTS "format7DataNetwork" JSONB;

-- Network generation settings
ALTER TABLE "journal_entries" ADD COLUMN IF NOT EXISTS "generateNetworkEntry" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "journal_entries" ADD COLUMN IF NOT EXISTS "networkGenerated" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "journal_entries" ADD COLUMN IF NOT EXISTS "networkGeneratedAt" TIMESTAMP(3);
ALTER TABLE "journal_entries" ADD COLUMN IF NOT EXISTS "sanitizationLog" JSONB;
