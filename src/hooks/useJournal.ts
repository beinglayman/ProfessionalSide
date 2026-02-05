import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  JournalService,
  CreateJournalEntryRequest,
  UpdateJournalEntryRequest,
  GetJournalEntriesParams,
  PublishJournalEntryRequest
} from '../services/journal.service';
import { QueryKeys } from '../lib/queryClient';
import { isDemoMode } from '../services/demo-mode.service';

// Note: Demo mode is now handled by the backend via X-Demo-Mode header.
// The header is automatically added by the API interceptor in src/lib/api.ts.
// Frontend hooks use the same API calls - backend routes to demo/real tables.

// Get journal entries
export const useJournalEntries = (params: GetJournalEntriesParams = {}, enabled: boolean = true) => {
  return useQuery({
    queryKey: QueryKeys.journalEntries(params),
    queryFn: async () => {
      const response = await JournalService.getJournalEntries(params);
      if (response.success && response.data) {
        return {
          entries: response.data,
          pagination: response.pagination,
        };
      }
      throw new Error(response.error || 'Failed to fetch journal entries');
    },
    enabled: enabled && (!!params.workspaceId || !!params.authorId || !!params.limit),
  });
};

// Get user feed (includes rechronicles)
// Demo mode is now handled by backend via X-Demo-Mode header
export const useUserFeed = (params: GetJournalEntriesParams = {}) => {
  // Debug: Log when hook is called
  console.log('[useUserFeed] Hook called with params:', JSON.stringify(params));

  return useQuery({
    queryKey: ['journal', 'feed', params, isDemoMode()],
    queryFn: async () => {
      console.log('[useUserFeed] queryFn EXECUTING - React Query decided to fetch');
      console.trace('[useUserFeed] Stack trace:');
      // Backend automatically routes to demo/real tables based on X-Demo-Mode header
      const response = await JournalService.getUserFeed(params);
      if (response.success && response.data) {
        return {
          entries: response.data,
          pagination: response.pagination,
        };
      }
      // Return empty if no data (e.g., demo mode without sync)
      if (response.success && !response.data) {
        return { entries: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
      }
      throw new Error(response.error || 'Failed to fetch user feed');
    },
    staleTime: 30 * 1000, // 30 seconds - data is considered fresh, prevents refetch storms
    refetchOnWindowFocus: false, // Disable - SSE handles updates
  });
};

// Get single journal entry
export const useJournalEntry = (id: string) => {
  return useQuery({
    queryKey: QueryKeys.journalEntry(id),
    queryFn: async () => {
      const response = await JournalService.getJournalEntryById(id);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error || 'Failed to fetch journal entry');
    },
    enabled: !!id,
  });
};

// Create journal entry
export const useCreateJournalEntry = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateJournalEntryRequest) => JournalService.createJournalEntry(data),
    onSuccess: (response) => {
      if (response.success) {
        // Invalidate and refetch journal entries
        queryClient.invalidateQueries({ queryKey: ['journal', 'entries'] });
      }
    },
  });
};

// Update journal entry
export const useUpdateJournalEntry = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateJournalEntryRequest }) => 
      JournalService.updateJournalEntry(id, data),
    onSuccess: (response, { id }) => {
      if (response.success) {
        // Update specific entry in cache
        queryClient.setQueryData(QueryKeys.journalEntry(id), response.data);
        // Invalidate entries list
        queryClient.invalidateQueries({ queryKey: ['journal', 'entries'] });
      }
    },
  });
};

// Delete journal entry
export const useDeleteJournalEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => JournalService.deleteJournalEntry(id),
    onSuccess: (response, id) => {
      if (response.success) {
        // Remove from cache
        queryClient.removeQueries({ queryKey: QueryKeys.journalEntry(id) });
        // Invalidate entries list and feed
        queryClient.invalidateQueries({ queryKey: ['journal', 'entries'] });
        queryClient.invalidateQueries({ queryKey: ['journal', 'feed'] });
      }
    },
  });
};

// Publish journal entry
export const usePublishJournalEntry = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: PublishJournalEntryRequest }) => 
      JournalService.publishJournalEntry(id, data),
    onSuccess: (response, { id }) => {
      if (response.success) {
        // Update specific entry in cache
        queryClient.setQueryData(QueryKeys.journalEntry(id), response.data);
        // Invalidate entries list
        queryClient.invalidateQueries({ queryKey: ['journal', 'entries'] });
      }
    },
  });
};

// Toggle like
export const useToggleLike = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => JournalService.toggleLike(id),
    onSuccess: (response, id) => {
      if (response.success) {
        // Invalidate related queries
        queryClient.invalidateQueries({ queryKey: QueryKeys.journalEntry(id) });
        queryClient.invalidateQueries({ queryKey: ['journal', 'entries'] });
      }
    },
  });
};

// Toggle appreciate
export const useToggleAppreciate = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => JournalService.toggleAppreciate(id),
    onSuccess: (response, id) => {
      if (response.success) {
        // Invalidate related queries
        queryClient.invalidateQueries({ queryKey: QueryKeys.journalEntry(id) });
        queryClient.invalidateQueries({ queryKey: ['journal', 'entries'] });
      }
    },
  });
};

// ReChronicle entry
export const useRechronicleEntry = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, comment }: { id: string; comment?: string }) => 
      JournalService.rechronicleEntry(id, comment),
    onSuccess: (response, { id }) => {
      if (response.success) {
        // Invalidate related queries
        queryClient.invalidateQueries({ queryKey: QueryKeys.journalEntry(id) });
        queryClient.invalidateQueries({ queryKey: ['journal', 'entries'] });
        queryClient.invalidateQueries({ queryKey: ['journal', 'feed'] }); // Invalidate user feed
      }
    },
  });
};

// Record analytics
export const useRecordAnalytics = () => {
  return useMutation({
    mutationFn: ({ id, data }: { 
      id: string; 
      data: {
        readTime?: number;
        engagementType?: 'view' | 'like' | 'comment' | 'share';
        referrer?: string;
      } 
    }) => JournalService.recordAnalytics(id, data),
    // Don't show errors for analytics - it's optional
    onError: (error) => {
      console.warn('Analytics recording failed:', error);
    },
  });
};

// Get entry comments
export const useEntryComments = (id: string) => {
  return useQuery({
    queryKey: QueryKeys.entryComments(id),
    queryFn: async () => {
      const response = await JournalService.getEntryComments(id);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error || 'Failed to fetch comments');
    },
    enabled: !!id,
  });
};

// Add comment
export const useAddComment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, content, parentId }: { id: string; content: string; parentId?: string }) => 
      JournalService.addComment(id, content, parentId),
    onSuccess: (response, { id }) => {
      if (response.success) {
        // Invalidate comments
        queryClient.invalidateQueries({ queryKey: QueryKeys.entryComments(id) });
        // Update entry comment count
        queryClient.invalidateQueries({ queryKey: QueryKeys.journalEntry(id) });
      }
    },
  });
};