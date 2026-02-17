import React, { useState } from 'react';
import { ExternalLink, ChevronDown, ChevronUp, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../ui/card';
import { Button } from '../../ui/button';
import { cn } from '../../../lib/utils';
import { StatusBadge } from './StatusBadge';
import { CopyChip } from './CopyChip';
import { CredentialForm } from './CredentialForm';
import type { OAuthProviderInfo, ConfigureProviderRequest } from '../../../services/admin-oauth.service';

interface ProviderSetupCardProps {
  provider: OAuthProviderInfo;
  onConfigure: (providerId: string, creds: ConfigureProviderRequest) => void;
  isConfiguring: boolean;
  /** If false, hides the configure action (read-only status view for non-admins). */
  canConfigure: boolean;
}

export const ProviderSetupCard: React.FC<ProviderSetupCardProps> = ({
  provider,
  onConfigure,
  isConfiguring,
  canConfigure,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const isConfigured = provider.status === 'configured';
  const isBlank = provider.status === 'blank';

  const handleSubmit = (creds: ConfigureProviderRequest) => {
    onConfigure(provider.id, creds);
    // Form stays open until mutation succeeds (parent will re-render with new status)
  };

  // Card border accent by status
  const borderClass = isConfigured
    ? 'border-green-200'
    : isBlank
      ? 'border-amber-200'
      : 'border-gray-200';

  return (
    <Card className={cn('relative transition-colors', borderClass)}>
      {/* Subtle top accent bar */}
      {isConfigured && (
        <div className="absolute top-0 inset-x-0 h-0.5 bg-green-500 rounded-t-lg" />
      )}
      {isBlank && (
        <div className="absolute top-0 inset-x-0 h-0.5 bg-amber-400 rounded-t-lg" />
      )}

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn(
              'flex items-center justify-center h-9 w-9 rounded-lg flex-shrink-0',
              isConfigured ? 'bg-green-50' : 'bg-gray-50'
            )}>
              <Shield className={cn('h-4 w-4', isConfigured ? 'text-green-600' : 'text-gray-400')} />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base">{provider.name}</CardTitle>
              <CardDescription className="text-xs mt-0.5 truncate">{provider.description}</CardDescription>
            </div>
          </div>
          <StatusBadge status={provider.status} />
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Configured state — show preview */}
        {isConfigured && provider.clientIdPreview && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="font-medium text-gray-600">Client ID:</span>
            <code className="bg-gray-50 px-1.5 py-0.5 rounded text-gray-600">{provider.clientIdPreview}</code>
          </div>
        )}

        {/* Expandable details */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs font-medium text-primary-500 hover:text-primary-600 transition-colors"
        >
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {expanded ? 'Hide details' : 'Setup details'}
        </button>

        {expanded && (
          <div className="space-y-3 text-sm">
            {/* Setup instructions */}
            {provider.setupNotes.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-600 mb-1.5">Setup steps</p>
                <ol className="list-decimal list-inside space-y-1 text-xs text-gray-600">
                  {provider.setupNotes.map((note, i) => (
                    <li key={i}>{note}</li>
                  ))}
                </ol>
              </div>
            )}

            {/* Callback URLs */}
            {provider.callbackUrls.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-600 mb-1.5">Callback URLs</p>
                <div className="flex flex-col gap-1.5">
                  {provider.callbackUrls.map((url) => (
                    <CopyChip key={url} value={url} />
                  ))}
                </div>
              </div>
            )}

            {/* Scopes */}
            {provider.scopes && (
              <div>
                <p className="text-xs font-medium text-gray-600 mb-1">Required scopes</p>
                <p className="text-xs text-gray-500 font-mono break-all">{provider.scopes}</p>
              </div>
            )}

            {/* Console links */}
            <div className="flex flex-wrap gap-2">
              {provider.preConsoleUrl && (
                <a
                  href={provider.preConsoleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary-500 hover:text-primary-600 hover:underline"
                >
                  Pre-setup <ExternalLink className="h-3 w-3" />
                </a>
              )}
              <a
                href={provider.consoleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary-500 hover:text-primary-600 hover:underline"
              >
                Developer console <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        )}

        {/* Action area — admin only */}
        {canConfigure && !showForm && (
          <Button
            size="sm"
            variant={isConfigured ? 'outline' : 'default'}
            className="w-full"
            onClick={() => setShowForm(true)}
          >
            {isConfigured ? 'Reconfigure' : isBlank ? 'Fix configuration' : 'Configure'}
          </Button>
        )}

        {/* Inline credential form */}
        {canConfigure && showForm && (
          <CredentialForm
            provider={provider}
            onSubmit={handleSubmit}
            onCancel={() => setShowForm(false)}
            isSubmitting={isConfiguring}
          />
        )}

        {/* Non-admin hint */}
        {!canConfigure && !isConfigured && (
          <p className="text-xs text-gray-400 italic">Contact your admin to configure this provider.</p>
        )}
      </CardContent>
    </Card>
  );
};
