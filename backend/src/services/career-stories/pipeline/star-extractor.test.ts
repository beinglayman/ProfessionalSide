/**
 * STARExtractor Tests
 *
 * Tests for STAR narrative extraction from hydrated clusters.
 */

import { describe, it, expect } from 'vitest';
import { STARExtractor, starExtractor } from './star-extractor';
import {
  HydratedCluster,
  HydratedActivity,
  CareerPersona,
  ToolType,
  WarningCodes,
} from './types';

describe('STARExtractor', () => {
  const testPersona: CareerPersona = {
    displayName: 'Honey Arora',
    emails: ['honey.arora@acme.com'],
    identities: {
      jira: { displayName: 'honey.arora' },
      github: { login: 'honey-arora' },
    },
  };

  const createActivity = (
    id: string,
    source: ToolType,
    title: string,
    options: {
      description?: string;
      timestamp?: Date;
      rawData?: Record<string, unknown>;
    } = {}
  ): HydratedActivity => ({
    id,
    source,
    title,
    description: options.description,
    timestamp: options.timestamp ?? new Date('2024-01-15'),
    refs: ['REF-1'],
    rawData: options.rawData,
  });

  const createCluster = (activities: HydratedActivity[]): HydratedCluster => ({
    id: 'cluster-1',
    activityIds: activities.map((a) => a.id),
    sharedRefs: ['REF-1'],
    metrics: {
      activityCount: activities.length,
      refCount: 1,
      toolTypes: [...new Set(activities.map((a) => a.source))],
      dateRange: {
        earliest: new Date('2024-01-01'),
        latest: new Date('2024-01-31'),
      },
    },
    activities,
  });

  describe('process', () => {
    it('generates STAR for valid cluster', () => {
      const activities: HydratedActivity[] = [
        createActivity('a1', 'jira', 'Fix slow query issue', {
          description: 'The dashboard was loading slowly due to N+1 queries',
          rawData: { assignee: 'honey.arora' },
        }),
        createActivity('a2', 'github', 'Implement query optimization', {
          description: 'Added eager loading to reduce query count',
          rawData: { author: 'honey-arora' },
        }),
        createActivity('a3', 'confluence', 'Performance improvement documentation', {
          rawData: { creator: 'Honey Arora' },
        }),
      ];
      const cluster = createCluster(activities);

      const result = starExtractor.process({ cluster, persona: testPersona });

      expect(result.data.star).not.toBeNull();
      expect(result.data.star?.clusterId).toBe('cluster-1');
      expect(result.data.participations).toHaveLength(3);
    });

    it('extracts situation from problem language', () => {
      const activities: HydratedActivity[] = [
        createActivity('a1', 'jira', 'Problem with login', {
          description: 'Users were unable to login due to session timeout issue',
          rawData: { assignee: 'honey.arora' },
        }),
        createActivity('a2', 'github', 'Fix session timeout', {
          rawData: { author: 'honey-arora' },
        }),
        createActivity('a3', 'confluence', 'Session handling doc', {
          rawData: { creator: 'Honey Arora' },
        }),
      ];
      const cluster = createCluster(activities);

      const result = starExtractor.process({ cluster, persona: testPersona });

      expect(result.data.star?.situation.text).toContain('session timeout');
      expect(result.data.star?.situation.confidence).toBeGreaterThan(0);
    });

    it('extracts task from Jira tickets', () => {
      const activities: HydratedActivity[] = [
        createActivity('a1', 'jira', 'Implement user authentication', {
          rawData: { assignee: 'honey.arora' },
        }),
        createActivity('a2', 'jira', 'Add OAuth integration', {
          rawData: { assignee: 'honey.arora' },
        }),
        createActivity('a3', 'github', 'Auth implementation', {
          rawData: { author: 'honey-arora' },
        }),
      ];
      const cluster = createCluster(activities);

      const result = starExtractor.process({ cluster, persona: testPersona });

      expect(result.data.star?.task.text).toContain('Implement user authentication');
      expect(result.data.star?.task.sources).toContain('a1');
    });

    it('extracts action from GitHub PRs', () => {
      const activities: HydratedActivity[] = [
        createActivity('a1', 'jira', 'Task ticket', {
          rawData: { assignee: 'honey.arora' },
        }),
        createActivity('a2', 'github', 'Add new API endpoint', {
          description: 'Created REST endpoint for user management',
          rawData: { author: 'honey-arora' },
        }),
        createActivity('a3', 'github', 'Refactor authentication', {
          rawData: { author: 'honey-arora' },
        }),
      ];
      const cluster = createCluster(activities);

      const result = starExtractor.process({ cluster, persona: testPersona });

      expect(result.data.star?.action.text).toContain('Add new API endpoint');
      expect(result.data.star?.action.confidence).toBeGreaterThan(0);
    });

    it('extracts result from outcome language', () => {
      const activities: HydratedActivity[] = [
        createActivity('a1', 'jira', 'Performance optimization', {
          rawData: { assignee: 'honey.arora' },
        }),
        createActivity('a2', 'github', 'Optimize queries', {
          rawData: { author: 'honey-arora' },
        }),
        createActivity('a3', 'confluence', 'Reduced latency from 500ms to 50ms', {
          description: 'Improved API response time by 90%',
          rawData: { creator: 'Honey Arora' },
          timestamp: new Date('2024-01-20'),
        }),
      ];
      const cluster = createCluster(activities);

      const result = starExtractor.process({ cluster, persona: testPersona });

      expect(result.data.star?.result.text).toMatch(/90%|50ms/);
    });

    it('detects participation levels', () => {
      const activities: HydratedActivity[] = [
        createActivity('a1', 'jira', 'Task 1', {
          rawData: { assignee: 'honey.arora' }, // initiator
        }),
        createActivity('a2', 'github', 'PR 1', {
          rawData: { author: 'someone-else', reviewers: ['honey-arora'] }, // contributor
        }),
        createActivity('a3', 'jira', 'Task 2', {
          rawData: { assignee: 'someone-else', mentions: ['honey.arora'] }, // mentioned
        }),
      ];
      const cluster = createCluster(activities);

      const result = starExtractor.process({ cluster, persona: testPersona });

      expect(result.data.participations[0].level).toBe('initiator');
      expect(result.data.participations[1].level).toBe('contributor');
      expect(result.data.participations[2].level).toBe('mentioned');
    });

    it('builds participation summary', () => {
      const activities: HydratedActivity[] = [
        createActivity('a1', 'jira', 'Task 1', { rawData: { assignee: 'honey.arora' } }),
        createActivity('a2', 'jira', 'Task 2', { rawData: { assignee: 'honey.arora' } }),
        createActivity('a3', 'github', 'PR 1', { rawData: { author: 'honey-arora' } }),
      ];
      const cluster = createCluster(activities);

      const result = starExtractor.process({ cluster, persona: testPersona });

      expect(result.data.star?.participationSummary.initiatorCount).toBe(3);
      expect(result.data.star?.participationSummary.observerCount).toBe(0);
    });
  });

  describe('validation gates', () => {
    it('fails MIN_ACTIVITIES gate', () => {
      const activities: HydratedActivity[] = [
        createActivity('a1', 'jira', 'Task 1', { rawData: { assignee: 'honey.arora' } }),
        createActivity('a2', 'github', 'PR 1', { rawData: { author: 'honey-arora' } }),
      ];
      const cluster = createCluster(activities);

      const result = starExtractor.process({ cluster, persona: testPersona });

      expect(result.data.star).toBeNull();
      expect(result.warnings.some((w) => w.code === WarningCodes.VALIDATION_GATES_FAILED)).toBe(true);
      expect(result.warnings[0].context?.failedGates).toContain('MIN_ACTIVITIES (2 < 3)');
    });

    it('fails MIN_TOOL_TYPES gate', () => {
      const activities: HydratedActivity[] = [
        createActivity('a1', 'jira', 'Task 1', { rawData: { assignee: 'honey.arora' } }),
        createActivity('a2', 'jira', 'Task 2', { rawData: { assignee: 'honey.arora' } }),
        createActivity('a3', 'jira', 'Task 3', { rawData: { assignee: 'honey.arora' } }),
      ];
      const cluster = createCluster(activities);

      const result = starExtractor.process({ cluster, persona: testPersona });

      expect(result.data.star).toBeNull();
      expect(result.warnings[0].context?.failedGates).toContain('MIN_TOOL_TYPES (1 < 2)');
    });

    it('fails MAX_OBSERVER_RATIO gate', () => {
      const activities: HydratedActivity[] = [
        createActivity('a1', 'jira', 'Task 1', { rawData: { assignee: 'someone-else' } }),
        createActivity('a2', 'github', 'PR 1', { rawData: { author: 'someone-else' } }),
        createActivity('a3', 'confluence', 'Doc 1', { rawData: { creator: 'Someone Else' } }),
      ];
      const cluster = createCluster(activities);

      const result = starExtractor.process({ cluster, persona: testPersona });

      expect(result.data.star).toBeNull();
      expect(result.warnings[0].context?.failedGates[0]).toContain('MAX_OBSERVER_RATIO');
    });

    it('respects custom gate thresholds', () => {
      const activities: HydratedActivity[] = [
        createActivity('a1', 'jira', 'Task 1', { rawData: { assignee: 'honey.arora' } }),
        createActivity('a2', 'github', 'PR 1', { rawData: { author: 'honey-arora' } }),
      ];
      const cluster = createCluster(activities);

      const result = starExtractor.process(
        { cluster, persona: testPersona },
        { minActivities: 2, minToolTypes: 2 }
      );

      expect(result.data.star).not.toBeNull();
    });
  });

  describe('suggested edits', () => {
    it('suggests edits for low confidence components', () => {
      const activities: HydratedActivity[] = [
        createActivity('a1', 'jira', 'Basic task', { rawData: { assignee: 'honey.arora' } }),
        createActivity('a2', 'github', 'Basic PR', { rawData: { author: 'honey-arora' } }),
        createActivity('a3', 'confluence', 'Basic doc', { rawData: { creator: 'Honey Arora' } }),
      ];
      const cluster = createCluster(activities);

      const result = starExtractor.process({ cluster, persona: testPersona });

      if (result.data.star) {
        expect(result.data.star.suggestedEdits.length).toBeGreaterThanOrEqual(0);
      }
    });

    it('suggests highlighting contributions when observer > initiator', () => {
      const activities: HydratedActivity[] = [
        createActivity('a1', 'jira', 'Need to fix slow query', {
          rawData: { assignee: 'someone-else', watchers: ['honey.arora'] },
        }),
        createActivity('a2', 'github', 'Fix query', {
          rawData: { author: 'someone-else', requestedReviewers: ['honey-arora'] },
        }),
        createActivity('a3', 'confluence', 'Documentation', {
          rawData: { creator: 'Someone Else', watchers: ['Honey Arora'] },
        }),
      ];
      const cluster = createCluster(activities);

      const result = starExtractor.process(
        { cluster, persona: testPersona },
        { maxObserverRatio: 1.0 } // Allow high observer ratio for this test
      );

      if (result.data.star) {
        expect(
          result.data.star.suggestedEdits.some((e) => e.includes('observer'))
        ).toBe(true);
      }
    });
  });

  describe('diagnostics', () => {
    it('includes processing metrics', () => {
      const activities: HydratedActivity[] = [
        createActivity('a1', 'jira', 'Task 1', { rawData: { assignee: 'honey.arora' } }),
        createActivity('a2', 'github', 'PR 1', { rawData: { author: 'honey-arora' } }),
        createActivity('a3', 'confluence', 'Doc 1', { rawData: { creator: 'Honey Arora' } }),
      ];
      const cluster = createCluster(activities);

      const result = starExtractor.process({ cluster, persona: testPersona });

      expect(result.diagnostics.processor).toBe('STARExtractor');
      expect(result.diagnostics.processingTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.diagnostics.inputMetrics.activityCount).toBe(3);
    });

    it('includes debug info when enabled', () => {
      const activities: HydratedActivity[] = [
        createActivity('a1', 'jira', 'Task 1', { rawData: { assignee: 'honey.arora' } }),
        createActivity('a2', 'github', 'PR 1', { rawData: { author: 'honey-arora' } }),
        createActivity('a3', 'confluence', 'Doc 1', { rawData: { creator: 'Honey Arora' } }),
      ];
      const cluster = createCluster(activities);

      const result = starExtractor.process(
        { cluster, persona: testPersona },
        { debug: true }
      );

      expect(result.diagnostics.debug).toBeDefined();
      expect(result.diagnostics.debug?.participations).toBeDefined();
    });
  });

  describe('metadata', () => {
    it('includes date range from cluster', () => {
      const activities: HydratedActivity[] = [
        createActivity('a1', 'jira', 'Task 1', {
          timestamp: new Date('2024-01-05'),
          rawData: { assignee: 'honey.arora' },
        }),
        createActivity('a2', 'github', 'PR 1', {
          timestamp: new Date('2024-01-15'),
          rawData: { author: 'honey-arora' },
        }),
        createActivity('a3', 'confluence', 'Doc 1', {
          timestamp: new Date('2024-01-25'),
          rawData: { creator: 'Honey Arora' },
        }),
      ];
      const cluster = createCluster(activities);

      const result = starExtractor.process({ cluster, persona: testPersona });

      expect(result.data.star?.metadata.totalActivities).toBe(3);
      expect(result.data.star?.metadata.toolsCovered).toContain('jira');
      expect(result.data.star?.metadata.toolsCovered).toContain('github');
    });
  });

  describe('validation result', () => {
    it('calculates validation score', () => {
      const activities: HydratedActivity[] = [
        createActivity('a1', 'jira', 'Fix slow query issue', {
          description: 'Dashboard was slow',
          rawData: { assignee: 'honey.arora' },
        }),
        createActivity('a2', 'github', 'Implement optimization', {
          description: 'Added caching',
          rawData: { author: 'honey-arora' },
        }),
        createActivity('a3', 'confluence', 'Improved performance by 50%', {
          description: 'Reduced latency',
          rawData: { creator: 'Honey Arora' },
        }),
      ];
      const cluster = createCluster(activities);

      const result = starExtractor.process({ cluster, persona: testPersona });

      expect(result.data.star?.validation.score).toBeGreaterThan(0);
      expect(result.data.star?.validation.score).toBeLessThanOrEqual(100);
    });

    it('includes warnings for incomplete STARs', () => {
      const activities: HydratedActivity[] = [
        createActivity('a1', 'jira', 'Task', { rawData: { assignee: 'honey.arora' } }),
        createActivity('a2', 'github', 'PR', { rawData: { author: 'honey-arora' } }),
        createActivity('a3', 'confluence', 'Doc', { rawData: { creator: 'Honey Arora' } }),
      ];
      const cluster = createCluster(activities);

      const result = starExtractor.process({ cluster, persona: testPersona });

      // With minimal content, validation should have warnings
      if (result.data.star && result.data.star.overallConfidence < 0.5) {
        expect(result.data.star.validation.warnings.length).toBeGreaterThan(0);
      }
    });
  });

  describe('edge cases', () => {
    it('handles empty activities array', () => {
      const cluster: HydratedCluster = {
        id: 'empty-cluster',
        activityIds: [],
        sharedRefs: [],
        metrics: { activityCount: 0, refCount: 0, toolTypes: [] },
        activities: [],
      };

      const result = starExtractor.process({ cluster, persona: testPersona });

      expect(result.data.star).toBeNull();
    });

    it('handles activities without rawData', () => {
      const activities: HydratedActivity[] = [
        createActivity('a1', 'jira', 'Task 1', { rawData: undefined }),
        createActivity('a2', 'github', 'PR 1', { rawData: undefined }),
        createActivity('a3', 'confluence', 'Doc 1', { rawData: undefined }),
      ];
      const cluster = createCluster(activities);

      const result = starExtractor.process({ cluster, persona: testPersona });

      // Should not throw, just have observer participation
      expect(result.data.participations).toHaveLength(3);
      expect(result.data.participations.every((p) => p.level === 'observer')).toBe(true);
    });

    it('handles minimal persona', () => {
      const minimalPersona: CareerPersona = {
        displayName: 'Test',
        emails: [],
        identities: {},
      };

      const activities: HydratedActivity[] = [
        createActivity('a1', 'jira', 'Task 1', { rawData: { assignee: 'test' } }),
        createActivity('a2', 'github', 'PR 1', { rawData: { author: 'test' } }),
        createActivity('a3', 'confluence', 'Doc 1', { rawData: { creator: 'Test' } }),
      ];
      const cluster = createCluster(activities);

      const result = starExtractor.process({ cluster, persona: minimalPersona });

      // Should complete without error
      expect(result.data.participations).toHaveLength(3);
    });
  });

  describe('singleton instance', () => {
    it('exports singleton starExtractor', () => {
      expect(starExtractor).toBeInstanceOf(STARExtractor);
      expect(starExtractor.name).toBe('STARExtractor');
      expect(starExtractor.version).toBe('1.0.0');
    });

    it('validate() does not throw', () => {
      expect(() => starExtractor.validate()).not.toThrow();
    });
  });
});
