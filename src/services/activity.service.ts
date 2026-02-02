import { api, ApiResponse } from '../lib/api';
import {
  Activity,
  ActivityGroup,
  GroupedActivitiesResponse,
  FlatActivitiesResponse,
  GetActivitiesParams
} from '../types/activity';

export type ActivitiesResponse = GroupedActivitiesResponse | FlatActivitiesResponse;

/**
 * Activity Service - fetches raw tool activities for journal tab views
 */
export const ActivityService = {
  /**
   * Get all activities with optional grouping
   * Used for journal tab views (Timeline, By Source, By Story)
   */
  async getActivities(params: GetActivitiesParams = {}): Promise<ApiResponse<ActivitiesResponse>> {
    try {
      const queryParams = new URLSearchParams();

      if (params.page) queryParams.set('page', String(params.page));
      if (params.limit) queryParams.set('limit', String(params.limit));
      if (params.groupBy) queryParams.set('groupBy', params.groupBy);
      if (params.source) queryParams.set('source', params.source);
      if (params.storyId) queryParams.set('storyId', params.storyId);
      if (params.timezone) queryParams.set('timezone', params.timezone);

      const url = `/activities${queryParams.toString() ? `?${queryParams}` : ''}`;
      const response = await api.get<ApiResponse<ActivitiesResponse>>(url);

      return response.data;
    } catch (error: any) {
      console.error('[ActivityService] getActivities error:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch activities'
      };
    }
  },

  /**
   * Get activities for a specific journal entry
   */
  async getActivitiesForJournalEntry(
    journalEntryId: string,
    params: { page?: number; limit?: number; source?: string } = {}
  ): Promise<ApiResponse<{ data: Activity[]; pagination: any; meta: any }>> {
    try {
      const queryParams = new URLSearchParams();

      if (params.page) queryParams.set('page', String(params.page));
      if (params.limit) queryParams.set('limit', String(params.limit));
      if (params.source) queryParams.set('source', params.source);

      const url = `/journal-entries/${journalEntryId}/activities${queryParams.toString() ? `?${queryParams}` : ''}`;
      const response = await api.get(url);

      return response.data;
    } catch (error: any) {
      console.error('[ActivityService] getActivitiesForJournalEntry error:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch activities'
      };
    }
  }
};
