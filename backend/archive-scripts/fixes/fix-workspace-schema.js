const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixWorkspaceSchema() {
  try {
    console.log('🔧 Applying missing workspace columns migration to production database...');
    
    // Run the migration SQL directly
    await prisma.$executeRaw`
      DO $$
      BEGIN
          -- Add isPersonal column to workspaces if it doesn't exist
          IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'workspaces') THEN
              IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'workspaces' AND column_name = 'isPersonal') THEN
                  ALTER TABLE "workspaces" ADD COLUMN "isPersonal" BOOLEAN NOT NULL DEFAULT false;
                  RAISE NOTICE 'Added isPersonal column to workspaces table';
              ELSE
                  RAISE NOTICE 'isPersonal column already exists in workspaces table';
              END IF;
              
              -- Add allowTeamMembers column to workspaces if it doesn't exist
              IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'workspaces' AND column_name = 'allowTeamMembers') THEN
                  ALTER TABLE "workspaces" ADD COLUMN "allowTeamMembers" BOOLEAN NOT NULL DEFAULT true;
                  RAISE NOTICE 'Added allowTeamMembers column to workspaces table';
              ELSE
                  RAISE NOTICE 'allowTeamMembers column already exists in workspaces table';
              END IF;
          ELSE
              RAISE NOTICE 'workspaces table does not exist';
          END IF;
      END $$;
    `;
    
    console.log('✅ Migration completed successfully!');
    
    // Test the workspace query to confirm the fix
    console.log('🧪 Testing workspace query...');
    const workspaces = await prisma.workspace.findMany({
      take: 1,
      select: {
        id: true,
        name: true,
        isPersonal: true,
        allowTeamMembers: true
      }
    });
    console.log('✅ Workspace query test successful!');
    console.log('Sample workspace:', workspaces[0] || 'No workspaces found');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
fixWorkspaceSchema().catch(console.error);