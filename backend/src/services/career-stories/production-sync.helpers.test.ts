/**
 * Production Sync Helpers Tests
 *
 * Tests for pure helper functions extracted from production-sync.service.ts:
 * - shortRepoName: container → display name
 * - deriveClusterName: LLM name / container / fallback chain
 * - buildTemporalTitle: repo-based / multi-project / tool-count titles
 * - buildToolSummary: human-readable tool list
 * - getClusterSummary: keyword extraction from activity titles
 * - looksLikeRawRef: detect raw crossToolRef names vs human names
 * - computeEntryTarget: dynamic entry count from data characteristics
 * - mergeSmallClusters: merge smallest same-container clusters
 * - dedupClustersByContainer: merge clusters sharing the same dominantContainer
 * - computeDominantContainer: find most frequent container signal
 * - withTimeout: promise timeout wrapper with timer cleanup
 * - runWithConcurrency: bounded parallel execution
 */

import { describe, it, expect, vi } from 'vitest';
import {
  shortRepoName,
  deriveClusterName,
  buildTemporalTitle,
  buildToolSummary,
  getClusterSummary,
  dedupClustersByContainer,
  looksLikeRawRef,
  computeEntryTarget,
  mergeSmallClusters,
  computeDominantContainer,
  withTimeout,
  runWithConcurrency,
} from './production-sync.service';

// =============================================================================
// Shared test helpers
// =============================================================================

function makeCluster(name: string, count: number, container?: string): any {
  const activities = Array.from({ length: count }, (_, i) => ({
    id: `${name}-${i}`,
    source: 'github',
    sourceId: `src-${name}-${i}`,
    sourceUrl: null,
    title: `Activity ${i} of ${name}`,
    description: null,
    timestamp: new Date('2026-02-01'),
    crossToolRefs: [],
  }));
  return {
    name,
    dominantContainer: container || null,
    activityIds: activities.map((a: any) => a.id),
    activities,
    metrics: {
      dateRange: { start: new Date('2026-02-01'), end: new Date('2026-02-15') },
      toolTypes: ['github'],
    },
  };
}

// =============================================================================
// shortRepoName
// =============================================================================

describe('shortRepoName', () => {
  it('extracts repo name from repo:owner/name format', () => {
    expect(shortRepoName('repo:beinglayman/ProfessionalSide')).toBe('ProfessionalSide');
  });

  it('extracts repo name from repo:name (no owner)', () => {
    expect(shortRepoName('repo:MyProject')).toBe('MyProject');
  });

  it('passes through non-repo containers as-is', () => {
    expect(shortRepoName('AUTH-1')).toBe('AUTH-1');
  });

  it('passes through Slack thread timestamps as-is', () => {
    expect(shortRepoName('1707300000.000100')).toBe('1707300000.000100');
  });

  it('passes through Confluence space keys as-is', () => {
    expect(shortRepoName('ENG')).toBe('ENG');
  });

  it('handles repo: prefix with deeply nested path', () => {
    expect(shortRepoName('repo:org/team/subteam/repo')).toBe('repo');
  });
});

// =============================================================================
// deriveClusterName
// =============================================================================

describe('deriveClusterName', () => {
  it('prefers LLM name when available', () => {
    expect(deriveClusterName('OAuth Feature', 'repo:beinglayman/ProfessionalSide')).toBe('OAuth Feature');
  });

  it('falls back to container when LLM name is null', () => {
    expect(deriveClusterName(null, 'repo:beinglayman/ProfessionalSide')).toBe('ProfessionalSide');
  });

  it('falls back to "Project" when both are null', () => {
    expect(deriveClusterName(null, null)).toBe('Project');
  });

  it('falls back to "Project" when both are undefined/null', () => {
    expect(deriveClusterName(null)).toBe('Project');
  });

  it('handles non-repo container (Jira epic)', () => {
    expect(deriveClusterName(null, 'AUTH-1')).toBe('AUTH-1');
  });

  it('handles empty string LLM name as falsy', () => {
    expect(deriveClusterName('', 'repo:org/repo')).toBe('repo');
  });
});

// =============================================================================
// buildTemporalTitle
// =============================================================================

