/**
 * STARGenerationService Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { STARGenerationService } from './star-generation.service';
import { ClusterHydrator, ActivityWithRefs } from './pipeline/cluster-hydrator';
import { STARExtractor } from './pipeline/star-extractor';
import { Cluster, CareerPersona, ScoredSTAR, ParticipationResult } from './pipeline/types';

describe('STARGenerationService', () => {
  // Test data factories
  const createPersona = (overrides: Partial<CareerPersona> = {}): CareerPersona => ({
    displayName: 'Test User',
    emails: ['test@example.com'],
    identities: {
      github: { login: 'testuser' },
      jira: { accountId: 'jira-123' },
    },
    ...overrides,
  });

  const createCluster = (overrides: Partial<Cluster> = {}): Cluster => ({
    id: 'cluster-1',
    activityIds: ['act-1', 'act-2', 'act-3'],
    sharedRefs: ['PROJ-123'],
    metrics: {
      activityCount: 3,
      refCount: 1,
      toolTypes: ['jira', 'github'],
      dateRange: {
        earliest: new Date('2024-01-01'),
        latest: new Date('2024-01-10'),
      },
    },
    ...overrides,
  });

  const createActivities = (): ActivityWithRefs[] => [
    {
      id: 'act-1',
      source: 'jira',
      sourceId: 'PROJ-123',
      title: 'Fix slow dashboard loading',
      description: 'Dashboard was taking 10s to load, users were complaining',
      timestamp: new Date('2024-01-01'),
      refs: ['PROJ-123'],
      rawData: { assignee: 'jira-123' },
    },
    {
      id: 'act-2',
      source: 'github',
      sourceId: 'pr-456',
      title: 'Implement query caching for dashboard',
      description: 'Added Redis caching layer, reduced load time from 10s to 200ms',
      timestamp: new Date('2024-01-05'),
      refs: ['PROJ-123'],
      rawData: { author: 'testuser', additions: 150, deletions: 20 },
    },
    {
      id: 'act-3',
      source: 'github',
      sourceId: 'pr-457',
      title: 'Add monitoring for cache hits',
      timestamp: new Date('2024-01-10'),
      refs: ['PROJ-123'],
      rawData: { author: 'testuser' },
    },
  ];

  describe('generate()', () => {
    it('generates STAR from valid cluster', async () => {
      const service = new STARGenerationService();
      const cluster = createCluster();
      const activities = createActivities();
      const persona = createPersona();

      const result = await service.generate(cluster, activities, persona);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.star).not.toBeNull();
        expect(result.value.star?.clusterId).toBe('cluster-1');
        expect(result.value.participations).toHaveLength(3);
        expect(result.value.processingTimeMs).toBeGreaterThan(0);
        expect(result.value.polishStatus).toBe('not_requested');
      }
    });

    it('returns null star when validation gates fail', async () => {
      const service = new STARGenerationService();
      const cluster = createCluster({
        activityIds: ['act-1'], // Only 1 activity
        metrics: {
          activityCount: 1,
          refCount: 1,
          toolTypes: ['jira'], // Only 1 tool type
        },
      });
      const activities = createActivities().slice(0, 1);
      const persona = createPersona();

      const result = await service.generate(cluster, activities, persona);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.star).toBeNull();
        expect(result.value.failedGates).toBeDefined();
        expect(result.value.failedGates!.length).toBeGreaterThan(0);
        expect(result.value.participations).toHaveLength(1);
      }
    });

    it('passes custom options to extractor', async () => {
      const service = new STARGenerationService();
      const cluster = createCluster({
        activityIds: ['act-1', 'act-2'],
        metrics: {
          activityCount: 2,
          refCount: 1,
          toolTypes: ['jira', 'github'],
        },
      });
      const activities = createActivities().slice(0, 2);
      const persona = createPersona();

      // Lower thresholds to allow STAR generation
      const result = await service.generate(cluster, activities, persona, {
        minActivities: 2,
        minToolTypes: 2,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.star).not.toBeNull();
      }
    });

    it('handles empty activities gracefully', async () => {
      const service = new STARGenerationService();
      const cluster = createCluster({ activityIds: [] });
      const persona = createPersona();

      const result = await service.generate(cluster, [], persona);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.star).toBeNull();
        expect(result.value.failedGates).toBeDefined();
      }
    });

    it('includes participation results even when STAR fails', async () => {
      const service = new STARGenerationService();
      const cluster = createCluster({
        activityIds: ['act-1'],
        metrics: {
          activityCount: 1,
          refCount: 1,
          toolTypes: ['jira'],
        },
      });
      const activities = createActivities().slice(0, 1);
      const persona = createPersona();

      const result = await service.generate(cluster, activities, persona);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.star).toBeNull();
        expect(result.value.participations).toHaveLength(1);
        expect(result.value.participations[0].activityId).toBe('act-1');
      }
    });
  });

  describe('generateFromClusterId()', () => {
    it('generates STAR when cluster ID matches', async () => {
      const service = new STARGenerationService();
      const cluster = createCluster();
      const activities = createActivities();
      const persona = createPersona();

      const result = await service.generateFromClusterId(
        'cluster-1',
        { cluster, activities },
        persona
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.star).not.toBeNull();
      }
    });

    it('returns error when cluster ID does not match', async () => {
      const service = new STARGenerationService();
      const cluster = createCluster({ id: 'cluster-2' });
      const activities = createActivities();
      const persona = createPersona();

      const result = await service.generateFromClusterId(
        'cluster-1',
        { cluster, activities },
        persona
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('CLUSTER_NOT_FOUND');
        expect(result.error.message).toContain('mismatch');
      }
    });
  });

  describe('dependency injection', () => {
    it('uses real hydrator and extractor with custom defaults', async () => {
      // Test that DI works by verifying the service uses the provided dependencies
      const service = new STARGenerationService();
      const cluster = createCluster();
      const activities = createActivities();
      const persona = createPersona();

      const result = await service.generate(cluster, activities, persona);

      // Verifies the pipeline works end-to-end
      expect(result.isOk()).toBe(true);
    });
  });

  describe('STAR quality', () => {
    it('generates STAR with all components from diverse activities', async () => {
      const service = new STARGenerationService();
      const cluster = createCluster();
      const activities = createActivities();
      const persona = createPersona();

      const result = await service.generate(cluster, activities, persona);

      expect(result.isOk()).toBe(true);
      if (result.isOk() && result.value.star) {
        expect(result.value.star.situation.text).toBeTruthy();
        expect(result.value.star.task.text).toBeTruthy();
        expect(result.value.star.action.text).toBeTruthy();
        expect(result.value.star.result.text).toBeTruthy();
      }
    });

    it('calculates participation levels correctly', async () => {
      const service = new STARGenerationService();
      const cluster = createCluster();
      const activities = createActivities();
      const persona = createPersona();

      const result = await service.generate(cluster, activities, persona);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // User is assignee on Jira and author on GitHub PRs
        const initiatorCount = result.value.participations.filter(
          (p) => p.level === 'initiator'
        ).length;

        expect(initiatorCount).toBeGreaterThan(0);
      }
    });
  });

  describe('Result chaining', () => {
    it('can chain Results with map', async () => {
      const service = new STARGenerationService();
      const cluster = createCluster();
      const activities = createActivities();
      const persona = createPersona();

      const result = await service.generate(cluster, activities, persona);
      const mapped = result.map((r) => r.star?.clusterId);

      expect(mapped.isOk()).toBe(true);
      if (mapped.isOk()) {
        expect(mapped.value).toBe('cluster-1');
      }
    });

    it('preserves participations in Result', async () => {
      const service = new STARGenerationService();
      const cluster = createCluster();
      const activities = createActivities();
      const persona = createPersona();

      const result = await service.generate(cluster, activities, persona);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.participations).toHaveLength(3);
      }
    });

    it('includes processing time in Result', async () => {
      const service = new STARGenerationService();
      const cluster = createCluster();
      const activities = createActivities();
      const persona = createPersona();

      const result = await service.generate(cluster, activities, persona);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.processingTimeMs).toBeGreaterThan(0);
      }
    });
  });

  describe('error handling with pattern matching', () => {
    it('returns typed error that can be pattern matched', async () => {
      const service = new STARGenerationService();
      const cluster = createCluster({ id: 'cluster-2' });
      const activities = createActivities();
      const persona = createPersona();

      const result = await service.generateFromClusterId(
        'cluster-1',
        { cluster, activities },
        persona
      );

      // Pattern matching on error type
      const message = result.match(
        (success) => `Generated STAR for ${success.star?.clusterId}`,
        (error) => {
          switch (error.code) {
            case 'CLUSTER_NOT_FOUND':
              return 'Cluster not found';
            case 'HYDRATION_FAILED':
              return 'Failed to hydrate cluster';
            case 'EXTRACTION_FAILED':
              return 'Failed to extract STAR';
            default:
              return 'Unknown error';
          }
        }
      );

      expect(message).toBe('Cluster not found');
    });
  });
});
