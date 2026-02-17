/**
 * MCP Controller Integration Tests
 *
 * Tests the controller handler functions with mock req/res objects.
 * Mocks: Prisma, oauthService, demo-mode middleware.
 * Exercises the full request → controller → service → response pipeline.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';

// ---------------------------------------------------------------------------
// Environment stubs (must come before any imports that read env)
// ---------------------------------------------------------------------------
vi.stubEnv('ENCRYPTION_KEY', 'test-key-for-controller-tests');
vi.stubEnv('GITHUB_CLIENT_ID', 'test-github-id');
vi.stubEnv('GITHUB_CLIENT_SECRET', 'test-github-secret');
vi.stubEnv('FRONTEND_URL', 'http://localhost:5173');

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('../lib/prisma', () => ({
  prisma: {
    mCPIntegration: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

const mockGetAuthorizationUrl = vi.fn();
const mockGetAuthorizationUrlForGroup = vi.fn();
const mockHandleCallback = vi.fn();
const mockDisconnectIntegration = vi.fn();
const mockValidateAllIntegrations = vi.fn();

vi.mock('../services/mcp/mcp-oauth.service', () => ({
  oauthService: {
    getAuthorizationUrl: (...args: any[]) => mockGetAuthorizationUrl(...args),
    getAuthorizationUrlForGroup: (...args: any[]) => mockGetAuthorizationUrlForGroup(...args),
    handleCallback: (...args: any[]) => mockHandleCallback(...args),
    disconnectIntegration: (...args: any[]) => mockDisconnectIntegration(...args),
    validateAllIntegrations: (...args: any[]) => mockValidateAllIntegrations(...args),
  },
}));

vi.mock('../middleware/demo-mode.middleware', () => ({
  isDemoModeRequest: () => false,
}));

vi.mock('../services/mcp/format7-transformer.service', () => ({
  format7Transformer: {},
}));

vi.mock('../services/mcp/content-sanitizer.service', () => ({
  getContentSanitizerService: () => ({}),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a mock Express Request */
function mockReq(overrides: Partial<Request> = {}): Request {
  return {
    user: { id: 'user-1', email: 'test@example.com', name: 'Test' },
    body: {},
    params: {},
    query: {},
    headers: {},
    ...overrides,
  } as unknown as Request;
}

/** Create a mock Express Response that captures status + json */
function mockRes() {
  const data: { statusCode?: number; body?: any; redirectUrl?: string } = {};
  const res = {
    status: vi.fn().mockImplementation((code: number) => {
      data.statusCode = code;
      return res;
    }),
    json: vi.fn().mockImplementation((body: any) => {
      data.body = body;
      return res;
    }),
    redirect: vi.fn().mockImplementation((url: string) => {
      data.redirectUrl = url;
      return res;
    }),
    _data: data,
  };
  return res as unknown as Response & { _data: typeof data };
}

/** Extract the inner async handler from asyncHandler wrapper */
function unwrap(handler: any) {
  // asyncHandler returns (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)
  // We call it directly, providing a no-op next
  return (req: Request, res: Response) => handler(req, res, vi.fn());
}

// ---------------------------------------------------------------------------
// Import controller AFTER mocks are registered
// ---------------------------------------------------------------------------

let controller: typeof import('../controllers/mcp.controller');

beforeEach(async () => {
  vi.clearAllMocks();
  // Reset prisma mocks
  const { prisma } = await import('../lib/prisma');
  (prisma.mCPIntegration.findMany as any).mockReset();
  (prisma.mCPIntegration.findUnique as any).mockReset();
  // Lazy import to ensure mocks are applied
  controller = await import('../controllers/mcp.controller');
});

// ===========================================================================
// getAvailableTools
// ===========================================================================

