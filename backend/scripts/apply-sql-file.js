const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function main() {
  const sqlPath = process.argv[2];
  const databaseUrl = process.env.DATABASE_URL;

  if (!sqlPath) {
    console.error('Usage: node scripts/apply-sql-file.js <path-to-sql>');
    process.exit(1);
  }
  if (!databaseUrl) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }

  const absPath = path.isAbsolute(sqlPath) ? sqlPath : path.join(process.cwd(), sqlPath);
  if (!fs.existsSync(absPath)) {
    console.error('SQL file not found:', absPath);
    process.exit(1);
  }

  const sql = fs.readFileSync(absPath, 'utf8');
  if (!sql.trim()) {
    console.log('SQL file is empty, nothing to apply.');
    process.exit(0);
  }

  // Enable SSL when using Azure (sslmode=require in URL)
  const ssl = { rejectUnauthorized: false };

  const client = new Client({ connectionString: databaseUrl, ssl });
  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Applying SQL (length:', sql.length, 'chars)...');
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('SQL applied successfully.');
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('Failed to apply SQL:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


