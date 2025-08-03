import { SearchParams, SearchResponse, SearchSuggestion } from '../types/search';
import { api } from '../lib/api';

export class SearchService {
  private static instance: SearchService;

  public static getInstance(): SearchService {
    if (!SearchService.instance) {
      SearchService.instance = new SearchService();
    }
    return SearchService.instance;
  }

  /**
   * Perform global search across all content types
   */
  async search(params: SearchParams): Promise<SearchResponse> {
    const queryParams = new URLSearchParams();
    
    queryParams.append('q', params.query);
    
    if (params.types?.length) {
      params.types.forEach(type => queryParams.append('types', type));
    }
    
    if (params.filters?.connectionType?.length) {
      params.filters.connectionType.forEach(type => queryParams.append('connectionType', type));
    }
    
    if (params.filters?.location) {
      queryParams.append('location', params.filters.location);
    }
    
    if (params.filters?.company) {
      queryParams.append('company', params.filters.company);
    }
    
    if (params.filters?.skills?.length) {
      params.filters.skills.forEach(skill => queryParams.append('skills', skill));
    }
    
    if (params.filters?.workspaceId) {
      queryParams.append('workspaceId', params.filters.workspaceId);
    }
    
    if (params.filters?.dateRange?.from) {
      queryParams.append('dateFrom', params.filters.dateRange.from.toISOString());
    }
    
    if (params.filters?.dateRange?.to) {
      queryParams.append('dateTo', params.filters.dateRange.to.toISOString());
    }
    
    if (params.filters?.contentTypes?.length) {
      params.filters.contentTypes.forEach(type => queryParams.append('contentTypes', type));
    }
    
    if (params.limit) {
      queryParams.append('limit', params.limit.toString());
    }
    
    if (params.offset) {
      queryParams.append('offset', params.offset.toString());
    }
    
    if (params.sortBy) {
      queryParams.append('sortBy', params.sortBy);
    }

    const response = await api.get(`/search?${queryParams.toString()}`);
    return response.data;
  }

  /**
   * Get search suggestions for autocomplete
   */
  async getSuggestions(query: string): Promise<string[]> {
    if (!query || query.length < 2) {
      return [];
    }

    const queryParams = new URLSearchParams({ q: query });

    try {
      const response = await api.get(`/search/suggestions?${queryParams.toString()}`);
      return response.data || [];
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      return [];
    }
  }

  /**
   * Get search history for the user
   */
  async getSearchHistory(): Promise<{ recent: any[]; popular: string[]; saved: any[] }> {
    try {
      const response = await api.get('/search/history');
      return response.data;
    } catch (error) {
      console.error('Error fetching search history:', error);
      return { recent: [], popular: [], saved: [] };
    }
  }

  /**
   * Save a search query
   */
  async saveSearch(name: string, params: SearchParams): Promise<void> {
    await api.post('/search/save', {
      name,
      query: params.query,
      filters: params.filters,
    });
  }

  /**
   * Delete a saved search
   */
  async deleteSavedSearch(searchId: string): Promise<void> {
    await api.delete(`/search/saved/${searchId}`);
  }

  /**
   * Record search interaction for analytics
   */
  async recordInteraction(query: string, resultId: string, action: 'click' | 'view' | 'share'): Promise<void> {
    try {
      await api.post('/search/interaction', {
        query,
        resultId,
        action,
      });
      // Don't throw errors for analytics failures
    } catch (error) {
      console.error('Failed to record search interaction:', error);
    }
  }
}

// Export singleton instance
export const searchService = SearchService.getInstance();