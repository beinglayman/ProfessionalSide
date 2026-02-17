/**
 * OAuth Setup Controller — Admin API for configuring OAuth provider credentials.
 *
 * Exposes the same functionality as `oauth-cli setup/validate` but via REST API,
 * enabling a web-based setup wizard in the admin UI.
 *
 * All endpoints require admin authentication.
 */

import { Request, Response } from 'express';
import * as path from 'path';
import { sendSuccess, sendError } from '../utils/response.utils';
import { readEnvFile, writeEnvFile, getEnvMap } from '../cli/oauth-cli';
import {
  PROVIDER_CONTRACTS,
  VALID_PROVIDERS,
  getCallbackUrls,
} from '../services/mcp/oauth-provider-contract';

function getEnvPath(): string {
  return path.resolve(__dirname, '../../.env');
}

/**
 * GET /api/v1/admin/oauth/providers
 *
 * Returns all providers with their current configuration status,
 * setup instructions, callback URLs, and console links.
 */
export const getOAuthProviders = async (req: Request, res: Response): Promise<void> => {
  try {
    const envPath = getEnvPath();
    const envMap = await getEnvMap(envPath);

    const providers = VALID_PROVIDERS.map((key) => {
      const contract = PROVIDER_CONTRACTS[key];
      const clientId = envMap.get(contract.envKeys.clientId) || '';
      const clientSecret = envMap.get(contract.envKeys.clientSecret) || '';

      const isConfigured = clientId.trim() !== '' && clientSecret.trim() !== '';
      const isBlank = (clientId !== '' || clientSecret !== '') && !isConfigured;

      // Gather optional env key values
      const optionalKeys = (contract.optionalEnvKeys || []).map((opt) => ({
        key: opt.key,
        description: opt.description,
        defaultValue: opt.defaultValue,
        currentValue: envMap.get(opt.key) || null,
      }));

      return {
        id: key,
        name: contract.name,
        description: contract.description,
        status: isConfigured ? 'configured' : isBlank ? 'blank' : 'missing',
        consoleUrl: contract.consoleUrl,
        preConsoleUrl: contract.preConsoleUrl || null,
        callbackUrls: getCallbackUrls(contract),
        setupNotes: contract.setupNotes,
        scopes: contract.scopes,
        optionalKeys,
        // Show partial client ID for configured providers (confirmation, not security)
        clientIdPreview: isConfigured ? clientId.substring(0, 8) + '...' : null,
      };
    });

    // Check encryption key status
    const encryptionKey = envMap.get('ENCRYPTION_KEY') || envMap.get('MCP_ENCRYPTION_KEY') || '';
    const encryptionKeyStatus = encryptionKey.trim() !== '' ? 'present' : 'missing';

    sendSuccess(res, {
      encryptionKeyStatus,
      providers,
      configured: providers.filter((p) => p.status === 'configured').length,
      total: providers.length,
    });
  } catch (error: any) {
    console.error('[OAuth Setup] Error reading providers:', error.message);
    sendError(res, 'Failed to read OAuth provider configuration', 500);
  }
};

/**
 * POST /api/v1/admin/oauth/providers/:provider/configure
 *
 * Write OAuth credentials for a specific provider to .env.
 * Body: { clientId: string, clientSecret: string, optionalKeys?: Record<string, string> }
 */
export const configureOAuthProvider = async (req: Request, res: Response): Promise<void> => {
  try {
    const { provider } = req.params;

    if (!VALID_PROVIDERS.includes(provider)) {
      sendError(res, `Unknown provider: ${provider}. Valid: ${VALID_PROVIDERS.join(', ')}`, 400);
      return;
    }

    const { clientId, clientSecret, optionalKeys } = req.body;

    if (!clientId || typeof clientId !== 'string' || !clientId.trim()) {
      sendError(res, 'clientId is required and must be non-blank', 400);
      return;
    }

    if (!clientSecret || typeof clientSecret !== 'string' || !clientSecret.trim()) {
      sendError(res, 'clientSecret is required and must be non-blank', 400);
      return;
    }

    const contract = PROVIDER_CONTRACTS[provider];
    const envPath = getEnvPath();

    // Build entries to write
    const entries = new Map<string, string>();
    entries.set(contract.envKeys.clientId, clientId.trim());
    entries.set(contract.envKeys.clientSecret, clientSecret.trim());

    // Write optional keys if provided
    if (optionalKeys && typeof optionalKeys === 'object') {
      for (const opt of contract.optionalEnvKeys || []) {
        const val = optionalKeys[opt.key];
        if (val && typeof val === 'string' && val.trim()) {
          entries.set(opt.key, val.trim());
        }
      }
    }

    await writeEnvFile(envPath, entries);

    // Hot-reload into process.env so no restart needed
    for (const [key, val] of entries) {
      process.env[key] = val;
    }

    console.log(`[OAuth Setup] ${contract.name} credentials configured by admin ${req.admin?.email || 'unknown'}`);

    sendSuccess(res, {
      provider: contract.name,
      status: 'configured',
      keysWritten: Array.from(entries.keys()),
    }, `${contract.name} OAuth credentials saved`);
  } catch (error: any) {
    console.error('[OAuth Setup] Error configuring provider:', error.message);
    sendError(res, 'Failed to save OAuth provider credentials', 500);
  }
};

/**
 * GET /api/v1/admin/oauth/validate
 *
 * Validate all provider configurations in .env.
 * Returns the same checks as `oauth-cli validate` but as JSON.
 */
export const validateOAuthConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const envPath = getEnvPath();
    const envMap = await getEnvMap(envPath);

    // 1. Check ENCRYPTION_KEY (boot-order guard — no MCPOAuthService import)
    const encKey = envMap.get('ENCRYPTION_KEY') || envMap.get('MCP_ENCRYPTION_KEY') || '';
    const encryptionKey = {
      status: encKey.trim() !== '' ? 'present' : 'missing',
      hint: encKey.trim() === ''
        ? 'Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
        : null,
    };

    // 2. Check each provider
    const backendUrl = envMap.get('BACKEND_URL') || 'http://localhost:3002';
    const providers = VALID_PROVIDERS.map((key) => {
      const contract = PROVIDER_CONTRACTS[key];
      const idVal = envMap.get(contract.envKeys.clientId) || '';
      const secretVal = envMap.get(contract.envKeys.clientSecret) || '';
      const issues: string[] = [];

      let status: 'configured' | 'missing' | 'blank';
      if (!idVal && !secretVal) {
        status = 'missing';
      } else if (!idVal.trim() || !secretVal.trim()) {
        status = 'blank';
        if (!idVal.trim()) issues.push(`${contract.envKeys.clientId} is blank`);
        if (!secretVal.trim()) issues.push(`${contract.envKeys.clientSecret} is blank`);
      } else {
        status = 'configured';
      }

      const expectedCallbackUrls = contract.callbackPaths.map((p) => `${backendUrl}${p}`);

      return {
        id: key,
        name: contract.name,
        status,
        issues,
        callbackUrls: expectedCallbackUrls,
      };
    });

    const configured = providers.filter((p) => p.status === 'configured').length;
    const hasErrors = encryptionKey.status === 'missing' || providers.some((p) => p.status === 'blank');

    sendSuccess(res, {
      valid: !hasErrors,
      encryptionKey,
      providers,
      summary: `${configured} of ${providers.length} providers configured`,
    });
  } catch (error: any) {
    console.error('[OAuth Setup] Error validating config:', error.message);
    sendError(res, 'Failed to validate OAuth configuration', 500);
  }
};
