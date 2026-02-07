# Clustering Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace broken temporal-only clustering with two-layer system: LLM semantic clustering (Phase 1, fixes both bugs) + heuristic graph enhancements (Phase 2, reduces LLM load) + temporal demotion (Phase 3).

**Architecture:** Phase 1 sends all activities to Haiku for KEEP/MOVE/NEW cluster assignment using the derivation service pattern (Handlebars template + model-selector). Phase 2 adds branch/collaborator/containment edges to the existing DFS graph so high-confidence assignments skip the LLM. Phase 3 demotes temporal entries to orphan-only fallback.

**Tech Stack:** TypeScript, Vitest, Handlebars, model-selector.service (Anthropic Haiku), Prisma (no schema changes)

**Design doc:** `docs/plans/2026-02-07-clustering-redesign.md`

---

## Phase 1: LLM Cluster Assignment (fixes both bugs)

### Task 1: Add `cluster-assign` task type to model selector

**Files:**
- Modify: `backend/src/services/ai/model-selector.service.ts:6,50-58`

**Step 1: Add the task type**

In `model-selector.service.ts`, add `'cluster-assign'` to the `TaskType` union and the `taskModelMap`:

```typescript
// Line 6 — add to union
export type TaskType = 'categorize' | 'analyze' | 'correlate' | 'generate' | 'summarize' | 'extract' | 'derive' | 'cluster-assign';

// Line 50-58 — add to map (uses quick/Haiku tier)
private taskModelMap: Record<TaskType, 'quick' | 'premium'> = {
  categorize: 'quick',
  analyze: 'quick',
  extract: 'quick',
  summarize: 'quick',
  correlate: 'quick',
  generate: 'premium',
  derive: 'quick',
  'cluster-assign': 'quick',
};
```

**Step 2: Verify existing tests still pass**

Run: `npx vitest run --reporter=verbose 2>&1 | tail -20`
Expected: All existing tests pass.

**Step 3: Commit**

```bash
git add backend/src/services/ai/model-selector.service.ts
git commit -m "feat: add cluster-assign task type to model selector (Haiku tier)"
```

---

### Task 2: Create cluster assignment prompt template

**Files:**
- Create: `backend/src/services/ai/prompts/templates/cluster-assign-system.prompt.md`
- Create: `backend/src/services/ai/prompts/templates/cluster-assign-user.prompt.md`

**Step 1: Create system prompt**

```markdown
You are a work activity clustering engine for a career stories app.

Your job: for each candidate activity, decide whether to:
- KEEP it in its current cluster,
- MOVE it to a different existing cluster, or
- NEW: create/join a new cluster name.

## Rules

1. Use only clusterId values from the EXISTING CLUSTERS list for KEEP or MOVE.
2. Use NEW:<descriptive cluster name> to create or join a new cluster.
3. Every candidate ID must appear exactly once in the JSON output.
4. If unsure, prefer NEW to avoid false merges. Over-splitting is fine.
5. Keep cluster names short and specific (e.g., "OAuth2 Authentication", "Dashboard Performance Optimization").
6. KEEP is only valid when the candidate already has a currentClusterId.
7. MOVE target must differ from currentClusterId.

## Output

Return ONLY a JSON object. No markdown, no commentary, no explanation.
```

**Step 2: Create user prompt template (Handlebars)**

