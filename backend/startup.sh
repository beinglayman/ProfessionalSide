#!/bin/sh
set -e

echo "=== Running Prisma migrations ==="
npm run db:migrate:deploy 2>&1 || true
echo "=== Migration step complete ==="

# Verify critical tables exist; if not, run DDL directly
echo "=== Verifying pragma_links table ==="
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  try {
    const result = await prisma.\$queryRaw\`
      SELECT EXISTS (
        SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'pragma_links'
      ) as exists
    \`;
    if (!result[0].exists) {
      console.log('pragma_links table MISSING — creating via raw SQL...');
      await prisma.\$executeRawUnsafe(\`
        CREATE TABLE IF NOT EXISTS \"pragma_links\" (
          \"id\" TEXT NOT NULL,
          \"userId\" TEXT NOT NULL,
          \"storyId\" TEXT NOT NULL,
          \"shortCode\" TEXT NOT NULL,
          \"token\" TEXT NOT NULL,
          \"tier\" TEXT NOT NULL,
          \"label\" TEXT,
          \"expiresAt\" TIMESTAMP(3),
          \"revokedAt\" TIMESTAMP(3),
          \"createdAt\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \"updatedAt\" TIMESTAMP(3) NOT NULL,
          CONSTRAINT \"pragma_links_pkey\" PRIMARY KEY (\"id\")
        );
        CREATE TABLE IF NOT EXISTS \"pragma_link_views\" (
          \"id\" TEXT NOT NULL,
          \"linkId\" TEXT NOT NULL,
          \"viewerId\" TEXT,
          \"ip\" TEXT,
          \"userAgent\" TEXT,
          \"viewedAt\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT \"pragma_link_views_pkey\" PRIMARY KEY (\"id\")
        );
        CREATE UNIQUE INDEX IF NOT EXISTS \"pragma_links_shortCode_key\" ON \"pragma_links\"(\"shortCode\");
        CREATE UNIQUE INDEX IF NOT EXISTS \"pragma_links_token_key\" ON \"pragma_links\"(\"token\");
        CREATE INDEX IF NOT EXISTS \"pragma_links_userId_storyId_idx\" ON \"pragma_links\"(\"userId\", \"storyId\");
        CREATE INDEX IF NOT EXISTS \"pragma_link_views_linkId_viewedAt_idx\" ON \"pragma_link_views\"(\"linkId\", \"viewedAt\");
      \`);
      // FKs — ignore if they already exist
      try { await prisma.\$executeRawUnsafe('ALTER TABLE \"pragma_links\" ADD CONSTRAINT \"pragma_links_storyId_fkey\" FOREIGN KEY (\"storyId\") REFERENCES \"career_stories\"(\"id\") ON DELETE CASCADE ON UPDATE CASCADE'); } catch(e) {}
      try { await prisma.\$executeRawUnsafe('ALTER TABLE \"pragma_links\" ADD CONSTRAINT \"pragma_links_userId_fkey\" FOREIGN KEY (\"userId\") REFERENCES \"users\"(\"id\") ON DELETE CASCADE ON UPDATE CASCADE'); } catch(e) {}
      try { await prisma.\$executeRawUnsafe('ALTER TABLE \"pragma_link_views\" ADD CONSTRAINT \"pragma_link_views_linkId_fkey\" FOREIGN KEY (\"linkId\") REFERENCES \"pragma_links\"(\"id\") ON DELETE CASCADE ON UPDATE CASCADE'); } catch(e) {}
      console.log('pragma_links tables created successfully');
    } else {
      console.log('pragma_links table exists — OK');
    }
  } catch (err) {
    console.error('Table verification failed:', err.message);
  } finally {
    await prisma.\$disconnect();
  }
})();
"
echo "=== Starting app ==="
NODE_ENV=production exec npx tsx src/app.ts
