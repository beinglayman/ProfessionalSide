#!/usr/bin/env ts-node
/**
 * OAuth CLI — Setup, validation, and token lifecycle management
 *
 * Usage:
 *   npm run oauth-cli -- <command> [options]
 *
 * Setup & Validation:
 *   setup                     Walk through OAuth app setup for all providers
 *   setup --provider <name>   Configure a specific provider (github, atlassian, google, microsoft)
 *   validate                  Check .env has correct OAuth credentials + callback URLs
 *
 * Token Lifecycle:
 *   status                    List all users with integrations and per-tool status
 *   inspect <tool>            Show token metadata (NOT the token itself)
 *   refresh <tool>            Force-refresh token (even if not expired)
 *   validate-all              Validate all integrations in parallel
 *   disconnect <tool>         Disconnect + revoke token at provider
 *   simulate-failure <tool>   Corrupt refresh token -> trigger real 400 -> restore
 */

import { Command } from 'commander';
import { prisma } from '../lib/prisma';
import { MCPToolType } from '../types/mcp.types';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as readline from 'readline/promises';

// --- Lazy oauthService import ---
// MCPOAuthService constructor throws if ENCRYPTION_KEY is missing.
// Commands like setup/validate must work without it. Only load on demand.
let _oauthService: any = null;
async function getOAuthService() {
  if (!_oauthService) {
    const mod = await import('../services/mcp/mcp-oauth.service');
    _oauthService = mod.oauthService;
  }
  return _oauthService;
}

// ============================================================
// .env Read/Write Helpers
// ============================================================

interface EnvLine {
  type: 'comment' | 'blank' | 'entry';
  raw: string;
  key?: string;
  value?: string;
}

/**
 * Parse .env file into structured lines, preserving comments and blanks
 * for round-trip fidelity.
 */
export async function readEnvFile(envPath: string): Promise<EnvLine[]> {
  let content: string;
  try {
    content = await fs.readFile(envPath, 'utf-8');
  } catch (err: any) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }

  const lines: EnvLine[] = [];
  for (const raw of content.split('\n')) {
    const trimmed = raw.trim();
    if (trimmed === '') {
      lines.push({ type: 'blank', raw });
    } else if (trimmed.startsWith('#')) {
      lines.push({ type: 'comment', raw });
    } else {
      const eqIdx = raw.indexOf('=');
      if (eqIdx === -1) {
        lines.push({ type: 'comment', raw }); // malformed line, preserve as-is
      } else {
        const key = raw.substring(0, eqIdx).trim();
        const value = raw.substring(eqIdx + 1).trim();
        lines.push({ type: 'entry', raw, key, value });
      }
    }
  }
  return lines;
}

/**
 * Write entries to .env file with atomic temp+backup+rename pattern.
 * Merges new entries into existing file, preserving comments and order.
 * Creates .env from scratch if it doesn't exist.
 */
export async function writeEnvFile(
  envPath: string,
  entries: Map<string, string>,
): Promise<void> {
  const existing = await readEnvFile(envPath);
  const written = new Set<string>();

  // Update existing entries in place
  const updatedLines = existing.map((line) => {
    if (line.type === 'entry' && line.key && entries.has(line.key)) {
      written.add(line.key);
      return { ...line, raw: `${line.key}=${entries.get(line.key)}`, value: entries.get(line.key) };
    }
    return line;
  });

  // Append new entries that weren't already in the file
  for (const [key, value] of entries) {
    if (!written.has(key)) {
      updatedLines.push({ type: 'entry', raw: `${key}=${value}`, key, value });
    }
  }

  const content = updatedLines.map((l) => l.raw).join('\n');

  // Atomic write: write to .env.tmp, backup existing to .env.bak, rename .env.tmp to .env
  const tmpPath = envPath + '.tmp';
  const bakPath = envPath + '.bak';

  await fs.writeFile(tmpPath, content, 'utf-8');

  // Backup existing .env (ignore if doesn't exist)
  try {
    await fs.copyFile(envPath, bakPath);
  } catch (err: any) {
    if (err.code !== 'ENOENT') throw err;
  }

  // Atomic rename
  await fs.rename(tmpPath, envPath);
}

