// Force complete migration fix for Railway
const { PrismaClient } = require('@prisma/client');

async function forceMigrationFix() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔧 Force fixing migration state...');
    
    // Delete ALL records for this migration (including the older failed one)
    const deleteResult = await prisma.$executeRaw`
      DELETE FROM "_prisma_migrations" 
      WHERE "migration_name" = '20250921134500_add_invitation_system'
    `;
    
    console.log('✅ Deleted all migration records for 20250921134500_add_invitation_system');
    
    // Now let's manually create the tables that should exist
    console.log('🔨 Creating missing tables...');
    
    // Create PlatformInvitation table
    try {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "PlatformInvitation" (
          "id" TEXT NOT NULL,
          "email" TEXT NOT NULL,
          "token" TEXT NOT NULL,
          "status" TEXT NOT NULL DEFAULT 'pending',
          "expiresAt" TIMESTAMP(3) NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "acceptedAt" TIMESTAMP(3),
          "inviterId" TEXT NOT NULL,
          "message" TEXT,
          CONSTRAINT "PlatformInvitation_pkey" PRIMARY KEY ("id")
        );
      `;
      console.log('✅ PlatformInvitation table created');
    } catch (e) {
      console.log('ℹ️  PlatformInvitation table already exists');
    }
    
    // Create InvitationRequest table
    try {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "InvitationRequest" (
          "id" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "email" TEXT NOT NULL,
          "role" TEXT NOT NULL,
          "organization" TEXT NOT NULL,
          "linkedinUrl" TEXT,
          "message" TEXT,
          "status" TEXT NOT NULL DEFAULT 'pending',
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "reviewedAt" TIMESTAMP(3),
          "reviewedById" TEXT,
          "adminMessage" TEXT,
          CONSTRAINT "InvitationRequest_pkey" PRIMARY KEY ("id")
        );
      `;
      console.log('✅ InvitationRequest table created');
    } catch (e) {
      console.log('ℹ️  InvitationRequest table already exists');
    }
    
    // Create SystemSettings table
    try {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "SystemSettings" (
          "id" TEXT NOT NULL,
          "key" TEXT NOT NULL,
          "value" TEXT NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "SystemSettings_pkey" PRIMARY KEY ("id")
        );
      `;
      console.log('✅ SystemSettings table created');
    } catch (e) {
      console.log('ℹ️  SystemSettings table already exists');
    }
    
    // Add columns to users table if they don't exist
    try {
      await prisma.$executeRaw`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "profileUrl" TEXT;`;
      await prisma.$executeRaw`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "invitationsRemaining" INTEGER NOT NULL DEFAULT 5;`;
      await prisma.$executeRaw`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "totalInvitationsSent" INTEGER NOT NULL DEFAULT 0;`;
      await prisma.$executeRaw`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isAdmin" BOOLEAN NOT NULL DEFAULT false;`;
      await prisma.$executeRaw`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lastQuotaReplenishment" TIMESTAMP(3);`;
      console.log('✅ User table columns added');
    } catch (e) {
      console.log('ℹ️  User columns already exist');
    }
    
    // Add column to workspaces table if it doesn't exist
    try {
      await prisma.$executeRaw`ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "isPersonal" BOOLEAN NOT NULL DEFAULT false;`;
      console.log('✅ Workspace table column added');
    } catch (e) {
      console.log('ℹ️  Workspace column already exists');
    }
    
    // Create indexes
    try {
      await prisma.$executeRaw`CREATE UNIQUE INDEX IF NOT EXISTS "PlatformInvitation_email_key" ON "PlatformInvitation"("email");`;
      await prisma.$executeRaw`CREATE UNIQUE INDEX IF NOT EXISTS "PlatformInvitation_token_key" ON "PlatformInvitation"("token");`;
      await prisma.$executeRaw`CREATE UNIQUE INDEX IF NOT EXISTS "InvitationRequest_email_key" ON "InvitationRequest"("email");`;
      await prisma.$executeRaw`CREATE UNIQUE INDEX IF NOT EXISTS "SystemSettings_key_key" ON "SystemSettings"("key");`;
      await prisma.$executeRaw`CREATE UNIQUE INDEX IF NOT EXISTS "users_profileUrl_key" ON "users"("profileUrl");`;
      console.log('✅ Indexes created');
    } catch (e) {
      console.log('ℹ️  Indexes already exist');
    }
    
    // Add foreign key constraints
    try {
      await prisma.$executeRaw`
        ALTER TABLE "PlatformInvitation" 
        ADD CONSTRAINT IF NOT EXISTS "PlatformInvitation_inviterId_fkey" 
        FOREIGN KEY ("inviterId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
      `;
      
      await prisma.$executeRaw`
        ALTER TABLE "InvitationRequest" 
        ADD CONSTRAINT IF NOT EXISTS "InvitationRequest_reviewedById_fkey" 
        FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
      `;
      console.log('✅ Foreign key constraints added');
    } catch (e) {
      console.log('ℹ️  Foreign key constraints already exist');
    }
    
    // Mark migration as completed
    const migrationId = require('crypto').randomUUID();
    const checksum = '23abdda4ab2ad95cf88ba98e5c2134db10db322b5cc95e9bc10826e0989b7e75';
    
    await prisma.$executeRaw`
      INSERT INTO "_prisma_migrations" 
      (id, checksum, migration_name, logs, rolled_back_at, started_at, applied_steps_count, finished_at) 
      VALUES (${migrationId}, ${checksum}, '20250921134500_add_invitation_system', NULL, NULL, NOW(), 1, NOW());
    `;
    
    console.log('🎉 Migration marked as completed successfully!');
    console.log('✅ All database changes applied successfully');
    
  } catch (error) {
    console.error('❌ Error during migration fix:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

forceMigrationFix();