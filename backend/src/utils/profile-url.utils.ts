import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Reserved URLs that cannot be used as profile URLs
const RESERVED_URLS = [
  'admin', 'api', 'www', 'app', 'mail', 'ftp', 'blog', 'news', 'help', 'support',
  'login', 'register', 'signin', 'signup', 'dashboard', 'profile', 'settings',
  'user', 'users', 'account', 'accounts', 'public', 'private', 'static', 'assets',
  'uploads', 'download', 'downloads', 'search', 'privacy', 'terms', 'about',
  'contact', 'home', 'index', 'test', 'tests', 'staging', 'dev', 'development',
  'prod', 'production', 'localhost', 'root', 'system', 'config', 'feed', 'feeds',
  'rss', 'atom', 'xml', 'json', 'robots', 'sitemap', 'manifest', 'service-worker',
  'network', 'workspaces', 'workspace', 'journal', 'goals', 'achievements',
  'notifications', 'invitations', 'onboarding'
];

/**
 * Generate a random 4-character suffix for profile URLs
 */
function generateRandomSuffix(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Normalize a name to create a URL-friendly slug
 */
function normalizeNameToSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    // Remove special characters except spaces and hyphens
    .replace(/[^a-z0-9\s-]/g, '')
    // Replace multiple spaces/hyphens with single hyphen
    .replace(/[\s-]+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '')
    // Limit length to 40 characters to leave room for suffix
    .substring(0, 40)
    // Remove trailing hyphen again in case substring created one
    .replace(/-+$/g, '');
}

/**
 * Validate profile URL format
 */
export function validateProfileUrl(url: string): { isValid: boolean; error?: string } {
  // Check length
  if (url.length < 3 || url.length > 50) {
    return { isValid: false, error: 'Profile URL must be between 3 and 50 characters' };
  }

  // Check format - only lowercase letters, numbers, and hyphens
  if (!/^[a-z0-9-]+$/.test(url)) {
    return { isValid: false, error: 'Profile URL can only contain lowercase letters, numbers, and hyphens' };
  }

  // Check for consecutive hyphens
  if (url.includes('--')) {
    return { isValid: false, error: 'Profile URL cannot contain consecutive hyphens' };
  }

  // Check starts/ends with hyphen
  if (url.startsWith('-') || url.endsWith('-')) {
    return { isValid: false, error: 'Profile URL cannot start or end with a hyphen' };
  }

  // Check reserved words
  if (RESERVED_URLS.includes(url)) {
    return { isValid: false, error: 'This profile URL is reserved and cannot be used' };
  }

  return { isValid: true };
}

/**
 * Check if a profile URL is available
 */
export async function isProfileUrlAvailable(url: string, excludeUserId?: string): Promise<boolean> {
  const existingUser = await prisma.user.findFirst({
    where: {
      profileUrl: url,
      ...(excludeUserId && { id: { not: excludeUserId } })
    }
  });

  return !existingUser;
}

/**
 * Generate a unique profile URL from a user's name
 */
export async function generateUniqueProfileUrl(name: string, excludeUserId?: string): Promise<string> {
  // Start with normalized name
  let baseUrl = normalizeNameToSlug(name);
  
  // If the base URL is empty after normalization, use a default
  if (!baseUrl) {
    baseUrl = 'user';
  }

  // Check if base URL is valid and available
  const validation = validateProfileUrl(baseUrl);
  if (validation.isValid && await isProfileUrlAvailable(baseUrl, excludeUserId)) {
    return baseUrl;
  }

  // If not available or invalid, try with random suffixes
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const suffix = generateRandomSuffix();
    const candidateUrl = `${baseUrl}-${suffix}`;
    
    const validation = validateProfileUrl(candidateUrl);
    if (validation.isValid && await isProfileUrlAvailable(candidateUrl, excludeUserId)) {
      return candidateUrl;
    }
    
    attempts++;
  }

  // Fallback to timestamp-based URL if all random attempts fail
  const timestamp = Date.now().toString().slice(-8);
  const fallbackUrl = `user-${timestamp}`;
  
  if (await isProfileUrlAvailable(fallbackUrl, excludeUserId)) {
    return fallbackUrl;
  }

  // Final fallback - this should never happen in practice
  throw new Error('Unable to generate unique profile URL');
}

/**
 * Update a user's profile URL
 */
export async function updateUserProfileUrl(userId: string, newUrl: string): Promise<void> {
  // Validate the new URL
  const validation = validateProfileUrl(newUrl);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  // Check if URL is available
  if (!await isProfileUrlAvailable(newUrl, userId)) {
    throw new Error('This profile URL is already taken');
  }

  // Update the user's profile URL
  await prisma.user.update({
    where: { id: userId },
    data: { profileUrl: newUrl }
  });
}

/**
 * Get user by profile URL
 */
export async function getUserByProfileUrl(profileUrl: string) {
  return await prisma.user.findFirst({
    where: {
      profileUrl: profileUrl,
      isActive: true
    },
    select: {
      id: true,
      name: true,
      email: true,
      title: true,
      bio: true,
      location: true,
      company: true,
      industry: true,
      yearsOfExperience: true,
      avatar: true,
      profileUrl: true,
      createdAt: true,
      profile: {
        select: {
          profileCompleteness: true,
          joinedDate: true,
          lastActiveAt: true,
          showEmail: true,
          showLocation: true,
          showCompany: true
        }
      }
    }
  });
}