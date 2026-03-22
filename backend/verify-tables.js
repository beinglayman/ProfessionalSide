const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    // Check if pragma_links table exists
    const result = await prisma.$queryRawUnsafe(
      "SELECT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'pragma_links') as exists"
    );

    if (!result[0].exists) {
      console.log('pragma_links table MISSING — creating via raw SQL...');

      // Check if migration is recorded but table is missing (ghost row)
      const ghostRows = await prisma.$queryRawUnsafe(
        "SELECT id, migration_name FROM _prisma_migrations WHERE migration_name LIKE '%pragma%'"
      );
      if (ghostRows.length > 0) {
        console.log('Found ghost migration row(s) — deleting so future deploys re-apply:');
        for (const row of ghostRows) {
          console.log('  Deleting:', row.migration_name);
          await prisma.$executeRawUnsafe(
            'DELETE FROM _prisma_migrations WHERE id = $1', row.id
          );
        }
      }

      // Create tables
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "pragma_links" (
          "id" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "storyId" TEXT NOT NULL,
          "shortCode" TEXT NOT NULL,
          "token" TEXT NOT NULL,
          "tier" TEXT NOT NULL,
          "label" TEXT,
          "expiresAt" TIMESTAMP(3),
          "revokedAt" TIMESTAMP(3),
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "pragma_links_pkey" PRIMARY KEY ("id")
        )
      `);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "pragma_link_views" (
          "id" TEXT NOT NULL,
          "linkId" TEXT NOT NULL,
          "viewerId" TEXT,
          "ip" TEXT,
          "userAgent" TEXT,
          "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "pragma_link_views_pkey" PRIMARY KEY ("id")
        )
      `);

      await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "pragma_links_shortCode_key" ON "pragma_links"("shortCode")');
      await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "pragma_links_token_key" ON "pragma_links"("token")');
      await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "pragma_links_userId_storyId_idx" ON "pragma_links"("userId", "storyId")');
      await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "pragma_link_views_linkId_viewedAt_idx" ON "pragma_link_views"("linkId", "viewedAt")');

      // Foreign keys — ignore if already exist
      try { await prisma.$executeRawUnsafe('ALTER TABLE "pragma_links" ADD CONSTRAINT "pragma_links_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "career_stories"("id") ON DELETE CASCADE ON UPDATE CASCADE'); } catch (e) { /* already exists */ }
      try { await prisma.$executeRawUnsafe('ALTER TABLE "pragma_links" ADD CONSTRAINT "pragma_links_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE'); } catch (e) { /* already exists */ }
      try { await prisma.$executeRawUnsafe('ALTER TABLE "pragma_link_views" ADD CONSTRAINT "pragma_link_views_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "pragma_links"("id") ON DELETE CASCADE ON UPDATE CASCADE'); } catch (e) { /* already exists */ }

      console.log('pragma_links tables created successfully');
    } else {
      console.log('pragma_links table exists — OK');
    }

    // Ensure originalSections column exists on CareerStory
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "CareerStory" ADD COLUMN IF NOT EXISTS "originalSections" JSONB'
    );
    console.log('CareerStory.originalSections column ensured — OK');
  } catch (err) {
    console.error('Table verification failed:', err?.message || err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
