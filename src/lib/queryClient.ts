import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Don't retry on 401, 403, 404
        if (error?.response?.status === 401 || 
            error?.response?.status === 403 || 
            error?.response?.status === 404) {
          return false;
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (previously cacheTime)
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});

// Query keys for consistent cache management
export const QueryKeys = {
  // Auth
  currentUser: ['auth', 'currentUser'] as const,
  
  // Users
  userProfile: (userId: string) => ['users', 'profile', userId] as const,
  userSkills: (userId?: string) => ['users', 'skills', userId] as const,
  searchUsers: (params: any) => ['users', 'search', params] as const,
  allSkills: ['users', 'skills', 'all'] as const,
  
  // Journal
  journalEntries: (params: any) => ['journal', 'entries', params] as const,
  journalEntry: (id: string) => ['journal', 'entry', id] as const,
  entryComments: (id: string) => ['journal', 'entry', id, 'comments'] as const,
  
  // Workspaces
  workspaces: ['workspaces'] as const,
  workspace: (id: string) => ['workspaces', id] as const,
  
  // Network
  networkConnections: ['network', 'connections'] as const,
  
  // Goals
  goals: ['goals'] as const,
  goal: (id: string) => ['goals', id] as const,

  // Career Stories
  careerStoriesStats: ['career-stories', 'stats'] as const,
  careerStoriesClusters: ['career-stories', 'clusters'] as const,
  careerStoriesCluster: (id: string) => ['career-stories', 'cluster', id] as const,
  careerStoriesActivities: (params: any) => ['career-stories', 'activities', params] as const,
  careerStoriesUnclusteredActivities: ['career-stories', 'activities', 'unclustered'] as const,

  // Billing
  walletBalance: ['billing', 'wallet'] as const,
} as const;