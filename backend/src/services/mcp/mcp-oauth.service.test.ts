import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import axios from 'axios';

// Set required env var BEFORE importing the service
vi.stubEnv('ENCRYPTION_KEY', 'test-encryption-key-for-unit-tests');
vi.stubEnv('GITHUB_CLIENT_ID', 'test-github-id');
vi.stubEnv('GITHUB_CLIENT_SECRET', 'test-github-secret');

vi.mock('axios');
vi.mock('../../lib/prisma', () => ({
  prisma: {
    mCPIntegration: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    mCPPrivacyLog: {
      create: vi.fn(),
    },
  },
}));

vi.mock('./mcp-privacy.service', () => {
  return {
    MCPPrivacyService: class {
      recordConsent = vi.fn().mockResolvedValue(undefined);
      logIntegrationAction = vi.fn().mockResolvedValue(undefined);
      getUserIntegrationStatus = vi.fn().mockResolvedValue(new Map());
      getPrivacyStatus = vi.fn().mockReturnValue({});
    },
  };
});

describe('MCPOAuthService: singleton', () => {
  it('exports a singleton instance', async () => {
    const { oauthService: instance1 } = await import('./mcp-oauth.service');
    const { oauthService: instance2 } = await import('./mcp-oauth.service');
    expect(instance1).toBe(instance2);
  });
});

describe('MCPOAuthService: encryption key', () => {
  afterEach(() => {
    vi.stubEnv('ENCRYPTION_KEY', 'test-encryption-key-for-unit-tests');
    vi.resetModules();
  });

  it('throws when ENCRYPTION_KEY and MCP_ENCRYPTION_KEY are both missing', async () => {
    vi.resetModules();
    delete process.env.ENCRYPTION_KEY;
    delete process.env.MCP_ENCRYPTION_KEY;

    await expect(() => import('./mcp-oauth.service')).rejects.toThrow(
      'ENCRYPTION_KEY or MCP_ENCRYPTION_KEY environment variable is required'
    );
  });

  it('accepts MCP_ENCRYPTION_KEY as fallback', async () => {
    vi.resetModules();
    delete process.env.ENCRYPTION_KEY;
    process.env.MCP_ENCRYPTION_KEY = 'valid-key';

    const mod = await import('./mcp-oauth.service');
    expect(mod.oauthService).toBeDefined();
  });
});

// --- Shared service instance for Tasks 4-8 ---
// Uses a fresh MCPOAuthService instance (not the singleton) to avoid module-level side effects
let service: any;

beforeEach(async () => {
  vi.stubEnv('ENCRYPTION_KEY', 'test-key-for-retry-tests');
  vi.stubEnv('GITHUB_CLIENT_ID', 'test-id');
  vi.stubEnv('GITHUB_CLIENT_SECRET', 'test-secret');
  vi.resetModules();
  vi.mocked(axios.post).mockReset();
  vi.mocked(axios.delete).mockReset();
  const { prisma } = await import('../../lib/prisma');
  (prisma.mCPIntegration.findUnique as any).mockReset();
  (prisma.mCPIntegration.upsert as any).mockReset();
  (prisma.mCPIntegration.update as any).mockReset();
  const mod = await import('./mcp-oauth.service');
  service = new mod.MCPOAuthService();
});

