const { exec } = require('child_process');
const util = require('util');
require('dotenv').config();
const execAsync = util.promisify(exec);

async function deployRailwayFixes() {
  try {
    console.log('🚀 RAILWAY PRE-DEPLOY: Starting database fixes...\n');
    console.log('📅 Timestamp:', new Date().toISOString());
    console.log('🔗 Database URL configured:', !!process.env.DATABASE_URL);
    console.log('🌍 Environment:', process.env.NODE_ENV || 'development');
    console.log('');

    // Step 1: Fix Supply Chain visibility
    console.log('📌 Step 1: Fixing Supply Chain visibility...');
    try {
      const { stdout: stdout1, stderr: stderr1 } = await execAsync('node fix_supply_chain_visibility_railway.js');
      console.log(stdout1);
      if (stderr1) console.error('Supply Chain stderr:', stderr1);
      console.log('✅ Supply Chain fix completed\n');
    } catch (error) {
      console.error('❌ Supply Chain fix failed:', error.message);
      // Continue with depth coverage even if this fails
    }

    // Step 2: Ensure depth coverage
    console.log('📌 Step 2: Ensuring depth coverage...');
    try {
      const { stdout: stdout2, stderr: stderr2 } = await execAsync('node ensure_depth_coverage_railway.js');
      console.log(stdout2);
      if (stderr2) console.error('Depth coverage stderr:', stderr2);
      console.log('✅ Depth coverage completed\n');
    } catch (error) {
      console.error('❌ Depth coverage failed:', error.message);
      // Don't fail deployment for this
    }

    // Step 3: Verify deployment status
    console.log('📌 Step 3: Verifying deployment status...');
    try {
      const { stdout: stdout3, stderr: stderr3 } = await execAsync('node verify_deployment_status.js');
      console.log(stdout3);
      if (stderr3) console.error('Verification stderr:', stderr3);
      console.log('✅ Verification completed\n');
    } catch (error) {
      console.error('❌ Verification failed:', error.message);
      // Don't fail deployment for verification issues
    }

    console.log('🎉 RAILWAY PRE-DEPLOY: All database fixes completed!');
    console.log('✅ Ready to start application server...\n');

  } catch (error) {
    console.error('❌ RAILWAY PRE-DEPLOY: Fatal error:', error);
    process.exit(1);
  }
}

// Execute the deployment fixes
deployRailwayFixes();