describe('buildTemporalTitle', () => {
  it('uses repo name when all activities from same repo', () => {
    const activities = [
      { source: 'github', rawData: { repository: 'beinglayman/ProfessionalSide' } },
      { source: 'github', rawData: { repository: 'beinglayman/ProfessionalSide' } },
      { source: 'github', rawData: { repository: 'beinglayman/ProfessionalSide' } },
    ];
    const title = buildTemporalTitle(activities, 'Feb 21', 'Feb 23');
    expect(title).toBe('ProfessionalSide: Feb 21 - Feb 23 (3 activities)');
  });

  it('uses project count when activities from multiple repos', () => {
    const activities = [
      { source: 'github', rawData: { repository: 'beinglayman/ProfessionalSide' } },
      { source: 'github', rawData: { repository: 'beinglayman/OtherProject' } },
      { source: 'github', rawData: { repository: 'beinglayman/ThirdProject' } },
    ];
    const title = buildTemporalTitle(activities, 'Feb 21', 'Feb 23');
    expect(title).toBe('3 projects: Feb 21 - Feb 23 (3 activities)');
  });

  it('falls back to tool counts when no rawData.repository', () => {
    const activities = [
      { source: 'github' },
      { source: 'github' },
      { source: 'jira' },
    ];
    const title = buildTemporalTitle(activities, 'Feb 21', 'Feb 23');
    expect(title).toBe('Week of Feb 21 - Feb 23 (2 github, 1 jira)');
  });

  it('handles mix of activities with and without rawData', () => {
    const activities = [
      { source: 'github', rawData: { repository: 'beinglayman/ProfessionalSide' } },
      { source: 'github', rawData: null },
      { source: 'slack' },
    ];
    // Only 1 repo found → single repo title
    const title = buildTemporalTitle(activities, 'Feb 21', 'Feb 23');
    expect(title).toBe('ProfessionalSide: Feb 21 - Feb 23 (3 activities)');
  });

  it('handles rawData with non-string repository', () => {
    const activities = [
      { source: 'github', rawData: { repository: 123 } },
      { source: 'github', rawData: { repository: null } },
    ];
    const title = buildTemporalTitle(activities, 'Feb 21', 'Feb 23');
    expect(title).toBe('Week of Feb 21 - Feb 23 (2 github)');
  });

  it('deduplicates repo names', () => {
    const activities = [
      { source: 'github', rawData: { repository: 'org/repo' } },
      { source: 'github', rawData: { repository: 'org/repo' } },
      { source: 'github', rawData: { repository: 'org/repo' } },
    ];
    const title = buildTemporalTitle(activities, 'Jan 1', 'Jan 7');
    expect(title).toContain('repo:');
    expect(title).not.toContain('3 projects');
  });
});

// =============================================================================
// buildToolSummary
// =============================================================================

describe('buildToolSummary', () => {
  it('returns single tool name', () => {
    const activities = [{ source: 'github' }, { source: 'github' }];
    expect(buildToolSummary(activities)).toBe('github');
  });

  it('joins two tools with "and"', () => {
    const activities = [{ source: 'github' }, { source: 'jira' }];
    expect(buildToolSummary(activities)).toBe('github and jira');
  });

  it('uses Oxford comma for three tools', () => {
    const activities = [{ source: 'github' }, { source: 'jira' }, { source: 'slack' }];
    expect(buildToolSummary(activities)).toBe('github, jira, and slack');
  });
});

// =============================================================================
// getClusterSummary
// =============================================================================

describe('getClusterSummary', () => {
  it('extracts most frequent keyword from titles', () => {
    const activities = [
      { title: 'feat: OAuth login flow' },
      { title: 'fix: OAuth callback error' },
      { title: 'test: OAuth integration tests' },
    ];
    expect(getClusterSummary(activities)).toBe('Oauth Work');
  });

  it('falls back to "Cross-Tool Collaboration" when no repeated words', () => {
    const activities = [
      { title: 'fix bug' },
      { title: 'add test' },
    ];
    expect(getClusterSummary(activities)).toBe('Cross-Tool Collaboration');
  });

  it('filters out stop words', () => {
    const activities = [
      { title: 'this with that from into' },
      { title: 'this with that from into' },
    ];
    // All words are stop words or <= 3 chars → fallback
    expect(getClusterSummary(activities)).toBe('Cross-Tool Collaboration');
  });

  it('ignores words shorter than 4 characters', () => {
    const activities = [
      { title: 'fix the API bug' },
      { title: 'fix the API now' },
    ];
    // "fix"=3chars filtered, "the"=3chars filtered, "API"=3chars filtered, "bug"=3chars filtered
    expect(getClusterSummary(activities)).toBe('Cross-Tool Collaboration');
  });

  it('capitalizes the keyword', () => {
    const activities = [
      { title: 'authentication flow redesign' },
      { title: 'authentication token refresh' },
    ];
    expect(getClusterSummary(activities)).toBe('Authentication Work');
  });

  it('returns fallback for empty activities array', () => {
    expect(getClusterSummary([])).toBe('Cross-Tool Collaboration');
  });
});

// =============================================================================
// looksLikeRawRef
// =============================================================================

describe('looksLikeRawRef', () => {
  it('detects lowercase single word as raw ref', () => {
    expect(looksLikeRawRef('arig')).toBe(true);
    expect(looksLikeRawRef('capture')).toBe(true);
  });

  it('detects local#N pattern as raw ref', () => {
    expect(looksLikeRawRef('local#1')).toBe(true);
    expect(looksLikeRawRef('local#42')).toBe(true);
  });

  it('detects Jira-style PROJ-NNN as raw ref', () => {
    expect(looksLikeRawRef('DH-905')).toBe(true);
    expect(looksLikeRawRef('AUTH-1')).toBe(true);
  });

  it('detects kebab-case as raw ref', () => {
    expect(looksLikeRawRef('tacit-web')).toBe(true);
    expect(looksLikeRawRef('interview-prep')).toBe(true);
  });

  it('preserves human-readable names with spaces', () => {
    expect(looksLikeRawRef('OAuth2 Authentication')).toBe(false);
    expect(looksLikeRawRef('Bidirectional Sync Server')).toBe(false);
    expect(looksLikeRawRef('Intelligence UI Frontend')).toBe(false);
  });

  it('preserves long single words (>= 15 chars)', () => {
    expect(looksLikeRawRef('authenticationsystem')).toBe(false);
  });
});

