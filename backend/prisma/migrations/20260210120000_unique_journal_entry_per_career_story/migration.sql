-- Enforce 1:1 relationship: each journal entry can only be promoted to one career story.
-- Partial unique index: multiple NULLs are allowed (stories without a journal entry source),
-- but only one non-null value per journalEntryId.
CREATE UNIQUE INDEX "career_stories_journal_entry_unique" ON "career_stories" ("journalEntryId") WHERE "journalEntryId" IS NOT NULL;
