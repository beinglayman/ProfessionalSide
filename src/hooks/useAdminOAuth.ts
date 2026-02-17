import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../contexts/ToastContext';
import {
  adminOAuthService,
  ConfigureProviderRequest,
} from '../services/admin-oauth.service';

/** Whether the current user has admin privileges. */
export function useIsAdmin() {
  return useQuery({
    queryKey: ['admin', 'access'],
    queryFn: () => adminOAuthService.checkAdminAccess(),
    staleTime: 5 * 60 * 1000, // 5 min — role doesn't change often
    retry: false,
  });
}

/** List all OAuth providers with configuration status. */
export function useOAuthProviders() {
  return useQuery({
    queryKey: ['admin', 'oauth', 'providers'],
    queryFn: () => adminOAuthService.getProviders(),
    staleTime: 30 * 1000,
    retry: 1,
  });
}

/** Validate all OAuth provider configurations. */
export function useOAuthValidation() {
  return useQuery({
    queryKey: ['admin', 'oauth', 'validate'],
    queryFn: () => adminOAuthService.validateConfig(),
    staleTime: 30 * 1000,
    retry: 1,
  });
}

/** Save credentials for a provider; invalidates both queries on success. */
export function useConfigureProvider() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({
      provider,
      creds,
    }: {
      provider: string;
      creds: ConfigureProviderRequest;
    }) => adminOAuthService.configureProvider(provider, creds),
    onSuccess: (data) => {
      toast.success(
        'Provider configured',
        `${data.provider} OAuth credentials saved`
      );
      queryClient.invalidateQueries({ queryKey: ['admin', 'oauth'] });
    },
    onError: (error: any) => {
      toast.error(
        'Configuration failed',
        error.response?.data?.error || 'Failed to save credentials'
      );
    },
  });
}
