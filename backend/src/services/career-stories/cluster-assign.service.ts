/**
 * Cluster Assignment Service
 *
 * Layer 2 of the two-layer clustering architecture.
 * Sends candidate activities to LLM for KEEP/MOVE/NEW assignment.
 * Falls back gracefully on failure.
 *
 * Pattern: Same as derivation.service.ts (prompt builder + model selector).
 */

import { getModelSelector } from '../ai/model-selector.service';
import {
  buildClusterAssignMessages,
  ClusterSummary,
  CandidateActivity,
} from '../ai/prompts/cluster-assign.prompt';
import { validateClusterAssignment, CandidateInfo } from './cluster-assign.validation';

// =============================================================================
// TYPES
// =============================================================================

export interface ClusterAssignment {
  action: 'KEEP' | 'MOVE' | 'NEW';
  target: string;
}

export interface AssignResult {
  assignments: Record<string, ClusterAssignment>;
  fallback: boolean;
  model?: string;
  processingTimeMs?: number;
}

// =============================================================================
// SERVICE
// =============================================================================

// One retry: validation failures are typically format issues that a second attempt can fix.
// LLM errors (network, timeout) fall back immediately — no retry.
const MAX_RETRIES = 1;

export async function assignClusters(
  existingClusters: ClusterSummary[],
  candidates: CandidateActivity[],
): Promise<AssignResult> {
  // Skip LLM when nothing to assign
  if (candidates.length === 0) {
    return { assignments: {}, fallback: false };
  }

  const startTime = Date.now();
  const modelSelector = getModelSelector();
  if (!modelSelector) {
    console.warn('[ClusterAssign] LLM service not available, falling back');
    return { assignments: {}, fallback: true };
  }

  const messages = buildClusterAssignMessages({ existingClusters, candidates });

  const candidateInfos: CandidateInfo[] = candidates.map(c => ({
    id: c.id,
    currentClusterId: c.currentClusterId,
  }));
  const existingIds = new Set(existingClusters.map(c => c.id));

  // Try up to MAX_RETRIES + 1 times
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await modelSelector.executeTask('cluster-assign', messages, 'quick', {
        maxTokens: 1000,
        temperature: 0.3,
      });

      const rawJson = result.content.trim();
      const validation = validateClusterAssignment(rawJson, candidateInfos, existingIds);

      if (validation.valid && validation.parsed) {
        const assignments = parseAssignments(validation.parsed);
        return {
          assignments,
          fallback: false,
          model: result.model,
          processingTimeMs: Date.now() - startTime,
        };
      }

      console.warn(`[ClusterAssign] Validation failed (attempt ${attempt + 1}):`, validation.errors);
    } catch (error) {
      console.warn(`[ClusterAssign] LLM error (attempt ${attempt + 1}):`, error);
      return { assignments: {}, fallback: true };
    }
  }

  // All retries exhausted
  console.warn('[ClusterAssign] All retries failed, falling back to Layer 1');
  return { assignments: {}, fallback: true };
}

// =============================================================================
// HELPERS
// =============================================================================

// Split validated "ACTION:target" strings into typed objects.
// Safe to cast — validation already enforced KEEP|MOVE|NEW format.
function parseAssignments(parsed: Record<string, string>): Record<string, ClusterAssignment> {
  const assignments: Record<string, ClusterAssignment> = {};

  for (const [id, value] of Object.entries(parsed)) {
    const colonIdx = value.indexOf(':');
    const action = value.substring(0, colonIdx) as 'KEEP' | 'MOVE' | 'NEW';
    const target = value.substring(colonIdx + 1);
    assignments[id] = { action, target };
  }

  return assignments;
}
