#!/usr/bin/env node
/**
 * TEMPORARY Railway startup script for ONE-TIME production database reset
 * This will completely reset the production database schema and seed reference data
 * After successful deployment, this should be reverted to migrate-and-start.js
 */

const { execSync } = require('child_process');

async function resetAndStart() {
  try {
    console.log('🔧 PRODUCTION DATABASE RESET - ONE TIME ONLY');
    console.log('⚠️  This will DELETE ALL DATA and recreate the schema in production');

    // Execute Prisma DB push with force reset on production database
    console.log('📦 Running Prisma DB push --force-reset on production...');
    execSync('npx prisma db push --force-reset --accept-data-loss', {
      stdio: 'inherit',
      env: { ...process.env }
    });

    console.log('✅ Production database schema reset completed!');

    // Generate Prisma client to match new schema
    console.log('🔧 Generating Prisma client...');
    execSync('npx prisma generate', {
      stdio: 'inherit',
      env: { ...process.env }
    });

    console.log('✅ Prisma client generated successfully!');

    // Seed essential reference data
    console.log('🌱 Seeding reference data in production...');
    try {
      execSync('npm run db:seed-reference', {
        stdio: 'inherit',
        env: { ...process.env }
      });
      console.log('✅ Reference data seeded successfully!');
    } catch (seedError) {
      console.log('⚠️  Reference data seeding failed, but continuing...');
      console.log('Seed Error:', seedError.message);
    }

    console.log('🎉 Production database reset and seeding complete!');
    console.log('🚀 Starting application...');

    // Start the application
    execSync('npx tsx src/app.ts', {
      stdio: 'inherit',
      env: { ...process.env }
    });

  } catch (error) {
    console.error('❌ Production reset failed:', error.message);
    process.exit(1);
  }
}

resetAndStart();