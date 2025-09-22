// Reset failed migration script for Railway deployment
const { PrismaClient } = require('@prisma/client');

async function resetFailedMigration() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Resetting failed migration state...');
    
    // Delete the failed migration record
    await prisma.$executeRaw`
      DELETE FROM "_prisma_migrations" 
      WHERE "migration_name" = '20250921134500_add_invitation_system'
    `;
    
    console.log('Migration state reset successfully');
    
    // Now deploy migrations
    console.log('Deploying migrations...');
    const { spawn } = require('child_process');
    
    const migrate = spawn('npx', ['prisma', 'migrate', 'deploy'], {
      stdio: 'inherit'
    });
    
    migrate.on('close', (code) => {
      console.log(`Migration deployment finished with code ${code}`);
      process.exit(code);
    });
    
  } catch (error) {
    console.error('Error resetting migration:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

resetFailedMigration();