```markdown
{{#if existingClusters.length}}
EXISTING CLUSTERS (last 30 days + referenced by candidates):
{{#each existingClusters}}
- clusterId: {{this.id}}
  name: "{{this.name}}"
  activityCount: {{this.activityCount}}
  dateRange: {{this.dateRange}}
  tools: {{this.toolSummary}}
  {{#if this.isReferenced}}(referenced by a candidate below){{/if}}
  topActivities: {{this.topActivities}}
{{/each}}
{{else}}
No existing clusters. All candidates will need NEW cluster assignments.
{{/if}}

CANDIDATE ACTIVITIES:
{{#each candidates}}
{{this.id}}. [{{this.source}}] "{{this.title}}" ({{this.date}})
   currentClusterId: {{#if this.currentClusterId}}{{this.currentClusterId}}{{else}}null{{/if}}
   confidence: {{#if this.confidence}}{{this.confidence}}{{else}}null{{/if}}
   {{#if this.description}}   {{truncate this.description 100}}{{/if}}
{{/each}}

Respond as JSON:
{
  "<activity_id>": "KEEP:<clusterId>" | "MOVE:<clusterId>" | "NEW:<name>"
}
```

**Step 3: Commit**

```bash
git add backend/src/services/ai/prompts/templates/cluster-assign-system.prompt.md backend/src/services/ai/prompts/templates/cluster-assign-user.prompt.md
git commit -m "feat: add cluster assignment prompt templates (system + user)"
```

---

### Task 3: Create cluster assignment prompt builder

**Files:**
- Create: `backend/src/services/ai/prompts/cluster-assign.prompt.ts`
- Create: `backend/src/services/ai/prompts/cluster-assign.prompt.test.ts`

**Step 1: Write the failing tests**

Create `cluster-assign.prompt.test.ts`:

```typescript
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

    // act-1 is unclustered
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
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run backend/src/services/ai/prompts/cluster-assign.prompt.test.ts --reporter=verbose 2>&1 | tail -5`
Expected: FAIL — module not found

**Step 3: Implement the prompt builder**

Create `cluster-assign.prompt.ts`:

```typescript
/**
 * Cluster Assignment Prompt Builder
 *
 * Builds chat messages for LLM-based cluster assignment.
 * Follows the same pattern as derivation.prompt.ts:
 * Handlebars templates loaded from /templates/ directory.
 *
 * @module cluster-assign.prompt
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import Handlebars from 'handlebars';
import { ChatCompletionMessageParam } from 'openai/resources/index';

// =============================================================================
// TYPES
// =============================================================================

export interface ClusterSummary {
  id: string;
  name: string;
  activityCount: number;
  dateRange: string;
  toolSummary: string;
  topActivities: string;
  isReferenced: boolean;
}

export interface CandidateActivity {
  id: string;
  source: string;
  title: string;
  date: string;
  currentClusterId: string | null;
  confidence: string | null;
  description: string | null;
}

export interface ClusterAssignParams {
  existingClusters: ClusterSummary[];
  candidates: CandidateActivity[];
}

// =============================================================================
// TEMPLATE LOADING
// =============================================================================

const TEMPLATES_DIR = join(__dirname, 'templates');

// Register truncate helper for description length control
Handlebars.registerHelper('truncate', (str: string, len: number) => {
  if (!str) return '';
  if (str.length <= len) return str;
  return str.substring(0, len) + '...';
});

let systemTemplate: string;
let userTemplate: Handlebars.TemplateDelegate;

try {
  systemTemplate = readFileSync(join(TEMPLATES_DIR, 'cluster-assign-system.prompt.md'), 'utf-8');
  const userRaw = readFileSync(join(TEMPLATES_DIR, 'cluster-assign-user.prompt.md'), 'utf-8');
  userTemplate = Handlebars.compile(userRaw);
} catch (error) {
  console.warn('Failed to load cluster-assign prompt templates:', (error as Error).message);
  systemTemplate = 'You are a work activity clustering engine. Assign each candidate to KEEP, MOVE, or NEW. Return only JSON.';
  userTemplate = Handlebars.compile(
    '{{#each candidates}}{{this.id}}. [{{this.source}}] "{{this.title}}"\n{{/each}}\nRespond as JSON.'
  );
}

// =============================================================================
// PROMPT BUILDER
// =============================================================================

/**
 * Build chat messages for cluster assignment.
 */
export function buildClusterAssignMessages(
  params: ClusterAssignParams,
): ChatCompletionMessageParam[] {
  const userContent = userTemplate({
    existingClusters: params.existingClusters,
    candidates: params.candidates,
  });

  return [
    { role: 'system', content: systemTemplate },
    { role: 'user', content: userContent },
  ];
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run backend/src/services/ai/prompts/cluster-assign.prompt.test.ts --reporter=verbose`
Expected: All 9 tests PASS

