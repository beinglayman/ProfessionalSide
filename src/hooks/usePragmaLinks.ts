import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PragmaLinkService, CreatePragmaLinkRequest } from '../services/pragma-link.service';

const PRAGMA_LINK_KEYS = {
  all: ['pragma-links'] as const,
  byStory: (storyId: string) => ['pragma-links', storyId] as const,
  resolve: (shortCode: string) => ['pragma-resolve', shortCode] as const,
};

export function usePragmaLinks(storyId: string | undefined) {
  return useQuery({
    queryKey: PRAGMA_LINK_KEYS.byStory(storyId!),
    queryFn: async () => {
      const response = await PragmaLinkService.listLinks(storyId!);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error || 'Failed to fetch links');
    },
    enabled: !!storyId,
  });
}

export function useCreatePragmaLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePragmaLinkRequest) => PragmaLinkService.createLink(data),
    onSuccess: (response, variables) => {
      if (response.success) {
        queryClient.invalidateQueries({ queryKey: PRAGMA_LINK_KEYS.byStory(variables.storyId) });
      }
    },
  });
}

export function useRevokePragmaLink(storyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (linkId: string) => PragmaLinkService.revokeLink(linkId),
    onSuccess: (response) => {
      if (response.success) {
        queryClient.invalidateQueries({ queryKey: PRAGMA_LINK_KEYS.byStory(storyId) });
      }
    },
  });
}

export function useResolvePragmaLink(shortCode: string | undefined, token: string | undefined) {
  return useQuery({
    queryKey: PRAGMA_LINK_KEYS.resolve(shortCode!),
    queryFn: async () => {
      const response = await PragmaLinkService.resolveLink(shortCode!, token);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error || 'Failed to resolve link');
    },
    enabled: !!shortCode,
    retry: false,
    staleTime: 0,
  });
}
