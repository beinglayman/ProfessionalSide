import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface WorkspaceInvitation {
  id: string;
  workspaceId: string;
  workspaceName: string;
  organizationName: string | null;
  description: string;
  role: string;
  invitedBy: {
    id: string;
    name: string;
    avatar: string;
    position: string;
  };
  invitationDate: string;
  expirationDate: string;
  status: 'pending' | 'accepted' | 'declined';
  isPersonal: boolean;
  message?: string;
}

// Hook to get pending invitations for current user
export function usePendingInvitations() {
  return useQuery({
    queryKey: ['workspace-invitations', 'pending'],
    queryFn: async (): Promise<WorkspaceInvitation[]> => {
      const response = await api.get('/workspaces/invitations/pending');
      return response.data.data;
    },
    staleTime: 30000, // Consider data fresh for 30 seconds
    gcTime: 300000, // Keep in cache for 5 minutes
  });
}

// Hook to accept invitation by ID
export function useAcceptInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      const response = await api.post(`/workspaces/invitations/${invitationId}/accept-by-id`);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['workspace-invitations'] });
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error) => {
      console.error('Failed to accept invitation:', error);
    },
  });
}

// Hook to decline invitation by ID
export function useDeclineInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      const response = await api.post(`/workspaces/invitations/${invitationId}/decline-by-id`);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['workspace-invitations'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error) => {
      console.error('Failed to decline invitation:', error);
    },
  });
}

// Hook to accept invitation by token (for email links)
export function useAcceptInvitationByToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (token: string) => {
      const response = await api.post(`/workspaces/invitations/${token}/accept`);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['workspace-invitations'] });
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error) => {
      console.error('Failed to accept invitation:', error);
    },
  });
}

// Hook to decline invitation by token (for email links)
export function useDeclineInvitationByToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (token: string) => {
      const response = await api.post(`/workspaces/invitations/${token}/decline`);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['workspace-invitations'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error) => {
      console.error('Failed to decline invitation:', error);
    },
  });
}