/**
 * Utility functions for handling avatar URLs
 */

/**
 * Ensures avatar URL uses HTTPS for Railway deployment
 * @param avatarUrl - The avatar URL to normalize
 * @returns HTTPS version of the URL or fallback
 */
export function normalizeAvatarUrl(avatarUrl: string | null | undefined): string {
  if (!avatarUrl) {
    return '/default-avatar.svg';
  }

  // If it's already a relative URL, return as-is
  if (avatarUrl.startsWith('/')) {
    return avatarUrl;
  }

  // If it's a full URL with HTTP, convert to HTTPS
  if (avatarUrl.startsWith('http://')) {
    return avatarUrl.replace('http://', 'https://');
  }

  // If it's already HTTPS or other protocol, return as-is
  return avatarUrl;
}

/**
 * Creates an avatar URL with error handling
 * @param avatarUrl - The raw avatar URL
 * @returns Normalized URL with fallback
 */
export function getAvatarUrl(avatarUrl: string | null | undefined): string {
  const normalized = normalizeAvatarUrl(avatarUrl);
  
  // If it's the default avatar, return it
  if (normalized === '/default-avatar.svg') {
    return normalized;
  }

  // For Railway URLs, ensure they're HTTPS
  if (normalized.includes('railway.app') && normalized.startsWith('http:')) {
    return normalized.replace('http:', 'https:');
  }

  return normalized;
}

/**
 * Handles avatar image load errors
 * @param event - The error event
 * @param fallbackUrl - Optional custom fallback URL
 */
export function handleAvatarError(
  event: React.SyntheticEvent<HTMLImageElement>, 
  fallbackUrl: string = '/default-avatar.svg'
): void {
  const target = event.target as HTMLImageElement;
  
  // Only set fallback if we're not already on the fallback
  if (target.src !== fallbackUrl && !target.src.endsWith(fallbackUrl)) {
    console.warn('Avatar failed to load:', target.src);
    target.src = fallbackUrl;
  }
}