**Step 5: Commit**

```bash
git add backend/src/services/ai/prompts/cluster-assign.prompt.ts backend/src/services/ai/prompts/cluster-assign.prompt.test.ts
git commit -m "feat: cluster assignment prompt builder with 9 tests"
```

---

### Task 4: Create cluster assignment validation

**Files:**
- Create: `backend/src/services/career-stories/cluster-assign.validation.ts`
- Create: `backend/src/services/career-stories/cluster-assign.validation.test.ts`

**Step 1: Write the failing tests**

Create `cluster-assign.validation.test.ts`:

```typescript
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
  // --- Happy path ---

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

  // --- Test matrix #1: Missing candidate ID ---

  it('rejects when a candidate ID is missing from response', () => {
    const rawJson = JSON.stringify({
      'act-1': 'NEW:Feature X',
      'act-2': 'KEEP:cluster_a',
      // act-3 missing
    });

    const result = validateClusterAssignment(rawJson, CANDIDATES, EXISTING_CLUSTER_IDS);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('act-3'))).toBe(true);
  });

  // --- Test matrix #2: Extra unknown ID ---

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

  // --- Test matrix #3: Invalid clusterId ---

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

  // --- Test matrix #4: KEEP on unclustered activity ---

  it('rejects KEEP when candidate has no currentClusterId', () => {
    const rawJson = JSON.stringify({
      'act-1': 'KEEP:cluster_a', // act-1 has currentClusterId: null
      'act-2': 'KEEP:cluster_a',
      'act-3': 'KEEP:cluster_b',
    });

    const result = validateClusterAssignment(rawJson, CANDIDATES, EXISTING_CLUSTER_IDS);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('act-1') && e.includes('KEEP'))).toBe(true);
  });

  // --- Test matrix #5: MOVE same as current ---

  it('rejects MOVE to same cluster as currentClusterId', () => {
    const rawJson = JSON.stringify({
      'act-1': 'NEW:Feature X',
      'act-2': 'MOVE:cluster_a', // same as currentClusterId
      'act-3': 'KEEP:cluster_b',
    });

    const result = validateClusterAssignment(rawJson, CANDIDATES, EXISTING_CLUSTER_IDS);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('act-2') && e.includes('MOVE'))).toBe(true);
  });

  // --- Invalid JSON ---

  it('rejects non-JSON response', () => {
    const result = validateClusterAssignment('not json at all', CANDIDATES, EXISTING_CLUSTER_IDS);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('JSON'))).toBe(true);
  });

  // --- Invalid value format ---

  it('rejects value that does not match KEEP/MOVE/NEW pattern', () => {
    const rawJson = JSON.stringify({
      'act-1': 'ASSIGN:cluster_a', // invalid action
      'act-2': 'KEEP:cluster_a',
      'act-3': 'KEEP:cluster_b',
    });

    const result = validateClusterAssignment(rawJson, CANDIDATES, EXISTING_CLUSTER_IDS);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('act-1'))).toBe(true);
  });

  // --- Empty NEW name ---

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

  // --- MOVE with unknown target ---

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
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run backend/src/services/career-stories/cluster-assign.validation.test.ts --reporter=verbose 2>&1 | tail -5`
Expected: FAIL — module not found

**Step 3: Implement the validator**

Create `cluster-assign.validation.ts`:

```typescript
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

const ACTION_PATTERN = /^(KEEP|MOVE|NEW):(.+)$/;

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
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run backend/src/services/career-stories/cluster-assign.validation.test.ts --reporter=verbose`
Expected: All 9 tests PASS

