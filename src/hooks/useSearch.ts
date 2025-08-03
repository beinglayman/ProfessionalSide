import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useRef, useEffect } from 'react';
import { api } from '../lib/api';
import { SearchParams, SearchResponse, SearchResult, SearchSuggestion } from '../types/search';

interface UseSearchOptions {
  debounceMs?: number;
  autoSearch?: boolean;
  minQueryLength?: number;
}

interface UseSearchReturn {
  // Search state
  results: SearchResult[];
  isLoading: boolean;
  error: string | null;
  total: number;
  facets: SearchResponse['facets'];
  suggestions: string[];
  queryTime: number;
  
  // Search actions
  search: (params: SearchParams) => Promise<void>;
  clear: () => void;
  retry: () => void;
  
  // Suggestions
  getSuggestions: (query: string) => Promise<void>;
  clearSuggestions: () => void;
  
  // Analytics
  recordInteraction: (resultId: string, action: 'click' | 'view' | 'share') => void;
}

/**
 * Main search hook with network-centric functionality
 */
export function useSearch(options: UseSearchOptions = {}): UseSearchReturn {
  const {
    debounceMs = 300,
    autoSearch = false,
    minQueryLength = 2
  } = options;

  // Search state
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [facets, setFacets] = useState<SearchResponse['facets']>({
    types: {},
    connections: {},
    skills: {},
    companies: {},
    locations: {}
  });
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [queryTime, setQueryTime] = useState(0);

  // Refs for cleanup and debouncing
  const lastSearchParams = useRef<SearchParams | null>(null);
  const debounceTimer = useRef<NodeJS.Timeout>();
  const abortController = useRef<AbortController>();

  /**
   * Perform search with error handling and loading states
   */
  const search = useCallback(async (params: SearchParams) => {
    if (!params.query || params.query.length < minQueryLength) {
      setResults([]);
      setTotal(0);
      setError(null);
      return;
    }

    // Cancel previous request
    if (abortController.current) {
      abortController.current.abort();
    }
    abortController.current = new AbortController();

    setIsLoading(true);
    setError(null);
    lastSearchParams.current = params;

    try {
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
      // Backend returns {success: true, data: SearchResponse}, so we need response.data.data
      const data: SearchResponse = response.data.data;
      
      // Check if this is still the latest search
      if (lastSearchParams.current === params) {
        setResults(data.results);
        setTotal(data.total);
        setFacets(data.facets);
        setQueryTime(data.queryTime);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError' && lastSearchParams.current === params) {
        console.error('Search error:', err);
        
        if (err.response?.status === 401) {
          setError('Please log in to search');
        } else if (err.response?.status === 400) {
          setError('Invalid search query');
        } else {
          setError(err.response?.data?.message || err.message || 'Search failed');
        }
        
        setResults([]);
        setTotal(0);
      }
    } finally {
      if (lastSearchParams.current === params) {
        setIsLoading(false);
      }
    }
  }, [minQueryLength]);

  /**
   * Debounced search for auto-search scenarios
   */
  const debouncedSearch = useCallback((params: SearchParams) => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      search(params);
    }, debounceMs);
  }, [search, debounceMs]);

  /**
   * Get search suggestions
   */
  const getSuggestions = useCallback(async (query: string) => {
    if (!query || query.length < minQueryLength) {
      setSuggestions([]);
      return;
    }

    try {
      const response = await api.get(`/search/suggestions?q=${encodeURIComponent(query)}`);
      setSuggestions(response.data);
    } catch (err) {
      console.error('Failed to get suggestions:', err);
      setSuggestions([]);
    }
  }, [minQueryLength]);

  /**
   * Clear search results and suggestions
   */
  const clear = useCallback(() => {
    setResults([]);
    setTotal(0);
    setError(null);
    setQueryTime(0);
    setSuggestions([]);
    lastSearchParams.current = null;
    
    if (abortController.current) {
      abortController.current.abort();
    }
  }, []);

  /**
   * Clear only suggestions
   */
  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
  }, []);

  /**
   * Retry last search
   */
  const retry = useCallback(() => {
    if (lastSearchParams.current) {
      search(lastSearchParams.current);
    }
  }, [search]);

  /**
   * Record search interaction for analytics
   */
  const recordInteraction = useCallback((resultId: string, action: 'click' | 'view' | 'share') => {
    if (lastSearchParams.current?.query) {
      api.post('/search/interaction', { 
        query: lastSearchParams.current.query, 
        resultId, 
        action 
      }).catch(err => {
        console.debug('Search interaction tracking failed:', err);
      });
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, []);

  return {
    // State
    results,
    isLoading,
    error,
    total,
    facets,
    suggestions,
    queryTime,
    
    // Actions
    search: autoSearch ? debouncedSearch : search,
    clear,
    retry,
    getSuggestions,
    clearSuggestions,
    recordInteraction,
  };
}

/**
 * Global search using React Query for caching
 */
export function useGlobalSearch(params: SearchParams & { enabled?: boolean }) {
  return useQuery({
    queryKey: ['search', 'global', params],
    queryFn: async (): Promise<SearchResponse> => {
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

      const response = await api.get(`/search?${queryParams}`);
      return response.data;
    },
    enabled: (params.enabled !== false) && !!params.query && params.query.length >= 2,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Search people only
 */
export function usePeopleSearch(params: Omit<SearchParams, 'types'>) {
  return useGlobalSearch({
    ...params,
    types: ['people']
  });
}

/**
 * Search workspaces only
 */
export function useWorkspaceSearch(params: Omit<SearchParams, 'types'>) {
  return useGlobalSearch({
    ...params,
    types: ['workspaces']
  });
}

/**
 * Search content only
 */
export function useContentSearch(params: Omit<SearchParams, 'types'>) {
  return useGlobalSearch({
    ...params,
    types: ['content']
  });
}

/**
 * Search skills only
 */
export function useSkillsSearch(params: Omit<SearchParams, 'types'>) {
  return useGlobalSearch({
    ...params,
    types: ['skills']
  });
}

/**
 * Get search suggestions as user types
 */
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

/**
 * Get search history for current user
 */
export function useSearchHistory() {
  return useQuery({
    queryKey: ['search', 'history'],
    queryFn: async () => {
      const response = await api.get('/search/history');
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Save a search query
 */
export function useSaveSearch() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ name, params }: { name: string; params: SearchParams }) => {
      const response = await api.post('/search/save', { 
        name, 
        query: params.query, 
        filters: params.filters 
      });
      return response.data;
    },
    onSuccess: () => {
      // Invalidate search history to refetch with new saved search
      queryClient.invalidateQueries({ queryKey: ['search', 'history'] });
    }
  });
}

/**
 * Delete saved search
 */
export function useDeleteSavedSearch() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (searchId: string) => {
      const response = await api.delete(`/search/saved/${searchId}`);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate search history to refetch without deleted search
      queryClient.invalidateQueries({ queryKey: ['search', 'history'] });
    }
  });
}

/**
 * Record search interaction (for analytics)
 */
export function useRecordSearchInteraction() {
  return useMutation({
    mutationFn: async ({ query, resultId, action }: { 
      query: string; 
      resultId: string; 
      action: 'click' | 'view' | 'share' 
    }) => {
      await api.post('/search/interaction', { query, resultId, action });
    },
    onError: (error) => {
      // Silent fail for analytics
      console.debug('Search interaction tracking failed:', error);
    }
  });
}

/**
 * Simplified hook for basic search without advanced features
 */
export function useBasicSearch(query: string, options: { enabled?: boolean; types?: SearchParams['types'] } = {}) {
  const { enabled = true, types } = options;
  
  return useGlobalSearch({
    query,
    types,
    enabled: enabled && !!query && query.length >= 2
  });
}