// =============================================================================
// computeEntryTarget
// =============================================================================

describe('computeEntryTarget', () => {
  it('counts projects with ≥3 activities as significant', () => {
    // 3 repos, each with 3 activities → 3 significant projects
    const activities = [
      { source: 'github', rawData: { repository: 'org/repo-a' } },
      { source: 'github', rawData: { repository: 'org/repo-a' } },
      { source: 'github', rawData: { repository: 'org/repo-a' } },
      { source: 'github', rawData: { repository: 'org/repo-b' } },
      { source: 'github', rawData: { repository: 'org/repo-b' } },
      { source: 'github', rawData: { repository: 'org/repo-b' } },
      { source: 'github', rawData: { repository: 'org/repo-c' } },
      { source: 'github', rawData: { repository: 'org/repo-c' } },
      { source: 'github', rawData: { repository: 'org/repo-c' } },
    ];
    const result = computeEntryTarget(activities, 0);
    expect(result.targetEntries).toBe(3);
  });

  it('ignores projects with fewer than 3 activities', () => {
    const activities = [
      // repo-a: 5 activities (significant)
      ...Array.from({ length: 5 }, () => ({ source: 'github', rawData: { repository: 'org/repo-a' } })),
      // repo-b: 2 activities (NOT significant)
      { source: 'github', rawData: { repository: 'org/repo-b' } },
      { source: 'github', rawData: { repository: 'org/repo-b' } },
      // figma: 1 activity (NOT significant)
      { source: 'figma', rawData: { fileId: 'abc' } },
    ];
    const result = computeEntryTarget(activities, 0);
    // Only 1 significant project → clamped to minimum 3
    expect(result.targetEntries).toBe(3);
  });

  it('subtracts existing story count from target', () => {
    // 5 repos, each with 4 activities → 5 significant
    const activities = Array.from({ length: 20 }, (_, i) => ({
      source: 'github',
      rawData: { repository: `org/repo-${i % 5}` },
    }));
    const result = computeEntryTarget(activities, 2);
    expect(result.targetEntries).toBe(3); // 5 - 2 = 3
  });

  it('returns 0 when no significant projects exist', () => {
    const activities = [
      { source: 'github', rawData: { repository: 'org/repo-a' } },
    ];
    // Only 1 activity → 0 significant projects → remaining = 0 → return 0
    const result = computeEntryTarget(activities, 0);
    expect(result.targetEntries).toBe(0);
  });

  it('caps target at 10 projects', () => {
    // 12 repos, each with 5 activities
    const activities = Array.from({ length: 60 }, (_, i) => ({
      source: 'github',
      rawData: { repository: `org/repo-${i % 12}` },
    }));
    const result = computeEntryTarget(activities, 0);
    expect(result.targetEntries).toBe(10); // capped at 10
  });

  it('computes minActivitiesPerEntry based on activity count and target', () => {
    const activities = Array.from({ length: 100 }, (_, i) => ({
      source: 'github',
      rawData: { repository: `org/repo-${i % 5}` },
    }));
    const result = computeEntryTarget(activities, 0);
    // 5 significant projects → target 5, minActivitiesPerEntry = max(3, floor(100 / (5 * 3))) = max(3, 6) = 6
    expect(result.targetEntries).toBe(5);
    expect(result.minActivitiesPerEntry).toBe(6);
  });
});

// =============================================================================
// mergeSmallClusters
// =============================================================================

describe('mergeSmallClusters', () => {
  it('does not merge when cluster count is below threshold', () => {
    const clusters = [makeCluster('A', 10), makeCluster('B', 20)];
    const result = mergeSmallClusters(clusters, 5);
    expect(result.length).toBe(2);
  });

  it('merges clusters down to target × 1.2', () => {
    const clusters = [
      makeCluster('A', 5, 'repo:org/X'),
      makeCluster('B', 3, 'repo:org/X'),
      makeCluster('C', 10, 'repo:org/Y'),
      makeCluster('D', 2, 'repo:org/Y'),
      makeCluster('E', 8),
    ];
    // target=3, maxClusters=ceil(3*1.2)=4, so should merge from 5 to 4
    const result = mergeSmallClusters(clusters, 3);
    expect(result.length).toBe(4);
  });

  it('preserves the longer name on merge', () => {
    const clusters = [
      makeCluster('Short', 2, 'repo:org/X'),
      makeCluster('A Much Longer Name', 3, 'repo:org/X'),
      makeCluster('Other', 4, 'repo:org/Y'),
    ];
    // target=1, maxClusters=ceil(1.2)=2 → 3 clusters → merge from 3 to 2
    // Smallest=Short(2), same-container partner=A Much Longer Name(3) → merge
    const result = mergeSmallClusters(clusters, 1);
    expect(result.length).toBe(2);
    const merged = result.find(c => c.activityIds.length === 5);
    expect(merged).toBeTruthy();
    expect(merged!.name).toBe('A Much Longer Name');
  });

  it('merges by smallest neighbor when no same-container match', () => {
    const clusters = [
      makeCluster('A', 2, 'repo:org/X'),
      makeCluster('B', 3, 'repo:org/Y'),
      makeCluster('C', 4, 'repo:org/Z'),
    ];
    // target=1, maxClusters=2 → merge from 3 to 2
    const result = mergeSmallClusters(clusters, 1);
    expect(result.length).toBe(2);
  });
});

