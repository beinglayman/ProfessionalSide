#!/usr/bin/env ts-node
/**
 * OAuth CLI — Testing tool for OAuth token lifecycle
 *
 * Usage:
 *   npx ts-node src/cli/oauth-cli.ts <command> [options]
 *
 * Commands:
 *   status                    List all users with integrations and per-tool status
 *   inspect <tool>            Show token metadata (NOT the token itself)
 *   refresh <tool>            Force-refresh token (even if not expired)
 *   validate-all              Validate all integrations in parallel
 *   disconnect <tool>         Disconnect + revoke token at provider
 *   simulate-failure <tool>   Corrupt refresh token → trigger real 400 → restore
 */

import { Command } from 'commander';
import { prisma } from '../lib/prisma';
import { oauthService } from '../services/mcp/mcp-oauth.service';
import { MCPToolType } from '../types/mcp.types';

const program = new Command();

program
  .name('oauth-cli')
  .description('OAuth token lifecycle testing tool')
  .version('1.0.0');

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
      // Summary: all users
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
    const results = await oauthService.validateAllIntegrations(opts.user);

    if (Object.keys(results).length === 0) {
      console.log('No active integrations found.');
      return;
    }

    if (opts.json) {
      console.log(JSON.stringify(results, null, 2));
    } else {
      for (const [tool, result] of Object.entries(results)) {
        const icon = result.status === 'valid' ? '✓' : result.status === 'expired' ? '⏱' : '✗';
        console.log(`  ${icon} ${tool}: ${result.status}${result.error ? ` (${result.error})` : ''}`);
      }
    }
  });

// --- disconnect command ---
program
  .command('disconnect <tool>')
  .description('Disconnect + revoke token at provider')
  .requiredOption('--user <userId>', 'User ID')
  .action(async (tool, opts) => {
    process.env.DEBUG_OAUTH = 'true'; // Show revocation logs
    console.log(`Disconnecting ${tool} for user ${opts.user}...`);
    const success = await oauthService.disconnectIntegration(opts.user, tool as MCPToolType);
    console.log(success ? 'Disconnected successfully' : 'Disconnect FAILED');
  });

// --- simulate-failure command ---
program
  .command('simulate-failure <tool>')
  .description('Corrupt refresh token → trigger real 400 → restore')
  .requiredOption('--user <userId>', 'User ID')
  .action(async (tool, opts) => {
    process.env.DEBUG_OAUTH = 'true';
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

    // Corrupt refresh token
    console.log('2. Corrupting refresh token in DB...');
    await prisma.mCPIntegration.update({
      where: { id: integration.id },
      data: { refreshToken: originalRefreshToken.split('').reverse().join('') },
    });

    // Force refresh — should hit real provider and get 400
    console.log('3. Triggering forced refresh (expect 400 from provider)...');
    const result = await oauthService.getAccessToken(userId, tool as MCPToolType);
    console.log(`4. Result: ${result ? 'got token (unexpected)' : 'null (expected — graceful failure)'}`);

    // Restore
    console.log('5. Restoring original refresh token...');
    await prisma.mCPIntegration.update({
      where: { id: integration.id },
      data: { refreshToken: originalRefreshToken },
    });

    console.log('6. Done. Token restored.');
  });

program.parseAsync(process.argv).catch(console.error).finally(async () => {
  await prisma.$disconnect();
});
