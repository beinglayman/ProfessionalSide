const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function directMigrationToProduction() {
  let pool;
  
  try {
    console.log('🚀 Starting direct migration to Railway production database...\n');

    // Use Railway's DATABASE_URL from environment
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      console.error('❌ DATABASE_URL environment variable not found');
      console.log('   Make sure this script is running via: railway run node railway-direct-migration.js');
      return;
    }

    console.log('🔌 Connecting to production database...');
    pool = new Pool({
      connectionString: databaseUrl,
      ssl: {
        rejectUnauthorized: false
      }
    });

    // Test connection
    const client = await pool.connect();
    console.log('✅ Connected to production database');

    // Check current benchmark count
    const currentCountResult = await client.query('SELECT COUNT(*) FROM "SkillBenchmark"');
    const currentCount = parseInt(currentCountResult.rows[0].count);
    console.log(`📊 Current benchmarks in production: ${currentCount}`);

    // Read JSON export data
    const exportFile = path.join(__dirname, 'skill-benchmarks-export.json');
    if (!fs.existsSync(exportFile)) {
      console.error('❌ Export file not found:', exportFile);
      client.release();
      return;
    }

    const benchmarks = JSON.parse(fs.readFileSync(exportFile, 'utf8'));
    console.log(`📄 Loaded ${benchmarks.length} benchmarks from export`);

    // Process in batches for production safety
    const batchSize = 50;
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    console.log(`\n📦 Processing ${Math.ceil(benchmarks.length / batchSize)} batches...`);

    for (let i = 0; i < benchmarks.length; i += batchSize) {
      const batch = benchmarks.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(benchmarks.length / batchSize);
      
      console.log(`\n📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} records)`);

      try {
        // Use transaction for batch integrity
        await client.query('BEGIN');

        for (const benchmark of batch) {
          try {
            const query = `
              INSERT INTO "SkillBenchmark" (
                id, "skillName", industry, role, "industryAverage", 
                "juniorLevel", "midLevel", "seniorLevel", "expertLevel",
                "marketDemand", "growthTrend", description, "createdAt", "updatedAt"
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
              ON CONFLICT (id) DO UPDATE SET
                "skillName" = EXCLUDED."skillName",
                industry = EXCLUDED.industry,
                role = EXCLUDED.role,
                "industryAverage" = EXCLUDED."industryAverage",
                "juniorLevel" = EXCLUDED."juniorLevel",
                "midLevel" = EXCLUDED."midLevel",
                "seniorLevel" = EXCLUDED."seniorLevel",
                "expertLevel" = EXCLUDED."expertLevel",
                "marketDemand" = EXCLUDED."marketDemand",
                "growthTrend" = EXCLUDED."growthTrend",
                description = EXCLUDED.description,
                "updatedAt" = NOW()
            `;

            const values = [
              benchmark.id,
              benchmark.skillName,
              benchmark.industry,
              benchmark.role,
              benchmark.industryAverage,
              benchmark.juniorLevel,
              benchmark.midLevel,
              benchmark.seniorLevel,
              benchmark.expertLevel,
              benchmark.marketDemand,
              benchmark.growthTrend,
              benchmark.description,
              benchmark.createdAt ? new Date(benchmark.createdAt) : new Date(),
              benchmark.updatedAt ? new Date(benchmark.updatedAt) : new Date()
            ];

            await client.query(query, values);
            successCount++;
            process.stdout.write('✅');

          } catch (error) {
            errorCount++;
            errors.push({
              skillName: benchmark.skillName,
              error: error.message
            });
            process.stdout.write('❌');
          }
        }

        await client.query('COMMIT');
        
      } catch (batchError) {
        await client.query('ROLLBACK');
        console.log(`\n❌ Batch ${batchNum} failed:`, batchError.message);
        errorCount += batch.length;
      }

      // Small delay between batches
      if (i + batchSize < benchmarks.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Final verification
    const finalCountResult = await client.query('SELECT COUNT(*) FROM "SkillBenchmark"');
    const finalCount = parseInt(finalCountResult.rows[0].count);

    console.log(`\n\n🎉 Migration completed!`);
    console.log(`📊 Results:`);
    console.log(`   - Records processed: ${benchmarks.length}`);
    console.log(`   - Successfully migrated: ${successCount}`);
    console.log(`   - Errors: ${errorCount}`);
    console.log(`   - Initial count: ${currentCount}`);
    console.log(`   - Final count: ${finalCount}`);
    console.log(`   - Net increase: ${finalCount - currentCount}`);
    console.log(`   - Success rate: ${Math.round((successCount / benchmarks.length) * 100)}%`);

    if (errors.length > 0 && errors.length <= 5) {
      console.log(`\n❌ Sample errors:`);
      errors.slice(0, 5).forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.skillName}: ${error.error.substring(0, 80)}...`);
      });
    }

    // Sample verification
    console.log(`\n🔍 Sample migrated records:`);
    const sampleResult = await client.query(
      'SELECT "skillName", "industryAverage", "marketDemand", "growthTrend" FROM "SkillBenchmark" ORDER BY "skillName" LIMIT 3'
    );

    sampleResult.rows.forEach((record, index) => {
      console.log(`   ${index + 1}. ${record.skillName}: ${record.industryAverage}/100 (${record.marketDemand} demand, ${record.growthTrend} trend)`);
    });

    client.release();

  } catch (error) {
    console.error('💥 Critical migration error:', error);
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

if (require.main === module) {
  directMigrationToProduction();
}

module.exports = { directMigrationToProduction };