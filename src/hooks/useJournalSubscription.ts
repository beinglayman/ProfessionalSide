import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type {
  JournalSubscription,
  CreateSubscriptionInput,
  UpdateSubscriptionInput,
  ConnectedToolsResponse
} from '../types/journal-subscription';

// Query keys for cache management
export const journalSubscriptionKeys = {
  all: ['journal-subscription'] as const,
  subscription: (workspaceId: string) => [...journalSubscriptionKeys.all, workspaceId] as const,
  connectedTools: ['connected-tools'] as const,
};

// Get subscription for a workspace
export function useJournalSubscription(workspaceId: string) {
  return useQuery({
    queryKey: journalSubscriptionKeys.subscription(workspaceId),
    queryFn: async (): Promise<JournalSubscription | null> => {
      try {
        const response = await api.get(`/workspaces/${workspaceId}/journal-subscription`);
        return response.data.data;
      } catch (error: any) {
        // Return null if subscription doesn't exist (404)
        if (error.response?.status === 404) {
          return null;
        }
        throw error;
      }
    },
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Get user's connected tools
export function useConnectedTools() {
  return useQuery({
    queryKey: journalSubscriptionKeys.connectedTools,
    queryFn: async (): Promise<ConnectedToolsResponse> => {
      const response = await api.get('/users/me/connected-tools');
      return response.data.data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Create subscription mutation
export function useCreateJournalSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workspaceId,
      ...data
    }: { workspaceId: string } & CreateSubscriptionInput): Promise<JournalSubscription> => {
      const response = await api.post(`/workspaces/${workspaceId}/journal-subscription`, data);
      return response.data.data;
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(
        journalSubscriptionKeys.subscription(variables.workspaceId),
        data
      );
    },
  });
}

// Update subscription mutation
export function useUpdateJournalSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workspaceId,
      ...data
    }: { workspaceId: string } & UpdateSubscriptionInput): Promise<JournalSubscription> => {
      const response = await api.put(`/workspaces/${workspaceId}/journal-subscription`, data);
      return response.data.data;
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(
        journalSubscriptionKeys.subscription(variables.workspaceId),
        data
      );
    },
  });
}

// Delete subscription mutation
export function useDeleteJournalSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (workspaceId: string): Promise<void> => {
      await api.delete(`/workspaces/${workspaceId}/journal-subscription`);
    },
    onSuccess: (_, workspaceId) => {
      queryClient.setQueryData(
        journalSubscriptionKeys.subscription(workspaceId),
        null
      );
    },
  });
}

// Toggle subscription active status mutation
export function useToggleJournalSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workspaceId,
      isActive
    }: { workspaceId: string; isActive: boolean }): Promise<JournalSubscription> => {
      const response = await api.patch(`/workspaces/${workspaceId}/journal-subscription/toggle`, {
        isActive
      });
      return response.data.data;
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(
        journalSubscriptionKeys.subscription(variables.workspaceId),
        data
      );
    },
  });
}

// Convenience hook that combines subscription data with mutations
export function useJournalSubscriptionManager(workspaceId: string) {
  const subscriptionQuery = useJournalSubscription(workspaceId);
  const connectedToolsQuery = useConnectedTools();
  const createMutation = useCreateJournalSubscription();
  const updateMutation = useUpdateJournalSubscription();
  const deleteMutation = useDeleteJournalSubscription();
  const toggleMutation = useToggleJournalSubscription();

  return {
    // Data
    subscription: subscriptionQuery.data,
    connectedTools: connectedToolsQuery.data?.tools ?? [],

    // Loading states
    isLoading: subscriptionQuery.isLoading,
    isLoadingTools: connectedToolsQuery.isLoading,

    // Error states
    error: subscriptionQuery.error,
    toolsError: connectedToolsQuery.error,

    // Mutation states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isToggling: toggleMutation.isPending,

    // Mutation functions
    createSubscription: (data: CreateSubscriptionInput) =>
      createMutation.mutateAsync({ workspaceId, ...data }),
    updateSubscription: (data: UpdateSubscriptionInput) =>
      updateMutation.mutateAsync({ workspaceId, ...data }),
    deleteSubscription: () =>
      deleteMutation.mutateAsync(workspaceId),
    toggleSubscription: (isActive: boolean) =>
      toggleMutation.mutateAsync({ workspaceId, isActive }),

    // Refetch
    refetch: subscriptionQuery.refetch,
    refetchTools: connectedToolsQuery.refetch,
  };
}
