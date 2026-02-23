-- Rename profileVisibility value from 'network' to 'private'
UPDATE "user_profiles" SET "profileVisibility" = 'private' WHERE "profileVisibility" = 'network';

-- Update the default value
ALTER TABLE "user_profiles" ALTER COLUMN "profileVisibility" SET DEFAULT 'private';
