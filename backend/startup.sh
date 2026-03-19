#!/bin/sh

echo "=== Running Prisma migrations ==="
npm run db:migrate:deploy 2>&1 && echo "=== Migrations applied ===" || echo "WARNING: Prisma migrate deploy failed"

echo "=== Ensuring schema columns exist ==="
node -e "
  const { PrismaClient } = require('@prisma/client');
  const p = new PrismaClient();
  p.\$executeRawUnsafe('ALTER TABLE \"CareerStory\" ADD COLUMN IF NOT EXISTS \"originalSections\" JSONB')
    .then(() => { console.log('Column originalSections ensured'); return p.\$disconnect(); })
    .catch(e => { console.error('Schema fix failed:', e.message); return p.\$disconnect(); });
" || echo "WARNING: Schema fix script failed"

echo "=== Verifying critical tables ==="
node verify-tables.js

echo "=== Starting app ==="
NODE_ENV=production exec npx tsx src/app.ts
