/**
 * Cluster Assignment Service Tests
 *
 * Tests for:
 * - Calls LLM and returns parsed assignments
 * - Retries once on validation failure
 * - Falls back to empty on double failure
 * - Skips LLM call when no candidates (test #27)
 * - Over-splitting creates separate clusters (test #28)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockExecuteTask = vi.fn();
vi.mock('../ai/model-selector.service', () => ({
  getModelSelector: () => ({
    executeTask: mockExecuteTask,
  }),
}));

vi.mock('../ai/prompts/cluster-assign.prompt', () => ({
  buildClusterAssignMessages: vi.fn().mockReturnValue([
    { role: 'system', content: 'system' },
    { role: 'user', content: 'user' },
  ]),
}));

import { assignClusters, ClusterAssignment } from './cluster-assign.service';
import { buildClusterAssignMessages } from '../ai/prompts/cluster-assign.prompt';
import type { ClusterSummary, CandidateActivity } from '../ai/prompts/cluster-assign.prompt';

const CLUSTERS: ClusterSummary[] = [
  {
    id: 'cluster_a',
    name: 'OAuth Feature',
    activityCount: 4,
    dateRange: 'Jan 22-28',
    toolSummary: 'github',
    topActivities: 'PR#41',
    isReferenced: false,
  },
];

const CANDIDATES: CandidateActivity[] = [
  { id: 'act-1', source: 'github', title: 'feat: derivation modal', date: 'Feb 7', currentClusterId: null, confidence: null, description: null },
  { id: 'act-2', source: 'github', title: 'fix: OAuth callback', date: 'Feb 7', currentClusterId: null, confidence: null, description: null },
];

describe('assignClusters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns parsed assignments on valid LLM response', async () => {
    mockExecuteTask.mockResolvedValue({
      content: JSON.stringify({
        'act-1': 'NEW:Derivation Feature',
        'act-2': 'MOVE:cluster_a',
      }),
      model: 'claude-3-5-haiku-latest',
    });

    const result = await assignClusters(CLUSTERS, CANDIDATES);

    expect(result.assignments).toEqual({
      'act-1': { action: 'NEW', target: 'Derivation Feature' },
      'act-2': { action: 'MOVE', target: 'cluster_a' },
    });
    expect(result.fallback).toBe(false);
  });

  it('retries once on invalid response, then returns valid', async () => {
    mockExecuteTask
      .mockResolvedValueOnce({ content: 'not json', model: 'haiku' })
      .mockResolvedValueOnce({
        content: JSON.stringify({
          'act-1': 'NEW:Feature X',
          'act-2': 'NEW:Feature X',
        }),
        model: 'haiku',
      });

    const result = await assignClusters(CLUSTERS, CANDIDATES);
    expect(result.fallback).toBe(false);
    expect(mockExecuteTask).toHaveBeenCalledTimes(2);
  });

  it('falls back after two failures', async () => {
    mockExecuteTask
      .mockResolvedValueOnce({ content: 'bad', model: 'haiku' })
      .mockResolvedValueOnce({ content: 'still bad', model: 'haiku' });

    const result = await assignClusters(CLUSTERS, CANDIDATES);
    expect(result.fallback).toBe(true);
    expect(result.assignments).toEqual({});
  });

  // Test matrix #27: Empty candidates skips LLM
  it('skips LLM call when no candidates', async () => {
    const result = await assignClusters(CLUSTERS, []);

    expect(result.assignments).toEqual({});
    expect(result.fallback).toBe(false);
    expect(mockExecuteTask).not.toHaveBeenCalled();
  });

  // Test matrix #28: Over-splitting creates separate entries
  it('handles LLM returning different NEW names for related items', async () => {
    mockExecuteTask.mockResolvedValue({
      content: JSON.stringify({
        'act-1': 'NEW:Derivation Docs',
        'act-2': 'NEW:Derivation UI',
      }),
      model: 'haiku',
    });

    const result = await assignClusters(CLUSTERS, CANDIDATES);
    expect(result.assignments['act-1'].target).toBe('Derivation Docs');
    expect(result.assignments['act-2'].target).toBe('Derivation UI');
    expect(result.fallback).toBe(false);
  });

  it('falls back on LLM timeout/error', async () => {
    mockExecuteTask.mockRejectedValue(new Error('LLM timeout'));

    const result = await assignClusters(CLUSTERS, CANDIDATES);
    expect(result.fallback).toBe(true);
  });

  it('passes clusters and candidates to buildClusterAssignMessages', async () => {
    mockExecuteTask.mockResolvedValue({
      content: JSON.stringify({
        'act-1': 'NEW:Feature X',
        'act-2': 'NEW:Feature X',
      }),
      model: 'haiku',
    });

    await assignClusters(CLUSTERS, CANDIDATES);

    expect(buildClusterAssignMessages).toHaveBeenCalledWith({
      existingClusters: CLUSTERS,
      candidates: CANDIDATES,
    });
  });

  it('calls executeTask with correct model params', async () => {
    mockExecuteTask.mockResolvedValue({
      content: JSON.stringify({
        'act-1': 'NEW:Feature X',
        'act-2': 'NEW:Feature X',
      }),
      model: 'haiku',
    });

    await assignClusters(CLUSTERS, CANDIDATES);

    expect(mockExecuteTask).toHaveBeenCalledWith(
      'cluster-assign',
      expect.any(Array),
      'quick',
      { maxTokens: 1000, temperature: 0.3 },
    );
  });

  it('returns model and processingTimeMs on success', async () => {
    mockExecuteTask.mockResolvedValue({
      content: JSON.stringify({
        'act-1': 'NEW:Feature X',
        'act-2': 'NEW:Feature X',
      }),
      model: 'claude-3-5-haiku-latest',
    });

    const result = await assignClusters(CLUSTERS, CANDIDATES);
    expect(result.model).toBe('claude-3-5-haiku-latest');
    expect(result.processingTimeMs).toBeDefined();
    expect(typeof result.processingTimeMs).toBe('number');
  });
});
