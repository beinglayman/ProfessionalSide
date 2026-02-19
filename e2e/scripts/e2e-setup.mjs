#!/usr/bin/env node

/**
 * E2E Setup Script
 *
 * Creates the E2E test user account headlessly.
 * Reads credentials from .env.local (E2E_REAL_EMAIL / E2E_REAL_PASSWORD).
 *
 * Usage: npm run e2e:setup
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
const name = process.env.E2E_REAL_NAME || 'E2E Test User';

if (!email || !password) {
  console.error('Missing credentials.');
  console.error(
    'Set E2E_REAL_EMAIL + E2E_REAL_PASSWORD (or E2E_EMAIL + E2E_PASSWORD) in .env.local.'
  );
  process.exit(1);
}

async function main() {
  console.log(`Creating E2E user at ${apiBaseUrl}`);
  console.log(`Email: ${email}`);

  const response = await fetch(`${apiBaseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg =
      payload?.error || payload?.message || `HTTP ${response.status}`;

    if (response.status === 409 || errorMsg.toLowerCase().includes('already exists')) {
      console.error(`User already exists: ${email}`);
      console.error('Run "npm run e2e:teardown" first to remove the existing user.');
      process.exit(1);
    }

    console.error(`Registration failed: ${errorMsg}`);
    process.exit(1);
  }

  const userId = payload?.data?.user?.id || payload?.user?.id || '(unknown)';
  console.log(`User created successfully.`);
  console.log(`  ID: ${userId}`);
  console.log(`  Email: ${email}`);
  console.log('');
  console.log('Next steps:');
  console.log('  1. Configure OAuth apps and set client IDs/secrets in backend/.env');
  console.log('  2. Connect integrations at /settings/integrations');
  console.log('  3. Run: npm run e2e:oauth:readiness');
}

main().catch((error) => {
  console.error('Unexpected failure during setup:');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
