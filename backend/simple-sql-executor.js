const fs = require('fs');
const { Pool } = require('pg');

async function executeSQLFile() {
  let pool;
  
  try {
    console.log('🚀 Connecting to production database...');
    
    // Use Railway's DATABASE_URL
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      console.error('❌ DATABASE_URL not found');
      return;
    }

    // Create connection pool
    pool = new Pool({
      connectionString: databaseUrl,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    // Read the SQL file
    const sqlContent = fs.readFileSync('migration.sql', 'utf8');
    console.log(`📄 Read SQL file: ${sqlContent.length} characters`);

    // Execute the SQL
    console.log('⚡ Executing SQL...');
    const result = await pool.query(sqlContent);
    
    console.log('✅ SQL executed successfully!');
    console.log(`📊 Rows affected: ${result.rowCount || 'Unknown'}`);

    // Verify the import
    const countResult = await pool.query('SELECT COUNT(*) as count FROM "SkillBenchmark"');
    console.log(`🔍 Total benchmarks in database: ${countResult.rows[0].count}`);

    // Sample verification
    const sampleResult = await pool.query('SELECT "skillName", "industryAverage", "marketDemand" FROM "SkillBenchmark" ORDER BY "skillName" LIMIT 3');
    console.log('\n🔍 Sample records:');
    sampleResult.rows.forEach((row, index) => {
      console.log(`  ${index + 1}. ${row.skillName}: ${row.industryAverage}/100 (${row.marketDemand} demand)`);
    });

  } catch (error) {
    console.error('💥 Error executing SQL:', error.message);
    if (error.code) {
      console.error(`   Code: ${error.code}`);
    }
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

executeSQLFile();