**Step 5: Commit**

```bash
git add backend/src/services/career-stories/cluster-assign.validation.ts backend/src/services/career-stories/cluster-assign.validation.test.ts
git commit -m "feat: cluster assignment LLM response validation with 9 tests"
```

---

### Task 5: Create cluster assignment service

**Files:**
- Create: `backend/src/services/career-stories/cluster-assign.service.ts`
- Create: `backend/src/services/career-stories/cluster-assign.service.test.ts`

**Step 1: Write the failing tests**

Create `cluster-assign.service.test.ts`:

```typescript
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
    // Each gets its own NEW — that's acceptable (over-split, user can merge)
    expect(result.assignments['act-1'].target).toBe('Derivation Docs');
    expect(result.assignments['act-2'].target).toBe('Derivation UI');
    expect(result.fallback).toBe(false);
  });

  it('falls back on LLM timeout/error', async () => {
    mockExecuteTask.mockRejectedValue(new Error('LLM timeout'));

    const result = await assignClusters(CLUSTERS, CANDIDATES);
    expect(result.fallback).toBe(true);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run backend/src/services/career-stories/cluster-assign.service.test.ts --reporter=verbose 2>&1 | tail -5`
Expected: FAIL — module not found

**Step 3: Implement the service**

Create `cluster-assign.service.ts`:

```typescript
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
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run backend/src/services/career-stories/cluster-assign.service.test.ts --reporter=verbose`
Expected: All 6 tests PASS

**Step 5: Commit**

```bash
git add backend/src/services/career-stories/cluster-assign.service.ts backend/src/services/career-stories/cluster-assign.service.test.ts
git commit -m "feat: cluster assignment service with retry, fallback, 6 tests"
```

---

### Task 6: Wire Layer 2 into production-sync pipeline

**Files:**
- Modify: `backend/src/services/career-stories/production-sync.service.ts`

This is the integration step. After the existing `clusterProductionActivities()` call, add the LLM assignment step.

**Step 1: Read the full sync orchestration function**

Read `production-sync.service.ts` to find the main orchestration function that calls steps 1-5 in sequence. Identify the exact insertion point after `clusterProductionActivities()` and before `createProductionJournalEntries()`.

**Step 2: Import the service**

At the top of `production-sync.service.ts`, add:

```typescript
import { assignClusters, ClusterAssignment } from './cluster-assign.service';
import type { ClusterSummary, CandidateActivity } from '../ai/prompts/cluster-assign.prompt';
```

**Step 3: Add Layer 2 between clustering and journal entry creation**

After `clusterProductionActivities()` returns `InMemoryCluster[]`, add a new step that:

1. Collects unclustered activity IDs (not in any cluster from Layer 1)
2. Builds `ClusterSummary[]` from existing journal entries (last 30 days + referenced)
3. Builds `CandidateActivity[]` from unclustered activities
4. Calls `assignClusters()`
5. Merges LLM assignments back into the `InMemoryCluster[]` array:
   - `MOVE:<clusterId>` → add activity to matching cluster
   - `NEW:<name>` → create new InMemoryCluster with that name, group matching activities
   - `KEEP:<clusterId>` → no-op (already assigned)
6. Pass the merged clusters to `createProductionJournalEntries()`

**Step 4: Test by running a production sync**

This is an integration test — trigger a sync and verify:
- LLM is called (check logs for `[ClusterAssign]`)
- New clusters are created with LLM-assigned names
- Activities that should be in different stories are in different stories

**Step 5: Commit**

```bash
git add backend/src/services/career-stories/production-sync.service.ts
git commit -m "feat: wire LLM cluster assignment (Layer 2) into production sync pipeline"
```

---

### Task 7: Integration test — reproduce today's bug

**Files:**
- Create: `backend/src/services/career-stories/cluster-assign.integration.test.ts`

