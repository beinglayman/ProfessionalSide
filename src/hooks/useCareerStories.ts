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
} from '../types/career-stories';
import {
  isDemoMode,
  DEMO_CLUSTERS,
  DEMO_CLUSTER_DETAILS,
  DEMO_STARS,
} from '../services/career-stories-demo-data';

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
 * In demo mode, fetches from demo tables. Otherwise, fetches from real tables.
 */
export const useClusters = () => {
  return useQuery({
    queryKey: QueryKeys.careerStoriesClusters,
    queryFn: async () => {
      // Demo mode - use client-side mock data (no API call)
      if (isDemoMode()) {
        return DEMO_CLUSTERS;
      }

      // Live mode - fetch real clusters from API
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
 * In demo mode, uses client-side mock data.
 */
export const useCluster = (id: string) => {
  return useQuery({
    queryKey: QueryKeys.careerStoriesCluster(id),
    queryFn: async () => {
      // Demo mode - use client-side mock data
      if (isDemoMode() && DEMO_CLUSTER_DETAILS[id]) {
        return DEMO_CLUSTER_DETAILS[id];
      }

      // Live mode - fetch from API
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
 * In demo mode, uses client-side mock STAR data.
 *
 * @param clusterId - The cluster to generate a STAR from
 * @param request - Optional request options (personaId, polish settings)
 */
export const useGenerateStar = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ clusterId, request }: { clusterId: string; request?: GenerateSTARRequest }) => {
      // Demo mode - use client-side mock STAR data
      if (isDemoMode() && DEMO_STARS[clusterId]) {
        // Simulate network delay for realism
        await new Promise(resolve => setTimeout(resolve, 800));

        return {
          success: true,
          data: {
            star: DEMO_STARS[clusterId],
            polishStatus: request?.options?.polish ? 'success' : 'skipped',
            processingTimeMs: 800,
          },
        };
      }

      // Live mode - call real API
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