describe('getAvailableTools', () => {
  it('returns 401 when user is not authenticated', async () => {
    const req = mockReq({ user: undefined });
    const res = mockRes();

    await unwrap(controller.getAvailableTools)(req, res);

    expect(res._data.statusCode).toBe(401);
    expect(res._data.body.success).toBe(false);
  });

  it('returns all tools with connection status', async () => {
    const { prisma } = await import('../lib/prisma');
    (prisma.mCPIntegration.findMany as any).mockResolvedValue([
      { toolType: 'github', isConnected: true, connectedAt: '2026-01-01', lastSyncAt: '2026-01-02' },
    ]);

    const req = mockReq();
    const res = mockRes();

    await unwrap(controller.getAvailableTools)(req, res);

    expect(res._data.statusCode).toBe(200);
    expect(res._data.body.success).toBe(true);

    const tools = res._data.body.data.tools;
    expect(tools.length).toBeGreaterThan(5);

    const github = tools.find((t: any) => t.toolType === 'github');
    expect(github.isConnected).toBe(true);

    const jira = tools.find((t: any) => t.toolType === 'jira');
    expect(jira.isConnected).toBe(false);
  });

  it('includes privacy status in response', async () => {
    const { prisma } = await import('../lib/prisma');
    (prisma.mCPIntegration.findMany as any).mockResolvedValue([]);

    const req = mockReq();
    const res = mockRes();

    await unwrap(controller.getAvailableTools)(req, res);

    expect(res._data.body.data.privacyStatus).toBeDefined();
    expect(res._data.body.data.privacyStatus.encryptionStandard).toBe('AES-256');
  });
});

// ===========================================================================
// getIntegrationStatus
// ===========================================================================

describe('getIntegrationStatus', () => {
  it('returns 401 when unauthenticated', async () => {
    const req = mockReq({ user: undefined });
    const res = mockRes();

    await unwrap(controller.getIntegrationStatus)(req, res);

    expect(res._data.statusCode).toBe(401);
  });

  it('returns all 11 tools with metadata', async () => {
    const { prisma } = await import('../lib/prisma');
    (prisma.mCPIntegration.findMany as any).mockResolvedValue([
      { id: '1', toolType: 'github', isConnected: true, connectedAt: '2026-01-01', lastSyncAt: '2026-01-02', scope: 'repo' },
    ]);

    const req = mockReq();
    const res = mockRes();

    await unwrap(controller.getIntegrationStatus)(req, res);

    expect(res._data.statusCode).toBe(200);
    const integrations = res._data.body.data.integrations;
    expect(integrations).toHaveLength(11);

    const github = integrations.find((i: any) => i.toolType === 'github');
    expect(github.isConnected).toBe(true);
    expect(github.name).toBe('GitHub');

    // Unconnected tools get placeholder
    const slack = integrations.find((i: any) => i.toolType === 'slack');
    expect(slack.isConnected).toBe(false);
    expect(slack.name).toBe('Slack');
  });
});

// ===========================================================================
// validateIntegrations
// ===========================================================================

describe('validateIntegrations', () => {
  it('returns 401 when unauthenticated', async () => {
    const req = mockReq({ user: undefined });
    const res = mockRes();

    await unwrap(controller.validateIntegrations)(req, res);

    expect(res._data.statusCode).toBe(401);
  });

  it('returns validation results with summary', async () => {
    mockValidateAllIntegrations.mockResolvedValue({
      github: { status: 'valid' },
      jira: { status: 'expired' },
    });

    const req = mockReq();
    const res = mockRes();

    await unwrap(controller.validateIntegrations)(req, res);

    expect(res._data.statusCode).toBe(200);
    const data = res._data.body.data;
    expect(data.validations.github.status).toBe('valid');
    expect(data.summary.valid).toBe(1);
    expect(data.summary.expired).toBe(1);
    expect(data.summary.total).toBe(2);
  });
});

// ===========================================================================
// initiateOAuth
// ===========================================================================

describe('initiateOAuth', () => {
  it('returns 401 when unauthenticated', async () => {
    const req = mockReq({ user: undefined, body: { toolType: 'github' } });
    const res = mockRes();

    await unwrap(controller.initiateOAuth)(req, res);

    expect(res._data.statusCode).toBe(401);
  });

  it('returns 400 for invalid tool type', async () => {
    const req = mockReq({ body: { toolType: 'nonexistent' } });
    const res = mockRes();

    await unwrap(controller.initiateOAuth)(req, res);

    expect(res._data.statusCode).toBe(400);
    expect(res._data.body.error).toMatch(/Invalid/i);
  });

  it('returns 400 when toolType is missing', async () => {
    const req = mockReq({ body: {} });
    const res = mockRes();

    await unwrap(controller.initiateOAuth)(req, res);

    expect(res._data.statusCode).toBe(400);
  });

  it('returns authUrl for valid configured tool', async () => {
    mockGetAuthorizationUrl.mockReturnValue({
      url: 'https://github.com/login/oauth/authorize?client_id=test',
      state: 'base64state',
    });

    const req = mockReq({ body: { toolType: 'github' } });
    const res = mockRes();

    await unwrap(controller.initiateOAuth)(req, res);

    expect(res._data.statusCode).toBe(200);
    expect(res._data.body.data.authUrl).toContain('github.com');
    expect(res._data.body.data.toolType).toBe('github');
    expect(mockGetAuthorizationUrl).toHaveBeenCalledWith('user-1', 'github');
  });

  it('returns 500 when OAuth is not configured for tool', async () => {
    mockGetAuthorizationUrl.mockReturnValue(null);

    const req = mockReq({ body: { toolType: 'jira' } });
    const res = mockRes();

    await unwrap(controller.initiateOAuth)(req, res);

    expect(res._data.statusCode).toBe(500);
    expect(res._data.body.error).toMatch(/not configured/i);
  });
});

