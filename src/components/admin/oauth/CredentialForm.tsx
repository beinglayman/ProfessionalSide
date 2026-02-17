import React, { useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import type { OAuthProviderInfo, ConfigureProviderRequest } from '../../../services/admin-oauth.service';

interface CredentialFormProps {
  provider: OAuthProviderInfo;
  onSubmit: (creds: ConfigureProviderRequest) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export const CredentialForm: React.FC<CredentialFormProps> = ({
  provider,
  onSubmit,
  onCancel,
  isSubmitting,
}) => {
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [optionalKeys, setOptionalKeys] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const opt of provider.optionalKeys) {
      initial[opt.key] = opt.currentValue || opt.defaultValue || '';
    }
    return initial;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!clientId.trim()) newErrors.clientId = 'Client ID is required';
    if (!clientSecret.trim()) newErrors.clientSecret = 'Client Secret is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const creds: ConfigureProviderRequest = {
      clientId: clientId.trim(),
      clientSecret: clientSecret.trim(),
    };

    // Include optional keys only if they differ from default
    const nonDefaultKeys: Record<string, string> = {};
    for (const opt of provider.optionalKeys) {
      const val = optionalKeys[opt.key]?.trim();
      if (val && val !== opt.defaultValue) {
        nonDefaultKeys[opt.key] = val;
      }
    }
    if (Object.keys(nonDefaultKeys).length > 0) {
      creds.optionalKeys = nonDefaultKeys;
    }

    onSubmit(creds);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4 border-t border-gray-100">
      {/* Client ID */}
      <div>
        <label htmlFor={`${provider.id}-client-id`} className="block text-sm font-medium text-gray-700 mb-1">
          Client ID <span className="text-red-500">*</span>
        </label>
        <Input
          id={`${provider.id}-client-id`}
          value={clientId}
          onChange={(e) => { setClientId(e.target.value); setErrors((p) => ({ ...p, clientId: '' })); }}
          placeholder="Paste your client/app ID"
          autoComplete="off"
        />
        {errors.clientId && <p className="mt-1 text-xs text-red-600">{errors.clientId}</p>}
      </div>

      {/* Client Secret */}
      <div>
        <label htmlFor={`${provider.id}-client-secret`} className="block text-sm font-medium text-gray-700 mb-1">
          Client Secret <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <Input
            id={`${provider.id}-client-secret`}
            type={showSecret ? 'text' : 'password'}
            value={clientSecret}
            onChange={(e) => { setClientSecret(e.target.value); setErrors((p) => ({ ...p, clientSecret: '' })); }}
            placeholder="Paste your client secret"
            className="pr-10"
            autoComplete="off"
          />
          <button
            type="button"
            onClick={() => setShowSecret(!showSecret)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
            aria-label={showSecret ? 'Hide secret' : 'Show secret'}
          >
            {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.clientSecret && <p className="mt-1 text-xs text-red-600">{errors.clientSecret}</p>}
      </div>

      {/* Dynamic optional keys */}
      {provider.optionalKeys.map((opt) => (
        <div key={opt.key}>
          <label htmlFor={`${provider.id}-${opt.key}`} className="block text-sm font-medium text-gray-700 mb-1">
            {opt.description} <span className="text-gray-400 text-xs">(Optional)</span>
          </label>
          <Input
            id={`${provider.id}-${opt.key}`}
            value={optionalKeys[opt.key] || ''}
            onChange={(e) => setOptionalKeys((p) => ({ ...p, [opt.key]: e.target.value }))}
            placeholder={opt.defaultValue || opt.key}
            autoComplete="off"
          />
        </div>
      ))}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2">
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              Saving...
            </>
          ) : (
            'Save credentials'
          )}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
      </div>
    </form>
  );
};
