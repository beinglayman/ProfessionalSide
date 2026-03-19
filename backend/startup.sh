#!/bin/sh

echo "=== Running Prisma migrations ==="
if npm run db:migrate:deploy 2>&1; then
  echo "=== Migrations applied ==="
else
  echo "WARNING: Prisma migrate deploy failed. Applying critical schema fixes..."
  node -e "
    const { PrismaClient } = require('@prisma/client');
    const p = new PrismaClient();
    p.\$executeRawUnsafe('ALTER TABLE \"CareerStory\" ADD COLUMN IF NOT EXISTS \"originalSections\" JSONB')
      .then(() => { console.log('Column originalSections ensured'); return p.\$disconnect(); })
      .catch(e => { console.error('Fallback SQL failed:', e.message); return p.\$disconnect(); });
  " || echo "WARNING: Fallback SQL also failed, continuing anyway..."
  echo "=== Schema fix attempted ==="
fi

echo "=== Verifying critical tables ==="
node verify-tables.js

echo "=== Starting app ==="
NODE_ENV=production exec npx tsx src/app.ts
