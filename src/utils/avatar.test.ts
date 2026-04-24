/**
 * Avatar URL normalization tests. Focus is on the STATIC_BASE_URL resolution
 * for /uploads/* paths, which was the source of the Azure 401 that was
 * hiding every user's avatar in production before this fix.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/api', () => ({
  STATIC_BASE_URL: 'https://backend.example.com',
}));

import { normalizeAvatarUrl } from './avatar';

describe('normalizeAvatarUrl', () => {
  it('returns the default when input is falsy', () => {
    expect(normalizeAvatarUrl(null)).toBe('/default-avatar.svg');
    expect(normalizeAvatarUrl(undefined)).toBe('/default-avatar.svg');
    expect(normalizeAvatarUrl('')).toBe('/default-avatar.svg');
  });

  it('prepends STATIC_BASE_URL for /uploads/ paths', () => {
    expect(normalizeAvatarUrl('/uploads/avatars/avatar-user-123.png')).toBe(
      'https://backend.example.com/uploads/avatars/avatar-user-123.png',
    );
  });

  it('keeps other relative URLs local to the frontend', () => {
    expect(normalizeAvatarUrl('/default-avatar.svg')).toBe('/default-avatar.svg');
    expect(normalizeAvatarUrl('/assets/team-member.jpg')).toBe('/assets/team-member.jpg');
  });

  it('upgrades http:// to https://', () => {
    expect(normalizeAvatarUrl('http://cdn.example.com/avatar.png')).toBe(
      'https://cdn.example.com/avatar.png',
    );
  });

  it('passes https:// URLs through unchanged', () => {
    expect(normalizeAvatarUrl('https://cdn.example.com/avatar.png')).toBe(
      'https://cdn.example.com/avatar.png',
    );
  });
});
