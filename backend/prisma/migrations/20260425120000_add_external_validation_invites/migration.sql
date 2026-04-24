-- Ship 4.2 - external validation invites for unknown participants.
-- Author invites someone by email; they receive a magic link that routes
-- them to signup and (post-signup) to the validator view with real
-- StoryValidation rows created at claim-time.

CREATE TABLE "external_validation_invites" (
  "id"              TEXT NOT NULL,
  "token"           TEXT NOT NULL,
  "email"           TEXT NOT NULL,
  "storyId"         TEXT NOT NULL,
  "inviterId"       TEXT NOT NULL,
  "sectionKeys"     TEXT[] DEFAULT ARRAY[]::TEXT[],
  "message"         TEXT,
  "status"          TEXT NOT NULL DEFAULT 'pending',
  "expiresAt"       TIMESTAMP(3) NOT NULL,
  "claimedAt"       TIMESTAMP(3),
  "claimedByUserId" TEXT,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL,

  CONSTRAINT "external_validation_invites_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "external_validation_invites_token_key" ON "external_validation_invites"("token");
CREATE INDEX "external_validation_invites_storyId_email_idx" ON "external_validation_invites"("storyId", "email");
CREATE INDEX "external_validation_invites_email_status_idx" ON "external_validation_invites"("email", "status");
CREATE INDEX "external_validation_invites_inviterId_idx" ON "external_validation_invites"("inviterId");

ALTER TABLE "external_validation_invites"
  ADD CONSTRAINT "external_validation_invites_storyId_fkey"
  FOREIGN KEY ("storyId") REFERENCES "career_stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "external_validation_invites"
  ADD CONSTRAINT "external_validation_invites_inviterId_fkey"
  FOREIGN KEY ("inviterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "external_validation_invites"
  ADD CONSTRAINT "external_validation_invites_claimedByUserId_fkey"
  FOREIGN KEY ("claimedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