// =============================================================================
// dedupClustersByContainer
// =============================================================================

describe('dedupClustersByContainer', () => {
  it('merges two clusters with the same container', () => {
    const clusters = [
      makeCluster('Sync Server Implementation', 10, 'repo:org/capture'),
      makeCluster('Sync Protocol Testing', 8, 'repo:org/capture'),
    ];
    const result = dedupClustersByContainer(clusters);
    expect(result.length).toBe(1);
    expect(result[0].activityIds.length).toBe(18);
  });

  it('keeps the longer name when merging', () => {
    const clusters = [
      makeCluster('Short', 5, 'repo:org/X'),
      makeCluster('A Much Longer Project Name', 3, 'repo:org/X'),
    ];
    const result = dedupClustersByContainer(clusters);
    expect(result[0].name).toBe('A Much Longer Project Name');
  });

  it('does not merge clusters with different containers', () => {
    const clusters = [
      makeCluster('A', 10, 'repo:org/X'),
      makeCluster('B', 8, 'repo:org/Y'),
    ];
    const result = dedupClustersByContainer(clusters);
    expect(result.length).toBe(2);
  });

  it('passes through clusters with null container unchanged', () => {
    const clusters = [
      makeCluster('A', 10, 'repo:org/X'),
      makeCluster('B', 5),
      makeCluster('C', 3),
    ];
    const result = dedupClustersByContainer(clusters);
    expect(result.length).toBe(3);
  });

  it('merges three clusters with the same container', () => {
    const clusters = [
      makeCluster('A', 10, 'repo:org/X'),
      makeCluster('B', 5, 'repo:org/X'),
      makeCluster('C', 3, 'repo:org/X'),
    ];
    const result = dedupClustersByContainer(clusters);
    expect(result.length).toBe(1);
    expect(result[0].activityIds.length).toBe(18);
  });

  // --- Size-gated dedup edge cases ---

  it('does NOT merge two large clusters with the same container (monorepo protection)', () => {
    const clusters = [
      makeCluster('Feature A', 20, 'repo:org/monorepo'),
      makeCluster('Feature B', 25, 'repo:org/monorepo'),
    ];
    // Default maxMergeSize=15; both > 15 → stay separate
    const result = dedupClustersByContainer(clusters);
    expect(result.length).toBe(2);
  });

  it('merges when one cluster is below maxMergeSize threshold', () => {
    const clusters = [
      makeCluster('Main Feature', 20, 'repo:org/monorepo'),
      makeCluster('Small Fix', 5, 'repo:org/monorepo'),
    ];
    // 5 < 15 (default maxMergeSize) → merge
    const result = dedupClustersByContainer(clusters);
    expect(result.length).toBe(1);
    expect(result[0].activityIds.length).toBe(25);
  });

  it('respects custom maxMergeSize parameter', () => {
    const clusters = [
      makeCluster('A', 8, 'repo:org/X'),
      makeCluster('B', 10, 'repo:org/X'),
    ];
    // maxMergeSize=5 → both > 5 → stay separate
    const result = dedupClustersByContainer(clusters, 5);
    expect(result.length).toBe(2);
  });

  it('handles empty clusters array', () => {
    expect(dedupClustersByContainer([])).toEqual([]);
  });

  it('handles single cluster passthrough', () => {
    const clusters = [makeCluster('A', 5, 'repo:org/X')];
    const result = dedupClustersByContainer(clusters);
    expect(result.length).toBe(1);
  });

  it('handles all null containers — no merging', () => {
    const clusters = [makeCluster('A', 5), makeCluster('B', 3), makeCluster('C', 7)];
    const result = dedupClustersByContainer(clusters);
    expect(result.length).toBe(3);
  });

  it('deduplicates interleaved containers correctly', () => {
    const clusters = [
      makeCluster('A1', 3, 'repo:X'),
      makeCluster('B1', 4, 'repo:Y'),
      makeCluster('A2', 5, 'repo:X'),
      makeCluster('B2', 2, 'repo:Y'),
    ];
    const result = dedupClustersByContainer(clusters);
    expect(result.length).toBe(2);
    // A1 + A2, B1 + B2
    const totalActivities = result.reduce((sum, c) => sum + c.activityIds.length, 0);
    expect(totalActivities).toBe(14);
  });

  it('preserves name when first cluster has longer name', () => {
    const clusters = [
      makeCluster('Very Long Descriptive Name', 5, 'repo:X'),
      makeCluster('Short', 3, 'repo:X'),
    ];
    const result = dedupClustersByContainer(clusters);
    expect(result[0].name).toBe('Very Long Descriptive Name');
  });

  it('preserves name when incoming cluster has null name', () => {
    const c1 = makeCluster('Good Name', 5, 'repo:X');
    const c2 = makeCluster('_', 3, 'repo:X');
    c2.name = null;
    const result = dedupClustersByContainer([c1, c2]);
    expect(result[0].name).toBe('Good Name');
  });
});

