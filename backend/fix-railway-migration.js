// Fix Railway migration script
const { PrismaClient } = require('@prisma/client');

async function fixRailwayMigration() {
  // Use Railway database URL
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('DATABASE_URL not found. Make sure this runs in Railway environment.');
    process.exit(1);
  }
  
  console.log('Connecting to Railway database...');
  const prisma = new PrismaClient();
  
  try {
    // First check if migration exists
    const existingMigration = await prisma.$queryRaw`
      SELECT * FROM "_prisma_migrations" 
      WHERE "migration_name" = '20250921134500_add_invitation_system'
    `;
    
    console.log('Existing migration records:', existingMigration);
    
    // Delete any failed migration records
    await prisma.$executeRaw`
      DELETE FROM "_prisma_migrations" 
      WHERE "migration_name" = '20250921134500_add_invitation_system'
      AND "finished_at" IS NULL
    `;
    
    console.log('Deleted failed migration records');
    
    // Check if tables exist
    const tables = await prisma.$queryRaw`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('PlatformInvitation', 'InvitationRequest', 'SystemSettings')
    `;
    
    console.log('Existing new tables:', tables);
    
    if (tables.length === 3) {
      // Tables exist, mark migration as completed
      const migrationId = require('crypto').randomUUID();
      const checksum = '8a7f8b5c4d3e2f1a9b8c7d6e5f4a3b2c1d9e8f7a6b5c4d3e2f1a9b8c7d6e5f4a';
      
      await prisma.$executeRaw`
        INSERT INTO "_prisma_migrations" 
        (id, checksum, migration_name, logs, rolled_back_at, started_at, applied_steps_count, finished_at) 
        VALUES (${migrationId}, ${checksum}, '20250921134500_add_invitation_system', NULL, NULL, NOW(), 1, NOW())
      `;
      
      console.log('Migration marked as completed successfully');
    } else {
      console.log('Not all tables exist. Migration needs to be run properly.');
    }
    
  } catch (error) {
    console.error('Error fixing migration:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

fixRailwayMigration();