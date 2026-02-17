import { api } from '../lib/api';

// ── Types matching backend response shapes (oauth-setup.controller.ts) ──

export interface OAuthProviderInfo {
  id: string;
  name: string;
  description: string;
  status: 'configured' | 'missing' | 'blank';
  consoleUrl: string;
  preConsoleUrl: string | null;
  callbackUrls: string[];
  setupNotes: string[];
  scopes: string;
  optionalKeys: Array<{
    key: string;
    description: string;
    defaultValue: string;
    currentValue: string | null;
  }>;
  clientIdPreview: string | null;
}

export interface OAuthProviderListResponse {
  encryptionKeyStatus: 'present' | 'missing';
  providers: OAuthProviderInfo[];
  configured: number;
  total: number;
}

export interface ConfigureProviderRequest {
  clientId: string;
  clientSecret: string;
  optionalKeys?: Record<string, string>;
}

export interface ConfigureProviderResponse {
  provider: string;
  status: 'configured';
  keysWritten: string[];
}

export interface ValidateProviderEntry {
  id: string;
  name: string;
  status: string;
  issues: string[];
  callbackUrls: string[];
}

export interface ValidateResponse {
  valid: boolean;
  encryptionKey: { status: 'present' | 'missing'; hint: string | null };
  providers: ValidateProviderEntry[];
  summary: string;
}

// ── Service ──

class AdminOAuthService {
  async getProviders(): Promise<OAuthProviderListResponse> {
    const res = await api.get('/admin/oauth/providers');
    return res.data.data;
  }

  async configureProvider(
    provider: string,
    creds: ConfigureProviderRequest
  ): Promise<ConfigureProviderResponse> {
    const res = await api.post(`/admin/oauth/providers/${provider}/configure`, creds);
    return res.data.data;
  }

  async validateConfig(): Promise<ValidateResponse> {
    const res = await api.get('/admin/oauth/validate');
    return res.data.data;
  }

  /** Check if current user has admin access (non-throwing). */
  async checkAdminAccess(): Promise<{ isAdmin: boolean; role?: string }> {
    try {
      const res = await api.get('/admin/permissions');
      return { isAdmin: true, role: res.data.data?.role };
    } catch {
      return { isAdmin: false };
    }
  }
}

export const adminOAuthService = new AdminOAuthService();
