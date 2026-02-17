import React from 'react';
import { AlertTriangle, Shield } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useOAuthProviders, useConfigureProvider, useIsAdmin } from '../../../hooks/useAdminOAuth';
import { ProviderSetupCard } from './ProviderSetupCard';
import type { ConfigureProviderRequest } from '../../../services/admin-oauth.service';

interface OAuthSetupWizardProps {
  /** Compact mode for dashboard embeds — cards only, no header chrome. */
  compact?: boolean;
}

/** Skeleton card for loading state. */
const SkeletonCard: React.FC = () => (
  <div className="rounded-lg border border-gray-200 bg-white p-6 animate-pulse">
    <div className="flex items-start gap-3 mb-4">
      <div className="h-9 w-9 rounded-lg bg-gray-100" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-24 bg-gray-100 rounded" />
        <div className="h-3 w-40 bg-gray-50 rounded" />
      </div>
      <div className="h-5 w-20 bg-gray-100 rounded-full" />
    </div>
    <div className="h-8 w-full bg-gray-50 rounded" />
  </div>
);

export const OAuthSetupWizard: React.FC<OAuthSetupWizardProps> = ({ compact = false }) => {
  const { data, isLoading, isError } = useOAuthProviders();
  const { data: adminData } = useIsAdmin();
  const configureMutation = useConfigureProvider();

  const isAdmin = adminData?.isAdmin ?? false;

  const handleConfigure = (providerId: string, creds: ConfigureProviderRequest) => {
    configureMutation.mutate({ provider: providerId, creds });
  };

  // Loading
  if (isLoading) {
    return (
      <div className={cn(!compact && 'space-y-4')}>
        {!compact && (
          <div className="animate-pulse space-y-2 mb-4">
            <div className="h-5 w-48 bg-gray-100 rounded" />
            <div className="h-3 w-64 bg-gray-50 rounded" />
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  // Error or no data — the endpoint returns 403 for non-admins
  // Non-admins won't have provider data, so we show nothing
  if (isError || !data) {
    return null;
  }

  const { providers, configured, total, encryptionKeyStatus } = data;

  return (
    <div className="space-y-4">
      {/* Header (full mode only) */}
      {!compact && (
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="h-5 w-5 text-primary-500" />
            <h2 className="text-lg font-semibold text-gray-900">OAuth Providers</h2>
          </div>
          <p className="text-sm text-gray-500">
            {configured} of {total} providers configured
            {configured === total && ' — all set!'}
          </p>
        </div>
      )}

      {/* Encryption key warning */}
      {encryptionKeyStatus === 'missing' && isAdmin && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-amber-800">Encryption key missing</p>
            <p className="text-amber-700 text-xs mt-0.5">
              OAuth tokens cannot be encrypted without ENCRYPTION_KEY in .env.
            </p>
          </div>
        </div>
      )}

      {/* Provider cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {providers.map((provider) => (
          <ProviderSetupCard
            key={provider.id}
            provider={provider}
            onConfigure={handleConfigure}
            isConfiguring={
              configureMutation.isPending &&
              configureMutation.variables?.provider === provider.id
            }
            canConfigure={isAdmin}
          />
        ))}
      </div>
    </div>
  );
};