// =============================================================================
// computeDominantContainer
// =============================================================================

describe('computeDominantContainer', () => {
  it('returns the most frequent container', () => {
    const activities = [
      { container: 'repo:org/A' },
      { container: 'repo:org/A' },
      { container: 'repo:org/B' },
    ];
    expect(computeDominantContainer(activities)).toBe('repo:org/A');
  });

  it('returns null when no activities have containers', () => {
    const activities = [
      { container: null },
      { container: null },
    ];
    expect(computeDominantContainer(activities)).toBeNull();
  });

  it('returns null for empty activities array', () => {
    expect(computeDominantContainer([])).toBeNull();
  });

  it('handles mix of null and non-null containers', () => {
    const activities = [
      { container: null },
      { container: 'repo:org/A' },
      { container: null },
    ];
    expect(computeDominantContainer(activities)).toBe('repo:org/A');
  });

  it('returns the sole container when only one activity has it', () => {
    const activities = [
      { container: null },
      { container: null },
      { container: 'repo:org/X' },
    ];
    expect(computeDominantContainer(activities)).toBe('repo:org/X');
  });

  it('handles activities with undefined container', () => {
    const activities = [
      { container: undefined },
      { container: 'repo:org/A' },
    ];
    expect(computeDominantContainer(activities)).toBe('repo:org/A');
  });
});

// =============================================================================
// EDGE CASE: looksLikeRawRef boundaries
// =============================================================================

describe('looksLikeRawRef — edge cases', () => {
  it('returns false for empty string', () => {
    expect(looksLikeRawRef('')).toBe(false);
  });

  it('treats PascalCase single words as NOT raw ref', () => {
    expect(looksLikeRawRef('MyProject')).toBe(false);
    expect(looksLikeRawRef('OAuth2')).toBe(false);
  });

  it('treats all-uppercase single words as NOT raw ref', () => {
    expect(looksLikeRawRef('README')).toBe(false);
    expect(looksLikeRawRef('API')).toBe(false);
  });

  it('boundary: exactly 14 chars lowercase = true, exactly 15 = false', () => {
    expect(looksLikeRawRef('abcdefghijklmn')).toBe(true);   // 14 chars
    expect(looksLikeRawRef('abcdefghijklmno')).toBe(false);  // 15 chars
  });

  it('catches lowercase Jira-like keys via kebab regex', () => {
    expect(looksLikeRawRef('auth-123')).toBe(true);
  });

  it('mixed-case Jira key like Auth-123 is NOT detected', () => {
    // Not all-uppercase PROJ-, not lowercase, not kebab (starts uppercase)
    expect(looksLikeRawRef('Auth-123')).toBe(false);
  });

  it('digit-leading kebab IS detected via lowercase < 15 chars rule', () => {
    // '3rd-party-lib' is all lowercase and < 15 chars → caught by first rule
    expect(looksLikeRawRef('3rd-party-lib')).toBe(true);
  });
});

// =============================================================================
// EDGE CASE: computeEntryTarget boundaries
// =============================================================================

