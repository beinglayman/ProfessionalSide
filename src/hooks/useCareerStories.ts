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

import { useMemo } from 'react';
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
  CareerStoriesListResult,
  CreateCareerStoryRequest,
  UpdateCareerStoryRequest,
  StoryVisibility,
  NarrativeFramework,
  WritingStyle,
  ToolActivity,
  StorySource,
  AnnotationStyle,
  DeriveStoryRequest,
  DeriveStoryResponse,
  DerivePacketRequest,
  DerivePacketResponse,
  StoryDerivation,
} from '../types/career-stories';
import { collectActivityIds } from '../utils/story-timeline';
import { QueryKeys as BillingKeys } from '../lib/queryClient';
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
 * Build an O(1) activity lookup map for a set of stories.
 * Fetches all activities referenced by the stories and returns a Map keyed by activity ID.
 */
export const useStoryActivityMap = (stories: CareerStory[]) => {
  const activityIds = useMemo(() => collectActivityIds(stories), [stories]);
  const { data: activitiesData } = useActivities({ limit: 500 }, activityIds.size > 0);

  return useMemo(() => {
    const map = new Map<string, ToolActivity>();
    if (!activitiesData?.activities) return map;
    for (const a of activitiesData.activities) {
      if (activityIds.has(a.id)) map.set(a.id, a);
    }
    return map;
  }, [activitiesData, activityIds]);
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
 * Regenerate a career story with a new framework and optional writing style
 */
export const useRegenerateCareerStory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, framework, style, userPrompt, archetype }: { id: string; framework: NarrativeFramework; style?: WritingStyle; userPrompt?: string; archetype?: string }) =>
      CareerStoriesService.regenerateStory(id, framework, style, userPrompt, archetype),
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
        // Refetch draft stories — deleted career story un-hides a promoted draft
        queryClient.invalidateQueries({ queryKey: ['activities'] });
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
    mutationFn: ({ id, visibility, category }: { id: string; visibility: StoryVisibility; category?: string }) =>
      CareerStoriesService.publishStory(id, visibility, category),
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

// =============================================================================
// FRAMEWORK RECOMMENDATIONS
// =============================================================================

/**
 * Framework recommendation response from AI analysis
 */
export interface FrameworkRecommendation {
  framework: NarrativeFramework;
  confidence: number;
  reason: string;
}

export interface FrameworkRecommendationsResponse {
  primary: FrameworkRecommendation | null;
  alternatives: FrameworkRecommendation[];
  recommendedUseCase: {
    id: string;
    label: string;
  } | null;
}

/**
 * Get AI-powered framework recommendations for a journal entry.
 *
 * Currently returns empty data - AI recommendation endpoint not yet implemented.
 * The FrameworkPickerModal gracefully handles missing recommendations by
 * defaulting to manual selection.
 *
 * @param entryId - The journal entry ID to analyze
 * @param enabled - Whether to run the query
 */
export const useFrameworkRecommendations = (entryId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['career-stories', 'framework-recommendations', entryId],
    queryFn: async (): Promise<FrameworkRecommendationsResponse> => {
      // TODO: Implement backend endpoint for AI-powered framework recommendations
      // For now, return empty data - modal handles this gracefully
      return {
        primary: null,
        alternatives: [],
        recommendedUseCase: null,
      };
    },
    enabled: enabled && !!entryId,
    staleTime: 5 * 60 * 1000, // 5 minutes - recommendations don't change frequently
  });
};

// =============================================================================
// STORY SOURCES
// =============================================================================

/**
 * Add a user note source to a story section
 */
export const useAddStorySource = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ storyId, sectionKey, content }: { storyId: string; sectionKey: string; content: string }) =>
      CareerStoriesService.addStorySource(storyId, sectionKey, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['career-stories', 'stories'] });
    },
  });
};

/**
 * Exclude or restore a source (set excludedAt)
 */
export const useUpdateStorySource = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ storyId, sourceId, excludedAt }: { storyId: string; sourceId: string; excludedAt: string | null }) =>
      CareerStoriesService.updateStorySource(storyId, sourceId, excludedAt),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['career-stories', 'stories'] });
    },
  });
};

// =============================================================================
// STORY ANNOTATIONS
// =============================================================================

/**
 * Create an annotation on a story section
 */
export const useCreateAnnotation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ storyId, input }: {
      storyId: string;
      input: {
        sectionKey: string;
        startOffset: number;
        endOffset: number;
        annotatedText: string;
        style: AnnotationStyle;
        note?: string | null;
      };
    }) => CareerStoriesService.createAnnotation(storyId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['career-stories', 'stories'] });
    },
  });
};

