#!/bin/sh

echo "=== Running Prisma migrations ==="
npm run db:migrate:deploy 2>&1 && echo "=== Migrations applied ===" || echo "WARNING: Prisma migrate deploy failed"

echo "=== Verifying critical tables and schema ==="
node verify-tables.js

echo "=== Starting app ==="
NODE_ENV=production exec npx tsx src/app.ts