describe('MCPOAuthService: retry on refresh', () => {
  it('retries on 503 and succeeds on third attempt', async () => {
    const { prisma } = await import('../../lib/prisma');
    (prisma.mCPIntegration.findUnique as any).mockResolvedValue({
      id: '1', userId: 'u1', toolType: 'github', isActive: true,
      refreshToken: service.encrypt('mock-refresh-token'),
      expiresAt: new Date(Date.now() - 1000),
      accessToken: service.encrypt('old-token'),
    });
    (prisma.mCPIntegration.upsert as any).mockResolvedValue({});

    const mockPost = vi.mocked(axios.post);
    mockPost
      .mockRejectedValueOnce({ response: { status: 503 }, message: 'Service Unavailable' })
      .mockRejectedValueOnce({ response: { status: 503 }, message: 'Service Unavailable' })
      .mockResolvedValueOnce({ data: { access_token: 'new-token', refresh_token: 'new-refresh' } });

    const result = await service.getAccessToken('u1', 'github');
    expect(result).toBe('new-token');
    expect(mockPost).toHaveBeenCalledTimes(3);
  });

  it('does NOT retry on 400 (permanent failure)', async () => {
    const { prisma } = await import('../../lib/prisma');
    (prisma.mCPIntegration.findUnique as any).mockResolvedValue({
      id: '1', userId: 'u1', toolType: 'github', isActive: true,
      refreshToken: service.encrypt('mock-refresh-token'),
      expiresAt: new Date(Date.now() - 1000),
      accessToken: service.encrypt('old-token'),
    });

    const mockPost = vi.mocked(axios.post);
    mockPost.mockRejectedValueOnce({ response: { status: 400, data: { error: 'invalid_grant' } }, message: 'Bad Request' });

    const result = await service.getAccessToken('u1', 'github');
    expect(result).toBeNull();
    expect(mockPost).toHaveBeenCalledTimes(1);
  });

  it('retries on 429 and honors Retry-After header', async () => {
    const { prisma } = await import('../../lib/prisma');
    (prisma.mCPIntegration.findUnique as any).mockResolvedValue({
      id: '1', userId: 'u1', toolType: 'github', isActive: true,
      refreshToken: service.encrypt('mock-refresh-token'),
      expiresAt: new Date(Date.now() - 1000),
      accessToken: service.encrypt('old-token'),
    });
    (prisma.mCPIntegration.upsert as any).mockResolvedValue({});

    const mockPost = vi.mocked(axios.post);
    mockPost
      .mockRejectedValueOnce({ response: { status: 429, headers: { 'retry-after': '1' } }, message: 'Too Many Requests' })
      .mockResolvedValueOnce({ data: { access_token: 'new-token', refresh_token: 'new-refresh' } });

    const result = await service.getAccessToken('u1', 'github');
    expect(result).toBe('new-token');
    expect(mockPost).toHaveBeenCalledTimes(2);
  });

  it('returns null after 3 failed attempts (503)', async () => {
    const { prisma } = await import('../../lib/prisma');
    (prisma.mCPIntegration.findUnique as any).mockResolvedValue({
      id: '1', userId: 'u1', toolType: 'github', isActive: true,
      refreshToken: service.encrypt('mock-refresh-token'),
      expiresAt: new Date(Date.now() - 1000),
      accessToken: service.encrypt('old-token'),
    });

    const mockPost = vi.mocked(axios.post);
    mockPost
      .mockRejectedValueOnce({ response: { status: 503 }, message: 'fail 1' })
      .mockRejectedValueOnce({ response: { status: 503 }, message: 'fail 2' })
      .mockRejectedValueOnce({ response: { status: 503 }, message: 'fail 3' });

    const result = await service.getAccessToken('u1', 'github');
    expect(result).toBeNull();
    expect(mockPost).toHaveBeenCalledTimes(3);
  });
});

describe('MCPOAuthService: proactive refresh', () => {
  it('triggers refresh when token expires in <5 minutes', async () => {
    const { prisma } = await import('../../lib/prisma');
    (prisma.mCPIntegration.findUnique as any).mockResolvedValue({
      id: '1', userId: 'u1', toolType: 'github', isActive: true,
      accessToken: service.encrypt('current-token'),
      refreshToken: service.encrypt('refresh-token'),
      expiresAt: new Date(Date.now() + 3 * 60 * 1000), // 3 min from now (within 5-min buffer)
    });

    const mockPost = vi.mocked(axios.post);
    mockPost.mockResolvedValueOnce({ data: { access_token: 'refreshed-token' } });
    (prisma.mCPIntegration.upsert as any).mockResolvedValue({});

    const result = await service.getAccessToken('u1', 'github');
    expect(result).toBe('refreshed-token');
  });

  it('does NOT trigger refresh when token expires in >5 minutes', async () => {
    const { prisma } = await import('../../lib/prisma');
    (prisma.mCPIntegration.findUnique as any).mockResolvedValue({
      id: '1', userId: 'u1', toolType: 'github', isActive: true,
      accessToken: service.encrypt('current-token'),
      refreshToken: service.encrypt('refresh-token'),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min from now
    });

    const result = await service.getAccessToken('u1', 'github');
    expect(result).toBe('current-token');
    expect(axios.post).not.toHaveBeenCalled();
  });
});