/**
 * Update an annotation (note or style)
 */
export const useUpdateAnnotation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ storyId, annotationId, input }: {
      storyId: string;
      annotationId: string;
      input: { note?: string | null; style?: AnnotationStyle };
    }) => CareerStoriesService.updateAnnotation(storyId, annotationId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['career-stories', 'stories'] });
    },
  });
};

/**
 * Delete an annotation
 */
export const useDeleteAnnotation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ storyId, annotationId }: { storyId: string; annotationId: string }) =>
      CareerStoriesService.deleteAnnotation(storyId, annotationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['career-stories', 'stories'] });
    },
  });
};

// =============================================================================
// DERIVATION ANNOTATIONS
// =============================================================================

export const useDerivationAnnotations = (derivationId: string | undefined) => {
  return useQuery({
    queryKey: ['career-stories', 'derivation-annotations', derivationId],
    queryFn: async () => {
      if (!derivationId) return [];
      const resp = await CareerStoriesService.getDerivationAnnotations(derivationId);
      return resp.data ?? [];
    },
    enabled: !!derivationId,
  });
};

export const useCreateDerivationAnnotation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ derivationId, input }: {
      derivationId: string;
      input: {
        sectionKey: string;
        startOffset: number;
        endOffset: number;
        annotatedText: string;
        style: AnnotationStyle;
        note?: string | null;
      };
    }) => CareerStoriesService.createDerivationAnnotation(derivationId, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['career-stories', 'derivation-annotations', variables.derivationId] });
    },
  });
};

export const useUpdateDerivationAnnotation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ derivationId, annotationId, input }: {
      derivationId: string;
      annotationId: string;
      input: { note?: string | null; style?: AnnotationStyle };
    }) => CareerStoriesService.updateDerivationAnnotation(derivationId, annotationId, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['career-stories', 'derivation-annotations', variables.derivationId] });
    },
  });
};

export const useDeleteDerivationAnnotation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ derivationId, annotationId }: { derivationId: string; annotationId: string }) =>
      CareerStoriesService.deleteDerivationAnnotation(derivationId, annotationId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['career-stories', 'derivation-annotations', variables.derivationId] });
    },
  });
};

// =============================================================================
// STORY DERIVATIONS
// =============================================================================

/**
 * Generate a derivation from a story. Invalidates derivation cache on success.
 */
export const useDeriveStory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ storyId, params }: { storyId: string; params: DeriveStoryRequest }) =>
      CareerStoriesService.deriveStory(storyId, params),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['career-stories', 'derivations', variables.storyId] });
      queryClient.invalidateQueries({ queryKey: ['career-stories', 'derivations-by-kind', 'single'] });
      queryClient.invalidateQueries({ queryKey: BillingKeys.walletBalance });
    },
  });
};

/**
 * Generate a packet from multiple stories. Invalidates derivation cache on success.
 */
export const useDerivePacket = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: DerivePacketRequest) =>
      CareerStoriesService.derivePacket(params),
    onSuccess: (_data, variables) => {
      for (const storyId of variables.storyIds) {
        queryClient.invalidateQueries({ queryKey: ['career-stories', 'derivations', storyId] });
      }
      queryClient.invalidateQueries({ queryKey: ['career-stories', 'derivations-by-kind', 'packet'] });
      queryClient.invalidateQueries({ queryKey: BillingKeys.walletBalance });
    },
  });
};

/**
 * Fetch saved derivations for a story.
 */
export const useStoryDerivations = (storyId: string | undefined) => {
  return useQuery({
    queryKey: ['career-stories', 'derivations', storyId],
    queryFn: () => CareerStoriesService.listDerivations(storyId!),
    enabled: !!storyId,
    select: (response) => response.data,
  });
};

/**
 * Delete a saved derivation.
 */
export const useDeleteDerivation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => CareerStoriesService.deleteDerivation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['career-stories', 'derivations'] });
      queryClient.invalidateQueries({ queryKey: ['career-stories', 'derivations-by-kind'] });
    },
  });
};

/**
 * Fetch all packets (multi-story derivations) for the current user.
 */
export const usePackets = () => {
  return useQuery({
    queryKey: ['career-stories', 'derivations-by-kind', 'packet'],
    queryFn: () => CareerStoriesService.listDerivationsByKind('packet'),
    select: (response) => response.data,
  });
};

/**
 * Fetch all single-story derivations for the current user.
 */
export const useSingleDerivations = () => {
  return useQuery({
    queryKey: ['career-stories', 'derivations-by-kind', 'single'],
    queryFn: () => CareerStoriesService.listDerivationsByKind('single'),
    select: (response) => response.data,
  });
};
