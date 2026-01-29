/**
 * NarrativeExtractor Tests
 *
 * Tests for multi-framework narrative extraction from hydrated clusters.
 * Covers all 8 frameworks: STAR, STARL, CAR, PAR, SAR, SOAR, SHARE, CARL
 */

import { describe, it, expect } from 'vitest';
import { NarrativeExtractor, narrativeExtractor } from './narrative-extractor';
import {
  HydratedCluster,
  HydratedActivity,
  CareerPersona,
  ToolType,
  NarrativeFrameworkType,
  WarningCodes,
} from './types';

describe('NarrativeExtractor', () => {
  const testPersona: CareerPersona = {
    displayName: 'Honey Arora',
    emails: ['honey.arora@acme.com'],
    identities: {
      jira: { displayName: 'honey.arora' },
      github: { login: 'honey-arora' },
    },
  };

  // ==========================================================================
  // TEST HELPERS
  // ==========================================================================

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

  // Sample activities for testing
  const sampleActivities: HydratedActivity[] = [
    createActivity('a1', 'jira', 'PROJ-123: Fix slow dashboard', {
      description: 'The dashboard was loading slowly due to N+1 query problem. Need to optimize.',
      timestamp: new Date('2024-01-01'),
      rawData: { assignee: 'honey.arora' },
    }),
    createActivity('a2', 'github', 'PR: Implement query optimization', {
      description: 'Added eager loading to reduce query count. Improved performance by 80%.',
      timestamp: new Date('2024-01-10'),
      rawData: { author: 'honey-arora' },
    }),
    createActivity('a3', 'confluence', 'Performance Optimization Guide', {
      description: 'Documented the optimization approach and lessons learned for future reference.',
      timestamp: new Date('2024-01-15'),
      rawData: { creator: 'Honey Arora' },
    }),
    createActivity('a4', 'slack', 'Team standup discussion', {
      description: 'Shared results with team: reduced load time from 5s to 1s.',
      timestamp: new Date('2024-01-20'),
      rawData: { author: 'honey.arora@acme.com' },
    }),
  ];

  // ==========================================================================
  // BASIC FUNCTIONALITY
  // ==========================================================================

  describe('basic functionality', () => {
    it('creates singleton instance', () => {
      expect(narrativeExtractor).toBeInstanceOf(NarrativeExtractor);
    });

    it('has correct name and version', () => {
      const extractor = new NarrativeExtractor();
      expect(extractor.name).toBe('NarrativeExtractor');
      expect(extractor.version).toBe('1.0.0');
    });

    it('validates without error', () => {
      const extractor = new NarrativeExtractor();
      expect(() => extractor.validate()).not.toThrow();
    });
  });

  // ==========================================================================
  // STAR FRAMEWORK (default)
  // ==========================================================================

  describe('STAR framework', () => {
    it('generates STAR narrative for valid cluster', () => {
      const cluster = createCluster(sampleActivities);

      const result = narrativeExtractor.process(
        { cluster, persona: testPersona },
        { framework: 'STAR' }
      );

      expect(result.data.narrative).not.toBeNull();
      expect(result.data.narrative?.framework).toBe('STAR');
      expect(result.data.narrative?.components).toHaveLength(4);
      expect(result.data.participations).toHaveLength(4);
    });

    it('extracts all 4 STAR components', () => {
      const cluster = createCluster(sampleActivities);

      const result = narrativeExtractor.process(
        { cluster, persona: testPersona },
        { framework: 'STAR' }
      );

      const componentNames = result.data.narrative?.components.map((c) => c.name);
      expect(componentNames).toEqual(['situation', 'task', 'action', 'result']);
    });

    it('uses STAR as default framework', () => {
      const cluster = createCluster(sampleActivities);

      const result = narrativeExtractor.process({ cluster, persona: testPersona });

      expect(result.data.narrative?.framework).toBe('STAR');
    });
  });

  // ==========================================================================
  // STARL FRAMEWORK
  // ==========================================================================

  describe('STARL framework', () => {
    it('generates STARL narrative with learning component', () => {
      const cluster = createCluster(sampleActivities);

      const result = narrativeExtractor.process(
        { cluster, persona: testPersona },
        { framework: 'STARL' }
      );

      expect(result.data.narrative?.framework).toBe('STARL');
      expect(result.data.narrative?.components).toHaveLength(5);

      const componentNames = result.data.narrative?.components.map((c) => c.name);
      expect(componentNames).toEqual(['situation', 'task', 'action', 'result', 'learning']);
    });

    it('extracts learning from confluence documentation', () => {
      const activitiesWithLearning = [
        ...sampleActivities,
        createActivity('a5', 'confluence', 'Lessons Learned', {
          description: 'Key learning: Always profile queries before optimization. This insight helped us avoid premature optimization.',
          timestamp: new Date('2024-01-25'),
          rawData: { creator: 'Honey Arora' },
        }),
      ];
      const cluster = createCluster(activitiesWithLearning);

      const result = narrativeExtractor.process(
        { cluster, persona: testPersona },
        { framework: 'STARL' }
      );

      const learning = result.data.narrative?.components.find((c) => c.name === 'learning');
      expect(learning).toBeDefined();
      expect(learning?.confidence).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // CAR FRAMEWORK
  // ==========================================================================

  describe('CAR framework', () => {
    it('generates CAR narrative with 3 components', () => {
      const cluster = createCluster(sampleActivities);

      const result = narrativeExtractor.process(
        { cluster, persona: testPersona },
        { framework: 'CAR' }
      );

      expect(result.data.narrative?.framework).toBe('CAR');
      expect(result.data.narrative?.components).toHaveLength(3);

      const componentNames = result.data.narrative?.components.map((c) => c.name);
      expect(componentNames).toEqual(['challenge', 'action', 'result']);
    });

    it('extracts challenge from problem language', () => {
      const challengeActivities = [
        createActivity('a1', 'jira', 'Critical: Dashboard crash issue', {
          description: 'The dashboard was crashing under high load. This was a major challenge blocking the release.',
          rawData: { assignee: 'honey.arora' },
        }),
        createActivity('a2', 'github', 'Fix memory leak', {
          rawData: { author: 'honey-arora' },
        }),
        createActivity('a3', 'confluence', 'Memory optimization', {
          rawData: { creator: 'Honey Arora' },
        }),
      ];
      const cluster = createCluster(challengeActivities);

      const result = narrativeExtractor.process(
        { cluster, persona: testPersona },
        { framework: 'CAR' }
      );

      const challenge = result.data.narrative?.components.find((c) => c.name === 'challenge');
      expect(challenge).toBeDefined();
      expect(challenge?.text).toContain('challenge');
    });
  });

  // ==========================================================================
  // PAR FRAMEWORK
  // ==========================================================================

  describe('PAR framework', () => {
    it('generates PAR narrative with problem focus', () => {
      const cluster = createCluster(sampleActivities);

      const result = narrativeExtractor.process(
        { cluster, persona: testPersona },
        { framework: 'PAR' }
      );

      expect(result.data.narrative?.framework).toBe('PAR');
      expect(result.data.narrative?.components).toHaveLength(3);

      const componentNames = result.data.narrative?.components.map((c) => c.name);
      expect(componentNames).toEqual(['problem', 'action', 'result']);
    });

    it('extracts problem from technical issue language', () => {
      const problemActivities = [
        createActivity('a1', 'jira', 'Bug: API returning 500 errors', {
          description: 'Problem: The API was returning 500 errors due to database connection pool exhaustion.',
          rawData: { assignee: 'honey.arora' },
        }),
        createActivity('a2', 'github', 'Increase connection pool', {
          rawData: { author: 'honey-arora' },
        }),
        createActivity('a3', 'confluence', 'Database tuning guide', {
          rawData: { creator: 'Honey Arora' },
        }),
      ];
      const cluster = createCluster(problemActivities);

      const result = narrativeExtractor.process(
        { cluster, persona: testPersona },
        { framework: 'PAR' }
      );

      const problem = result.data.narrative?.components.find((c) => c.name === 'problem');
      expect(problem).toBeDefined();
      expect(problem?.text.toLowerCase()).toContain('problem');
    });
  });

  // ==========================================================================
  // SAR FRAMEWORK
  // ==========================================================================

  describe('SAR framework', () => {
    it('generates concise SAR narrative', () => {
      const cluster = createCluster(sampleActivities);

      const result = narrativeExtractor.process(
        { cluster, persona: testPersona },
        { framework: 'SAR' }
      );

      expect(result.data.narrative?.framework).toBe('SAR');
      expect(result.data.narrative?.components).toHaveLength(3);

      const componentNames = result.data.narrative?.components.map((c) => c.name);
      expect(componentNames).toEqual(['situation', 'action', 'result']);
    });
  });

  // ==========================================================================
  // SOAR FRAMEWORK
  // ==========================================================================

  describe('SOAR framework', () => {
    it('generates SOAR narrative with objective', () => {
      const cluster = createCluster(sampleActivities);

      const result = narrativeExtractor.process(
        { cluster, persona: testPersona },
        { framework: 'SOAR' }
      );

      expect(result.data.narrative?.framework).toBe('SOAR');
      expect(result.data.narrative?.components).toHaveLength(4);

      const componentNames = result.data.narrative?.components.map((c) => c.name);
      expect(componentNames).toEqual(['situation', 'objective', 'action', 'result']);
    });

    it('extracts objective from goal language', () => {
      const objectiveActivities = [
        createActivity('a1', 'jira', 'Goal: Improve page load time', {
          description: 'Objective: Reduce page load time from 5s to under 1s to improve user experience.',
          rawData: { assignee: 'honey.arora' },
        }),
        createActivity('a2', 'github', 'Implement caching layer', {
          rawData: { author: 'honey-arora' },
        }),
        createActivity('a3', 'confluence', 'Performance targets', {
          rawData: { creator: 'Honey Arora' },
        }),
      ];
      const cluster = createCluster(objectiveActivities);

      const result = narrativeExtractor.process(
        { cluster, persona: testPersona },
        { framework: 'SOAR' }
      );

      const objective = result.data.narrative?.components.find((c) => c.name === 'objective');
      expect(objective).toBeDefined();
    });
  });

  // ==========================================================================
  // SHARE FRAMEWORK
  // ==========================================================================

  describe('SHARE framework', () => {
    it('generates SHARE narrative with all 5 components', () => {
      const cluster = createCluster(sampleActivities);

      const result = narrativeExtractor.process(
        { cluster, persona: testPersona },
        { framework: 'SHARE' }
      );

      expect(result.data.narrative?.framework).toBe('SHARE');
      expect(result.data.narrative?.components).toHaveLength(5);

      const componentNames = result.data.narrative?.components.map((c) => c.name);
      expect(componentNames).toEqual(['situation', 'hindsight', 'action', 'result', 'example']);
    });
  });

  // ==========================================================================
  // CARL FRAMEWORK
  // ==========================================================================

  describe('CARL framework', () => {
    it('generates CARL narrative with context and learning', () => {
      const cluster = createCluster(sampleActivities);

      const result = narrativeExtractor.process(
        { cluster, persona: testPersona },
        { framework: 'CARL' }
      );

      expect(result.data.narrative?.framework).toBe('CARL');
      expect(result.data.narrative?.components).toHaveLength(4);

      const componentNames = result.data.narrative?.components.map((c) => c.name);
      expect(componentNames).toEqual(['context', 'action', 'result', 'learning']);
    });

    it('extracts context from constraint language', () => {
      const contextActivities = [
        createActivity('a1', 'jira', 'Urgent: Production issue under deadline', {
          description: 'Context: We had a tight deadline and were under pressure to deliver. The constraints were significant.',
          rawData: { assignee: 'honey.arora' },
        }),
        createActivity('a2', 'github', 'Hotfix deployment', {
          rawData: { author: 'honey-arora' },
        }),
        createActivity('a3', 'confluence', 'Incident report', {
          rawData: { creator: 'Honey Arora' },
        }),
      ];
      const cluster = createCluster(contextActivities);

      const result = narrativeExtractor.process(
        { cluster, persona: testPersona },
        { framework: 'CARL' }
      );

      const context = result.data.narrative?.components.find((c) => c.name === 'context');
      expect(context).toBeDefined();
    });
  });

  // ==========================================================================
  // VALIDATION GATES
  // ==========================================================================

  describe('validation gates', () => {
    it('fails when cluster has too few activities', () => {
      const activities = [
        createActivity('a1', 'jira', 'Single task', {
          rawData: { assignee: 'honey.arora' },
        }),
      ];
      const cluster = createCluster(activities);

      const result = narrativeExtractor.process(
        { cluster, persona: testPersona },
        { minActivities: 3 }
      );

      expect(result.data.narrative).toBeNull();
      expect(result.warnings).toContainEqual(
        expect.objectContaining({ code: WarningCodes.VALIDATION_GATES_FAILED })
      );
    });

    it('fails when cluster has too few tool types', () => {
      const activities = [
        createActivity('a1', 'jira', 'Task 1', { rawData: { assignee: 'honey.arora' } }),
        createActivity('a2', 'jira', 'Task 2', { rawData: { assignee: 'honey.arora' } }),
        createActivity('a3', 'jira', 'Task 3', { rawData: { assignee: 'honey.arora' } }),
      ];
      const cluster = createCluster(activities);

      const result = narrativeExtractor.process(
        { cluster, persona: testPersona },
        { minToolTypes: 2 }
      );

      expect(result.data.narrative).toBeNull();
    });

    it('passes with custom lower thresholds', () => {
      const activities = [
        createActivity('a1', 'jira', 'Single task', {
          rawData: { assignee: 'honey.arora' },
        }),
        createActivity('a2', 'github', 'PR for task', {
          rawData: { author: 'honey-arora' },
        }),
      ];
      const cluster = createCluster(activities);

      const result = narrativeExtractor.process(
        { cluster, persona: testPersona },
        { minActivities: 2, minToolTypes: 2 }
      );

      expect(result.data.narrative).not.toBeNull();
    });
  });

  // ==========================================================================
  // SAFE PROCESS (Result type)
  // ==========================================================================

  describe('safeProcess', () => {
    it('returns ok Result for valid cluster', () => {
      const cluster = createCluster(sampleActivities);

      const result = narrativeExtractor.safeProcess({ cluster, persona: testPersona });

      expect(result.isOk()).toBe(true);
    });

    it('returns err Result for validation failure', () => {
      const activities = [
        createActivity('a1', 'jira', 'Single task', {
          rawData: { assignee: 'honey.arora' },
        }),
      ];
      const cluster = createCluster(activities);

      const result = narrativeExtractor.safeProcess(
        { cluster, persona: testPersona },
        { minActivities: 3 }
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('VALIDATION_FAILED');
        expect(result.error.failedGates).toBeDefined();
      }
    });
  });

  // ==========================================================================
  // COMPONENT CONFIDENCE
  // ==========================================================================

  describe('component confidence', () => {
    it('assigns higher confidence when multiple activities match', () => {
      const activities = [
        createActivity('a1', 'jira', 'Problem: Performance issue', {
          description: 'The system was slow',
          rawData: { assignee: 'honey.arora' },
        }),
        createActivity('a2', 'jira', 'Another problem with latency', {
          description: 'Latency was too high',
          rawData: { assignee: 'honey.arora' },
        }),
        createActivity('a3', 'github', 'Fix performance', {
          rawData: { author: 'honey-arora' },
        }),
      ];
      const cluster = createCluster(activities);

      const result = narrativeExtractor.process(
        { cluster, persona: testPersona },
        { framework: 'STAR' }
      );

      const situation = result.data.narrative?.components.find((c) => c.name === 'situation');
      expect(situation?.confidence).toBeGreaterThan(0.5);
    });

    it('assigns lower confidence when no activities match pattern', () => {
      const activities = [
        createActivity('a1', 'jira', 'Random task', {
          rawData: { assignee: 'honey.arora' },
        }),
        createActivity('a2', 'github', 'Some code', {
          rawData: { author: 'honey-arora' },
        }),
        createActivity('a3', 'confluence', 'Documentation', {
          rawData: { creator: 'Honey Arora' },
        }),
      ];
      const cluster = createCluster(activities);

      const result = narrativeExtractor.process(
        { cluster, persona: testPersona },
        { framework: 'STARL' }
      );

      // Learning component should have low confidence since no learning patterns
      const learning = result.data.narrative?.components.find((c) => c.name === 'learning');
      expect(learning?.confidence).toBeLessThan(0.8);
    });
  });

  // ==========================================================================
  // SUGGESTED EDITS
  // ==========================================================================

  describe('suggested edits', () => {
    it('returns suggestedEdits array', () => {
      const cluster = createCluster(sampleActivities);

      const result = narrativeExtractor.process({ cluster, persona: testPersona });

      // suggestedEdits should always be an array (may be empty)
      expect(result.data.narrative?.suggestedEdits).toBeDefined();
      expect(Array.isArray(result.data.narrative?.suggestedEdits)).toBe(true);
    });

    it('suggests edits when observer count exceeds initiator count', () => {
      // Create activities where user is mostly observer but cluster still passes validation
      // Mix: 2 activities where user is owner (initiator) + 3 activities where user is observer
      // Observer ratio = 60%, just at threshold to pass
      const activities = [
        // User owns these (initiator)
        createActivity('a1', 'jira', 'Task assigned to user', {
          rawData: { assignee: 'honey.arora' },
        }),
        createActivity('a2', 'github', 'PR by user', {
          rawData: { author: 'honey-arora' },
        }),
        // User doesn't own these (observer)
        createActivity('a3', 'confluence', 'Doc by someone else', {
          rawData: { creator: 'Team Member' },
        }),
        createActivity('a4', 'jira', 'Task by another person', {
          rawData: { assignee: 'other.person' },
        }),
        createActivity('a5', 'slack', 'Message by teammate', {
          rawData: { author: 'teammate@acme.com' },
        }),
      ];
      const cluster = createCluster(activities);

      // Use higher maxObserverRatio to allow the cluster to pass
      const result = narrativeExtractor.process(
        { cluster, persona: testPersona },
        { maxObserverRatio: 0.7 }
      );

      // The narrative should exist (cluster passes validation)
      expect(result.data.narrative).not.toBeNull();

      // Check participation counts from the participations array
      const initiatorCount = result.data.participations.filter(
        (p) => p.level === 'initiator'
      ).length;
      const observerCount = result.data.participations.filter(
        (p) => p.level === 'observer'
      ).length;

      // We have 3 observers and 2 initiators
      expect(observerCount).toBeGreaterThan(initiatorCount);

      // Should suggest highlighting contributions since user is mostly observer
      const suggestedEdits = result.data.narrative?.suggestedEdits ?? [];
      const hasObserverWarning = suggestedEdits.some((e) =>
        e.toLowerCase().includes('observer') || e.toLowerCase().includes('contribution')
      );

      expect(hasObserverWarning).toBe(true);
    });
  });

  // ==========================================================================
  // ALTERNATIVE FRAMEWORKS
  // ==========================================================================

  describe('alternative frameworks', () => {
    it('suggests alternative frameworks when appropriate', () => {
      const activitiesWithLearning = [
        createActivity('a1', 'jira', 'Task with problem', {
          description: 'There was a problem that needed solving',
          rawData: { assignee: 'honey.arora' },
        }),
        createActivity('a2', 'github', 'Fix implementation', {
          rawData: { author: 'honey-arora' },
        }),
        createActivity('a3', 'confluence', 'Lessons learned document', {
          description: 'Key learning from this project: always test in staging first',
          rawData: { creator: 'Honey Arora' },
        }),
      ];
      const cluster = createCluster(activitiesWithLearning);

      const result = narrativeExtractor.process(
        { cluster, persona: testPersona },
        { framework: 'STAR' }
      );

      expect(result.data.alternativeFrameworks).toBeDefined();
    });
  });

  // ==========================================================================
  // DIAGNOSTICS
  // ==========================================================================

  describe('diagnostics', () => {
    it('includes processing time', () => {
      const cluster = createCluster(sampleActivities);

      const result = narrativeExtractor.process({ cluster, persona: testPersona });

      expect(result.diagnostics.processingTimeMs).toBeGreaterThan(0);
    });

    it('includes input metrics', () => {
      const cluster = createCluster(sampleActivities);

      const result = narrativeExtractor.process({ cluster, persona: testPersona });

      expect(result.diagnostics.inputMetrics).toBeDefined();
      expect(result.diagnostics.inputMetrics.activityCount).toBe(4);
    });

    it('includes output metrics', () => {
      const cluster = createCluster(sampleActivities);

      const result = narrativeExtractor.process({ cluster, persona: testPersona });

      expect(result.diagnostics.outputMetrics).toBeDefined();
      expect(result.diagnostics.outputMetrics.narrativeGenerated).toBe(1);
    });

    it('includes debug info when enabled', () => {
      const cluster = createCluster(sampleActivities);

      const result = narrativeExtractor.process(
        { cluster, persona: testPersona },
        { debug: true }
      );

      expect(result.diagnostics.debug).toBeDefined();
      expect(result.diagnostics.debug?.participations).toBeDefined();
      expect(result.diagnostics.debug?.componentConfidences).toBeDefined();
    });
  });

  // ==========================================================================
  // PARTICIPATION SUMMARY
  // ==========================================================================

  describe('participation summary', () => {
    it('counts participation levels correctly', () => {
      const cluster = createCluster(sampleActivities);

      const result = narrativeExtractor.process({ cluster, persona: testPersona });

      const summary = result.data.narrative?.participationSummary;
      expect(summary).toBeDefined();
      expect(summary?.initiatorCount).toBeGreaterThanOrEqual(0);
      expect(summary?.contributorCount).toBeGreaterThanOrEqual(0);
      expect(summary?.mentionedCount).toBeGreaterThanOrEqual(0);
      expect(summary?.observerCount).toBeGreaterThanOrEqual(0);
    });
  });

  // ==========================================================================
  // METADATA
  // ==========================================================================

  describe('metadata', () => {
    it('includes date range', () => {
      const cluster = createCluster(sampleActivities);

      const result = narrativeExtractor.process({ cluster, persona: testPersona });

      const metadata = result.data.narrative?.metadata;
      expect(metadata?.dateRange).toBeDefined();
      expect(metadata?.dateRange.start).toBeInstanceOf(Date);
      expect(metadata?.dateRange.end).toBeInstanceOf(Date);
    });

    it('includes tools covered', () => {
      const cluster = createCluster(sampleActivities);

      const result = narrativeExtractor.process({ cluster, persona: testPersona });

      const metadata = result.data.narrative?.metadata;
      expect(metadata?.toolsCovered).toBeDefined();
      expect(metadata?.toolsCovered.length).toBeGreaterThan(0);
    });

    it('includes total activities', () => {
      const cluster = createCluster(sampleActivities);

      const result = narrativeExtractor.process({ cluster, persona: testPersona });

      const metadata = result.data.narrative?.metadata;
      expect(metadata?.totalActivities).toBe(4);
    });
  });

  // ==========================================================================
  // VALIDATION RESULT
  // ==========================================================================

  describe('validation result', () => {
    it('passes validation for well-formed narrative', () => {
      const cluster = createCluster(sampleActivities);

      const result = narrativeExtractor.process({ cluster, persona: testPersona });

      expect(result.data.narrative?.validation.passed).toBe(true);
    });

    it('includes validation score', () => {
      const cluster = createCluster(sampleActivities);

      const result = narrativeExtractor.process({ cluster, persona: testPersona });

      expect(result.data.narrative?.validation.score).toBeGreaterThan(0);
      expect(result.data.narrative?.validation.score).toBeLessThanOrEqual(100);
    });
  });

  // ==========================================================================
  // ALL FRAMEWORKS GENERATE VALID OUTPUT
  // ==========================================================================

  describe('all frameworks', () => {
    const frameworks: NarrativeFrameworkType[] = [
      'STAR', 'STARL', 'CAR', 'PAR', 'SAR', 'SOAR', 'SHARE', 'CARL'
    ];

    frameworks.forEach((framework) => {
      it(`generates valid narrative for ${framework}`, () => {
        const cluster = createCluster(sampleActivities);

        const result = narrativeExtractor.process(
          { cluster, persona: testPersona },
          { framework }
        );

        expect(result.data.narrative).not.toBeNull();
        expect(result.data.narrative?.framework).toBe(framework);
        expect(result.data.narrative?.components.length).toBeGreaterThan(0);
        expect(result.data.narrative?.overallConfidence).toBeGreaterThan(0);
      });
    });
  });
});
