/**
 * Career Stories Pipeline Integration Tests
 *
 * Tests the FULL pipeline: Raw API Data → Ref Extraction → Clustering
 *
 * These tests use REALISTIC data that mirrors actual API responses from:
 * - GitHub (PRs, commits, issues)
 * - Jira (tickets with keys like PROJ-123)
 * - Confluence (pages with URLs)
 * - Outlook (meetings with agendas)
 * - Figma (files with URLs)
 *
 * The goal: Verify that refs are correctly extracted from REAL data shapes,
 * not sanitized mock data. If extraction fails here, it fails in production.
 */

import { describe, it, expect } from 'vitest';
import { RefExtractorService } from './ref-extractor.service';
import { ActivityInput } from './activity-persistence.service';

const refExtractor = new RefExtractorService();

/**
 * Simulate the persistence service's ref extraction logic
 */
function extractRefsFromActivity(activity: ActivityInput): string[] {
  return refExtractor.extractRefsFromMultiple([
    activity.title,
    activity.description,
    activity.rawData ? JSON.stringify(activity.rawData) : null,
  ]);
}

/**
 * Pure clustering algorithm (same as service)
 */
function clusterActivities(
  activities: Array<{ id: string; refs: string[] }>
): string[][] {
  const refToIds = new Map<string, Set<string>>();

  activities.forEach((a) => {
    a.refs.forEach((ref) => {
      if (!refToIds.has(ref)) refToIds.set(ref, new Set());
      refToIds.get(ref)!.add(a.id);
    });
  });

  const adjacency = new Map<string, Set<string>>();
  activities.forEach((a) => adjacency.set(a.id, new Set()));

  refToIds.forEach((ids) => {
    const arr = Array.from(ids);
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        adjacency.get(arr[i])!.add(arr[j]);
        adjacency.get(arr[j])!.add(arr[i]);
      }
    }
  });

  const visited = new Set<string>();
  const clusters: string[][] = [];

  function dfs(id: string, cluster: string[]) {
    visited.add(id);
    cluster.push(id);
    adjacency.get(id)?.forEach((n) => {
      if (!visited.has(n)) dfs(n, cluster);
    });
  }

  activities.forEach((a) => {
    if (!visited.has(a.id)) {
      const cluster: string[] = [];
      dfs(a.id, cluster);
      if (cluster.length >= 2) clusters.push(cluster);
    }
  });

  return clusters;
}

// =============================================================================
// REALISTIC RAW DATA FIXTURES
// These mirror ACTUAL API responses from each tool
// =============================================================================

