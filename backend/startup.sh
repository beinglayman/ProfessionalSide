#!/bin/sh
set -e

echo "=== Running Prisma migrations ==="
npm run db:migrate:deploy 2>&1 && echo "=== Migrations applied ===" || {
  echo "WARNING: Prisma migrate deploy failed. Applying critical schema fixes..."
  node -e "
    const { PrismaClient } = require('@prisma/client');
    const p = new PrismaClient();
    p.\$executeRawUnsafe('ALTER TABLE \"CareerStory\" ADD COLUMN IF NOT EXISTS \"originalSections\" JSONB')
      .then(() => { console.log('Column originalSections ensured'); p.\$disconnect(); })
      .catch(e => { console.error('Fallback SQL failed:', e.message); p.\$disconnect(); process.exit(1); });
  "
  echo "=== Schema fixes applied ==="
}

echo "=== Verifying critical tables ==="
node verify-tables.js

echo "=== Starting app ==="
NODE_ENV=production exec npx tsx src/app.ts
