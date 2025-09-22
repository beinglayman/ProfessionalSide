/**
 * EMERGENCY: Production database reset endpoint
 * This endpoint will force reset the production database schema
 * REMOVE AFTER SUCCESSFUL RESET
 */

const { execSync } = require('child_process');
const express = require('express');
const router = express.Router();

router.post('/emergency-db-reset', async (req, res) => {
  try {
    console.log('🚨 EMERGENCY: Starting production database reset...');

    // Execute Prisma DB push with force reset
    console.log('📦 Running Prisma DB push --force-reset...');
    const pushOutput = execSync('npx prisma db push --force-reset --accept-data-loss', {
      encoding: 'utf8',
      env: { ...process.env }
    });

    console.log('✅ Database schema reset completed');

    // Generate Prisma client
    console.log('🔧 Generating Prisma client...');
    const generateOutput = execSync('npx prisma generate', {
      encoding: 'utf8',
      env: { ...process.env }
    });

    console.log('✅ Prisma client generated');

    // Seed reference data
    console.log('🌱 Seeding reference data...');
    let seedOutput = '';
    try {
      seedOutput = execSync('npm run db:seed-reference', {
        encoding: 'utf8',
        env: { ...process.env }
      });
      console.log('✅ Reference data seeded successfully');
    } catch (seedError) {
      console.log('⚠️ Seeding failed but continuing...');
      seedOutput = seedError.message;
    }

    res.json({
      success: true,
      message: 'Production database reset completed successfully',
      outputs: {
        schema_reset: pushOutput,
        client_generation: generateOutput,
        data_seeding: seedOutput
      }
    });

  } catch (error) {
    console.error('❌ Emergency reset failed:', error);
    res.status(500).json({
      success: false,
      error: 'Database reset failed',
      details: error.message
    });
  }
});

module.exports = router;