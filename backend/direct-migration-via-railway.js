const fs = require('fs');
const path = require('path');

async function executeMigrationSQL() {
  try {
    console.log('🚀 Reading migration SQL file...');
    
    const sqlFile = path.join(__dirname, 'migration.sql');
    if (!fs.existsSync(sqlFile)) {
      console.error('❌ Migration SQL file not found');
      process.exit(1);
    }

    const sqlContent = fs.readFileSync(sqlFile, 'utf8');
    console.log(`📄 SQL file loaded: ${sqlContent.length} characters`);

    // Count the number of INSERT statements by counting the number of IDs
    const idMatches = sqlContent.match(/'cmf[a-z0-9]+'/g);
    const recordCount = idMatches ? idMatches.length : 0;
    console.log(`📊 Records to insert: ${recordCount}`);

    // Split into smaller chunks for processing
    const lines = sqlContent.split('\n');
    const insertStatement = lines[0]; // INSERT INTO "SkillBenchmark" (...)
    const values = lines.slice(1).join('\n'); // All the VALUES

    console.log('✅ Migration SQL ready for execution via Railway');
    console.log('\n🔧 To execute manually in Railway console:');
    console.log('1. railway run -- node -e "console.log(process.env.DATABASE_URL)"');
    console.log('2. Copy the database URL');  
    console.log('3. Use a PostgreSQL client to execute the migration.sql file');
    console.log('\n📋 Or paste this into Railway database console:');
    console.log(sqlContent.substring(0, 500) + '...');

  } catch (error) {
    console.error('💥 Error:', error);
  }
}

executeMigrationSQL();