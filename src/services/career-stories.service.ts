/**
 * Career Stories Service
 *
 * API service for tool activities, clusters, and STAR narrative generation.
 *
 * API Endpoints:
 * - GET /career-stories/clusters - List all clusters
 * - GET /career-stories/clusters/:id - Get cluster with activities
 * - POST /career-stories/clusters/generate - Run clustering algorithm
 * - POST /career-stories/clusters/:id/generate-star - Generate STAR narrative
 *
 * Error Handling:
 * - All methods return ApiResponse wrapper with success/error
 * - HTTP errors are converted to error property in response
 *
 * TODO: Add request/response logging for debugging
 * TODO: Consider adding request caching for static data
 */

import { api, ApiResponse } from '../lib/api';
import {
  ToolActivity,
  Cluster,
  ClusterWithActivities,
  GenerateClustersRequest,
  GenerateClustersResponse,
  GenerateSTARRequest,
  GenerateSTARResult,
  MergeClustersRequest,
  CareerStoriesStats,
} from '../types/career-stories';

// =============================================================================
// TOOL ACTIVITIES
// =============================================================================

export interface GetActivitiesParams {
  source?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export class CareerStoriesService {
  /**
   * Get user's tool activities with optional filtering
   */
  static async getActivities(params: GetActivitiesParams = {}): Promise<ApiResponse<ToolActivity[]>> {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, value.toString());
      }
    });

    const response = await api.get<ApiResponse<ToolActivity[]>>(
      `/career-stories/activities?${searchParams.toString()}`
    );
    return response.data;
  }

  /**
   * Get a single activity by ID
   */
  static async getActivityById(id: string): Promise<ApiResponse<ToolActivity>> {
    const response = await api.get<ApiResponse<ToolActivity>>(`/career-stories/activities/${id}`);
    return response.data;
  }

  /**
   * Get activities not assigned to any cluster
   */
  static async getUnclusteredActivities(): Promise<ApiResponse<ToolActivity[]>> {
    const response = await api.get<ApiResponse<ToolActivity[]>>('/career-stories/activities/unclustered');
    return response.data;
  }

  // =============================================================================
  // CLUSTERS
  // =============================================================================

  /**
   * Get all clusters for the user
   */
  static async getClusters(): Promise<ApiResponse<Cluster[]>> {
    const response = await api.get<ApiResponse<Cluster[]>>('/career-stories/clusters');
    return response.data;
  }

  /**
   * Get a single cluster with its activities
   */
  static async getClusterById(id: string): Promise<ApiResponse<ClusterWithActivities>> {
    const response = await api.get<ApiResponse<ClusterWithActivities>>(`/career-stories/clusters/${id}`);
    return response.data;
  }

  /**
   * Run clustering algorithm on unclustered activities
   */
  static async generateClusters(data: GenerateClustersRequest = {}): Promise<ApiResponse<GenerateClustersResponse>> {
    const response = await api.post<ApiResponse<GenerateClustersResponse>>(
      '/career-stories/clusters/generate',
      data
    );
    return response.data;
  }

  /**
   * Rename a cluster
   */
  static async renameCluster(id: string, name: string): Promise<ApiResponse<Cluster>> {
    const response = await api.patch<ApiResponse<Cluster>>(`/career-stories/clusters/${id}`, { name });
    return response.data;
  }

  /**
   * Delete a cluster (activities become unclustered)
   */
  static async deleteCluster(id: string): Promise<ApiResponse<null>> {
    const response = await api.delete<ApiResponse<null>>(`/career-stories/clusters/${id}`);
    return response.data;
  }

  /**
   * Add an activity to a cluster
   */
  static async addActivityToCluster(clusterId: string, activityId: string): Promise<ApiResponse<Cluster>> {
    const response = await api.post<ApiResponse<Cluster>>(
      `/career-stories/clusters/${clusterId}/activities`,
      { activityId }
    );
    return response.data;
  }

  /**
   * Remove an activity from a cluster
   */
  static async removeActivityFromCluster(clusterId: string, activityId: string): Promise<ApiResponse<Cluster>> {
    const response = await api.delete<ApiResponse<Cluster>>(
      `/career-stories/clusters/${clusterId}/activities/${activityId}`
    );
    return response.data;
  }

  /**
   * Merge multiple clusters into one
   */
  static async mergeClusters(data: MergeClustersRequest): Promise<ApiResponse<Cluster>> {
    const response = await api.post<ApiResponse<Cluster>>('/career-stories/clusters/merge', data);
    return response.data;
  }

  // =============================================================================
  // STAR GENERATION
  // =============================================================================

  /**
   * Generate a STAR narrative from a cluster
   */
  static async generateStar(clusterId: string, data: GenerateSTARRequest = {}): Promise<ApiResponse<GenerateSTARResult>> {
    const response = await api.post<ApiResponse<GenerateSTARResult>>(
      `/career-stories/clusters/${clusterId}/generate-star`,
      data
    );
    return response.data;
  }

  // =============================================================================
  // STATS
  // =============================================================================

  /**
   * Get summary stats for career stories
   */
  static async getStats(): Promise<ApiResponse<CareerStoriesStats>> {
    const response = await api.get<ApiResponse<CareerStoriesStats>>('/career-stories/stats');
    return response.data;
  }

  // =============================================================================
  // MOCK DATA (Development only)
  // =============================================================================

  /**
   * Seed mock tool activities for testing
   */
  static async seedMockData(): Promise<ApiResponse<{ activitiesCreated: number }>> {
    const response = await api.post<ApiResponse<{ activitiesCreated: number }>>('/career-stories/mock/seed');
    return response.data;
  }

  /**
   * Clear all activities and clusters
   */
  static async clearMockData(): Promise<ApiResponse<{ deleted: { activities: number; clusters: number; stories: number } }>> {
    const response = await api.delete<ApiResponse<{ deleted: { activities: number; clusters: number; stories: number } }>>('/career-stories/mock/clear');
    return response.data;
  }

  /**
   * Run full pipeline: seed -> cluster -> return results
   */
  static async runFullPipeline(): Promise<ApiResponse<{
    pipeline: {
      step1_cleared: boolean;
      step2_seeded: number;
      step3_clustered: number;
      step4_unclustered: number;
    };
    clusters: Array<{ id: string; activityCount: number; activityIds: string[] }>;
  }>> {
    const response = await api.post<ApiResponse<{
      pipeline: {
        step1_cleared: boolean;
        step2_seeded: number;
        step3_clustered: number;
        step4_unclustered: number;
      };
      clusters: Array<{ id: string; activityCount: number; activityIds: string[] }>;
    }>>('/career-stories/mock/full-pipeline');
    return response.data;
  }
}
