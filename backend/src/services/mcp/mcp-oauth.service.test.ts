import { describe, it, expect, vi, afterEach } from 'vitest';

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

describe('MCPOAuthService: encryption key', () => {
  afterEach(() => {
    // Restore env and module cache for subsequent tests
    vi.stubEnv('ENCRYPTION_KEY', 'test-encryption-key-for-unit-tests');
    vi.resetModules();
  });

  it('throws when ENCRYPTION_KEY and MCP_ENCRYPTION_KEY are both missing', async () => {
    vi.resetModules();
    delete process.env.ENCRYPTION_KEY;
    delete process.env.MCP_ENCRYPTION_KEY;

    // Module-level singleton instantiation will throw during import
    await expect(() => import('./mcp-oauth.service')).rejects.toThrow(
      'ENCRYPTION_KEY or MCP_ENCRYPTION_KEY environment variable is required'
    );
  });

  it('accepts MCP_ENCRYPTION_KEY as fallback', async () => {
    vi.resetModules();
    delete process.env.ENCRYPTION_KEY;
    process.env.MCP_ENCRYPTION_KEY = 'valid-key';

    // Should import without throwing
    const mod = await import('./mcp-oauth.service');
    expect(mod.oauthService).toBeDefined();
  });
});
