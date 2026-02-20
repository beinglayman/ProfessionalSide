-- Rename profileVisibility value from 'network' to 'private'
UPDATE "UserProfile" SET "profileVisibility" = 'private' WHERE "profileVisibility" = 'network';

-- Update the default value
ALTER TABLE "UserProfile" ALTER COLUMN "profileVisibility" SET DEFAULT 'private';
