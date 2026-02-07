/**
 * Cluster Assignment Validation Tests
 *
 * Tests the validation contract from design doc:
 * - JSON parse success
 * - Keys match candidate IDs (no missing, no extras)
 * - Values match KEEP/MOVE/NEW pattern
 * - KEEP only valid with non-null currentClusterId
 * - MOVE target differs from currentClusterId
 */

import { describe, it, expect } from 'vitest';
import { validateClusterAssignment, CandidateInfo } from './cluster-assign.validation';

const CANDIDATES: CandidateInfo[] = [
  { id: 'act-1', currentClusterId: null },
  { id: 'act-2', currentClusterId: 'cluster_a' },
  { id: 'act-3', currentClusterId: 'cluster_b' },
];

const EXISTING_CLUSTER_IDS = new Set(['cluster_a', 'cluster_b', 'cluster_c']);

describe('validateClusterAssignment', () => {
  it('accepts valid response with mix of NEW, MOVE, KEEP', () => {
    const rawJson = JSON.stringify({
      'act-1': 'NEW:Share As Derivations',
      'act-2': 'KEEP:cluster_a',
      'act-3': 'MOVE:cluster_c',
    });

    const result = validateClusterAssignment(rawJson, CANDIDATES, EXISTING_CLUSTER_IDS);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects when a candidate ID is missing from response', () => {
    const rawJson = JSON.stringify({
      'act-1': 'NEW:Feature X',
      'act-2': 'KEEP:cluster_a',
    });

    const result = validateClusterAssignment(rawJson, CANDIDATES, EXISTING_CLUSTER_IDS);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('act-3'))).toBe(true);
  });

  it('rejects when response contains unknown ID', () => {
    const rawJson = JSON.stringify({
      'act-1': 'NEW:Feature X',
      'act-2': 'KEEP:cluster_a',
      'act-3': 'KEEP:cluster_b',
      'act-unknown': 'NEW:Bogus',
    });

    const result = validateClusterAssignment(rawJson, CANDIDATES, EXISTING_CLUSTER_IDS);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('act-unknown'))).toBe(true);
  });

  it('rejects KEEP with unknown clusterId', () => {
    const rawJson = JSON.stringify({
      'act-1': 'NEW:Feature X',
      'act-2': 'KEEP:cluster_999',
      'act-3': 'KEEP:cluster_b',
    });

    const result = validateClusterAssignment(rawJson, CANDIDATES, EXISTING_CLUSTER_IDS);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('cluster_999'))).toBe(true);
  });

  it('rejects KEEP when candidate has no currentClusterId', () => {
    const rawJson = JSON.stringify({
      'act-1': 'KEEP:cluster_a',
      'act-2': 'KEEP:cluster_a',
      'act-3': 'KEEP:cluster_b',
    });

    const result = validateClusterAssignment(rawJson, CANDIDATES, EXISTING_CLUSTER_IDS);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('act-1') && e.includes('KEEP'))).toBe(true);
  });

  it('rejects MOVE to same cluster as currentClusterId', () => {
    const rawJson = JSON.stringify({
      'act-1': 'NEW:Feature X',
      'act-2': 'MOVE:cluster_a',
      'act-3': 'KEEP:cluster_b',
    });

    const result = validateClusterAssignment(rawJson, CANDIDATES, EXISTING_CLUSTER_IDS);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('act-2') && e.includes('MOVE'))).toBe(true);
  });

  it('rejects non-JSON response', () => {
    const result = validateClusterAssignment('not json at all', CANDIDATES, EXISTING_CLUSTER_IDS);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('JSON'))).toBe(true);
  });

  it('rejects value that does not match KEEP/MOVE/NEW pattern', () => {
    const rawJson = JSON.stringify({
      'act-1': 'ASSIGN:cluster_a',
      'act-2': 'KEEP:cluster_a',
      'act-3': 'KEEP:cluster_b',
    });

    const result = validateClusterAssignment(rawJson, CANDIDATES, EXISTING_CLUSTER_IDS);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('act-1'))).toBe(true);
  });

  it('rejects NEW with empty name', () => {
    const rawJson = JSON.stringify({
      'act-1': 'NEW:',
      'act-2': 'KEEP:cluster_a',
      'act-3': 'KEEP:cluster_b',
    });

    const result = validateClusterAssignment(rawJson, CANDIDATES, EXISTING_CLUSTER_IDS);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('empty'))).toBe(true);
  });

  it('rejects MOVE to unknown clusterId', () => {
    const rawJson = JSON.stringify({
      'act-1': 'NEW:Feature X',
      'act-2': 'MOVE:cluster_999',
      'act-3': 'KEEP:cluster_b',
    });

    const result = validateClusterAssignment(rawJson, CANDIDATES, EXISTING_CLUSTER_IDS);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('cluster_999'))).toBe(true);
  });

  it('rejects JSON array response', () => {
    const rawJson = JSON.stringify([{ 'act-1': 'NEW:Feature X' }]);
    const result = validateClusterAssignment(rawJson, CANDIDATES, EXISTING_CLUSTER_IDS);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('not a JSON object'))).toBe(true);
  });

  it('rejects KEEP target that differs from currentClusterId', () => {
    const rawJson = JSON.stringify({
      'act-1': 'NEW:Feature X',
      'act-2': 'KEEP:cluster_b',
      'act-3': 'KEEP:cluster_b',
    });

    const result = validateClusterAssignment(rawJson, CANDIDATES, EXISTING_CLUSTER_IDS);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('act-2') && e.includes('MOVE instead'))).toBe(true);
  });

  it('returns parsed map on valid response', () => {
    const rawJson = JSON.stringify({
      'act-1': 'NEW:Feature X',
      'act-2': 'KEEP:cluster_a',
      'act-3': 'MOVE:cluster_c',
    });

    const result = validateClusterAssignment(rawJson, CANDIDATES, EXISTING_CLUSTER_IDS);
    expect(result.valid).toBe(true);
    expect(result.parsed).toEqual({
      'act-1': 'NEW:Feature X',
      'act-2': 'KEEP:cluster_a',
      'act-3': 'MOVE:cluster_c',
    });
  });

  it('collects multiple errors in one pass', () => {
    const rawJson = JSON.stringify({
      'act-1': 'ASSIGN:bad',
      'act-2': 'MOVE:cluster_a',
      // act-3 missing
    });

    const result = validateClusterAssignment(rawJson, CANDIDATES, EXISTING_CLUSTER_IDS);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });

  it('handles empty candidates list', () => {
    const rawJson = JSON.stringify({});
    const result = validateClusterAssignment(rawJson, [], EXISTING_CLUSTER_IDS);
    expect(result.valid).toBe(true);
    expect(result.parsed).toEqual({});
  });

  it('rejects NEW with whitespace-only name', () => {
    const rawJson = JSON.stringify({
      'act-1': 'NEW:   ',
      'act-2': 'KEEP:cluster_a',
      'act-3': 'KEEP:cluster_b',
    });

    const result = validateClusterAssignment(rawJson, CANDIDATES, EXISTING_CLUSTER_IDS);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('empty'))).toBe(true);
  });
});
