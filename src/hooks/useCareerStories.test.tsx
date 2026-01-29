import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import {
  useClusters,
  useCluster,
  useGenerateStar,
  useGenerateClusters,
  useCareerStoriesStats,
} from './useCareerStories';
import { CareerStoriesService } from '../services/career-stories.service';

// Mock the service
vi.mock('../services/career-stories.service');

const mockCareerStoriesService = CareerStoriesService as jest.Mocked<typeof CareerStoriesService>;

// Create wrapper with fresh QueryClient per test
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useCareerStories Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('useClusters', () => {
    it('fetches clusters successfully', async () => {
      const mockClusters = [
        { id: 'cluster-1', name: 'Auth Migration', activityCount: 5 },
        { id: 'cluster-2', name: 'API Refactor', activityCount: 3 },
      ];

      mockCareerStoriesService.getClusters.mockResolvedValue({
        success: true,
        data: mockClusters,
      });

      const { result } = renderHook(() => useClusters(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockClusters);
      expect(mockCareerStoriesService.getClusters).toHaveBeenCalledTimes(1);
    });

    it('handles error response', async () => {
      mockCareerStoriesService.getClusters.mockResolvedValue({
        success: false,
        error: 'Failed to fetch clusters',
      });

      const { result } = renderHook(() => useClusters(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });
  });

  describe('useCluster', () => {
    it('fetches single cluster with activities', async () => {
      const mockCluster = {
        id: 'cluster-1',
        name: 'Auth Migration',
        activityCount: 5,
        activities: [
          { id: 'act-1', title: 'PR #123' },
          { id: 'act-2', title: 'JIRA-456' },
        ],
      };

      mockCareerStoriesService.getClusterById.mockResolvedValue({
        success: true,
        data: mockCluster,
      });

      const { result } = renderHook(() => useCluster('cluster-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockCluster);
      expect(mockCareerStoriesService.getClusterById).toHaveBeenCalledWith('cluster-1');
    });

    it('is disabled when id is empty', async () => {
      const { result } = renderHook(() => useCluster(''), {
        wrapper: createWrapper(),
      });

      // Should not fetch when id is empty
      expect(result.current.isFetching).toBe(false);
      expect(mockCareerStoriesService.getClusterById).not.toHaveBeenCalled();
    });
  });

  describe('useGenerateStar', () => {
    it('generates STAR successfully', async () => {
      const mockResult = {
        star: {
          clusterId: 'cluster-1',
          situation: { text: 'The situation', sources: [], confidence: 0.9 },
          task: { text: 'The task', sources: [], confidence: 0.85 },
          action: { text: 'The action', sources: [], confidence: 0.88 },
          result: { text: 'The result', sources: [], confidence: 0.82 },
          overallConfidence: 0.86,
          validation: { passed: true, score: 0.9, failedGates: [], warnings: [] },
        },
        processingTimeMs: 1234,
        polishStatus: 'success',
      };

      mockCareerStoriesService.generateStar.mockResolvedValue({
        success: true,
        data: mockResult,
      });

      const { result } = renderHook(() => useGenerateStar(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        clusterId: 'cluster-1',
        request: { options: { polish: true } },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockCareerStoriesService.generateStar).toHaveBeenCalledWith('cluster-1', {
        options: { polish: true },
      });
    });

    it('handles validation failure', async () => {
      const mockResult = {
        star: null,
        reason: 'VALIDATION_GATES_FAILED',
        failedGates: ['MIN_ACTIVITIES', 'MIN_TOOL_TYPES'],
        processingTimeMs: 50,
      };

      mockCareerStoriesService.generateStar.mockResolvedValue({
        success: true,
        data: mockResult,
      });

      const { result } = renderHook(() => useGenerateStar(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ clusterId: 'cluster-1' });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.data?.star).toBeNull();
      expect(result.current.data?.data?.failedGates).toEqual(['MIN_ACTIVITIES', 'MIN_TOOL_TYPES']);
    });
  });

  describe('useGenerateClusters', () => {
    it('generates clusters successfully', async () => {
      const mockResult = {
        clustersCreated: 3,
        clusters: [
          { cluster: { id: 'c1' }, activityIds: ['a1', 'a2'], activityCount: 2 },
          { cluster: { id: 'c2' }, activityIds: ['a3', 'a4', 'a5'], activityCount: 3 },
        ],
      };

      mockCareerStoriesService.generateClusters.mockResolvedValue({
        success: true,
        data: mockResult,
      });

      const { result } = renderHook(() => useGenerateClusters(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({});

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockCareerStoriesService.generateClusters).toHaveBeenCalledWith({});
    });
  });

  describe('useCareerStoriesStats', () => {
    it('fetches stats successfully', async () => {
      const mockStats = {
        activities: {
          total: 100,
          unclustered: 25,
          bySource: { github: 50, jira: 30, slack: 20 },
        },
        clusters: 10,
        stories: 5,
      };

      mockCareerStoriesService.getStats.mockResolvedValue({
        success: true,
        data: mockStats,
      });

      const { result } = renderHook(() => useCareerStoriesStats(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockStats);
    });
  });
});
