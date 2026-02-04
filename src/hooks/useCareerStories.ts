/**
 * Career Stories React Query Hooks
 *
 * Hooks for fetching and mutating career stories data.
 *
 * Query Key Strategy:
 * - All keys prefixed with 'career-stories' for easy invalidation
 * - Cluster list uses array key for collection
 * - Individual cluster uses factory function for ID-based key
 *
 * Cache Invalidation:
 * - Mutations invalidate related queries for consistency
 * - generateStar invalidates cluster queries to update STAR status
 * - generateClusters invalidates stats and unclustered activities
 *
 * Demo Mode:
 * - When backend returns empty data, demo mode provides sample clusters
 * - Demo mode can be toggled via localStorage 'career-stories-demo'
 *
 * TODO: Add retry logic for network failures
 * TODO: Consider staleTime optimization for frequently accessed data
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QueryKeys } from '../lib/queryClient';
import {
  CareerStoriesService,
  GetActivitiesParams,
} from '../services/career-stories.service';
import {
  GenerateClustersRequest,
  GenerateSTARRequest,
  MergeClustersRequest,
  CareerStory,
  CreateCareerStoryRequest,
  UpdateCareerStoryRequest,
  StoryVisibility,
  NarrativeFramework,
} from '../types/career-stories';
import { isDemoMode, DEMO_CLUSTER_DETAILS } from '../services/career-stories-demo-data';
// NOTE: DEMO_CLUSTERS and DEMO_STARS removed - CareerStories come from DB only

// =============================================================================
// STATS
// =============================================================================

/**
 * Get career stories summary stats
 */
export const useCareerStoriesStats = () => {
  return useQuery({
    queryKey: QueryKeys.careerStoriesStats,
    queryFn: async () => {
      const response = await CareerStoriesService.getStats();
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error || 'Failed to fetch career stories stats');
    },
  });
};

// =============================================================================
// ACTIVITIES
// =============================================================================

/**
 * Get user's tool activities with optional filtering
 */
export const useActivities = (params: GetActivitiesParams = {}, enabled: boolean = true) => {
  return useQuery({
    queryKey: QueryKeys.careerStoriesActivities(params),
    queryFn: async () => {
      const response = await CareerStoriesService.getActivities(params);
      if (response.success && response.data) {
        return {
          activities: response.data,
          pagination: response.pagination,
        };
      }
      throw new Error(response.error || 'Failed to fetch activities');
    },
    enabled,
  });
};

/**
 * Get unclustered activities
 */
export const useUnclusteredActivities = () => {
  return useQuery({
    queryKey: QueryKeys.careerStoriesUnclusteredActivities,
    queryFn: async () => {
      const response = await CareerStoriesService.getUnclusteredActivities();
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error || 'Failed to fetch unclustered activities');
    },
  });
};

// =============================================================================
// CLUSTERS
// =============================================================================

/**
 * Get all clusters for the user.
 *
 * NOTE: This fetches from StoryCluster table (production clustering).
 * Demo mode no longer uses hardcoded DEMO_CLUSTERS - those were journal entries,
 * not career stories. Career Stories are only created when a user explicitly
 * generates a polished narrative from a JournalEntry.
 */
export const useClusters = () => {
  return useQuery({
    queryKey: QueryKeys.careerStoriesClusters,
    queryFn: async () => {
      // Always fetch from API - no demo mode fallback
      // CareerStory records are only created through explicit narrative generation
      const response = await CareerStoriesService.getClusters();
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error || 'Failed to fetch clusters');
    },
  });
};

/**
 * Get a single cluster with activities.
 *
 * NOTE: Demo mode fallback removed - CareerStories come from explicit
 * narrative generation, not hardcoded mock data.
 */
export const useCluster = (id: string) => {
  return useQuery({
    queryKey: QueryKeys.careerStoriesCluster(id),
    queryFn: async () => {
      const response = await CareerStoriesService.getClusterById(id);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error || 'Failed to fetch cluster');
    },
    enabled: !!id,
  });
};

/**
 * Generate clusters from unclustered activities
 */
export const useGenerateClusters = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: GenerateClustersRequest = {}) =>
      CareerStoriesService.generateClusters(data),
    onSuccess: (response) => {
      if (response.success) {
        // Invalidate clusters and stats
        queryClient.invalidateQueries({ queryKey: QueryKeys.careerStoriesClusters });
        queryClient.invalidateQueries({ queryKey: QueryKeys.careerStoriesStats });
        queryClient.invalidateQueries({ queryKey: QueryKeys.careerStoriesUnclusteredActivities });
      }
    },
  });
};

