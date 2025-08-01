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

export interface SearchSuggestionsInput {
  query: string;
}

export interface SaveSearchInput {
  name: string;
  query: string;
  filters?: SearchFilters;
}

export interface SearchInteractionInput {
  query: string;
  resultId: string;
  action: 'click' | 'view' | 'share';
}