/**
 * Cluster Assignment Prompt Builder Tests
 *
 * Tests for:
 * - Builds system + user messages from clusters + candidates
 * - Includes all candidate IDs in prompt
 * - Includes existing cluster summaries
 * - Handles empty clusters list
 * - Truncates long descriptions
 */

import { describe, it, expect } from 'vitest';
import { buildClusterAssignMessages, ClusterAssignParams } from './cluster-assign.prompt';

const MOCK_CLUSTERS = [
  {
    id: 'cluster_abc',
    name: 'OAuth2 Authentication',
    activityCount: 4,
    dateRange: 'Jan 22-28',
    toolSummary: 'github, jira',
    topActivities: 'PR#38 error tracking, PR#41 OAuth fix',
    isReferenced: false,
  },
];

const MOCK_CANDIDATES = [
  {
    id: 'act-1',
    source: 'github',
    title: 'feat: add derivation modal',
    date: 'Feb 7',
    currentClusterId: null,
    confidence: null,
    description: 'Added modal with pill selectors',
  },
  {
    id: 'act-2',
    source: 'github',
    title: 'fix: OAuth callback blocked',
    date: 'Feb 7',
    currentClusterId: 'cluster_abc',
    confidence: 'low',
    description: null,
  },
];

describe('buildClusterAssignMessages', () => {
  it('returns system and user messages', () => {
    const messages = buildClusterAssignMessages({
      existingClusters: MOCK_CLUSTERS,
      candidates: MOCK_CANDIDATES,
    });

    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('system');
    expect(messages[1].role).toBe('user');
  });

  it('includes all candidate IDs in user prompt', () => {
    const messages = buildClusterAssignMessages({
      existingClusters: MOCK_CLUSTERS,
      candidates: MOCK_CANDIDATES,
    });
    const userContent = messages[1].content as string;

    expect(userContent).toContain('act-1');
    expect(userContent).toContain('act-2');
  });

  it('includes existing cluster summaries', () => {
    const messages = buildClusterAssignMessages({
      existingClusters: MOCK_CLUSTERS,
      candidates: MOCK_CANDIDATES,
    });
    const userContent = messages[1].content as string;

    expect(userContent).toContain('cluster_abc');
    expect(userContent).toContain('OAuth2 Authentication');
  });

  it('handles empty clusters list', () => {
    const messages = buildClusterAssignMessages({
      existingClusters: [],
      candidates: MOCK_CANDIDATES,
    });
    const userContent = messages[1].content as string;

    expect(userContent).toContain('No existing clusters');
    expect(userContent).toContain('act-1');
  });

  it('shows currentClusterId and confidence for weak assignments', () => {
    const messages = buildClusterAssignMessages({
      existingClusters: MOCK_CLUSTERS,
      candidates: MOCK_CANDIDATES,
    });
    const userContent = messages[1].content as string;

    expect(userContent).toContain('currentClusterId: cluster_abc');
    expect(userContent).toContain('confidence: low');
  });

  it('shows null for unclustered candidates', () => {
    const messages = buildClusterAssignMessages({
      existingClusters: MOCK_CLUSTERS,
      candidates: MOCK_CANDIDATES,
    });
    const userContent = messages[1].content as string;

    expect(userContent).toContain('currentClusterId: null');
    expect(userContent).toContain('confidence: null');
  });

  it('includes description when present', () => {
    const messages = buildClusterAssignMessages({
      existingClusters: MOCK_CLUSTERS,
      candidates: MOCK_CANDIDATES,
    });
    const userContent = messages[1].content as string;

    expect(userContent).toContain('Added modal with pill selectors');
  });

  it('truncates long descriptions to 100 characters', () => {
    const longDesc = 'A'.repeat(200);
    const messages = buildClusterAssignMessages({
      existingClusters: [],
      candidates: [{ ...MOCK_CANDIDATES[0], description: longDesc }],
    });
    const userContent = messages[1].content as string;

    expect(userContent).not.toContain(longDesc);
    expect(userContent).toContain('A'.repeat(100) + '...');
  });

  it('system prompt contains KEEP/MOVE/NEW instructions', () => {
    const messages = buildClusterAssignMessages({
      existingClusters: [],
      candidates: MOCK_CANDIDATES,
    });
    const systemContent = messages[0].content as string;

    expect(systemContent).toContain('KEEP');
    expect(systemContent).toContain('MOVE');
    expect(systemContent).toContain('NEW');
    expect(systemContent).toContain('JSON');
  });
});
