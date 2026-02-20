/**
 * Migration script: Generate profileUrl slugs for all existing users who don't have one.
 *
 * Usage: node scripts/generate-slugs.js
 *
 * Must be run from the backend directory with DATABASE_URL set.
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const RESERVED_URLS = [
  'admin', 'api', 'www', 'app', 'mail', 'ftp', 'blog', 'news', 'help', 'support',
  'login', 'register', 'signin', 'signup', 'dashboard', 'profile', 'settings',
  'user', 'users', 'account', 'accounts', 'public', 'private', 'static', 'assets',
  'uploads', 'download', 'downloads', 'search', 'privacy', 'terms', 'about',
  'contact', 'home', 'index', 'test', 'tests', 'staging', 'dev', 'development',
  'prod', 'production', 'localhost', 'root', 'system', 'config', 'feed', 'feeds',
  'rss', 'atom', 'xml', 'json', 'robots', 'sitemap', 'manifest', 'service-worker',
  'network', 'workspaces', 'workspace', 'journal', 'goals', 'achievements',
  'notifications', 'invitations', 'onboarding', 'stories', 'me', 's',
  'forgot-password', 'reset-password', 'verify-email', 'teams', 'timeline',
];

function generateRandomSuffix() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function normalizeNameToSlug(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 40)
    .replace(/-+$/g, '');
}

function isValidSlug(url) {
  if (url.length < 3 || url.length > 50) return false;
  if (!/^[a-z0-9-]+$/.test(url)) return false;
  if (url.includes('--')) return false;
  if (url.startsWith('-') || url.endsWith('-')) return false;
  if (RESERVED_URLS.includes(url)) return false;
  return true;
}

async function main() {
  const users = await prisma.user.findMany({
    where: { profileUrl: null },
    select: { id: true, name: true },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`Found ${users.length} users without a profileUrl.`);
  let succeeded = 0;
  let failed = 0;

  for (const user of users) {
    const baseSlug = normalizeNameToSlug(user.name) || 'user';

    for (let attempt = 0; attempt < 10; attempt++) {
      const candidate = attempt === 0 && isValidSlug(baseSlug)
        ? baseSlug
        : `${baseSlug}-${generateRandomSuffix()}`;

      if (!isValidSlug(candidate)) continue;

      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { profileUrl: candidate },
        });
        console.log(`  ${user.name} -> ${candidate}`);
        succeeded++;
        break;
      } catch (err) {
        if (err.code === 'P2002') {
          // Unique constraint violation — try next suffix
          continue;
        }
        console.error(`  ERROR for ${user.name}: ${err.message}`);
        failed++;
        break;
      }
    }
  }

  console.log(`\nDone. Succeeded: ${succeeded}, Failed: ${failed}`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Script failed:', err);
  prisma.$disconnect();
  process.exit(1);
});