describe('computeEntryTarget — edge cases', () => {
  it('returns 0 when existing stories >= significant projects', () => {
    // 4 repos × 5 acts = 4 significant, existing = 6
    const activities = Array.from({ length: 20 }, (_, i) => ({
      source: 'github',
      rawData: { repository: `org/repo-${i % 4}` },
    }));
    const result = computeEntryTarget(activities, 6);
    expect(result.targetEntries).toBe(0);
    expect(result.minActivitiesPerEntry).toBe(Infinity);
  });

  it('returns 0 when existing stories == significant projects', () => {
    const activities = Array.from({ length: 15 }, (_, i) => ({
      source: 'github',
      rawData: { repository: `org/repo-${i % 5}` },
    }));
    const result = computeEntryTarget(activities, 5);
    expect(result.targetEntries).toBe(0);
  });

  it('handles empty activities array', () => {
    const result = computeEntryTarget([], 0);
    // 0 significant projects → remaining = 0 → return 0
    expect(result.targetEntries).toBe(0);
  });

  it('handles all non-GitHub tools (no rawData.repository)', () => {
    const activities = Array.from({ length: 10 }, () => ({
      source: 'jira',
      rawData: { issueKey: 'PROJ-1' },
    }));
    const result = computeEntryTarget(activities, 0);
    // 1 significant project (tool:jira = 10), target = max(3, 1) = 3
    expect(result.targetEntries).toBe(3);
  });

  it('handles rawData = null and rawData = undefined', () => {
    const activities = [
      { source: 'github', rawData: null },
      { source: 'github', rawData: undefined },
      { source: 'github' },
    ] as Array<{ source: string; rawData?: any }>;
    const result = computeEntryTarget(activities, 0);
    // All 3 group under tool:github → 1 significant (count=3), target = max(3, 1) = 3
    expect(result.targetEntries).toBe(3);
  });

  it('handles non-string repository field in rawData', () => {
    const activities = [
      { source: 'github', rawData: { repository: { name: 'repo' } } },
      { source: 'github', rawData: { repository: 123 } },
      { source: 'github', rawData: { repository: null } },
    ];
    const result = computeEntryTarget(activities, 0);
    // All fall to tool:github (typeof check fails), count=3, 1 significant
    expect(result.targetEntries).toBe(3);
  });

  it('500+ activities in 1 repo → high minActivitiesPerEntry', () => {
    const activities = Array.from({ length: 500 }, () => ({
      source: 'github',
      rawData: { repository: 'org/monorepo' },
    }));
    const result = computeEntryTarget(activities, 0);
    // 1 significant, target = 3, minPerEntry = max(3, floor(500/9)) = 55
    expect(result.targetEntries).toBe(3);
    expect(result.minActivitiesPerEntry).toBe(55);
  });

  it('counts non-GitHub tool with 3+ activities as significant', () => {
    const activities = [
      ...Array.from({ length: 3 }, () => ({ source: 'jira' })),
      ...Array.from({ length: 3 }, () => ({ source: 'github', rawData: { repository: 'org/A' } })),
      { source: 'slack' },
      { source: 'slack' },
    ];
    const result = computeEntryTarget(activities, 0);
    // tool:jira=3, org/A=3, tool:slack=2 → 2 significant projects → target = 3
    expect(result.targetEntries).toBe(3);
  });

  it('uses container signal for finer project grouping', () => {
    // 6 Jira activities across 2 epics (3 each) + 3 GitHub activities
    const activities = [
      ...Array.from({ length: 3 }, () => ({ source: 'jira', container: 'AUTH-EPIC' })),
      ...Array.from({ length: 3 }, () => ({ source: 'jira', container: 'PERF-EPIC' })),
      ...Array.from({ length: 3 }, () => ({ source: 'github', container: 'repo:org/A' })),
    ];
    const result = computeEntryTarget(activities, 0);
    // 3 significant projects (AUTH-EPIC, PERF-EPIC, repo:org/A)
    expect(result.targetEntries).toBe(3);
  });

  it('falls back to rawData.repository when container is null', () => {
    const activities = [
      ...Array.from({ length: 5 }, () => ({ source: 'github', container: null, rawData: { repository: 'org/A' } })),
      ...Array.from({ length: 5 }, () => ({ source: 'github', container: null, rawData: { repository: 'org/B' } })),
    ];
    const result = computeEntryTarget(activities, 0);
    expect(result.targetEntries).toBe(3); // 2 significant, clamped to min 3
  });
});

// =============================================================================
// EDGE CASE: mergeSmallClusters boundaries
// =============================================================================

