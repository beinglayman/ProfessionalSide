import { APIRequestContext, Page } from '@playwright/test';

export const DEFAULT_BACKEND_API_URL =
  process.env.E2E_API_URL || 'http://localhost:3002/api/v1';

export const DEFAULT_REQUIRED_REAL_TOOLS = [
  'github',
  'jira',
  'confluence',
  'google_workspace',
  'outlook',
] as const;

export interface MCPIntegrationStatus {
  toolType: string;
  isConnected: boolean;
}

export interface RealOAuthReadiness {
  requiredTools: string[];
  connectedTools: string[];
  missingTools: string[];
  invalidTools: string[];
}

export function isRealOAuthEnabled(): boolean {
  return process.env.E2E_REAL_OAUTH === 'true';
}

export function getRequiredRealTools(
  rawValue = process.env.E2E_REQUIRED_TOOLS
): string[] {
  if (!rawValue) {
    return [...DEFAULT_REQUIRED_REAL_TOOLS];
  }

  const tools = rawValue
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (tools.length === 0) {
    return [...DEFAULT_REQUIRED_REAL_TOOLS];
  }

  return tools;
}

export async function disableDemoMode(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.setItem('app-demo-mode', 'false');
  });
}

export async function getAccessTokenFromPage(page: Page): Promise<string> {
  return page.evaluate(() => localStorage.getItem('inchronicle_access_token') || '');
}

function normalizeIntegrations(payload: any): MCPIntegrationStatus[] {
  const rawIntegrations = payload?.data?.integrations || payload?.integrations || [];

  if (!Array.isArray(rawIntegrations)) {
    return [];
  }

  return rawIntegrations
    .map((item: any) => ({
      toolType: String(item.toolType || item.tool || '').toLowerCase(),
      isConnected: Boolean(item.isConnected),
    }))
    .filter((item: MCPIntegrationStatus) => Boolean(item.toolType));
}

function normalizeValidationMap(payload: any): Record<string, string> {
  const validations = payload?.data?.validations || payload?.validations || {};
  const normalized: Record<string, string> = {};

  for (const [toolType, entry] of Object.entries(validations)) {
    const status = typeof entry === 'object' && entry !== null
      ? String((entry as any).status || '')
      : '';
    normalized[toolType.toLowerCase()] = status.toLowerCase();
  }

  return normalized;
}

export async function assertRealOAuthReadiness(options: {
  request: APIRequestContext;
  accessToken: string;
  requiredTools?: string[];
  apiBaseUrl?: string;
}): Promise<RealOAuthReadiness> {
  const {
    request,
    accessToken,
    requiredTools = getRequiredRealTools(),
    apiBaseUrl = DEFAULT_BACKEND_API_URL,
  } = options;

  if (!accessToken) {
    throw new Error(
      'Missing inchronicle access token after login. Cannot validate real OAuth readiness.'
    );
  }

  const authHeaders = { Authorization: `Bearer ${accessToken}` };

  const integrationResponse = await request.get(`${apiBaseUrl}/mcp/integrations`, {
    headers: authHeaders,
  });

  if (!integrationResponse.ok()) {
    throw new Error(
      `Failed to fetch MCP integrations from ${apiBaseUrl}/mcp/integrations (status ${integrationResponse.status()}).`
    );
  }

  const integrationPayload = await integrationResponse.json();
  const integrations = normalizeIntegrations(integrationPayload);
  const connectedTools = integrations
    .filter((item) => item.isConnected)
    .map((item) => item.toolType);

  const missingTools = requiredTools.filter(
    (tool) => !connectedTools.includes(tool.toLowerCase())
  );

  if (missingTools.length > 0) {
    throw new Error(
      [
        'Real OAuth readiness check failed.',
        `Missing connected integrations: ${missingTools.join(', ')}`,
        'One-time setup:',
        '1) Connect tools in /settings/integrations with the real E2E account.',
        '2) Validate backend OAuth config: cd backend && npm run oauth-cli -- validate',
        '3) Re-run: npm run e2e:oauth:readiness',
      ].join('\n')
    );
  }

  const validationResponse = await request.get(
    `${apiBaseUrl}/mcp/integrations/validate`,
    { headers: authHeaders }
  );

  if (!validationResponse.ok()) {
    throw new Error(
      `Failed to validate MCP integrations at ${apiBaseUrl}/mcp/integrations/validate (status ${validationResponse.status()}).`
    );
  }

  const validationPayload = await validationResponse.json();
  const validationMap = normalizeValidationMap(validationPayload);

  const invalidTools = requiredTools.filter((tool) => {
    const status = validationMap[tool.toLowerCase()];
    return status !== 'valid';
  });

  if (invalidTools.length > 0) {
    throw new Error(
      [
        'Real OAuth readiness check failed.',
        `Connected but invalid/expired integrations: ${invalidTools.join(', ')}`,
        'Re-authenticate these tools in /settings/integrations and retry.',
      ].join('\n')
    );
  }

  return {
    requiredTools,
    connectedTools,
    missingTools: [],
    invalidTools: [],
  };
}