/**
 * Get a Map of env key-value pairs from the .env file.
 */
export async function getEnvMap(envPath: string): Promise<Map<string, string>> {
  const lines = await readEnvFile(envPath);
  const map = new Map<string, string>();
  for (const line of lines) {
    if (line.type === 'entry' && line.key) {
      map.set(line.key, line.value || '');
    }
  }
  return map;
}

// ============================================================
// Provider Contract (shared source of truth)
// ============================================================

import {
  PROVIDER_CONTRACTS,
  VALID_PROVIDERS,
  getBackendUrl,
  getCallbackUrls,
} from '../services/mcp/oauth-provider-contract';

// ============================================================
// Interactive prompt helpers
// ============================================================

async function promptNonBlank(rl: readline.Interface, question: string): Promise<string> {
  while (true) {
    const answer = await rl.question(question);
    const trimmed = answer.trim();
    if (trimmed) return trimmed;
    console.log('  Value cannot be blank. Please try again.');
  }
}

async function promptYesNo(rl: readline.Interface, question: string, defaultNo = true): Promise<boolean> {
  const suffix = defaultNo ? '(y/N)' : '(Y/n)';
  const answer = await rl.question(`${question} ${suffix} `);
  const lower = answer.trim().toLowerCase();
  if (defaultNo) return lower === 'y' || lower === 'yes';
  return lower !== 'n' && lower !== 'no';
}

// ============================================================
// Setup flow
// ============================================================

