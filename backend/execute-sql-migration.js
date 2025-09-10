const fs = require('fs');
const path = require('path');

async function executeSqlMigration() {
  try {
    console.log('🚀 Preparing SQL migration for Railway execution...\n');

    // Read the SQL file
    const sqlFile = path.join(__dirname, 'skill-benchmarks-export.sql');
    if (!fs.existsSync(sqlFile)) {
      console.error('❌ SQL export file not found:', sqlFile);
      return;
    }

    const sqlContent = fs.readFileSync(sqlFile, 'utf8');
    
    // Extract just the INSERT statement (skip comments)
    const lines = sqlContent.split('\n');
    const insertLines = lines.filter(line => 
      line.startsWith('INSERT INTO') || 
      line.startsWith('  (') || 
      line.trim().endsWith(',') ||
      line.trim().endsWith(');')
    );
    
    const insertStatement = insertLines.join('\n');
    
    console.log('📄 SQL migration statement prepared');
    console.log(`📊 Statement length: ${insertStatement.length} characters`);
    
    // Write a clean SQL file for Railway execution
    const cleanSqlFile = path.join(__dirname, 'migration.sql');
    fs.writeFileSync(cleanSqlFile, insertStatement);
    
    console.log(`✅ Clean SQL file created: ${cleanSqlFile}`);
    console.log('\n🔧 To execute this migration via Railway, run:');
    console.log('   railway run -- sh -c "psql \\$DATABASE_URL < migration.sql"');
    console.log('\n📋 Or copy the SQL content and execute manually in Railway console.');
    
  } catch (error) {
    console.error('💥 Error preparing SQL migration:', error);
  }
}

executeSqlMigration();