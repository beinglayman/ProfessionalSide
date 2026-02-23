/**
 * Cluster Assignment Integration Test
 *
 * Reproduces today's bug: 5 derivation commits + 1 OAuth PR
 * should create 2 stories, not 1.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock LLM to return expected clustering
const mockExecuteTask = vi.fn();
vi.mock('../ai/model-selector.service', () => ({
  getModelSelector: () => ({
    executeTask: mockExecuteTask,
  }),
}));

import { assignClusters } from './cluster-assign.service';
import type { ClusterSummary, CandidateActivity } from '../ai/prompts/cluster-assign.prompt';

describe('Integration: today\'s bug reproduction (test matrix #24)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('separates derivation commits from OAuth PR into different clusters', async () => {
    const existingClusters: ClusterSummary[] = [
      {
        id: 'cluster_oauth',
        name: 'API Debugging and OAuth Integration',
        activityCount: 4,
        dateRange: 'Jan 22-28',
        toolSummary: 'github, jira',
        topActivities: 'PR#38 error tracking, PR#41 OAuth callback fix',
        isReferenced: false,
      },
    ];

    const candidates: CandidateActivity[] = [
      { id: 'c1', source: 'github', title: 'docs: add Share As derivations design document', date: 'Feb 7', currentClusterId: null, confidence: null, description: '+301/-0' },
      { id: 'c2', source: 'github', title: 'copy: strip jargon from derivation UI labels', date: 'Feb 7', currentClusterId: null, confidence: null, description: '+8/-8' },
      { id: 'c3', source: 'github', title: 'test: derivation prompt builder (32) and service (16) tests', date: 'Feb 7', currentClusterId: null, confidence: null, description: '+313/-0' },
      { id: 'c4', source: 'github', title: 'feat: DerivationModal UI with pill selectors and preview frames', date: 'Feb 7', currentClusterId: null, confidence: null, description: '+668/-131' },
      { id: 'c5', source: 'github', title: 'feat: wire POST /stories/:storyId/derive endpoint', date: 'Feb 7', currentClusterId: null, confidence: null, description: '+48/-0' },
      { id: 'c6', source: 'github', title: 'Closed Pull Request: Fixing OAuth Callback Blockage', date: 'Feb 7', currentClusterId: null, confidence: null, description: 'Resolved OAuth callback issue' },
    ];

    // Simulate LLM response that correctly separates the two features
    mockExecuteTask.mockResolvedValue({
      content: JSON.stringify({
        'c1': 'NEW:Share As Derivations Feature',
        'c2': 'NEW:Share As Derivations Feature',
        'c3': 'NEW:Share As Derivations Feature',
        'c4': 'NEW:Share As Derivations Feature',
        'c5': 'NEW:Share As Derivations Feature',
        'c6': 'MOVE:cluster_oauth',
      }),
      model: 'claude-haiku-4-5-20251001',
    });

    const result = await assignClusters(existingClusters, candidates);

    // OAuth PR moved to existing cluster
    expect(result.assignments['c6']).toEqual({ action: 'MOVE', target: 'cluster_oauth' });

    // All derivation commits in a new cluster
    const derivationAssignments = ['c1', 'c2', 'c3', 'c4', 'c5'].map(id => result.assignments[id]);
    expect(derivationAssignments.every(a => a.action === 'NEW' && a.target === 'Share As Derivations Feature')).toBe(true);

    // Two distinct groups
    expect(result.fallback).toBe(false);
  });
});