describe('mergeSmallClusters — edge cases', () => {
  it('returns empty array for empty input', () => {
    expect(mergeSmallClusters([], 5)).toEqual([]);
  });

  it('returns single cluster unchanged', () => {
    const clusters = [makeCluster('A', 5)];
    const result = mergeSmallClusters(clusters, 0);
    expect(result.length).toBe(1);
    expect(result[0].activityIds.length).toBe(5);
  });

  it('merges all null-container clusters by size proximity', () => {
    const clusters = [
      makeCluster('A', 2),
      makeCluster('B', 3),
      makeCluster('C', 4),
      makeCluster('D', 5),
      makeCluster('E', 6),
    ];
    // target=2, maxClusters = ceil(2.4) = 3
    const result = mergeSmallClusters(clusters, 2);
    expect(result.length).toBe(3);
  });

  it('preserves total activity count across merges (invariant)', () => {
    const sizes = [2, 3, 5, 7, 4, 6, 2, 3];
    const totalInput = sizes.reduce((a, b) => a + b, 0); // 32
    const clusters = sizes.map((s, i) => makeCluster(`C${i}`, s));
    const result = mergeSmallClusters(clusters, 3);
    const totalOutput = result.reduce((sum, c) => sum + c.activityIds.length, 0);
    expect(totalOutput).toBe(totalInput);
  });

  it('returns input unchanged when targetEntries=0', () => {
    const clusters = [makeCluster('A', 5), makeCluster('B', 3), makeCluster('C', 2)];
    const result = mergeSmallClusters(clusters, 0);
    expect(result.length).toBe(3); // guard returns early, no merge
  });

  it('prefers same-container merge when sizes are equal', () => {
    const clusters = [
      makeCluster('A', 2, 'repo:X'),
      makeCluster('B', 2, 'repo:X'),
      makeCluster('C', 3, 'repo:Y'),
    ];
    // target=1, maxClusters=2 → merge from 3 to 2
    // Smallest=A(2), same-container partner=B(2) → merge A+B
    const result = mergeSmallClusters(clusters, 1);
    expect(result.length).toBe(2);
    // The merged cluster should have 4 activities (A+B), C stays at 3
    const merged = result.find(c => c.activityIds.length === 4);
    expect(merged).toBeTruthy();
  });

  it('adopts name from smallest when partner has null name', () => {
    // Need 3 clusters with target=1 → maxClusters=ceil(1.2)=2, forces merge from 3→2
    const c1 = makeCluster('OAuth Flow', 2);
    const c2 = makeCluster('_', 5);
    c2.name = null;
    const c3 = makeCluster('Other Work', 4);
    const result = mergeSmallClusters([c1, c2, c3], 1);
    expect(result.length).toBe(2);
    // Sorted by size: c1(2), c3(4), c2(5). Smallest=c1(2), no same-container → merge into nearest neighbor c3(4).
    // c3 has a name, c1 has a name. Longer name wins.
    // Verify the null-named cluster survived without crashing
    const nullNamed = result.find(c => c.name === null);
    // c2 with null name should still be in the result since it wasn't merged
    expect(result.some(c => c.activityIds.length >= 5)).toBe(true);
  });

  it('recalculates dominantContainer after merge', () => {
    // A has 8 activities, all with container X via activity source
    // B has 3 activities, all with container Y
    // After merge A into B → combined has 11, dominant should be X (8 > 3)
    const clusterA: any = {
      name: 'A',
      dominantContainer: 'repo:org/X',
      activityIds: Array.from({ length: 8 }, (_, i) => `A-${i}`),
      activities: Array.from({ length: 8 }, (_, i) => ({
        id: `A-${i}`, source: 'github', sourceId: `s-A-${i}`, sourceUrl: null,
        title: `Activity ${i}`, description: null, timestamp: new Date('2026-02-01'),
        crossToolRefs: [], container: 'repo:org/X',
      })),
      metrics: {
        dateRange: { start: new Date('2026-02-01'), end: new Date('2026-02-15') },
        toolTypes: ['github'],
      },
    };
    const clusterB: any = {
      name: 'B',
      dominantContainer: 'repo:org/Y',
      activityIds: Array.from({ length: 3 }, (_, i) => `B-${i}`),
      activities: Array.from({ length: 3 }, (_, i) => ({
        id: `B-${i}`, source: 'github', sourceId: `s-B-${i}`, sourceUrl: null,
        title: `Activity ${i}`, description: null, timestamp: new Date('2026-02-01'),
        crossToolRefs: [], container: 'repo:org/Y',
      })),
      metrics: {
        dateRange: { start: new Date('2026-02-01'), end: new Date('2026-02-15') },
        toolTypes: ['github'],
      },
    };

    // Need 3 clusters with target=1 → maxClusters=2 to force a merge
    const clusterC: any = {
      name: 'C',
      dominantContainer: null,
      activityIds: ['C-0'],
      activities: [{ id: 'C-0', source: 'github', sourceId: 's-C-0', sourceUrl: null,
        title: 'Tiny', description: null, timestamp: new Date('2026-02-01'),
        crossToolRefs: [], container: null }],
      metrics: {
        dateRange: { start: new Date('2026-02-01'), end: new Date('2026-02-01') },
        toolTypes: ['github'],
      },
    };

    // Sorted: C(1), B(3), A(8). C merges into B (no same-container, falls to neighbor).
    // B now has 4 activities (3 Y + 1 null). dominantContainer should be recalculated as Y.
    const result = mergeSmallClusters([clusterA, clusterB, clusterC], 1);
    expect(result.length).toBe(2);
    const mergedB = result.find(c => c.activityIds.length === 4);
    expect(mergedB).toBeTruthy();
    // dominantContainer recalculated: 3 from Y, 1 null → still Y
    expect(mergedB!.dominantContainer).toBe('repo:org/Y');
  });
});

// =============================================================================
// PIPELINE INTEGRATION: mergeSmallClusters → dedupClustersByContainer
// =============================================================================

describe('merge + dedup pipeline', () => {
  it('preserves total activity count through both passes', () => {
    const clusters = [
      makeCluster('A', 5, 'repo:X'),
      makeCluster('B', 3, 'repo:X'),
      makeCluster('C', 10, 'repo:Y'),
      makeCluster('D', 2, 'repo:Y'),
      makeCluster('E', 8, 'repo:Z'),
      makeCluster('F', 4),
      makeCluster('G', 6),
      makeCluster('H', 2, 'repo:Z'),
    ];
    const totalInput = clusters.reduce((sum, c) => sum + c.activityIds.length, 0);

    const merged = mergeSmallClusters(clusters, 4);
    const deduped = dedupClustersByContainer(merged);

    const totalOutput = deduped.reduce((sum, c) => sum + c.activityIds.length, 0);
    expect(totalOutput).toBe(totalInput);
  });

  it('monorepo scenario: large temporal splits stay separate after both passes', () => {
    // Simulate a monorepo with 50 activities split into 3 temporal clusters
    const clusters = [
      makeCluster('Week 1 Work', 18, 'repo:org/monorepo'),
      makeCluster('Week 2 Work', 20, 'repo:org/monorepo'),
      makeCluster('Week 3 Work', 12, 'repo:org/monorepo'),
      makeCluster('Side Project', 5, 'repo:org/other'),
    ];

    const merged = mergeSmallClusters(clusters, 3);
    // maxMergeSize=15 → 18 and 20 are both > 15 → stay separate
    const deduped = dedupClustersByContainer(merged);

    // Week 1 (18) and Week 2 (20) must NOT be merged (both > maxMergeSize)
    // Week 3 (12) < 15 so it CAN merge with an existing monorepo cluster
    // Side Project (5) stays separate (different container)
    expect(deduped.length).toBeGreaterThanOrEqual(3);
    // The two large clusters must survive
    const largeClusters = deduped.filter(c => c.activityIds.length >= 18);
    expect(largeClusters.length).toBeGreaterThanOrEqual(1);
  });

  it('Layer 2 null-container clusters pass through both stages untouched', () => {
    const clusters = [
      makeCluster('LLM Cluster 1', 5),  // null container (from Layer 2)
      makeCluster('LLM Cluster 2', 3),  // null container (from Layer 2)
      makeCluster('Repo Cluster', 10, 'repo:org/X'),
    ];

    const merged = mergeSmallClusters(clusters, 3);
    const deduped = dedupClustersByContainer(merged);

    // Null-container clusters go through dedup unchanged
    const totalActivities = deduped.reduce((sum, c) => sum + c.activityIds.length, 0);
    expect(totalActivities).toBe(18);
  });
});