**Step 1: Write integration test for test matrix #24**

```typescript
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
      model: 'claude-3-5-haiku-latest',
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
```

**Step 2: Run test**

Run: `npx vitest run backend/src/services/career-stories/cluster-assign.integration.test.ts --reporter=verbose`
Expected: PASS

**Step 3: Commit**

```bash
git add backend/src/services/career-stories/cluster-assign.integration.test.ts
git commit -m "test: integration test reproducing today's clustering bug (#24)"
```

---

## Phase 2: Heuristic Layer Enhancements (reduces LLM load)

### Task 8: Create signal extractor

**Files:**
- Create: `backend/src/services/career-stories/signal-extractor.ts`
- Create: `backend/src/services/career-stories/signal-extractor.test.ts`

Extracts `collaborators`, `container` from `rawData` per tool type. No keyword extraction (GSE cut).

**Step 1: Write tests covering container extraction per tool and collaborator extraction**

Tests should cover:
- GitHub PR: extracts `headRef` as container (excluding `main`, `master`, `develop`, `release/*`, `hotfix/*`)
- GitHub Commit: no container (inferred later via containment)
- Jira: extracts epic key from `linkedIssues`
- Slack: extracts `threadTs ?? thread_ts` as container (not channelId)
- Collaborator extraction: returns all people fields minus self
- Collaborator extraction: normalizes emails to usernames
- Test matrix #12: `headRef: main` → no container
- Test matrix #13: `headRef: release/1.2` → no container
- Test matrix #14: `headRef: feature/oauth2-auth` → container set
- Test matrix #15: Slack same `threadTs` → container set
- Test matrix #16: Slack different `threadTs` → different containers
- Test matrix #20: Self excluded from collaborators

**Step 2: Implement signal extractor**

```typescript
export interface ExtractedSignals {
  collaborators: string[];
  container: string | null;
}

export function extractSignals(
  source: string,
  rawData: Record<string, unknown> | null,
  selfIdentifiers: string[],
): ExtractedSignals
```

Per-tool extraction functions. Branch blacklist: `const EXCLUDED_BRANCHES = new Set(['main', 'master', 'develop'])` + check `startsWith('release/')` and `startsWith('hotfix/')`.

**Step 3: Run tests, commit**

```bash
git commit -m "feat: signal extractor for collaborators + containers per tool"
```

---

### Task 9: Add multi-signal edges to clustering

**Files:**
- Modify: `backend/src/services/career-stories/clustering.service.ts`
- Modify: `backend/src/services/career-stories/clustering.service.test.ts`

**Step 1: Widen `clusterActivitiesInMemory` input type**

Add optional fields to the activity input:

```typescript
clusterActivitiesInMemory(
  activities: Array<{
    id: string;
    source: string;
    sourceId: string;
    title: string;
    description: string | null;
    timestamp: Date;
    crossToolRefs: string[];
    // NEW optional signals:
    collaborators?: string[];
    container?: string | null;
  }>,
  options?: { minClusterSize?: number }
)
```

**Step 2: Add container edges and collaborator edges to adjacency builder**

In `buildAdjacencyList` (or new `buildMultiSignalAdjacency`):
- After ref edges: if two activities share non-null `container` → edge
- After container edges: if two activities share ≥2 collaborators AND timestamps within 30 days → edge

> **Note**: Containment edges (commit↔PR via SHA membership) are intentionally deferred per GSE directive. Commits without branch info rely on other signals (refs, collaborators) or fall through to Layer 2. Add SHA-based containment as a follow-up when needed.

**Step 3: Add temporal split post-process**

New method `splitByTemporalGap(components, activityMap, maxGapDays=14)`:
- For each component, sort by timestamp
- Walk sequentially, split where gap > maxGapDays
- Return flattened sub-components

**Step 4: Write tests for new edge types**

