import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface SearchResult {
  id: string;
  type: 'journal_entry' | 'user' | 'workspace' | 'file';
  title: string;
  description?: string;
  snippet?: string;
  url: string;
  metadata: {
    author?: {
      id: string;
      name: string;
      avatar?: string;
    };
    workspace?: {
      id: string;
      name: string;
    };
    category?: string;
    tags?: string[];
    createdAt: string;
    updatedAt: string;
  };
  relevanceScore: number;
}

export interface SearchFilters {
  type?: 'journal_entry' | 'user' | 'workspace' | 'file';
  category?: string;
  workspace?: string;
  author?: string;
  dateFrom?: string;
  dateTo?: string;
  tags?: string[];
}

export interface SearchParams {
  query: string;
  filters?: SearchFilters;
  page?: number;
  limit?: number;
  sortBy?: 'relevance' | 'date' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchResponse {
  results: SearchResult[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  facets: {
    types: { type: string; count: number }[];
    categories: { category: string; count: number }[];
    workspaces: { workspace: string; count: number }[];
    authors: { author: string; count: number }[];
    tags: { tag: string; count: number }[];
  };
  suggestions: string[];
  searchTime: number;
}

export interface RecentSearch {
  id: string;
  query: string;
  filters?: SearchFilters;
  timestamp: string;
  resultCount: number;
}

export interface SearchHistory {
  recent: RecentSearch[];
  popular: string[];
  saved: {
    id: string;
    name: string;
    query: string;
    filters?: SearchFilters;
    createdAt: string;
  }[];
}

// Global search across all content
export function useGlobalSearch(params: SearchParams) {
  return useQuery({
    queryKey: ['search', 'global', params],
    queryFn: async (): Promise<SearchResponse> => {
      const queryParams = new URLSearchParams();
      queryParams.append('q', params.query);
      
      if (params.filters?.type) queryParams.append('type', params.filters.type);
      if (params.filters?.category) queryParams.append('category', params.filters.category);
      if (params.filters?.workspace) queryParams.append('workspace', params.filters.workspace);
      if (params.filters?.author) queryParams.append('author', params.filters.author);
      if (params.filters?.dateFrom) queryParams.append('dateFrom', params.filters.dateFrom);
      if (params.filters?.dateTo) queryParams.append('dateTo', params.filters.dateTo);
      if (params.filters?.tags) {
        params.filters.tags.forEach(tag => queryParams.append('tags', tag));
      }
      
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

      const response = await api.get(`/search?${queryParams}`);
      return response.data;
    },
    enabled: !!params.query && params.query.length >= 2,
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Search within journal entries only
export function useJournalSearch(params: Omit<SearchParams, 'filters'> & { 
  filters?: Omit<SearchFilters, 'type'> 
}) {
  return useGlobalSearch({
    ...params,
    filters: {
      ...params.filters,
      type: 'journal_entry'
    }
  });
}

// Search users
export function useUserSearch(params: Omit<SearchParams, 'filters'> & { 
  filters?: Omit<SearchFilters, 'type'> 
}) {
  return useGlobalSearch({
    ...params,
    filters: {
      ...params.filters,
      type: 'user'
    }
  });
}

// Search workspaces
export function useWorkspaceSearch(params: Omit<SearchParams, 'filters'> & { 
  filters?: Omit<SearchFilters, 'type'> 
}) {
  return useGlobalSearch({
    ...params,
    filters: {
      ...params.filters,
      type: 'workspace'
    }
  });
}

// Get search suggestions as user types
export function useSearchSuggestions(query: string) {
  return useQuery({
    queryKey: ['search', 'suggestions', query],
    queryFn: async (): Promise<string[]> => {
      if (!query || query.length < 2) return [];
      
      const response = await api.get(`/search/suggestions?q=${encodeURIComponent(query)}`);
      return response.data;
    },
    enabled: !!query && query.length >= 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Get search history for current user
export function useSearchHistory() {
  return useQuery({
    queryKey: ['search', 'history'],
    queryFn: async (): Promise<SearchHistory> => {
      const response = await api.get('/search/history');
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Save a search query
export function useSaveSearch() {
  return async (name: string, query: string, filters?: SearchFilters) => {
    const response = await api.post('/search/save', { name, query, filters });
    return response.data;
  };
}

// Delete saved search
export function useDeleteSavedSearch() {
  return async (searchId: string) => {
    const response = await api.delete(`/search/saved/${searchId}`);
    return response.data;
  };
}

// Record search interaction (for analytics)
export function useRecordSearchInteraction() {
  return async (query: string, resultId: string, action: 'click' | 'view' | 'share') => {
    try {
      await api.post('/search/interaction', { query, resultId, action });
    } catch (error) {
      // Silent fail for analytics
      console.debug('Search interaction tracking failed:', error);
    }
  };
}