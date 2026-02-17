/**
 * Shared OAuth provider contract — single source of truth.
 *
 * Imported by:
 *   - oauth-cli.ts (setup + validate commands)
 *   - oauth-setup.controller.ts (admin API endpoints)
 *   - mcp-oauth.service.ts will import from here in Day 4 refactor
 */

export interface ProviderContract {
  name: string;
  envKeys: { clientId: string; clientSecret: string };
  /** Optional env keys (e.g. MICROSOFT_TENANT_ID) */
  optionalEnvKeys?: { key: string; description: string; defaultValue: string }[];
  callbackPaths: string[];
  consoleUrl: string;
  /** Extra URL shown before consoleUrl (e.g. Google consent screen) */
  preConsoleUrl?: string;
  setupNotes: string[];
  scopes: string;
  /** Human-readable description of what this provider covers */
  description: string;
}

export const PROVIDER_CONTRACTS: Record<string, ProviderContract> = {
  github: {
    name: 'GitHub',
    description: 'GitHub repositories and user profile',
    envKeys: { clientId: 'GITHUB_CLIENT_ID', clientSecret: 'GITHUB_CLIENT_SECRET' },
    callbackPaths: ['/api/v1/mcp/callback/github'],
    consoleUrl: 'https://github.com/settings/applications/new',
    setupNotes: [
      'Set Homepage URL to: http://localhost:3002',
      'Set Authorization callback URL to the callback URL shown above',
    ],
    scopes: 'repo read:user',
  },
  atlassian: {
    name: 'Atlassian',
    description: 'Jira + Confluence (one app covers both)',
    envKeys: { clientId: 'ATLASSIAN_CLIENT_ID', clientSecret: 'ATLASSIAN_CLIENT_SECRET' },
    callbackPaths: [
      '/api/v1/mcp/callback/jira',
      '/api/v1/mcp/callback/confluence',
      '/api/v1/mcp/callback/atlassian',
    ],
    consoleUrl: 'https://developer.atlassian.com/console/myapps/',
    setupNotes: [
      'One app covers both Jira and Confluence',
      'Add ALL three callback URLs as redirect URIs',
      'Enable OAuth 2.0 (3LO) authorization code grants',
    ],
    scopes: 'read:jira-work read:jira-user read:board-scope:jira-software read:sprint:jira-software read:me offline_access',
  },
  google: {
    name: 'Google Workspace',
    description: 'Google Drive + Calendar',
    envKeys: { clientId: 'GOOGLE_CLIENT_ID', clientSecret: 'GOOGLE_CLIENT_SECRET' },
    callbackPaths: ['/api/v1/mcp/callback/google_workspace'],
    preConsoleUrl: 'https://console.cloud.google.com/apis/credentials/consent',
    consoleUrl: 'https://console.cloud.google.com/apis/credentials',
    setupNotes: [
      'You must configure the OAuth consent screen BEFORE creating credentials',
      'Set application type to "Web application"',
      'Add the callback URL as an Authorized redirect URI',
    ],
    scopes: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/calendar.readonly',
  },
  microsoft: {
    name: 'Microsoft',
    description: 'Outlook, Teams, OneDrive, OneNote (one Azure app covers all)',
    envKeys: { clientId: 'MICROSOFT_CLIENT_ID', clientSecret: 'MICROSOFT_CLIENT_SECRET' },
    optionalEnvKeys: [
      {
        key: 'MICROSOFT_TENANT_ID',
        description: 'Azure AD tenant ID. Defaults to "common" (multi-tenant). Set your org tenant ID for single-tenant.',
        defaultValue: 'common',
      },
    ],
    callbackPaths: [
      '/api/v1/mcp/callback/outlook',
      '/api/v1/mcp/callback/teams',
      '/api/v1/mcp/callback/onedrive',
      '/api/v1/mcp/callback/onenote',
    ],
    consoleUrl: 'https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps',
    setupNotes: [
      'One Azure app registration covers Outlook, Teams, OneDrive, and OneNote',
      'Go to App registrations > New registration',
      'Set redirect URIs (Web platform) — add ALL four callback URLs',
      'Go to Certificates & secrets > New client secret',
      'Copy the Application (client) ID and the client secret Value (not the Secret ID)',
    ],
    scopes: 'User.Read Mail.Read Calendars.Read offline_access',
  },
};

export const VALID_PROVIDERS = Object.keys(PROVIDER_CONTRACTS);

export function getBackendUrl(): string {
  return process.env.BACKEND_URL || 'http://localhost:3002';
}

export function getCallbackUrls(provider: ProviderContract): string[] {
  const baseUrl = getBackendUrl();
  return provider.callbackPaths.map((p) => `${baseUrl}${p}`);
}
