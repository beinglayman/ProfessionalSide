import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Regression tests for API_BASE_URL resolution.
 * Incident 2026-03-28: removing the api.inchronicle.com guard caused
 * production to call /users/profile/me instead of /api/v1/users/profile/me.
 */
describe('API_BASE_URL resolution', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it('uses VITE_API_URL when set to a valid backend URL with /api/v1', async () => {
    vi.stubEnv('VITE_API_URL', 'https://ps-backend-1758551070.azurewebsites.net/api/v1');
    const { API_BASE_URL } = await import('../api');
    expect(API_BASE_URL).toBe('https://ps-backend-1758551070.azurewebsites.net/api/v1');
  });

  it('rejects VITE_API_URL containing api.inchronicle.com', async () => {
    vi.stubEnv('VITE_API_URL', 'https://api.inchronicle.com');
    vi.stubEnv('DEV', false);
    const { API_BASE_URL } = await import('../api');
    expect(API_BASE_URL).not.toContain('api.inchronicle.com');
    expect(API_BASE_URL).toContain('/api/v1');
  });

  it('rejects VITE_API_URL containing professionalside-production', async () => {
    vi.stubEnv('VITE_API_URL', 'https://professionalside-production.azurewebsites.net');
    vi.stubEnv('DEV', false);
    const { API_BASE_URL } = await import('../api');
    expect(API_BASE_URL).not.toContain('professionalside-production');
  });

  it('falls back to localhost in dev when VITE_API_URL is empty', async () => {
    vi.stubEnv('VITE_API_URL', '');
    vi.stubEnv('DEV', true);
    const { API_BASE_URL } = await import('../api');
    expect(API_BASE_URL).toBe('http://localhost:3002/api/v1');
  });

  it('API_BASE_URL always contains /api/v1 suffix', async () => {
    vi.stubEnv('VITE_API_URL', '');
    vi.stubEnv('DEV', false);
    const { API_BASE_URL } = await import('../api');
    expect(API_BASE_URL).toContain('/api/v1');
  });
});