Tests should cover test matrix items:
- #14: Feature branch match creates container edge
- #17: Collaborator overlap within 30d creates edge
- #18: Collaborator overlap beyond 30d → no edge
- #19: Only 1 shared collaborator → no edge
- #21: Temporal split with >14d gap
- #22: No gap → no split
- #23: Multiple gaps → multiple splits

**Step 5: Verify existing tests still pass**

Run: `npx vitest run backend/src/services/career-stories/clustering.service.test.ts --reporter=verbose`
Expected: All existing + new tests PASS

**Step 6: Commit**

```bash
git commit -m "feat: multi-signal edges (container, collaborator) + temporal split in clustering"
```

---

### Task 10: Wire signals into production-sync

**Files:**
- Modify: `backend/src/services/career-stories/production-sync.service.ts`

**Step 1: Extract signals before clustering**

After `persistProductionActivities()`, before `clusterProductionActivities()`:

1. For each persisted activity, call `extractSignals(activity.source, activity.rawData, selfIdentifiers)`
2. Pass the enriched activities (with `collaborators` and `container`) to `clusterProductionActivities()`

**Step 2: Mark high-confidence assignments to skip LLM**

After Layer 1 clustering, activities assigned via ref or container edges are high-confidence. Only send unclustered activities to Layer 2.

**Step 3: Add logging for signal instrumentation**

```typescript
console.log(`[ProductionSync] Signal stats: ${containerEdges} container edges, ${collaboratorEdges} collaborator edges, ${refEdges} ref edges`);
```

**Step 4: Run full sync, verify**

**Step 5: Commit**

```bash
git commit -m "feat: wire signal extraction + multi-signal clustering into production sync"
```

---

## Phase 3: Temporal Entry Demotion

### Task 11: Demote temporal entries to orphan-only

**Files:**
- Modify: `backend/src/services/career-stories/production-sync.service.ts`

**Step 1: Only create temporal entries for true orphans**

After Layer 1 + Layer 2, any activities still unassigned go to temporal grouping. Change `createTemporalEntries()` to only receive the orphan activity IDs.

**Step 2: Reduce window from 14d → 7d**

Change `JOURNAL_WINDOW_SIZE_DAYS` from 14 to 7.

**Step 3: Include tool types in temporal entry titles**

Instead of "Week of Jan 5 - Jan 19", use "Week of Jan 5 - Jan 19 (3 github, 2 slack)" to give users context.

**Step 4: Commit**

```bash
git commit -m "feat: demote temporal entries to orphan-only, 7d window, richer titles"
```

---

### Task 12: Full regression test

**Files:**
- All test files

**Step 1: Run full test suite**

Run: `npx vitest run --reporter=verbose`
Expected: All tests pass, no regressions.

**Step 2: Count new tests**

Tally: prompt builder (9) + validation (9) + service (6) + integration (1) + signal extractor (~12) + clustering new edges (~7) = ~44 new tests.

**Step 3: Final commit**

```bash
git commit -m "test: verify full regression suite passes after clustering redesign"
```

---

## Summary

| Phase | Tasks | Files | Tests | Time |
|-------|-------|-------|-------|------|
| Phase 1: LLM Layer | Tasks 1-7 | 7 new, 2 modified | ~25 | 1.5d |
| Phase 2: Heuristics | Tasks 8-10 | 2 new, 2 modified | ~19 | 2d |
| Phase 3: Demotion | Tasks 11-12 | 1 modified | 0 new | 0.5d |
| **Total** | **12 tasks** | **9 new, 5 modified** | **~44 new** | **4d** |

**After Phase 1 (day 2):** Both bugs are fixed. LLM correctly separates derivation commits from OAuth PR.

**After Phase 2 (day 4):** High-confidence assignments skip LLM. Signal instrumentation shows edge type distribution.

**After Phase 3 (day 4.5):** Temporal entries only for true orphans. Cleaner story list.
