-- Essential missing schema additions for production compatibility
-- This migration adds only the critical missing pieces that are causing errors

-- Add status column to goals table (if it exists)
-- This may fail if goals table doesn't exist, which is fine
DO $$
BEGIN
    -- Add status column to goals if table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'goals') THEN
        -- Check if status column doesn't already exist
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'goals' AND column_name = 'status') THEN
            ALTER TABLE "goals" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'yet-to-start';
        END IF;
    END IF;
END $$;

-- Create organizations table if it doesn't exist
CREATE TABLE IF NOT EXISTS "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT,
    "logo" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- Create unique index on organizations domain if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_indexes 
        WHERE tablename = 'organizations' AND indexname = 'organizations_domain_key'
    ) THEN
        CREATE UNIQUE INDEX "organizations_domain_key" ON "organizations"("domain");
    END IF;
END $$;

-- Create workspace_members table if it doesn't exist
CREATE TABLE IF NOT EXISTS "workspace_members" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "permissions" JSONB,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "workspace_members_pkey" PRIMARY KEY ("id")
);

-- Create unique index on workspace_members if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_indexes 
        WHERE tablename = 'workspace_members' AND indexname = 'workspace_members_userId_workspaceId_key'
    ) THEN
        CREATE UNIQUE INDEX "workspace_members_userId_workspaceId_key" ON "workspace_members"("userId", "workspaceId");
    END IF;
END $$;

-- Add foreign key constraints if tables exist and constraints don't exist
DO $$
BEGIN
    -- Add organizationId foreign key to workspaces if both tables exist
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'workspaces') 
       AND EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'organizations') THEN
        -- Check if foreign key doesn't already exist
        IF NOT EXISTS (
            SELECT FROM information_schema.table_constraints 
            WHERE table_name = 'workspaces' AND constraint_name = 'workspaces_organizationId_fkey'
        ) THEN
            ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_organizationId_fkey" 
                FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
    END IF;

    -- Add foreign key constraints for workspace_members if tables exist
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'workspace_members') 
       AND EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users') 
       AND EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'workspaces') THEN
        
        -- Add userId foreign key
        IF NOT EXISTS (
            SELECT FROM information_schema.table_constraints 
            WHERE table_name = 'workspace_members' AND constraint_name = 'workspace_members_userId_fkey'
        ) THEN
            ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_userId_fkey" 
                FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
        
        -- Add workspaceId foreign key
        IF NOT EXISTS (
            SELECT FROM information_schema.table_constraints 
            WHERE table_name = 'workspace_members' AND constraint_name = 'workspace_members_workspaceId_fkey'
        ) THEN
            ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspaceId_fkey" 
                FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
    END IF;
END $$;

-- Add missing columns to users table if they don't exist
DO $$
BEGIN
    -- Add hasSeenOnboardingOverlay column if it doesn't exist
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users') THEN
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'hasSeenOnboardingOverlay') THEN
            ALTER TABLE "users" ADD COLUMN "hasSeenOnboardingOverlay" BOOLEAN NOT NULL DEFAULT false;
        END IF;
        
        -- Add onboardingSkipped column if it doesn't exist
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'onboardingSkipped') THEN
            ALTER TABLE "users" ADD COLUMN "onboardingSkipped" BOOLEAN NOT NULL DEFAULT false;
        END IF;
    END IF;
END $$;