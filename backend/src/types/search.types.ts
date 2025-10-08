// Base search result interface
export interface BaseSearchResult {
  id: string;
  type: 'people' | 'workspaces' | 'content' | 'skills';
  title: string;
  subtitle: string;
  description?: string;
  relevanceScore: number;
  matchType: 'exact' | 'partial' | 'semantic' | 'fuzzy';
}

export interface PeopleSearchResult extends BaseSearchResult {
  type: 'people';
  avatar?: string;
  position: string;
  company: string;
  location?: string;
  connectionStatus: 'core' | 'extended' | 'following' | 'none';
  mutualConnections: number;
  skills: string[];
  bio?: string;
  isVerified?: boolean;
}

export interface WorkspaceSearchResult extends BaseSearchResult {
  type: 'workspaces';
  organizationName: string;
  memberCount: number;
  isPrivate: boolean;
  canJoin: boolean;
  canRequestJoin: boolean;
  industry?: string;
  tags: string[];
  recentActivity?: Date;
}

export interface ContentSearchResult extends BaseSearchResult {
  type: 'content';
  contentType: 'journal_entry' | 'achievement' | 'artifact';
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  workspaceName?: string;
  workspaceId?: string;
  snippet: string;
  publishedAt: Date;
  likes: number;
  comments: number;
  skills: string[];
  isAccessible: boolean; // Based on user's workspace membership
}

export interface SkillSearchResult extends BaseSearchResult {
  type: 'skills';
  category: string;
  endorsements: number;
  relatedSkills: string[];
  trendingScore?: number;
  industryDemand?: 'high' | 'medium' | 'low';
  usersWithSkill: number;
  networkUsersWithSkill: number;
}

export type SearchResult = PeopleSearchResult | WorkspaceSearchResult | ContentSearchResult | SkillSearchResult;

// Search filters interface
export interface SearchFilters {
  connectionType?: ('core' | 'extended' | 'following' | 'none')[];
  location?: string;
  company?: string;
  skills?: string[];
  workspaceId?: string;
  dateRange?: {
    from: Date;
    to: Date;
  };
  contentTypes?: ('journal_entry' | 'achievement' | 'artifact')[];
}

// Search request parameters
export interface SearchParams {
  query: string;
  types?: ('people' | 'workspaces' | 'content' | 'skills')[];
  filters?: SearchFilters;
  sortBy?: 'relevance' | 'recent' | 'popular' | 'network_proximity';
  limit?: number;
  offset?: number;
}

// Search response
export interface SearchResponse {
  results: SearchResult[];
  total: number;
  facets: {
    types: Record<string, number>;
    connections: Record<string, number>;
    skills: Record<string, number>;
    companies: Record<string, number>;
    locations: Record<string, number>;
  };
  suggestions?: string[];
  queryTime: number;
}

// Search suggestions
export interface SearchSuggestion {
  id: string;
  text: string;
  type: 'person' | 'workspace' | 'skill' | 'company' | 'location';
  count?: number;
  highlighted?: string; // Text with highlighted matching parts
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