/**
 * Rename a cluster
 */
export const useRenameCluster = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      CareerStoriesService.renameCluster(id, name),
    onSuccess: (response, { id }) => {
      if (response.success) {
        queryClient.invalidateQueries({ queryKey: QueryKeys.careerStoriesCluster(id) });
        queryClient.invalidateQueries({ queryKey: QueryKeys.careerStoriesClusters });
      }
    },
  });
};

/**
 * Delete a cluster
 */
export const useDeleteCluster = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => CareerStoriesService.deleteCluster(id),
    onSuccess: (response, id) => {
      if (response.success) {
        queryClient.removeQueries({ queryKey: QueryKeys.careerStoriesCluster(id) });
        queryClient.invalidateQueries({ queryKey: QueryKeys.careerStoriesClusters });
        queryClient.invalidateQueries({ queryKey: QueryKeys.careerStoriesStats });
        queryClient.invalidateQueries({ queryKey: QueryKeys.careerStoriesUnclusteredActivities });
      }
    },
  });
};

/**
 * Add activity to cluster
 */
export const useAddActivityToCluster = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ clusterId, activityId }: { clusterId: string; activityId: string }) =>
      CareerStoriesService.addActivityToCluster(clusterId, activityId),
    onSuccess: (response, { clusterId }) => {
      if (response.success) {
        queryClient.invalidateQueries({ queryKey: QueryKeys.careerStoriesCluster(clusterId) });
        queryClient.invalidateQueries({ queryKey: QueryKeys.careerStoriesClusters });
        queryClient.invalidateQueries({ queryKey: QueryKeys.careerStoriesUnclusteredActivities });
      }
    },
  });
};

/**
 * Remove activity from cluster
 */
export const useRemoveActivityFromCluster = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ clusterId, activityId }: { clusterId: string; activityId: string }) =>
      CareerStoriesService.removeActivityFromCluster(clusterId, activityId),
    onSuccess: (response, { clusterId }) => {
      if (response.success) {
        queryClient.invalidateQueries({ queryKey: QueryKeys.careerStoriesCluster(clusterId) });
        queryClient.invalidateQueries({ queryKey: QueryKeys.careerStoriesClusters });
        queryClient.invalidateQueries({ queryKey: QueryKeys.careerStoriesUnclusteredActivities });
      }
    },
  });
};

/**
 * Merge clusters
 */
export const useMergeClusters = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: MergeClustersRequest) =>
      CareerStoriesService.mergeClusters(data),
    onSuccess: (response) => {
      if (response.success) {
        queryClient.invalidateQueries({ queryKey: QueryKeys.careerStoriesClusters });
        queryClient.invalidateQueries({ queryKey: QueryKeys.careerStoriesStats });
      }
    },
  });
};

// =============================================================================
// STAR GENERATION
// =============================================================================

/**
 * Generate STAR narrative for a cluster.
 *
 * NOTE: Demo mode fallback removed - STAR generation happens through
 * the real API which creates CareerStory records.
 *
 * @param clusterId - The cluster to generate a STAR from
 * @param request - Optional request options (personaId, polish settings)
 */
export const useGenerateStar = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ clusterId, request }: { clusterId: string; request?: GenerateSTARRequest }) => {
      return CareerStoriesService.generateStar(clusterId, request);
    },
    onSuccess: (response, { clusterId }) => {
      if (response.success) {
        queryClient.invalidateQueries({ queryKey: QueryKeys.careerStoriesCluster(clusterId) });
        queryClient.invalidateQueries({ queryKey: QueryKeys.careerStoriesClusters });
        queryClient.invalidateQueries({ queryKey: QueryKeys.careerStoriesStats });
      }
    },
  });
};

// =============================================================================
// MOCK DATA (Development)
// =============================================================================

/**
 * Seed mock data for testing
 */
export const useSeedMockData = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => CareerStoriesService.seedMockData(),
    onSuccess: (response) => {
      if (response.success) {
        queryClient.invalidateQueries({ queryKey: ['career-stories'] });
      }
    },
  });
};

/**
 * Clear all mock data
 */
export const useClearMockData = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => CareerStoriesService.clearMockData(),
    onSuccess: (response) => {
      if (response.success) {
        queryClient.invalidateQueries({ queryKey: ['career-stories'] });
      }
    },
  });
};

/**
 * Run full pipeline (seed -> cluster)
 */
export const useRunFullPipeline = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => CareerStoriesService.runFullPipeline(),
    onSuccess: (response) => {
      if (response.success) {
        queryClient.invalidateQueries({ queryKey: ['career-stories'] });
      }
    },
  });
};

