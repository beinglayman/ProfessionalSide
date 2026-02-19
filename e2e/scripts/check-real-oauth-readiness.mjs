#!/usr/bin/env node

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

dotenv.config({ path: path.join(projectRoot, '.env.local'), quiet: true });
dotenv.config({ path: path.join(projectRoot, '.env'), quiet: true });

const apiBaseUrl = process.env.E2E_API_URL || 'http://localhost:3002/api/v1';
const email = process.env.E2E_REAL_EMAIL || process.env.E2E_EMAIL;
const password = process.env.E2E_REAL_PASSWORD || process.env.E2E_PASSWORD;
const requiredTools = getRequiredTools(process.env.E2E_REQUIRED_TOOLS);

if (!email || !password) {
  console.error('Missing credentials.');
  console.error(
    'Set E2E_REAL_EMAIL + E2E_REAL_PASSWORD (or E2E_EMAIL + E2E_PASSWORD).'
  );
  process.exit(1);
}

function getRequiredTools(rawValue) {
  if (!rawValue) {
    return ['github', 'jira', 'confluence', 'google_workspace', 'outlook'];
  }

  const parsed = rawValue
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  return parsed.length > 0
    ? parsed
    : ['github', 'jira', 'confluence', 'google_workspace', 'outlook'];
}

function normalizeIntegrations(payload) {
  const raw = payload?.data?.integrations || payload?.integrations || [];
  if (!Array.isArray(raw)) return [];

  return raw.map((item) => ({
    toolType: String(item.toolType || item.tool || '').toLowerCase(),
    isConnected: Boolean(item.isConnected),
  }));
}

function normalizeValidationMap(payload) {
  const raw = payload?.data?.validations || payload?.validations || {};
  const map = {};
  for (const [toolType, entry] of Object.entries(raw)) {
    map[toolType.toLowerCase()] =
      typeof entry === 'object' && entry !== null
        ? String(entry.status || '').toLowerCase()
        : '';
  }
  return map;
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

async function main() {
  console.log(`Checking real OAuth readiness at ${apiBaseUrl}`);
  console.log(`Required tools: ${requiredTools.join(', ')}`);

  const { response: loginResponse, payload: loginPayload } = await requestJson(
    `${apiBaseUrl}/auth/login`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }
  );

  if (!loginResponse.ok()) {
    console.error(`Login failed (${loginResponse.status}).`);
    console.error(
      loginPayload?.error || loginPayload?.message || 'Unable to authenticate.'
    );
    process.exit(1);
  }

  const accessToken =
    loginPayload?.data?.accessToken || loginPayload?.accessToken || '';

  if (!accessToken) {
    console.error('Login succeeded but access token was missing in response.');
    process.exit(1);
  }

  const authHeaders = { Authorization: `Bearer ${accessToken}` };

  const {
    response: integrationsResponse,
    payload: integrationsPayload,
  } = await requestJson(`${apiBaseUrl}/mcp/integrations`, { headers: authHeaders });

  if (!integrationsResponse.ok()) {
    console.error(
      `Failed to fetch integrations (${integrationsResponse.status}).`
    );
    process.exit(1);
  }

  const integrations = normalizeIntegrations(integrationsPayload);
  const connectedTools = integrations
    .filter((item) => item.isConnected)
    .map((item) => item.toolType);

  const missingTools = requiredTools.filter(
    (tool) => !connectedTools.includes(tool)
  );

  if (missingTools.length > 0) {
    console.error(
      `Missing connected integrations: ${missingTools.join(', ')}`
    );
    console.error('Connect these in /settings/integrations and rerun this check.');
    process.exit(1);
  }

  const {
    response: validationResponse,
    payload: validationPayload,
  } = await requestJson(`${apiBaseUrl}/mcp/integrations/validate`, {
    headers: authHeaders,
  });

  if (!validationResponse.ok()) {
    console.error(
      `Failed to validate integrations (${validationResponse.status}).`
    );
    process.exit(1);
  }

  const validationMap = normalizeValidationMap(validationPayload);
  const invalidTools = requiredTools.filter(
    (tool) => validationMap[tool] !== 'valid'
  );

  if (invalidTools.length > 0) {
    console.error(
      `Connected but invalid/expired integrations: ${invalidTools.join(', ')}`
    );
    console.error('Reconnect these tools in /settings/integrations.');
    process.exit(1);
  }

  console.log('Real OAuth readiness check passed.');
}

main().catch((error) => {
  console.error('Unexpected failure while checking readiness:');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
