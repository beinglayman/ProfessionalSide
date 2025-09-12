#!/usr/bin/env node
/**
 * Migration and startup script for Railway deployment
 */

const { execSync } = require('child_process');

async function migrateAndStart() {
  try {
    console.log('🚀 Starting Railway deployment with migrations...');
    
    // Run database migrations
    console.log('📦 Running Prisma migrate deploy...');
    execSync('npx prisma migrate deploy', { 
      stdio: 'inherit',
      env: { ...process.env }
    });
    
    console.log('✅ Database migrations completed successfully!');
    
    // Generate Prisma client
    console.log('🔧 Generating Prisma client...');
    execSync('npx prisma generate', { 
      stdio: 'inherit',
      env: { ...process.env }
    });
    
    console.log('✅ Prisma client generated successfully!');
    
    // Run reference data seeding if needed
    console.log('🌱 Running database seed (reference data)...');
    try {
      execSync('npm run db:seed-reference', { 
        stdio: 'inherit',
        env: { ...process.env }
      });
      console.log('✅ Database seeded successfully!');
    } catch (seedError) {
      console.log('⚠️  Seeding failed, continuing with app startup...');
    }
    
    console.log('🎉 Database setup complete! Starting application...');
    
    // Start the application
    execSync('npx tsx src/app.ts', { 
      stdio: 'inherit',
      env: { ...process.env }
    });
    
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

migrateAndStart();