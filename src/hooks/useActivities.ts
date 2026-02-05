import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { ActivityService, ActivitiesResponse } from '../services/activity.service';
import { GetActivitiesParams, GroupedActivitiesResponse, FlatActivitiesResponse } from '../types/activity';
import { isDemoMode } from '../services/demo-mode.service';

/**
 * Hook to fetch raw activities with optional grouping
 * Used for journal tab views (Timeline, By Source, By Story)
 */
export function useActivities(params: GetActivitiesParams = {}) {
  // Include demo mode in query key so cache invalidates on mode change
  const queryKey = ['activities', params, isDemoMode()];

  // Debug: Log when hook is called to track re-renders
  console.log('[useActivities] Hook called with params:', JSON.stringify(params), 'queryKey:', JSON.stringify(queryKey));

  return useQuery({
    queryKey,
    queryFn: async (): Promise<ActivitiesResponse> => {
      console.log('[useActivities] queryFn EXECUTING - this means React Query decided to fetch');
      console.trace('[useActivities] Stack trace:');
      // Default timezone to user's local timezone
      const paramsWithTimezone: GetActivitiesParams = {
        ...params,
        timezone: params.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
      };

      console.log('[useActivities] Fetching activities with params:', paramsWithTimezone, 'at', new Date().toISOString());
      const response = await ActivityService.getActivities(paramsWithTimezone);
      console.log('[useActivities] Response:', response);

      if (response.success && response.data) {
        console.log('[useActivities] Success, returning data:', response.data);
        return response.data;
      }

      console.log('[useActivities] Error or no data, returning empty response');

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