async function setupProvider(providerKey: string, envPath: string): Promise<boolean> {
  const contract = PROVIDER_CONTRACTS[providerKey];
  if (!contract) {
    console.error(`Unknown provider: ${providerKey}. Valid: ${VALID_PROVIDERS.join(', ')}`);
    return false;
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  try {
    const callbackUrls = getCallbackUrls(contract);

    console.log(`\n--- Setting up ${contract.name} OAuth App ---\n`);
    console.log(`1. Go to: ${contract.consoleUrl}\n`);

    if (callbackUrls.length === 1) {
      console.log(`2. Set callback URL to: ${callbackUrls[0]}\n`);
    } else {
      console.log('2. Register ALL callback URLs:');
      for (const url of callbackUrls) {
        console.log(`   ${url}`);
      }
      console.log();
    }

    for (const note of contract.setupNotes) {
      console.log(`   ${note}`);
    }
    console.log();

    // Check for existing values
    const envMap = await getEnvMap(envPath);
    const existingId = envMap.get(contract.envKeys.clientId);
    const existingSecret = envMap.get(contract.envKeys.clientSecret);

    if (existingId && existingSecret) {
      console.log(`  ${contract.name} credentials already configured.`);
      console.log(`  ${contract.envKeys.clientId} = ${existingId.substring(0, 6)}...`);
      const overwrite = await promptYesNo(rl, '  Overwrite existing credentials?');
      if (!overwrite) {
        console.log(`  Skipping ${contract.name}.`);
        return true;
      }
    }

    const clientId = await promptNonBlank(rl, `  Enter ${contract.name} Client ID: `);
    const clientSecret = await promptNonBlank(rl, `  Enter ${contract.name} Client Secret: `);

    // Write to .env (atomic)
    const newEntries = new Map<string, string>();
    newEntries.set(contract.envKeys.clientId, clientId);
    newEntries.set(contract.envKeys.clientSecret, clientSecret);
    await writeEnvFile(envPath, newEntries);

    console.log(`\n  ${contract.name} credentials saved to .env`);
    return true;
  } finally {
    rl.close();
  }
}

// ============================================================
// Validate flow
// ============================================================

interface ValidationResult {
  provider: string;
  status: 'configured' | 'missing' | 'blank';
  details: string[];
}

async function validateEnv(envPath: string): Promise<void> {
  const envMap = await getEnvMap(envPath);
  let hasErrors = false;

  // 1. Check ENCRYPTION_KEY first — this is the boot-order guard
  const encKey = envMap.get('ENCRYPTION_KEY') || envMap.get('MCP_ENCRYPTION_KEY');
  if (!encKey) {
    console.log('\n  ENCRYPTION_KEY:  missing');
    console.log('    ENCRYPTION_KEY or MCP_ENCRYPTION_KEY is required for OAuth token encryption.');
    console.log('    Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    hasErrors = true;
  } else if (!encKey.trim()) {
    console.log('\n  ENCRYPTION_KEY:  blank');
    hasErrors = true;
  } else {
    console.log('\n  ENCRYPTION_KEY:  present');
  }

  // 2. Check each provider
  const results: ValidationResult[] = [];
  const backendUrl = envMap.get('BACKEND_URL') || 'http://localhost:3002';

  for (const [key, contract] of Object.entries(PROVIDER_CONTRACTS)) {
    const idVal = envMap.get(contract.envKeys.clientId);
    const secretVal = envMap.get(contract.envKeys.clientSecret);
    const details: string[] = [];

    if (!idVal && !secretVal) {
      results.push({ provider: contract.name, status: 'missing', details: ['Not configured'] });
      continue;
    }

    let status: 'configured' | 'blank' = 'configured';

    if (!idVal || !idVal.trim()) {
      details.push(`${contract.envKeys.clientId} is blank`);
      status = 'blank';
    }
    if (!secretVal || !secretVal.trim()) {
      details.push(`${contract.envKeys.clientSecret} is blank`);
      status = 'blank';
    }

    // Check callback URLs
    const expectedUrls = contract.callbackPaths.map((p) => `${backendUrl}${p}`);
    details.push(`Callback URL(s): ${expectedUrls.join(', ')}`);

    results.push({ provider: contract.name, status, details });
  }

  // 3. Print summary
  console.log('\n  --- Provider Status ---\n');

  for (const r of results) {
    const icon = r.status === 'configured' ? 'OK' : r.status === 'missing' ? '--' : 'ERR';
    console.log(`  ${icon}  ${r.provider}: ${r.status}`);
    for (const d of r.details) {
      console.log(`       ${d}`);
    }
    if (r.status === 'blank') hasErrors = true;
  }

  const configured = results.filter((r) => r.status === 'configured').length;
  const total = results.length;
  console.log(`\n  ${configured} of ${total} providers configured.`);

  if (hasErrors) {
    console.log('\n  Issues found. Run "npm run oauth-cli -- setup" to configure providers.\n');
    process.exitCode = 1;
  } else {
    console.log();
  }
}

// ============================================================
// Commander program
// ============================================================

const program = new Command();

program
  .name('oauth-cli')
  .description('OAuth setup, validation, and token lifecycle management')
  .version('1.0.0');

// --- setup command ---
program
  .command('setup')
  .description('Walk through OAuth app setup (guided)')
  .option('--provider <name>', 'Configure a specific provider (github, atlassian, google, microsoft)')
  .action(async (opts) => {
    const envPath = path.resolve(__dirname, '../../.env');

    if (opts.provider) {
      if (!VALID_PROVIDERS.includes(opts.provider)) {
        console.error(`Unknown provider: ${opts.provider}. Valid: ${VALID_PROVIDERS.join(', ')}`);
        process.exitCode = 1;
        return;
      }
      await setupProvider(opts.provider, envPath);
    } else {
      // Walk through all providers sequentially
      console.log('\nOAuth Setup — walking through all providers.\n');
      for (const providerKey of VALID_PROVIDERS) {
        await setupProvider(providerKey, envPath);
      }
      console.log('\nSetup complete. Run "npm run oauth-cli -- validate" to verify.\n');
    }
  });

// --- validate command ---
program
  .command('validate')
  .description('Check .env has correct OAuth credentials and callback URLs')
  .action(async () => {
    const envPath = path.resolve(__dirname, '../../.env');
    await validateEnv(envPath);
  });

// --- status command ---
program
  .command('status')
  .description('List all users with integrations and per-tool status')
  .option('--user <userId>', 'Show detailed status for one user')
  .option('--json', 'Output as JSON')
  .action(async (opts) => {
    if (opts.user) {
      const integrations = await prisma.mCPIntegration.findMany({
        where: { userId: opts.user },
        orderBy: { toolType: 'asc' },
      });

      if (integrations.length === 0) {
        console.log('No integrations found for user', opts.user);
        return;
      }

      const rows = integrations.map(i => ({
        tool: i.toolType,
        active: i.isActive,
        connected: i.isConnected,
        tokenAge: i.connectedAt ? `${Math.round((Date.now() - i.connectedAt.getTime()) / 86400000)}d` : 'n/a',
        expiresIn: i.expiresAt ? `${Math.round((i.expiresAt.getTime() - Date.now()) / 60000)}m` : 'n/a',
        hasRefresh: !!i.refreshToken,
        scope: i.scope || 'n/a',
      }));

      if (opts.json) {
        console.log(JSON.stringify(rows, null, 2));
      } else {
        console.table(rows);
      }
    } else {
      const integrations = await prisma.mCPIntegration.findMany({
        select: { userId: true, toolType: true, isActive: true },
      });

      if (integrations.length === 0) {
        console.log('No integrations found.');
        return;
      }

      const byUser = new Map<string, string[]>();
      for (const i of integrations) {
        const tools = byUser.get(i.userId) || [];
        tools.push(`${i.toolType}${i.isActive ? '' : ' (inactive)'}`);
        byUser.set(i.userId, tools);
      }

      for (const [userId, tools] of byUser) {
        console.log(`${userId}: ${tools.join(', ')}`);
      }
    }
  });

// --- inspect command ---
program
  .command('inspect <tool>')
  .description('Show token metadata (NOT the token itself)')
  .requiredOption('--user <userId>', 'User ID')
  .option('--json', 'Output as JSON')
  .action(async (tool, opts) => {
    const integration = await prisma.mCPIntegration.findUnique({
      where: { userId_toolType: { userId: opts.user, toolType: tool } },
    });

    if (!integration) {
      console.log(`No integration found for ${tool}`);
      return;
    }

    const info = {
      tool: integration.toolType,
      active: integration.isActive,
      connected: integration.isConnected,
      connectedAt: integration.connectedAt?.toISOString() || 'n/a',
      expiresAt: integration.expiresAt?.toISOString() || 'n/a',
      expiresInMs: integration.expiresAt ? integration.expiresAt.getTime() - Date.now() : null,
      hasRefreshToken: !!integration.refreshToken,
      scope: integration.scope || 'n/a',
      updatedAt: integration.updatedAt?.toISOString() || 'n/a',
    };

    if (opts.json) {
      console.log(JSON.stringify(info, null, 2));
    } else {
      console.log('\n--- Token Inspection ---');
      for (const [k, v] of Object.entries(info)) {
        console.log(`  ${k}: ${v}`);
      }
    }
  });

// --- refresh command ---
program
  .command('refresh <tool>')
  .description('Force-refresh token (even if not expired)')
  .requiredOption('--user <userId>', 'User ID')
  .option('--verbose', 'Show retry/backoff details')
  .option('--json', 'Output as JSON')
  .action(async (tool, opts) => {
    if (opts.verbose) process.env.DEBUG_OAUTH = 'true';
    const oauthService = await getOAuthService();

    console.log(`Force-refreshing ${tool} for user ${opts.user}...`);
    const token = await oauthService.getAccessToken(opts.user, tool as MCPToolType);

    if (token) {
      const result = { success: true, tokenPrefix: token.substring(0, 8) + '...' };
      if (opts.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(`Refresh successful. Token starts with: ${result.tokenPrefix}`);
      }
    } else {
      const result = { success: false };
      if (opts.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log('Refresh FAILED — returned null');
      }
    }
  });

// --- validate-all command ---
program
  .command('validate-all')
  .description('Validate all integrations in parallel')
  .requiredOption('--user <userId>', 'User ID')
  .option('--json', 'Output as JSON')
  .action(async (opts) => {
    const oauthService = await getOAuthService();
    const results = await oauthService.validateAllIntegrations(opts.user);

    if (Object.keys(results).length === 0) {
      console.log('No active integrations found.');
      return;
    }

    if (opts.json) {
      console.log(JSON.stringify(results, null, 2));
    } else {
      for (const [tool, result] of Object.entries(results)) {
        const r = result as { status: string; error?: string };
        const icon = r.status === 'valid' ? 'OK' : r.status === 'expired' ? '!!' : 'ERR';
        console.log(`  ${icon} ${tool}: ${r.status}${r.error ? ` (${r.error})` : ''}`);
      }
    }
  });

// --- disconnect command ---
program
  .command('disconnect <tool>')
  .description('Disconnect + revoke token at provider')
  .requiredOption('--user <userId>', 'User ID')
  .action(async (tool, opts) => {
    process.env.DEBUG_OAUTH = 'true';
    const oauthService = await getOAuthService();
    console.log(`Disconnecting ${tool} for user ${opts.user}...`);
    const success = await oauthService.disconnectIntegration(opts.user, tool as MCPToolType);
    console.log(success ? 'Disconnected successfully' : 'Disconnect FAILED');
  });

// --- simulate-failure command ---
program
  .command('simulate-failure <tool>')
  .description('Corrupt refresh token -> trigger real 400 -> restore')
  .requiredOption('--user <userId>', 'User ID')
  .action(async (tool, opts) => {
    console.warn('\nWARNING: This command temporarily corrupts the refresh token in the DB.');
    console.warn('   If you Ctrl+C before step 5 completes, the token will remain corrupted.');
    console.warn('   You would need to manually restore it or re-authenticate.\n');

    process.env.DEBUG_OAUTH = 'true';
    const oauthService = await getOAuthService();
    const userId = opts.user;

    const integration = await prisma.mCPIntegration.findUnique({
      where: { userId_toolType: { userId, toolType: tool } },
    });

    if (!integration || !integration.refreshToken) {
      console.log(`No active integration with refresh token for ${tool}`);
      return;
    }

    const originalRefreshToken = integration.refreshToken;
    console.log('1. Saving original refresh token...');

    console.log('2. Corrupting refresh token in DB...');
    await prisma.mCPIntegration.update({
      where: { id: integration.id },
      data: { refreshToken: originalRefreshToken.split('').reverse().join('') },
    });

    console.log('3. Triggering forced refresh (expect 400 from provider)...');
    const result = await oauthService.getAccessToken(userId, tool as MCPToolType);
    console.log(`4. Result: ${result ? 'got token (unexpected)' : 'null (expected — graceful failure)'}`);

    console.log('5. Restoring original refresh token...');
    await prisma.mCPIntegration.update({
      where: { id: integration.id },
      data: { refreshToken: originalRefreshToken },
    });

    console.log('6. Done. Token restored.');
  });

// Only run CLI when executed directly (not when imported by the controller)
const isDirectExecution = require.main === module ||
  process.argv[1]?.endsWith('oauth-cli.ts') ||
  process.argv[1]?.endsWith('oauth-cli.js');

if (isDirectExecution) {
  program.parseAsync(process.argv).catch(console.error).finally(async () => {
    await prisma.$disconnect();
  });
}