describe('MCPOAuthService: refresh mutex', () => {
  it('deduplicates concurrent refresh calls (only 1 actual refresh)', async () => {
    const { prisma } = await import('../../lib/prisma');
    (prisma.mCPIntegration.findUnique as any).mockResolvedValue({
      id: '1', userId: 'u1', toolType: 'github', isActive: true,
      accessToken: service.encrypt('old-token'),
      refreshToken: service.encrypt('refresh-token'),
      expiresAt: new Date(Date.now() - 1000), // expired
    });
    (prisma.mCPIntegration.upsert as any).mockResolvedValue({});

    const mockPost = vi.mocked(axios.post);
    mockPost.mockImplementation(() =>
      new Promise(resolve => setTimeout(() => resolve({
        data: { access_token: 'new-token', refresh_token: 'new-refresh' }
      } as any), 50))
    );

    // Fire 5 concurrent requests
    const results = await Promise.all([
      service.getAccessToken('u1', 'github'),
      service.getAccessToken('u1', 'github'),
      service.getAccessToken('u1', 'github'),
      service.getAccessToken('u1', 'github'),
      service.getAccessToken('u1', 'github'),
    ]);

    // All should get the same token
    results.forEach(r => expect(r).toBe('new-token'));
    // But axios.post should only be called ONCE (the mutex deduplicates)
    expect(mockPost).toHaveBeenCalledTimes(1);
  });
});

describe('MCPOAuthService: state parameter expiry', () => {
  it('generates state with iat timestamp', () => {
    const result = service.getAuthorizationUrl('user-1', 'github');
    expect(result).not.toBeNull();
    const stateData = JSON.parse(Buffer.from(result!.state, 'base64').toString('utf8'));
    expect(stateData.iat).toBeDefined();
    expect(typeof stateData.iat).toBe('number');
    expect(Date.now() - stateData.iat).toBeLessThan(1000);
  });

  it('rejects state with no iat (legacy)', async () => {
    const legacyState = Buffer.from(JSON.stringify({
      userId: 'u1', toolType: 'github', state: 'abc'
    })).toString('base64');

    const result = await service.handleCallback('code', legacyState);
    expect(result.success).toBe(false);
  });

  it('rejects state older than 10 minutes', async () => {
    const staleState = Buffer.from(JSON.stringify({
      userId: 'u1', toolType: 'github', state: 'abc',
      iat: Date.now() - 11 * 60 * 1000
    })).toString('base64');

    const result = await service.handleCallback('code', staleState);
    expect(result.success).toBe(false);
  });
});

describe('MCPOAuthService: revocation on disconnect', () => {
  it('calls GitHub revocation endpoint on disconnect', async () => {
    const { prisma } = await import('../../lib/prisma');
    (prisma.mCPIntegration.findUnique as any).mockResolvedValue({
      id: '1', userId: 'u1', toolType: 'github', isActive: true,
      accessToken: service.encrypt('token-to-revoke'),
    });
    (prisma.mCPIntegration.update as any).mockResolvedValue({});

    const mockDelete = vi.mocked(axios.delete);
    mockDelete.mockResolvedValueOnce({} as any);

    await service.disconnectIntegration('u1', 'github');

    expect(mockDelete).toHaveBeenCalledWith(
      expect.stringContaining('api.github.com/applications'),
      expect.objectContaining({ data: { access_token: 'token-to-revoke' } })
    );
  });

  it('completes disconnect even if revocation fails', async () => {
    const { prisma } = await import('../../lib/prisma');
    (prisma.mCPIntegration.findUnique as any).mockResolvedValue({
      id: '1', userId: 'u1', toolType: 'github', isActive: true,
      accessToken: service.encrypt('token-to-revoke'),
    });
    (prisma.mCPIntegration.update as any).mockResolvedValue({});

    const mockDelete = vi.mocked(axios.delete);
    mockDelete.mockRejectedValueOnce(new Error('404 Not Found'));

    const result = await service.disconnectIntegration('u1', 'github');
    expect(result).toBe(true);
  });
});
