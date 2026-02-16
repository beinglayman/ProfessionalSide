import { describe, it, expect, vi } from 'vitest';

// Set required env var BEFORE importing the service
vi.stubEnv('ENCRYPTION_KEY', 'test-encryption-key-for-unit-tests');
vi.stubEnv('GITHUB_CLIENT_ID', 'test-github-id');
vi.stubEnv('GITHUB_CLIENT_SECRET', 'test-github-secret');

describe('MCPOAuthService: singleton', () => {
  it('exports a singleton instance', async () => {
    const { oauthService: instance1 } = await import('./mcp-oauth.service');
    const { oauthService: instance2 } = await import('./mcp-oauth.service');
    expect(instance1).toBe(instance2);
  });
});
