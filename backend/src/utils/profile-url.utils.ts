import { PrismaClient } from '@prisma/client';

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

function generateRandomSuffix(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function normalizeNameToSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 40)
    .replace(/-+$/g, '');
}

export function validateProfileUrl(url: string): { isValid: boolean; error?: string } {
  if (url.length < 3 || url.length > 50) {
    return { isValid: false, error: 'Profile URL must be between 3 and 50 characters' };
  }
  if (!/^[a-z0-9-]+$/.test(url)) {
    return { isValid: false, error: 'Profile URL can only contain lowercase letters, numbers, and hyphens' };
  }
  if (url.includes('--')) {
    return { isValid: false, error: 'Profile URL cannot contain consecutive hyphens' };
  }
  if (url.startsWith('-') || url.endsWith('-')) {
    return { isValid: false, error: 'Profile URL cannot start or end with a hyphen' };
  }
  if (RESERVED_URLS.includes(url)) {
    return { isValid: false, error: 'This profile URL is reserved and cannot be used' };
  }
  return { isValid: true };
}

export async function isProfileUrlAvailable(
  prismaClient: PrismaClient,
  url: string,
  excludeUserId?: string
): Promise<boolean> {
  const existingUser = await prismaClient.user.findFirst({
    where: {
      profileUrl: url,
      ...(excludeUserId && { id: { not: excludeUserId } }),
    },
  });
  return !existingUser;
}

export async function generateUniqueProfileUrl(
  prismaClient: PrismaClient,
  name: string,
  excludeUserId?: string
): Promise<string> {
  let baseUrl = normalizeNameToSlug(name);
  if (!baseUrl) {
    baseUrl = 'user';
  }

  const validation = validateProfileUrl(baseUrl);
  if (validation.isValid && await isProfileUrlAvailable(prismaClient, baseUrl, excludeUserId)) {
    return baseUrl;
  }

  let attempts = 0;
  const maxAttempts = 10;
  while (attempts < maxAttempts) {
    const suffix = generateRandomSuffix();
    const candidateUrl = `${baseUrl}-${suffix}`;
    const candidateValidation = validateProfileUrl(candidateUrl);
    if (candidateValidation.isValid && await isProfileUrlAvailable(prismaClient, candidateUrl, excludeUserId)) {
      return candidateUrl;
    }
    attempts++;
  }

  const timestamp = Date.now().toString().slice(-8);
  const fallbackUrl = `user-${timestamp}`;
  if (await isProfileUrlAvailable(prismaClient, fallbackUrl, excludeUserId)) {
    return fallbackUrl;
  }

  throw new Error('Unable to generate unique profile URL');
}

export async function getUserByProfileUrl(
  prismaClient: PrismaClient,
  profileUrl: string
) {
  return prismaClient.user.findFirst({
    where: {
      profileUrl,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      title: true,
      company: true,
      avatar: true,
      profileUrl: true,
      profile: {
        select: {
          profileVisibility: true,
          allowSearchEngineIndexing: true,
        },
      },
    },
  });
}