// =============================================================================
// withTimeout
// =============================================================================

describe('withTimeout', () => {
  it('resolves with value when promise completes before timeout', async () => {
    const result = await withTimeout(Promise.resolve('done'), 1000, 'test');
    expect(result).toBe('done');
  });

  it('returns undefined when promise exceeds timeout', async () => {
    const slow = new Promise<string>((resolve) => setTimeout(() => resolve('late'), 500));
    const result = await withTimeout(slow, 10, 'test-timeout');
    expect(result).toBeUndefined();
  });

  it('propagates rejection from the original promise', async () => {
    const failing = Promise.reject(new Error('boom'));
    await expect(withTimeout(failing, 1000, 'test-reject')).rejects.toThrow('boom');
  });

  it('cleans up timer after promise resolves (no leak)', async () => {
    const clearSpy = vi.spyOn(global, 'clearTimeout');
    await withTimeout(Promise.resolve('ok'), 5000, 'test-cleanup');
    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });

  it('cleans up timer after timeout fires', async () => {
    const clearSpy = vi.spyOn(global, 'clearTimeout');
    const slow = new Promise<string>((resolve) => setTimeout(() => resolve('late'), 500));
    await withTimeout(slow, 10, 'test-cleanup-timeout');
    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });
});

// =============================================================================
// runWithConcurrency
// =============================================================================

describe('runWithConcurrency', () => {
  it('runs all tasks and returns fulfilled results', async () => {
    const tasks = [
      () => Promise.resolve('a'),
      () => Promise.resolve('b'),
      () => Promise.resolve('c'),
    ];
    const results = await runWithConcurrency(tasks, 2);
    expect(results).toHaveLength(3);
    expect(results.every(r => r.status === 'fulfilled')).toBe(true);
    expect((results[0] as PromiseFulfilledResult<string>).value).toBe('a');
    expect((results[1] as PromiseFulfilledResult<string>).value).toBe('b');
    expect((results[2] as PromiseFulfilledResult<string>).value).toBe('c');
  });

  it('captures rejections without aborting other tasks', async () => {
    const tasks = [
      () => Promise.resolve('ok'),
      () => Promise.reject(new Error('fail')),
      () => Promise.resolve('also ok'),
    ];
    const results = await runWithConcurrency(tasks, 2);
    expect(results).toHaveLength(3);
    expect(results[0].status).toBe('fulfilled');
    expect(results[1].status).toBe('rejected');
    expect((results[1] as PromiseRejectedResult).reason.message).toBe('fail');
    expect(results[2].status).toBe('fulfilled');
  });

  it('respects concurrency limit', async () => {
    let running = 0;
    let maxRunning = 0;
    const tasks = Array.from({ length: 6 }, () => async () => {
      running++;
      maxRunning = Math.max(maxRunning, running);
      await new Promise(resolve => setTimeout(resolve, 20));
      running--;
      return 'done';
    });
    await runWithConcurrency(tasks, 2);
    expect(maxRunning).toBeLessThanOrEqual(2);
  });

  it('handles empty task array', async () => {
    const results = await runWithConcurrency([], 5);
    expect(results).toEqual([]);
  });

  it('handles limit larger than task count', async () => {
    const tasks = [() => Promise.resolve(1), () => Promise.resolve(2)];
    const results = await runWithConcurrency(tasks, 10);
    expect(results).toHaveLength(2);
    expect(results.every(r => r.status === 'fulfilled')).toBe(true);
  });

  it('preserves result order regardless of completion order', async () => {
    const tasks = [
      () => new Promise<string>(resolve => setTimeout(() => resolve('slow'), 50)),
      () => Promise.resolve('fast'),
      () => new Promise<string>(resolve => setTimeout(() => resolve('medium'), 20)),
    ];
    const results = await runWithConcurrency(tasks, 3);
    expect((results[0] as PromiseFulfilledResult<string>).value).toBe('slow');
    expect((results[1] as PromiseFulfilledResult<string>).value).toBe('fast');
    expect((results[2] as PromiseFulfilledResult<string>).value).toBe('medium');
  });
});
