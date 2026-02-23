import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { ActivityService, ActivitiesResponse } from '../services/activity.service';
import { GetActivitiesParams, GroupedActivitiesResponse, FlatActivitiesResponse } from '../types/activity';
import { isDemoMode } from '../services/demo-mode.service';

/**
 * Hook to fetch raw activities with optional grouping
 * Used for journal tab views (Timeline, By Source, By Story)
 */
export function useActivities(params: GetActivitiesParams = {}, options?: { enabled?: boolean }) {
  // Include demo mode in query key so cache invalidates on mode change
  const queryKey = ['activities', params, isDemoMode()];

  return useQuery({
    queryKey,
    enabled: options?.enabled ?? true,
    queryFn: async (): Promise<ActivitiesResponse> => {
      // Default timezone to user's local timezone
      const paramsWithTimezone: GetActivitiesParams = {
        ...params,
        timezone: params.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
      };

      const response = await ActivityService.getActivities(paramsWithTimezone);

      if (response.success && response.data) {
        const data = response.data;
        // Debug: log when activities arrive to trace SSE→refetch→render chain
        if ('groups' in data && data.groups.length > 0) {
          console.log(`[useActivities] Fetched ${data.groups.length} groups, ${data.pagination?.total ?? '?'} total (groupBy: ${params.groupBy})`);
        }
        return data;
      }

      // Log failed responses to trace silent failures
      console.warn('[useActivities] API response not successful:', response.error || 'unknown error');

      // Return empty response on error
      if (params.groupBy) {
        return {
          groups: [],
          pagination: { page: 1, limit: 50, total: 0, totalPages: 0, hasMore: false },
          meta: { groupBy: params.groupBy, sourceMode: isDemoMode() ? 'demo' : 'production' }
        } as GroupedActivitiesResponse;
      }

      return {
        data: [],
        pagination: { page: 1, limit: 50, total: 0, totalPages: 0, hasMore: false },
        meta: { groupBy: null, sourceMode: isDemoMode() ? 'demo' : 'production' }
      } as FlatActivitiesResponse;
    },
    staleTime: 30 * 1000, // 30 seconds - data is considered fresh for this long
    refetchOnWindowFocus: false, // Disable - we use SSE for updates
    refetchOnMount: true, // Only refetch if stale (default behavior)
    gcTime: 5 * 60 * 1000, // 5 minutes cache retention
    // Keep showing previous data while refetching to prevent flash of empty state
    placeholderData: keepPreviousData,
  });
}

/**
 * Hook to fetch activities for a specific journal entry (draft story)
 */
export function useJournalEntryActivities(
  journalEntryId: string | undefined,
  params: { page?: number; limit?: number; source?: string } = {}
) {
  return useQuery({
    queryKey: ['journal-entry-activities', journalEntryId, params, isDemoMode()],
    queryFn: async () => {
      if (!journalEntryId) {
        return { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0, hasMore: false }, meta: {} };
      }

      const response = await ActivityService.getActivitiesForJournalEntry(journalEntryId, params);

      if (response.success && response.data) {
        return response.data;
      }

      return { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0, hasMore: false }, meta: {} };
    },
    enabled: !!journalEntryId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * Type guard to check if response is grouped
 */
export function isGroupedResponse(response: ActivitiesResponse): response is GroupedActivitiesResponse {
  return 'groups' in response;
}