// ===========================================================================
// initiateGroupOAuth
// ===========================================================================

describe('initiateGroupOAuth', () => {
  it('returns 401 when unauthenticated', async () => {
    const req = mockReq({ user: undefined, body: { groupType: 'atlassian' } });
    const res = mockRes();

    await unwrap(controller.initiateGroupOAuth)(req, res);

    expect(res._data.statusCode).toBe(401);
  });

  it('returns 400 for invalid group type', async () => {
    const req = mockReq({ body: { groupType: 'invalid' } });
    const res = mockRes();

    await unwrap(controller.initiateGroupOAuth)(req, res);

    expect(res._data.statusCode).toBe(400);
    expect(res._data.body.error).toMatch(/Invalid group/i);
  });

  it('returns authUrl for atlassian group', async () => {
    mockGetAuthorizationUrlForGroup.mockReturnValue({
      url: 'https://auth.atlassian.com/authorize?...',
      state: 'base64state',
      tools: ['jira', 'confluence'],
    });

    const req = mockReq({ body: { groupType: 'atlassian' } });
    const res = mockRes();

    await unwrap(controller.initiateGroupOAuth)(req, res);

    expect(res._data.statusCode).toBe(200);
    expect(res._data.body.data.authUrl).toContain('atlassian');
    expect(res._data.body.data.tools).toEqual(['jira', 'confluence']);
    expect(mockGetAuthorizationUrlForGroup).toHaveBeenCalledWith('user-1', 'atlassian');
  });

  it('returns 500 when group OAuth is not configured', async () => {
    mockGetAuthorizationUrlForGroup.mockReturnValue(null);

    const req = mockReq({ body: { groupType: 'microsoft' } });
    const res = mockRes();

    await unwrap(controller.initiateGroupOAuth)(req, res);

    expect(res._data.statusCode).toBe(500);
    expect(res._data.body.error).toMatch(/not configured/i);
  });
});

// ===========================================================================
// handleOAuthCallback
// ===========================================================================