describe('Pipeline Integration: Real API Data → Refs → Clusters', () => {

  // ===========================================================================
  // GITHUB: Real PR and commit data
  // ===========================================================================

  describe('GitHub raw data extraction', () => {
    it('extracts Jira ticket from PR title (common pattern)', () => {
      const activity: ActivityInput = {
        source: 'github',
        sourceId: 'acme/backend/pull/142',
        sourceUrl: 'https://github.com/acme/backend/pull/142',
        title: '[AUTH-456] Implement OAuth2 refresh token flow',
        description: 'This PR implements the refresh token logic as specified in AUTH-456.',
        timestamp: new Date(),
        rawData: {
          number: 142,
          state: 'merged',
          head: { ref: 'feature/auth-456-refresh-tokens' },
          body: 'Closes AUTH-456\n\nAlso related to AUTH-457 for token storage.',
          additions: 342,
          deletions: 89,
        },
      };

      const refs = extractRefsFromActivity(activity);

      expect(refs).toContain('AUTH-456');
      expect(refs).toContain('AUTH-457');
    });

    it('extracts ticket from branch name in rawData', () => {
      const activity: ActivityInput = {
        source: 'github',
        sourceId: 'acme/api/pull/88',
        sourceUrl: 'https://github.com/acme/api/pull/88',
        title: 'Fix pagination bug',  // No ticket in title!
        description: 'Fixes off-by-one error in pagination',
        timestamp: new Date(),
        rawData: {
          number: 88,
          head: { ref: 'bugfix/CORE-999-pagination-fix' },  // Ticket in branch name
          base: { ref: 'main' },
        },
      };

      const refs = extractRefsFromActivity(activity);

      expect(refs).toContain('CORE-999');
    });

    it('extracts PR cross-references from commit messages', () => {
      const activity: ActivityInput = {
        source: 'github',
        sourceId: 'abc123',
        sourceUrl: 'https://github.com/acme/backend/commit/abc123',
        title: 'feat: add caching layer',
        description: null,
        timestamp: new Date(),
        rawData: {
          sha: 'abc123def456',
          message: 'feat: add caching layer\n\nPart of #42 and relates to acme/frontend#18',
          author: { login: 'developer' },
        },
      };

      const refs = extractRefsFromActivity(activity);

      expect(refs).toContain('local#42');
      expect(refs).toContain('acme/frontend#18');
    });

    it('extracts from GitHub issue that references Confluence', () => {
      const activity: ActivityInput = {
        source: 'github',
        sourceId: 'acme/backend/issues/200',
        sourceUrl: 'https://github.com/acme/backend/issues/200',
        title: 'RFC: New caching architecture',
        description: 'See design doc: https://acme.atlassian.net/wiki/spaces/ARCH/pages/123456789/Caching-RFC',
        timestamp: new Date(),
        rawData: {
          number: 200,
          state: 'open',
          labels: ['rfc', 'architecture'],
        },
      };

      const refs = extractRefsFromActivity(activity);

      expect(refs).toContain('confluence:123456789');
    });
  });

  // ===========================================================================
  // JIRA: Real ticket data with various reference patterns
  // ===========================================================================

  describe('Jira raw data extraction', () => {
    it('extracts self-reference and linked tickets', () => {
      const activity: ActivityInput = {
        source: 'jira',
        sourceId: 'PLAT-1234',
        sourceUrl: 'https://acme.atlassian.net/browse/PLAT-1234',
        title: 'Implement user authentication service',
        description: 'Parent epic: PLAT-1000. Blocked by PLAT-1233. See also PLAT-1235.',
        timestamp: new Date(),
        rawData: {
          key: 'PLAT-1234',
          fields: {
            summary: 'Implement user authentication service',
            status: { name: 'In Progress' },
            assignee: { displayName: 'John Doe' },
            parent: { key: 'PLAT-1000' },
            issuelinks: [
              { type: { name: 'Blocks' }, outwardIssue: { key: 'PLAT-1235' } },
              { type: { name: 'is blocked by' }, inwardIssue: { key: 'PLAT-1233' } },
            ],
          },
        },
      };

      const refs = extractRefsFromActivity(activity);

      expect(refs).toContain('PLAT-1234');  // Self
      expect(refs).toContain('PLAT-1000');  // Parent epic
      expect(refs).toContain('PLAT-1233');  // Blocked by
      expect(refs).toContain('PLAT-1235');  // Blocks
    });

    it('extracts GitHub PR links from Jira description', () => {
      const activity: ActivityInput = {
        source: 'jira',
        sourceId: 'FE-789',
        sourceUrl: 'https://acme.atlassian.net/browse/FE-789',
        title: 'Update dashboard components',
        description: 'Implementation: https://github.com/acme/frontend/pull/456\n\nBackend changes: https://github.com/acme/backend/pull/123',
        timestamp: new Date(),
        rawData: {
          key: 'FE-789',
          fields: {
            summary: 'Update dashboard components',
            customfield_10001: 'https://github.com/acme/frontend/pull/456',  // PR link custom field
          },
        },
      };

      const refs = extractRefsFromActivity(activity);

      expect(refs).toContain('FE-789');
      expect(refs).toContain('acme/frontend#456');
      expect(refs).toContain('acme/backend#123');
    });

    it('extracts Confluence design doc from Jira', () => {
      const activity: ActivityInput = {
        source: 'jira',
        sourceId: 'ARCH-100',
        sourceUrl: 'https://acme.atlassian.net/browse/ARCH-100',
        title: 'Design: Event-driven architecture',
        description: 'Design doc: https://acme.atlassian.net/wiki/spaces/ARCH/pages/987654321/Event-Architecture',
        timestamp: new Date(),
        rawData: {
          key: 'ARCH-100',
          fields: {
            summary: 'Design: Event-driven architecture',
          },
        },
      };

      const refs = extractRefsFromActivity(activity);

      expect(refs).toContain('ARCH-100');
      expect(refs).toContain('confluence:987654321');
    });
  });

  // ===========================================================================
  // CONFLUENCE: Real page data
  // ===========================================================================

  describe('Confluence raw data extraction', () => {
    it('extracts Jira tickets mentioned in page content', () => {
      const activity: ActivityInput = {
        source: 'confluence',
        sourceId: '111222333',
        sourceUrl: 'https://acme.atlassian.net/wiki/spaces/ENG/pages/111222333/Q1-Planning',
        title: 'Q1 2026 Engineering Planning',
        description: 'Key initiatives: AUTH-500 (Authentication revamp), PERF-600 (Performance improvements), DATA-700 (Data pipeline)',
        timestamp: new Date(),
        rawData: {
          id: '111222333',
          title: 'Q1 2026 Engineering Planning',
          space: { key: 'ENG', name: 'Engineering' },
          body: {
            storage: {
              value: '<p>Priorities:</p><ul><li>AUTH-500 - Q1</li><li>PERF-600 - Q1-Q2</li><li>DATA-700 - Q2</li></ul>',
            },
          },
        },
      };

      const refs = extractRefsFromActivity(activity);

      // Note: We DON'T expect confluence:111222333 - that's the activity's own ID
      // Ref extraction finds refs TO OTHER resources, not self-references
      expect(refs).toContain('AUTH-500');
      expect(refs).toContain('PERF-600');
      expect(refs).toContain('DATA-700');
    });

    it('extracts GitHub links from technical design doc', () => {
      const activity: ActivityInput = {
        source: 'confluence',
        sourceId: '444555666',
        sourceUrl: 'https://acme.atlassian.net/wiki/spaces/ARCH/pages/444555666/API-Design',
        title: 'REST API Design Standards',
        description: 'Reference implementation: https://github.com/acme/api-template/pull/10',
        timestamp: new Date(),
        rawData: {
          id: '444555666',
          title: 'REST API Design Standards',
          body: {
            storage: {
              value: '<p>See reference: <a href="https://github.com/acme/api-template/pull/10">PR #10</a></p>',
            },
          },
        },
      };

      const refs = extractRefsFromActivity(activity);

      // Note: We DON'T expect confluence:444555666 - that's the activity's own ID
      expect(refs).toContain('acme/api-template#10');
    });
  });

  // ===========================================================================
  // OUTLOOK: Meeting data with agenda references
  // ===========================================================================

  describe('Outlook raw data extraction', () => {
    it('extracts Jira tickets from meeting subject and body', () => {
      const activity: ActivityInput = {
        source: 'outlook',
        sourceId: 'meeting-abc-123',
        sourceUrl: null,
        title: '[AUTH-500] Sprint Planning - Authentication Epic',
        description: 'Agenda:\n- Review AUTH-500 progress\n- Discuss AUTH-501, AUTH-502 blockers\n- Demo from https://github.com/acme/auth-service/pull/77',
        timestamp: new Date(),
        rawData: {
          id: 'meeting-abc-123',
          subject: '[AUTH-500] Sprint Planning - Authentication Epic',
          bodyPreview: 'Discuss AUTH-500 sprint goals...',
          organizer: { emailAddress: { address: 'pm@acme.com' } },
          attendees: [
            { emailAddress: { address: 'dev1@acme.com' } },
            { emailAddress: { address: 'dev2@acme.com' } },
          ],
        },
      };

      const refs = extractRefsFromActivity(activity);

      expect(refs).toContain('AUTH-500');
      expect(refs).toContain('AUTH-501');
      expect(refs).toContain('AUTH-502');
      expect(refs).toContain('acme/auth-service#77');
    });

    it('extracts Confluence links from meeting notes', () => {
      const activity: ActivityInput = {
        source: 'outlook',
        sourceId: 'meeting-xyz-789',
        sourceUrl: null,
        title: 'Architecture Review',
        description: 'Review doc: https://acme.atlassian.net/wiki/spaces/ARCH/pages/999888777/Review',
        timestamp: new Date(),
        rawData: {
          id: 'meeting-xyz-789',
          subject: 'Architecture Review',
        },
      };

      const refs = extractRefsFromActivity(activity);

      expect(refs).toContain('confluence:999888777');
    });
  });

  // ===========================================================================
  // FIGMA: Design file data
  // ===========================================================================

  describe('Figma raw data extraction', () => {
    it('extracts Jira ticket from Figma file name', () => {
      const activity: ActivityInput = {
        source: 'figma',
        sourceId: 'FigmaFileKey123',
        sourceUrl: 'https://www.figma.com/file/FigmaFileKey123/AUTH-500-Login-Redesign',
        title: 'AUTH-500 Login Redesign',
        description: 'New login flow designs for AUTH-500',
        timestamp: new Date(),
        rawData: {
          key: 'FigmaFileKey123',
          name: 'AUTH-500 Login Redesign',
          lastModified: '2026-01-15T10:00:00Z',
        },
      };

      const refs = extractRefsFromActivity(activity);

      expect(refs).toContain('AUTH-500');
      // TODO: sourceUrl is not currently included in ref extraction
      // If we want figma:FigmaFileKey123, we need to add sourceUrl to extraction
    });

    it('extracts from Figma comment mentioning tickets', () => {
      const activity: ActivityInput = {
        source: 'figma',
        sourceId: 'comment-abc',
        sourceUrl: 'https://www.figma.com/file/XYZ789/Dashboard',
        title: 'Comment on Dashboard',
        description: 'Updated per FE-100 requirements. Also see FE-101 for mobile specs.',
        timestamp: new Date(),
        rawData: {
          id: 'comment-abc',
          file_key: 'XYZ789',
          message: 'Updated per FE-100 requirements',
        },
      };

      const refs = extractRefsFromActivity(activity);

      expect(refs).toContain('FE-100');
      expect(refs).toContain('FE-101');
      // TODO: file_key in rawData doesn't match figma URL pattern
      // Consider adding explicit figma key extraction from rawData.file_key
    });
  });

  // ===========================================================================
  // FULL PIPELINE: Multiple tools → Clustering
  // ===========================================================================

  describe('Full pipeline: cross-tool clustering', () => {
    it('clusters Auth feature across GitHub, Jira, Confluence, Outlook', () => {
      const activities: ActivityInput[] = [
        // Jira epic
        {
          source: 'jira',
          sourceId: 'AUTH-500',
          sourceUrl: 'https://acme.atlassian.net/browse/AUTH-500',
          title: 'Epic: OAuth2 Implementation',
          description: 'Design: https://acme.atlassian.net/wiki/spaces/ENG/pages/12345/OAuth-Design',
          timestamp: new Date(),
          rawData: { key: 'AUTH-500' },
        },
        // Confluence design doc
        {
          source: 'confluence',
          sourceId: '12345',
          sourceUrl: 'https://acme.atlassian.net/wiki/spaces/ENG/pages/12345/OAuth-Design',
          title: 'OAuth2 Design Document',
          description: 'Implementation for AUTH-500. PR: https://github.com/acme/backend/pull/200',
          timestamp: new Date(),
          rawData: { id: '12345' },
        },
        // GitHub PR
        {
          source: 'github',
          sourceId: 'acme/backend/pull/200',
          sourceUrl: 'https://github.com/acme/backend/pull/200',
          title: '[AUTH-500] Implement OAuth2 flow',
          description: 'Implements design from confluence:12345',
          timestamp: new Date(),
          rawData: { number: 200 },
        },
        // Sprint planning meeting
        {
          source: 'outlook',
          sourceId: 'meeting-sprint-1',
          sourceUrl: null,
          title: 'Sprint Planning: AUTH-500',
          description: 'Review AUTH-500 progress',
          timestamp: new Date(),
          rawData: { id: 'meeting-sprint-1' },
        },
        // Figma designs
        {
          source: 'figma',
          sourceId: 'FigmaAuth500',
          sourceUrl: 'https://www.figma.com/file/FigmaAuth500/Login-Screens',
          title: 'AUTH-500 Login Screens',
          description: null,
          timestamp: new Date(),
          rawData: { key: 'FigmaAuth500' },
        },

        // UNRELATED: Should NOT cluster with AUTH-500
        {
          source: 'jira',
          sourceId: 'PERF-100',
          sourceUrl: 'https://acme.atlassian.net/browse/PERF-100',
          title: 'Performance optimization',
          description: 'Unrelated to auth work',
          timestamp: new Date(),
          rawData: { key: 'PERF-100' },
        },
        {
          source: 'github',
          sourceId: 'acme/backend/pull/300',
          sourceUrl: 'https://github.com/acme/backend/pull/300',
          title: 'chore: update dependencies',
          description: 'Routine maintenance',
          timestamp: new Date(),
          rawData: { number: 300 },
        },
      ];

      // Extract refs for each activity
      const activitiesWithRefs = activities.map((a, i) => ({
        id: `activity-${i}`,
        name: a.title,
        refs: extractRefsFromActivity(a),
      }));

      // Run clustering
      const clusters = clusterActivities(activitiesWithRefs);

      // Should have 1 cluster (Auth feature) - PERF-100 and chore PR don't cluster
      expect(clusters.length).toBeGreaterThanOrEqual(1);

      // Find the Auth cluster
      const authCluster = clusters.find((c) =>
        c.includes('activity-0') // Jira AUTH-500
      );

      expect(authCluster).toBeDefined();
      expect(authCluster).toContain('activity-0'); // Jira AUTH-500
      expect(authCluster).toContain('activity-1'); // Confluence (links to AUTH-500 and PR)
      expect(authCluster).toContain('activity-2'); // GitHub PR (has AUTH-500)
      expect(authCluster).toContain('activity-3'); // Meeting (has AUTH-500)
      expect(authCluster).toContain('activity-4'); // Figma (has AUTH-500)

      // PERF-100 and chore PR should NOT be in auth cluster
      expect(authCluster).not.toContain('activity-5');
      expect(authCluster).not.toContain('activity-6');
    });

    it('correctly separates two distinct projects', () => {
      const activities: ActivityInput[] = [
        // Project A: Authentication
        {
          source: 'jira', sourceId: 'AUTH-1',
          title: 'Auth ticket', description: null,
          timestamp: new Date(), rawData: { key: 'AUTH-1' },
        },
        {
          source: 'github', sourceId: 'pr-auth',
          title: '[AUTH-1] Auth PR', description: null,
          timestamp: new Date(), rawData: {},
        },

        // Project B: Performance (completely separate)
        {
          source: 'jira', sourceId: 'PERF-1',
          title: 'Perf ticket', description: null,
          timestamp: new Date(), rawData: { key: 'PERF-1' },
        },
        {
          source: 'github', sourceId: 'pr-perf',
          title: '[PERF-1] Perf PR', description: null,
          timestamp: new Date(), rawData: {},
        },
      ];

      const activitiesWithRefs = activities.map((a, i) => ({
        id: `act-${i}`,
        refs: extractRefsFromActivity(a),
      }));

      const clusters = clusterActivities(activitiesWithRefs);

      // Should have 2 separate clusters
      expect(clusters).toHaveLength(2);

      const authCluster = clusters.find((c) => c.includes('act-0'))!;
      const perfCluster = clusters.find((c) => c.includes('act-2'))!;

      expect(authCluster).toContain('act-0');
      expect(authCluster).toContain('act-1');
      expect(authCluster).not.toContain('act-2');
      expect(authCluster).not.toContain('act-3');

      expect(perfCluster).toContain('act-2');
      expect(perfCluster).toContain('act-3');
      expect(perfCluster).not.toContain('act-0');
      expect(perfCluster).not.toContain('act-1');
    });
  });

  // ===========================================================================
  // EDGE CASES FROM REAL DATA
  // ===========================================================================

  describe('Real-world edge cases', () => {
    it('handles ticket refs in markdown links', () => {
      const activity: ActivityInput = {
        source: 'confluence',
        sourceId: 'page-1',
        title: 'Sprint Notes',
        description: 'See [AUTH-100](https://jira.com/AUTH-100) for details',
        timestamp: new Date(),
        rawData: {},
      };

      const refs = extractRefsFromActivity(activity);
      expect(refs).toContain('AUTH-100');
    });

    it('handles ticket refs in code blocks', () => {
      const activity: ActivityInput = {
        source: 'github',
        sourceId: 'pr-1',
        title: 'Update config',
        description: '```\n# Config for FEAT-123\nkey: value\n```',
        timestamp: new Date(),
        rawData: {},
      };

      const refs = extractRefsFromActivity(activity);
      expect(refs).toContain('FEAT-123');
    });

    it('does NOT extract false positives from version numbers', () => {
      const activity: ActivityInput = {
        source: 'github',
        sourceId: 'pr-version',
        title: 'Bump version to 2.0.0',
        description: 'Upgrade from v1.0.0 to V2.0.0-beta',
        timestamp: new Date(),
        rawData: {
          files: ['package.json'],
        },
      };

      const refs = extractRefsFromActivity(activity);

      // Should NOT match V2 or v1 as tickets (too short)
      expect(refs).not.toContain('V2');
      expect(refs).not.toContain('V1');
    });

    it('handles multiple same refs without duplication', () => {
      const activity: ActivityInput = {
        source: 'jira',
        sourceId: 'TASK-1',
        title: 'TASK-1: Do the thing',
        description: 'This is TASK-1. TASK-1 is important. See TASK-1.',
        timestamp: new Date(),
        rawData: { key: 'TASK-1' },
      };

      const refs = extractRefsFromActivity(activity);

      // Should only have TASK-1 once
      expect(refs.filter((r) => r === 'TASK-1')).toHaveLength(1);
    });

    it('handles unicode and special characters in descriptions', () => {
      const activity: ActivityInput = {
        source: 'jira',
        sourceId: 'INTL-100',
        title: 'Internationalization: 日本語 support',
        description: 'Add support for AUTH-200 in 日本語 locale. See INTL-101 for 中文.',
        timestamp: new Date(),
        rawData: { key: 'INTL-100' },
      };

      const refs = extractRefsFromActivity(activity);

      expect(refs).toContain('INTL-100');
      expect(refs).toContain('AUTH-200');
      expect(refs).toContain('INTL-101');
    });

    it('extracts from deeply nested rawData', () => {
      const activity: ActivityInput = {
        source: 'github',
        sourceId: 'pr-nested',
        title: 'Complex PR',
        description: null,
        timestamp: new Date(),
        rawData: {
          commits: [
            {
              message: 'fix: resolve BUG-100',
              author: { name: 'dev' },
            },
            {
              message: 'feat: add FEAT-200 feature',
              author: { name: 'dev' },
            },
          ],
          reviews: [
            {
              body: 'LGTM, addresses BUG-100 well',
            },
          ],
        },
      };

      const refs = extractRefsFromActivity(activity);

      expect(refs).toContain('BUG-100');
      expect(refs).toContain('FEAT-200');
    });
  });

  // ===========================================================================
  // SCALE TEST
  // ===========================================================================

  describe('Scale and performance', () => {
    it('handles 100+ activities without issues', () => {
      const activities: Array<{ id: string; refs: string[] }> = [];

      // Create 100 activities across 10 projects
      for (let project = 0; project < 10; project++) {
        for (let item = 0; item < 10; item++) {
          activities.push({
            id: `proj${project}-item${item}`,
            refs: [`PROJ${project}-${item}`, `PROJ${project}-EPIC`],
          });
        }
      }

      const startTime = Date.now();
      const clusters = clusterActivities(activities);
      const duration = Date.now() - startTime;

      // Should complete in reasonable time (<100ms)
      expect(duration).toBeLessThan(100);

      // Should have 10 clusters (one per project)
      expect(clusters).toHaveLength(10);

      // Each cluster should have 10 items
      clusters.forEach((cluster) => {
        expect(cluster).toHaveLength(10);
      });
    });
  });
});
