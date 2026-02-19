#!/usr/bin/env node

/**
 * E2E Teardown Script
 *
 * Wipes MCP integrations and hard-deletes the E2E test user.
 * Reads credentials from .env.local (E2E_REAL_EMAIL / E2E_REAL_PASSWORD).
 *
 * Usage: npm run e2e:teardown
 */

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

if (!email || !password) {
  console.error('Missing credentials.');
  console.error(
    'Set E2E_REAL_EMAIL + E2E_REAL_PASSWORD (or E2E_EMAIL + E2E_PASSWORD) in .env.local.'
  );
  process.exit(1);
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

async function main() {
  console.log(`Tearing down E2E user at ${apiBaseUrl}`);
  console.log(`Email: ${email}`);

  // Step 1: Login
  console.log('\n1. Logging in...');
  const { response: loginResponse, payload: loginPayload } = await requestJson(
    `${apiBaseUrl}/auth/login`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }
  );

  if (!loginResponse.ok) {
    // If login fails, the user is likely already deleted — treat as success
    console.log(`Login failed (${loginResponse.status}). User may already be deleted.`);
    console.log('\nTeardown complete (no-op). Email is available for re-registration.');
    process.exit(0);
  }

  const accessToken =
    loginPayload?.data?.accessToken || loginPayload?.accessToken || '';

  if (!accessToken) {
    console.error('Login succeeded but access token was missing.');
    process.exit(1);
  }

  const authHeaders = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  // Step 2: Wipe MCP integrations
  console.log('2. Wiping MCP integrations...');
  const { response: mcpResponse } = await requestJson(
    `${apiBaseUrl}/mcp/data`,
    { method: 'DELETE', headers: authHeaders }
  );

  if (mcpResponse.ok) {
    console.log('   MCP data wiped.');
  } else {
    console.log(`   MCP wipe returned ${mcpResponse.status} (may not exist yet — continuing).`);
  }

  // Step 3: Hard-delete user
  console.log('3. Hard-deleting user...');
  const { response: deleteResponse, payload: deletePayload } = await requestJson(
    `${apiBaseUrl}/users/hard-delete`,
    { method: 'DELETE', headers: authHeaders }
  );

  if (!deleteResponse.ok) {
    const errorMsg =
      deletePayload?.error || deletePayload?.message || `HTTP ${deleteResponse.status}`;
    console.error(`Hard-delete failed: ${errorMsg}`);
    process.exit(1);
  }

  console.log('   User hard-deleted.');
  console.log('\nTeardown complete. Email is now available for re-registration.');
}

main().catch((error) => {
  console.error('Unexpected failure during teardown:');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
