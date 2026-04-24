-- Ship 4.1: Reminder cron tracking on StoryValidation.
-- Adds a nullable lastReminderAt timestamp so the reminder job can enforce
-- a cooldown window (don't spam the same validator every day), and a
-- status+requestedAt index so the query that finds stale PENDING rows is
-- cheap even when the table grows.

ALTER TABLE "story_validations"
  ADD COLUMN "lastReminderAt" TIMESTAMP(3);

CREATE INDEX "story_validations_status_requestedAt_idx"
  ON "story_validations"("status", "requestedAt");
