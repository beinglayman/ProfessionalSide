/**
 * Utility functions for handling avatar URLs
 */

import { STATIC_BASE_URL } from '../lib/api';

/**
 * Normalizes avatar URL — ensures HTTPS, resolves backend-served relative
 * paths to the correct origin, and provides a fallback.
 *
 * Uploaded avatars are stored in the database as "/uploads/avatars/xyz.png"
 * — a relative path served by the backend's static handler at its own
 * origin (NOT under /api/v1). On the frontend these paths would otherwise
 * resolve against the frontend's own origin, which doesn't serve them.
 * We prepend STATIC_BASE_URL (the backend origin without /api/v1) so the
 * <img> hits the right server.
 *
 * `/default-avatar.svg` and other bundled static assets stay local.
 */
export function normalizeAvatarUrl(avatarUrl: string | null | undefined): string {
  if (!avatarUrl) {
    return '/default-avatar.svg';
  }

  // Backend-hosted uploaded files: prepend the static origin.
  if (avatarUrl.startsWith('/uploads/')) {
    return `${STATIC_BASE_URL}${avatarUrl}`;
  }

  // Other relative URLs (e.g. frontend-bundled assets like /default-avatar.svg)
  // stay local to the frontend origin.
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