// =============================================================================
// DEMO MODE MUTATIONS
// =============================================================================

/**
 * Update activity assignments for a demo cluster.
 * Sets groupingMethod to 'manual'.
 */
export const useUpdateDemoClusterActivities = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ clusterId, activityIds }: { clusterId: string; activityIds: string[] }) => {
      // In demo mode with client-side data, update local state
      if (isDemoMode() && DEMO_CLUSTER_DETAILS[clusterId]) {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 300));

        // For now, just return success - real API will persist
        return {
          success: true,
          data: { id: clusterId, activityCount: activityIds.length, groupingMethod: 'manual' },
        };
      }

      // Live demo mode - call API
      return CareerStoriesService.updateDemoClusterActivities(clusterId, activityIds);
    },
    onSuccess: (response, { clusterId }) => {
      if (response.success) {
        queryClient.invalidateQueries({ queryKey: QueryKeys.careerStoriesCluster(clusterId) });
        queryClient.invalidateQueries({ queryKey: QueryKeys.careerStoriesClusters });
      }
    },
  });
};

/**
 * Get all demo activities for activity selection.
 */
export const useDemoActivities = () => {
  return useQuery({
    queryKey: ['demo-activities'],
    queryFn: async () => {
      // In demo mode with client-side data, gather from all clusters
      if (isDemoMode()) {
        const allActivities = Object.values(DEMO_CLUSTER_DETAILS).flatMap((c) => c.activities);
        return allActivities;
      }

      // Live mode - fetch from API
      const response = await CareerStoriesService.getDemoActivities();
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error || 'Failed to fetch demo activities');
    },
  });
};

// =============================================================================
// CAREER STORIES CRUD
// =============================================================================

/**
 * List all career stories for the user
 */
export const useListCareerStories = () => {
  return useQuery({
    queryKey: ['career-stories', 'stories'],
    queryFn: async () => {
      const response = await CareerStoriesService.listStories();
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error || 'Failed to fetch career stories');
    },
  });
};

/**
 * Create a new career story
 */
export const useCreateCareerStory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCareerStoryRequest) => CareerStoriesService.createStory(data),
    onSuccess: (response) => {
      if (response.success) {
        queryClient.invalidateQueries({ queryKey: ['career-stories', 'stories'] });
        queryClient.invalidateQueries({ queryKey: QueryKeys.careerStoriesStats });
      }
    },
  });
};

/**
 * Update a career story
 */
export const useUpdateCareerStory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCareerStoryRequest }) =>
      CareerStoriesService.updateStory(id, data),
    onSuccess: (response) => {
      if (response.success) {
        queryClient.invalidateQueries({ queryKey: ['career-stories', 'stories'] });
      }
    },
  });
};

/**
 * Regenerate a career story with a new framework
 */
export const useRegenerateCareerStory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, framework }: { id: string; framework: NarrativeFramework }) =>
      CareerStoriesService.regenerateStory(id, framework),
    onSuccess: (response) => {
      if (response.success) {
        queryClient.invalidateQueries({ queryKey: ['career-stories', 'stories'] });
      }
    },
  });
};

/**
 * Delete a career story
 */
export const useDeleteCareerStory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => CareerStoriesService.deleteStory(id),
    onSuccess: (response) => {
      if (response.success) {
        queryClient.invalidateQueries({ queryKey: ['career-stories', 'stories'] });
        queryClient.invalidateQueries({ queryKey: QueryKeys.careerStoriesStats });
      }
    },
  });
};

/**
 * Publish a career story
 */
export const usePublishCareerStory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, visibility }: { id: string; visibility: StoryVisibility }) =>
      CareerStoriesService.publishStory(id, visibility),
    onSuccess: (response) => {
      if (response.success) {
        queryClient.invalidateQueries({ queryKey: ['career-stories', 'stories'] });
      }
    },
  });
};

/**
 * Unpublish a career story
 */
export const useUnpublishCareerStory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => CareerStoriesService.unpublishStory(id),
    onSuccess: (response) => {
      if (response.success) {
        queryClient.invalidateQueries({ queryKey: ['career-stories', 'stories'] });
      }
    },
  });
};

/**
 * Set visibility on a published story
 */
export const useSetCareerStoryVisibility = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, visibility }: { id: string; visibility: StoryVisibility }) =>
      CareerStoriesService.setStoryVisibility(id, visibility),
    onSuccess: (response) => {
      if (response.success) {
        queryClient.invalidateQueries({ queryKey: ['career-stories', 'stories'] });
      }
    },
  });
};
