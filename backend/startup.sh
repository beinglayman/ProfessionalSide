#!/bin/sh
set -e

echo "=== Running Prisma migrations ==="
npm run db:migrate:deploy 2>&1 && echo "=== Migrations applied ===" || {
  echo "WARNING: Prisma migrate deploy failed. Applying critical schema fixes..."
  npx prisma db execute --stdin <<'SQL'
    ALTER TABLE "CareerStory" ADD COLUMN IF NOT EXISTS "originalSections" JSONB;
SQL
  echo "=== Schema fixes applied ==="
}

echo "=== Verifying critical tables ==="
node verify-tables.js

echo "=== Starting app ==="
NODE_ENV=production exec npx tsx src/app.ts
