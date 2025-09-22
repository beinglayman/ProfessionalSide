-- Fix SystemSettings table structure to match Prisma schema
-- Drop the existing incorrect table
DROP TABLE IF EXISTS "SystemSettings";

-- Create the correct table structure
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "invitationOnlyMode" BOOLEAN NOT NULL DEFAULT false,
    "lastUpdatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraint
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_lastUpdatedBy_fkey"
    FOREIGN KEY ("lastUpdatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Insert default settings
INSERT INTO "system_settings" ("id", "invitationOnlyMode", "lastUpdatedBy", "updatedAt", "createdAt")
VALUES ('singleton', false, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;