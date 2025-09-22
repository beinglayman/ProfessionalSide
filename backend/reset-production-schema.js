#!/usr/bin/env node
/**
 * Production database schema reset script
 * This will completely reset the production database schema to match Prisma
 */

const { execSync } = require('child_process');

async function resetProductionSchema() {
  try {
    console.log('🔧 Starting production database schema reset...');
    console.log('⚠️  This will DELETE ALL DATA and recreate the schema');

    // Execute Prisma DB push with force reset
    console.log('📦 Running Prisma DB push --force-reset...');
    execSync('npx prisma db push --force-reset --accept-data-loss', {
      stdio: 'inherit',
      env: { ...process.env }
    });

    console.log('✅ Production database schema reset completed!');

    // Seed essential reference data
    console.log('🌱 Seeding essential reference data...');
    try {
      execSync('npm run db:seed-reference', {
        stdio: 'inherit',
        env: { ...process.env }
      });
      console.log('✅ Reference data seeded successfully!');
    } catch (seedError) {
      console.log('⚠️  Reference data seeding failed, but schema reset completed');
      console.log('Error:', seedError.message);
    }

    console.log('🎉 Production database reset and seeding complete!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Production schema reset failed:', error.message);
    process.exit(1);
  }
}

resetProductionSchema();