describe('handleOAuthCallback', () => {
  const makeState = (data: Record<string, any>) =>
    Buffer.from(JSON.stringify(data)).toString('base64');

  it('redirects with error when OAuth provider returns error', async () => {
    const req = mockReq({
      params: { toolType: 'github' },
      query: { error: 'access_denied' },
    });
    const res = mockRes();

    await unwrap(controller.handleOAuthCallback)(req, res);

    expect(res._data.redirectUrl).toContain('error=access_denied');
    expect(res._data.redirectUrl).toContain('tool=github');
  });

  it('redirects with error when code is missing', async () => {
    const req = mockReq({
      params: { toolType: 'github' },
      query: { state: makeState({ userId: 'u1', toolType: 'github', iat: Date.now() }) },
    });
    const res = mockRes();

    await unwrap(controller.handleOAuthCallback)(req, res);

    expect(res._data.redirectUrl).toContain('error=missing_params');
  });

  it('redirects with error when state is missing', async () => {
    const req = mockReq({
      params: { toolType: 'github' },
      query: { code: 'auth-code' },
    });
    const res = mockRes();

    await unwrap(controller.handleOAuthCallback)(req, res);

    expect(res._data.redirectUrl).toContain('error=missing_params');
  });

  it('redirects with error for invalid tool type', async () => {
    const req = mockReq({
      params: { toolType: 'nonexistent' },
      query: {
        code: 'auth-code',
        state: makeState({ userId: 'u1', toolType: 'nonexistent', iat: Date.now() }),
      },
    });
    const res = mockRes();

    await unwrap(controller.handleOAuthCallback)(req, res);

    expect(res._data.redirectUrl).toContain('error=invalid_tool');
  });

  it('redirects with error when state toolType mismatches URL param', async () => {
    const req = mockReq({
      params: { toolType: 'github' },
      query: {
        code: 'auth-code',
        state: makeState({ userId: 'u1', toolType: 'jira', iat: Date.now() }),
      },
    });
    const res = mockRes();

    await unwrap(controller.handleOAuthCallback)(req, res);

    expect(res._data.redirectUrl).toContain('error=state_mismatch');
  });

  it('redirects with error when state has no userId', async () => {
    const req = mockReq({
      params: { toolType: 'github' },
      query: {
        code: 'auth-code',
        state: makeState({ toolType: 'github', iat: Date.now() }),
      },
    });
    const res = mockRes();

    await unwrap(controller.handleOAuthCallback)(req, res);

    expect(res._data.redirectUrl).toContain('error=invalid_state');
  });

  it('redirects with error on malformed (non-base64) state', async () => {
    const req = mockReq({
      params: { toolType: 'github' },
      query: { code: 'auth-code', state: '%%%invalid%%%' },
    });
    const res = mockRes();

    await unwrap(controller.handleOAuthCallback)(req, res);

    expect(res._data.redirectUrl).toContain('error=invalid_state');
  });

  it('redirects to success on valid callback', async () => {
    mockHandleCallback.mockResolvedValue({
      success: true,
      toolType: 'github',
    });

    const state = makeState({ userId: 'u1', toolType: 'github', iat: Date.now() });
    const req = mockReq({
      params: { toolType: 'github' },
      query: { code: 'valid-code', state },
    });
    const res = mockRes();

    await unwrap(controller.handleOAuthCallback)(req, res);

    expect(res._data.redirectUrl).toContain('success=true');
    expect(res._data.redirectUrl).toContain('tools=github');
    expect(mockHandleCallback).toHaveBeenCalledWith('valid-code', state);
  });

  it('redirects with multiple tools on group callback success', async () => {
    mockHandleCallback.mockResolvedValue({
      success: true,
      toolTypes: ['jira', 'confluence'],
    });

    const state = makeState({ userId: 'u1', groupType: 'atlassian', iat: Date.now() });
    const req = mockReq({
      params: { toolType: 'atlassian' },
      query: { code: 'valid-code', state },
    });
    const res = mockRes();

    await unwrap(controller.handleOAuthCallback)(req, res);

    expect(res._data.redirectUrl).toContain('success=true');
    expect(res._data.redirectUrl).toContain('tools=jira,confluence');
  });

  it('redirects with error when oauthService.handleCallback fails', async () => {
    mockHandleCallback.mockResolvedValue({ success: false });

    const state = makeState({ userId: 'u1', toolType: 'github', iat: Date.now() });
    const req = mockReq({
      params: { toolType: 'github' },
      query: { code: 'bad-code', state },
    });
    const res = mockRes();

    await unwrap(controller.handleOAuthCallback)(req, res);

    expect(res._data.redirectUrl).toContain('error=oauth_exchange_failed');
  });

  it('validates group type matches state for group callbacks', async () => {
    const state = makeState({ userId: 'u1', groupType: 'microsoft', iat: Date.now() });
    const req = mockReq({
      params: { toolType: 'atlassian' },
      query: { code: 'auth-code', state },
    });
    const res = mockRes();

    await unwrap(controller.handleOAuthCallback)(req, res);

    expect(res._data.redirectUrl).toContain('error=state_mismatch');
  });
});

// ===========================================================================
// disconnectIntegration
// ===========================================================================

describe('disconnectIntegration', () => {
  it('returns 401 when unauthenticated', async () => {
    const req = mockReq({ user: undefined, params: { toolType: 'github' } });
    const res = mockRes();

    await unwrap(controller.disconnectIntegration)(req, res);

    expect(res._data.statusCode).toBe(401);
  });

  it('returns 404 when integration not found', async () => {
    mockDisconnectIntegration.mockResolvedValue(false);

    const req = mockReq({ params: { toolType: 'github' } });
    const res = mockRes();

    await unwrap(controller.disconnectIntegration)(req, res);

    expect(res._data.statusCode).toBe(404);
    expect(res._data.body.error).toMatch(/not found/i);
  });

  it('returns success on disconnect', async () => {
    mockDisconnectIntegration.mockResolvedValue(true);

    const req = mockReq({ params: { toolType: 'github' } });
    const res = mockRes();

    await unwrap(controller.disconnectIntegration)(req, res);

    expect(res._data.statusCode).toBe(200);
    expect(res._data.body.data.message).toContain('github');
    expect(res._data.body.data.privacyNotice).toMatch(/revoked/i);
    expect(mockDisconnectIntegration).toHaveBeenCalledWith('user-1', 'github');
  });
});
