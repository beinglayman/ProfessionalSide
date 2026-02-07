/**
 * Cluster Assignment Validation
 *
 * Validates LLM responses for cluster assignment.
 * Strict one-to-one enforcement: every candidate ID must appear exactly once.
 */

// =============================================================================
// TYPES
// =============================================================================

export interface CandidateInfo {
  id: string;
  currentClusterId: string | null;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  parsed?: Record<string, string>;
}

// =============================================================================
// PATTERNS
// =============================================================================

const ACTION_PATTERN = /^(KEEP|MOVE|NEW):(.*)$/;

// =============================================================================
// VALIDATOR
// =============================================================================

export function validateClusterAssignment(
  rawJson: string,
  candidates: CandidateInfo[],
  existingClusterIds: Set<string>,
): ValidationResult {
  const errors: string[] = [];

  // 1. Parse JSON
  let parsed: Record<string, string>;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return { valid: false, errors: ['JSON parse failed'] };
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { valid: false, errors: ['Response is not a JSON object'] };
  }

  const candidateIds = new Set(candidates.map(c => c.id));
  const candidateMap = new Map(candidates.map(c => [c.id, c]));
  const responseKeys = new Set(Object.keys(parsed));

  // 2. Check for missing candidate IDs
  for (const id of candidateIds) {
    if (!responseKeys.has(id)) {
      errors.push(`Missing candidate ID: ${id}`);
    }
  }

  // 3. Check for extra IDs
  for (const key of responseKeys) {
    if (!candidateIds.has(key)) {
      errors.push(`Extra unknown ID: ${key}`);
    }
  }

  // 4. Validate each value
  for (const [id, value] of Object.entries(parsed)) {
    if (!candidateIds.has(id)) continue; // already flagged as extra

    const match = ACTION_PATTERN.exec(value);
    if (!match) {
      errors.push(`${id}: invalid format "${value}" — must be KEEP:<id>, MOVE:<id>, or NEW:<name>`);
      continue;
    }

    const [, action, target] = match;
    const candidate = candidateMap.get(id)!;

    switch (action) {
      case 'KEEP':
        if (!candidate.currentClusterId) {
          errors.push(`${id}: KEEP invalid — candidate has no currentClusterId`);
        } else if (!existingClusterIds.has(target)) {
          errors.push(`${id}: KEEP references unknown clusterId: ${target}`);
        } else if (target !== candidate.currentClusterId) {
          errors.push(`${id}: KEEP target ${target} differs from currentClusterId ${candidate.currentClusterId} — use MOVE instead`);
        }
        break;

      case 'MOVE':
        if (!existingClusterIds.has(target)) {
          errors.push(`${id}: MOVE references unknown clusterId: ${target}`);
        } else if (target === candidate.currentClusterId) {
          errors.push(`${id}: MOVE target same as currentClusterId ${target} — use KEEP instead`);
        }
        break;

      case 'NEW':
        if (!target.trim()) {
          errors.push(`${id}: NEW has empty cluster name`);
        }
        break;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    parsed: errors.length === 0 ? parsed : undefined,
  };
}
