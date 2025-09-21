#!/usr/bin/env node
/**
 * Run database migrations in Railway environment
 */

import { execSync } from 'child_process';
import { chdir } from 'process';

async function runMigrations() {
  try {
    console.log('🚀 Starting database migration...');
    
    // Change to backend directory and run migrations
    chdir('./backend');
    
    // Run Prisma migration
    console.log('📦 Running Prisma migrate deploy...');
    execSync('npx prisma migrate deploy', { 
      stdio: 'inherit',
      env: { ...process.env }
    });
    
    console.log('✅ Database migration completed successfully!');
    
    // Also generate Prisma client
    console.log('🔧 Generating Prisma client...');
    execSync('npx prisma generate', { 
      stdio: 'inherit',
      env: { ...process.env }
    });
    
    console.log('✅ Prisma client generated successfully!');
    
    // Run database seed if available
    console.log('🌱 Running database seed...');
    try {
      execSync('npm run db:seed', { 
        stdio: 'inherit',
        env: { ...process.env }
      });
      console.log('✅ Database seeded successfully!');
    } catch (seedError) {
      console.log('⚠️  Seed script not found or failed, continuing...');
    }
    
    console.log('🎉 All database setup complete!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigrations();