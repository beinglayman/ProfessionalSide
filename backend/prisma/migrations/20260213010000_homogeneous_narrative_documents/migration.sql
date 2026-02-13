-- Add sections JSON to story_derivations (nullable for backward compat)
ALTER TABLE "story_derivations" ADD COLUMN "sections" JSONB;

-- Make story_sources polymorphic: storyId nullable, add derivationId
ALTER TABLE "story_sources" ADD COLUMN "derivationId" TEXT;
ALTER TABLE "story_sources" ALTER COLUMN "storyId" DROP NOT NULL;

-- Indexes for derivation sources
CREATE INDEX "story_sources_derivationId_idx" ON "story_sources"("derivationId");
CREATE INDEX "story_sources_derivationId_sectionKey_idx" ON "story_sources"("derivationId", "sectionKey");

-- Foreign key to story_derivations
ALTER TABLE "story_sources" ADD CONSTRAINT "story_sources_derivationId_fkey"
  FOREIGN KEY ("derivationId") REFERENCES "story_derivations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- XOR check constraint: exactly one of storyId/derivationId must be non-null
ALTER TABLE "story_sources" ADD CONSTRAINT "story_sources_owner_check"
  CHECK (
    ("storyId" IS NOT NULL AND "derivationId" IS NULL) OR
    ("storyId" IS NULL AND "derivationId" IS NOT NULL)
  );
