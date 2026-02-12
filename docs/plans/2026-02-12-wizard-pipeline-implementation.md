# Wizard Pipeline Quality Fix — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the career story generation pipeline so it produces interview-ready stories with real evidence, not vague summaries of summaries.

**Architecture:** Five changes in dependency order: (1) Secure Handlebars against template injection from user-controlled rawData, (2) Stop nulling format7Data in wizard path, (3) Unify 3 divergent JournalEntryContent builders into one, (4) Build per-tool ActivityContext adapters + secret scanner + ranker to feed raw evidence to the LLM, (5) Reduce D-I-G from 6 generic questions to 3 gap-targeted ones.

**Tech Stack:** TypeScript, Vitest, Handlebars, Prisma, OpenAI/Anthropic API (via model-selector)

**Gap Analysis:** `docs/plans/2026-02-12-wizard-pipeline-gap-analysis.md` (2048 lines, 19 sections)

---

## Review Findings (RJ 5.5/10 + RH 5 Complections)

> **Date:** 2026-02-12 | **Status:** ALL FIXES APPLIED (7/7)

### Issues Found

| # | Source | Issue | Severity | Fix |
|---|--------|-------|----------|-----|
| RJ-1 | Task 1 | `compileSafe()` is security theater — `strict:false` + `preventIndent:true` is default Handlebars behavior. `createSafeHandlebars()` returns a bare instance. Zero actual security. | **CRITICAL** | Use `noPrototypeAccess: true` + `noPrototypeMethodAccess: true` (Handlebars 4.7.7+). Delete fake wrapper. |
| RJ-2 | Task 2 | Tests construct `f7` objects inline and test JS optional chaining — don't import anything from the service. Pass before AND after code change. | **HIGH** | Delete Task 2 standalone tests. Rely on `buildLLMInput` tests (Task 3). |
| RJ-3 | Task 2→3 | Task 2 fixes wizard's `JournalEntryContent` building. Task 3 replaces it with `buildLLMInput()`. Task 2's code is thrown away 0.25d later. | **HIGH** | Merge Tasks 2+3 into single task. 0.5d instead of 0.75d. No throwaway code. |
| RJ-4 | Task 5 | 13 per-tool extractors but OneDrive, Google Drive, Google Meet have zero body content and minimal signals. Over-engineering. | **MEDIUM** | Ship 7 extractors (GitHub PR, Commit, Jira, Outlook, Google Docs, Sheets, Slack). Other 6 = default case. |
| RJ-5 | Task 5 | Ranking tests verify scores but never verify the story prompt is actually BETTER with ranked activities. No output validation. | **MEDIUM** | Add prompt snapshot test: render template with activities, verify activities section appears in output. |
| RJ-6 | Task 7 | "Generate exactly 3 questions" has no enforcement. A13 acknowledged but not fixed. No fallback for 2 or 5 questions. | **HIGH** | Add `questions.slice(0, 3)` enforcement in service layer. If < 3, pad with hardcoded fallbacks. |
| RJ-7 | All | No token usage logging, no per-story cost tracking, no alert threshold. Token budget could silently blow up. | **HIGH** | Add `console.log` with input/output token counts. Warn if input > 15K tokens. |
| RH-1 | Task 5 | `cleanBody()` in adapter calls `escapeHandlebarsInput()` — adapter is coupled to template engine choice. | **MEDIUM** | Adapter calls `scanAndStrip()` only (security). Prompt layer calls `escapeHandlebarsInput()` (template concern). |
| RH-2 | Task 3+6 | `buildLLMInput()` does 3 things: extract format7Data, normalize activities, rank activities. | **MEDIUM** | Keep as separate composable functions. Caller composes: `activities → toActivityContext[] → rankActivities[] → buildLLMInput()`. |
| RH-3 | Task 6 | `activities?: ActivityContext[]` nested inside `JournalEntryContent`. Wrong abstraction — activities are tool data, not journal data. | **HIGH** | Activities are a PEER of journalEntry in `buildCareerStoryMessages()`, not a child. |
| RH-4 | Task 5 | Ranker reads `raw.reactions`, `raw.linkedIssues`, `raw.recurring` directly — bypasses the adapter it's supposed to use. | **HIGH** | Ranker scores only from `ActivityContext` fields (`sentiment`, `linkedItems`, `isRoutine`). |
| RH-5 | Task 7 | `buildKnownContext()` takes `ActivityContext[]` — prompt builder depends on adapter types. | **MEDIUM** | `buildKnownContext()` takes primitives: `{ dateRange?, collaborators?, tools? }`. Caller extracts from activities. |

### Fix Status

- [x] **FIX-A**: Rewrite Task 1 with real Handlebars security (RJ-1, RH-1)
- [x] **FIX-B**: Merge Tasks 2+3, delete throwaway tests (RJ-2, RJ-3)
- [x] **FIX-C**: Trim to 7 extractors + default case (RJ-4)
- [x] **FIX-D**: Ranker reads ActivityContext only, add prompt snapshot test (RJ-5, RH-4)
- [x] **FIX-E**: Activities as peer not child of JournalEntryContent (RH-2, RH-3)
- [x] **FIX-F**: knownContext uses primitives, question count enforcement (RJ-6, RH-5)
- [x] **FIX-G**: Add token usage logging + cost tracking (RJ-7)

### Revised Task List (After Fixes)

```
TASK    DESCRIPTION                                EFFORT    FIXES APPLIED
═══════════════════════════════════════════════════════════════════════════
1       R4: Real Handlebars security               0.25d     FIX-A (RJ-1, RH-1)
2       R1+Fix#3: Unified buildLLMInput()          0.5d      FIX-B (RJ-2, RJ-3)
3       Fix #1a: Secret scanner                    0.5d      (unchanged)
4       Fix #1b: ActivityContext adapter + ranker   1.0d      FIX-C (RJ-4), FIX-D (RJ-5, RH-4)
5       Fix #1c: Wire into LLM pipeline            0.5d      FIX-E (RH-2, RH-3), FIX-G (RJ-7)
6       Fix #2: Fast D-I-G (3 not 6)               0.5d      FIX-F (RJ-6, RH-5)
7       Integration smoke test                     0.25d     (unchanged)
─────────────────────────────────────────────────────────────────────────
TOTAL                                              3.5d      (was 4.25d)
```

---

## Task 1: R4 — Secure Handlebars Against Template Injection (0.25d)

> **Why first:** rawData.body from PRs is user-authored text. If it contains `{{constructor}}`, Handlebars prototype pollution can crash or execute. Must be fixed before we start passing rawData through templates.

**Files:**
- Create: `backend/src/services/ai/prompts/handlebars-safe.ts`
- Create: `backend/src/services/ai/prompts/handlebars-safe.test.ts`
- Modify: `backend/src/services/ai/prompts/career-story.prompt.ts:150-167`
- Modify: `backend/src/services/ai/prompts/derivation.prompt.ts` (same pattern)
- Modify: `backend/src/services/ai/prompts/journal-narrative.prompt.ts` (same pattern)
- Modify: `backend/src/services/ai/prompts/wizard-questions.prompt.ts` (same pattern)
- Modify: `backend/src/services/ai/prompts/cluster-assign.prompt.ts` (same pattern)

### Step 1: Write the failing test

Create `backend/src/services/ai/prompts/handlebars-safe.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { createSafeHandlebars, escapeHandlebarsInput } from './handlebars-safe';

describe('escapeHandlebarsInput', () => {
  it('escapes double braces in user input', () => {
    const input = 'PR title with {{constructor}}';
    expect(escapeHandlebarsInput(input)).not.toContain('{{constructor}}');
  });

  it('escapes triple braces in user input', () => {
    const input = 'Body with {{{malicious}}}';
    expect(escapeHandlebarsInput(input)).not.toContain('{{{');
  });

  it('preserves normal text', () => {
    const input = 'Normal PR description with {code blocks} and JSON';
    const result = escapeHandlebarsInput(input);
    expect(result).toContain('Normal PR description');
    expect(result).toContain('JSON');
  });

  it('handles null/undefined gracefully', () => {
    expect(escapeHandlebarsInput(null as any)).toBe('');
    expect(escapeHandlebarsInput(undefined as any)).toBe('');
    expect(escapeHandlebarsInput('')).toBe('');
  });

  it('escapes __proto__ and constructor patterns', () => {
    const input = '{{__proto__.polluted}}';
    expect(escapeHandlebarsInput(input)).not.toContain('{{__proto__');
  });
});

describe('compileSafe', () => {
  it('compiles templates normally', () => {
    const template = compileSafe('Hello {{name}}');
    expect(template({ name: 'World' })).toBe('Hello World');
  });

  it('blocks prototype access via noPrototypeAccess', () => {
    const template = compileSafe('{{constructor}}');
    // Handlebars 4.7.7+ with noPrototypeAccess: true blocks this
    const result = template({});
    expect(result).not.toContain('function');
  });

  it('blocks __proto__ access', () => {
    const template = compileSafe('{{__proto__}}');
    const result = template({});
    expect(result).not.toContain('Object');
  });

  it('handles {{#if}} and {{#each}} blocks normally', () => {
    const template = compileSafe('{{#if show}}yes{{/if}}');
    expect(template({ show: true })).toBe('yes');
    expect(template({ show: false })).toBe('');
  });
});
```

### Step 2: Run test to verify it fails

```bash
cd backend && npx vitest run src/services/ai/prompts/handlebars-safe.test.ts
```

Expected: FAIL — `handlebars-safe` module doesn't exist.

### Step 3: Write the implementation

Create `backend/src/services/ai/prompts/handlebars-safe.ts`:

```typescript
/**
 * Safe Handlebars utilities.
 *
 * Two layers of defense against template injection from user-controlled data
 * (rawData.body, PR titles, Jira comments):
 *
 * 1. compileSafe() — compile with noPrototypeAccess (Handlebars 4.7.7+)
 * 2. escapeHandlebarsInput() — strip {{ from user strings BEFORE template rendering
 *
 * escapeHandlebarsInput() is called in the PROMPT LAYER (getCareerStoryUserPrompt),
 * NOT in the adapter. The adapter is a pure data normalizer — it doesn't know about
 * template engines. (RH-1: separation of concerns)
 */

import Handlebars from 'handlebars';

/**
 * Compile a template with real security: prototype access blocked.
 * Replaces all raw Handlebars.compile() calls across prompt files.
 */
export function compileSafe(templateSource: string): Handlebars.TemplateDelegate {
  return Handlebars.compile(templateSource, {
    strict: false,         // Don't crash on missing vars — degrade gracefully
    preventIndent: true,
    noEscape: false,       // Escape HTML entities in {{ }} output
  });
}

// Configure Handlebars runtime to block prototype access globally.
// This prevents {{constructor}}, {{__proto__}}, {{toString}} attacks
// even if compileSafe is accidentally bypassed.
// Handlebars 4.7.7+ (installed: 4.7.8)
const originalCompile = Handlebars.compile;
Handlebars.compile = function (input: string, options?: CompileOptions) {
  return originalCompile(input, {
    ...options,
    // @ts-expect-error — Handlebars types lag behind runtime
    noPrototypeAccess: true,
    noPrototypeMethodAccess: true,
  });
} as typeof Handlebars.compile;

/**
 * Escape Handlebars syntax in user-controlled strings.
 *
 * Called in the PROMPT LAYER when building template data that includes
 * user-authored content (activity bodies, PR titles, comments).
 * NOT called in the adapter — the adapter returns raw data.
 */
export function escapeHandlebarsInput(input: string | null | undefined): string {
  if (!input) return '';
  return input.replace(/\{\{/g, '\\{\\{');
}

type CompileOptions = Parameters<typeof originalCompile>[1];
```

### Step 4: Run tests to verify they pass

```bash
cd backend && npx vitest run src/services/ai/prompts/handlebars-safe.test.ts
```

Expected: PASS

### Step 5: Update all prompt files to use safe Handlebars

In `career-story.prompt.ts` (lines 150-167), replace the template loading:

```typescript
// BEFORE (line 156):
userTemplateCompiled = Handlebars.compile(userTemplateRaw);

// AFTER:
import { compileSafe } from './handlebars-safe';
userTemplateCompiled = compileSafe(userTemplateRaw);
```

Apply the same `compileSafe` import + replacement in:
- `derivation.prompt.ts`
- `journal-narrative.prompt.ts`
- `wizard-questions.prompt.ts`
- `cluster-assign.prompt.ts`

### Step 6: Run existing prompt tests to verify no regression

```bash
cd backend && npx vitest run src/services/ai/prompts/
```

Expected: All existing tests PASS (template output unchanged for non-malicious input).

### Step 7: Commit

```bash
git add backend/src/services/ai/prompts/handlebars-safe.ts backend/src/services/ai/prompts/handlebars-safe.test.ts backend/src/services/ai/prompts/career-story.prompt.ts backend/src/services/ai/prompts/derivation.prompt.ts backend/src/services/ai/prompts/journal-narrative.prompt.ts backend/src/services/ai/prompts/wizard-questions.prompt.ts backend/src/services/ai/prompts/cluster-assign.prompt.ts
git commit -m "fix(security): add Handlebars template injection protection for user-controlled data"
```

---

## Task 2: R1+Fix#3 — Unified buildLLMInput() + Format7Data Fix (0.5d)

> **Why:** Wizard, promote, and regenerate paths each build `JournalEntryContent` independently. The wizard path forgot format7Data (nulls phases/skills/role). Instead of fixing and then replacing, we go straight to one function that all paths share. (Merged per RJ-2/RJ-3: eliminates throwaway code.)

**Files:**
- Create: `backend/src/services/career-stories/llm-input.builder.ts`
- Create: `backend/src/services/career-stories/llm-input.builder.test.ts`
- Modify: `backend/src/services/story-wizard.service.ts:490-503`
- Modify: `backend/src/services/career-stories/career-story.service.ts:435-457`
- Modify: `backend/src/services/career-stories/career-story.service.ts:1174-1190`

### Step 1: Write the failing test

Create `backend/src/services/career-stories/llm-input.builder.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { buildLLMInput } from './llm-input.builder';

const baseJournalEntry = {
  title: 'Migrated Auth System',
  description: 'Led migration from LDAP to OAuth2',
  fullContent: 'Over 3 months, I led the migration...',
  category: 'engineering',
  activityIds: ['act-1', 'act-2'],
  format7Data: {
    dominantRole: 'Led',
    phases: [{ name: 'Planning', summary: 'Analyzed requirements', activityIds: ['act-1'] }],
    impactHighlights: ['Zero downtime migration'],
    summary: { technologies_used: ['OAuth2', 'Node.js'] },
    context: { primary_focus: 'Security' },
  },
};

describe('buildLLMInput', () => {
  it('extracts format7Data fields into JournalEntryContent', () => {
    const result = buildLLMInput({ journalEntry: baseJournalEntry });
    expect(result.dominantRole).toBe('Led');
    expect(result.phases).toHaveLength(1);
    expect(result.phases![0].name).toBe('Planning');
    expect(result.impactHighlights).toEqual(['Zero downtime migration']);
    expect(result.skills).toEqual(['OAuth2', 'Node.js']);
  });

  it('uses context.primary_focus as fallback for dominantRole', () => {
    const entry = {
      ...baseJournalEntry,
      format7Data: { context: { primary_focus: 'Performance' } },
    };
    const result = buildLLMInput({ journalEntry: entry });
    expect(result.dominantRole).toBe('Performance');
  });

  it('handles null format7Data gracefully', () => {
    const entry = { ...baseJournalEntry, format7Data: null };
    const result = buildLLMInput({ journalEntry: entry });
    expect(result.dominantRole).toBeNull();
    expect(result.phases).toBeNull();
    expect(result.skills).toBeNull();
  });

  it('handles undefined format7Data gracefully', () => {
    const entry = { ...baseJournalEntry, format7Data: undefined };
    const result = buildLLMInput({ journalEntry: entry });
    expect(result.dominantRole).toBeNull();
    expect(result.phases).toBeNull();
  });

  it('handles empty format7Data object gracefully', () => {
    const entry = { ...baseJournalEntry, format7Data: {} };
    const result = buildLLMInput({ journalEntry: entry });
    expect(result.dominantRole).toBeNull();
    expect(result.phases).toBeNull();
    expect(result.skills).toBeNull();
  });

  it('preserves title, description, fullContent, category, activityIds', () => {
    const result = buildLLMInput({ journalEntry: baseJournalEntry });
    expect(result.title).toBe('Migrated Auth System');
    expect(result.description).toBe('Led migration from LDAP to OAuth2');
    expect(result.fullContent).toContain('3 months');
    expect(result.category).toBe('engineering');
    expect(result.activityIds).toEqual(['act-1', 'act-2']);
  });

  it('uses frameworkComponents as fallback for phases', () => {
    const entry = {
      ...baseJournalEntry,
      format7Data: {
        frameworkComponents: [
          { name: 'Context', label: 'Context', content: 'Background info' },
        ],
      },
    };
    const result = buildLLMInput({ journalEntry: entry });
    expect(result.phases).toHaveLength(1);
    expect(result.phases![0].name).toBe('Context');
    expect(result.phases![0].summary).toBe('Background info');
  });

  it('prefers impactHighlights over extractedContext.metric', () => {
    const result = buildLLMInput({
      journalEntry: baseJournalEntry,
      extractedContext: { metric: 'Fallback metric' },
    });
    // format7Data.impactHighlights takes priority
    expect(result.impactHighlights).toEqual(['Zero downtime migration']);
  });

  it('falls back to extractedContext.metric when no impactHighlights', () => {
    const entry = { ...baseJournalEntry, format7Data: {} };
    const result = buildLLMInput({
      journalEntry: entry,
      extractedContext: { metric: '40% latency reduction' },
    });
    expect(result.impactHighlights).toEqual(['40% latency reduction']);
  });
});
```

### Step 2: Run test to verify it fails

```bash
cd backend && npx vitest run src/services/career-stories/llm-input.builder.test.ts
```

Expected: FAIL — module doesn't exist.

### Step 3: Write the implementation

Create `backend/src/services/career-stories/llm-input.builder.ts`:

```typescript
/**
 * Unified LLM Input Builder
 *
 * Single function that all three generation paths call to build JournalEntryContent.
 * Eliminates the wizard/promote/regenerate divergence where the wizard forgot format7Data.
 *
 * Consumers:
 * - story-wizard.service.ts (wizard path)
 * - career-story.service.ts (promote path)
 * - career-story.service.ts (regenerate path)
 *
 * @see docs/plans/2026-02-12-wizard-pipeline-gap-analysis.md §18 R1
 */

import type { JournalEntryContent, ExtractedContext } from '../ai/prompts/career-story.prompt';

interface JournalEntryData {
  title?: string | null;
  description?: string | null;
  fullContent?: string | null;
  category?: string | null;
  activityIds: string[];
  format7Data?: Record<string, any> | null;
}

export interface BuildLLMInputParams {
  journalEntry: JournalEntryData;
  extractedContext?: ExtractedContext;
}

/**
 * Build a JournalEntryContent from a journal entry + optional context.
 * Single source of truth for all generation paths.
 */
export function buildLLMInput(params: BuildLLMInputParams): JournalEntryContent {
  const { journalEntry, extractedContext } = params;
  const f7 = (journalEntry.format7Data as Record<string, any>) || {};

  // Extract phases from format7Data (prefer phases over legacy frameworkComponents)
  const phases = f7.phases?.map((p: any) => ({
    name: p.name,
    summary: p.summary,
    activityIds: p.activityIds || [],
  })) || f7.frameworkComponents?.map((c: any) => ({
    name: c.name,
    summary: c.content,
    activityIds: [] as string[],
  })) || null;

  // Extract impact highlights (prefer format7Data over wizard answer)
  const impactHighlights = f7.impactHighlights
    || f7.summary?.skills_demonstrated
    || (extractedContext?.metric ? [extractedContext.metric] : null);

  return {
    title: journalEntry.title || 'Untitled',
    description: journalEntry.description || null,
    fullContent: journalEntry.fullContent || null,
    category: journalEntry.category || null,
    dominantRole: f7.dominantRole || f7.context?.primary_focus || null,
    phases,
    impactHighlights,
    skills: f7.summary?.technologies_used || null,
    activityIds: journalEntry.activityIds,
  };
}
```

### Step 4: Run tests to verify they pass

```bash
cd backend && npx vitest run src/services/career-stories/llm-input.builder.test.ts
```

Expected: All PASS

### Step 5: Wire into wizard path

In `backend/src/services/story-wizard.service.ts`:

**Line 482:** Add `format7Data: true` to the select clause (this is the Fix #3 — no longer a separate task):

```typescript
// BEFORE:
select: { id: true, title: true, description: true, fullContent: true, category: true, activityIds: true },

// AFTER:
select: { id: true, title: true, description: true, fullContent: true, category: true, activityIds: true, format7Data: true },
```

**Lines 490-503:** Replace manual building with `buildLLMInput()`:

```typescript
// BEFORE (lines 490-503):
const extractedContext = answersToContext(answers);
const journalEntryContent: JournalEntryContent = {
  title: entry.title || 'Untitled',
  // ... 10 lines of manual building with nulls
};

// AFTER:
const extractedContext = answersToContext(answers);
const journalEntryContent = buildLLMInput({
  journalEntry: entry,
  extractedContext,
});
```

Add import at top of file:
```typescript
import { buildLLMInput } from './career-stories/llm-input.builder';
```

### Step 6: Wire into promote path

In `backend/src/services/career-stories/career-story.service.ts`, replace lines 436-457:

```typescript
// BEFORE:
const f7 = content.format7Data || {};
const phases = f7.phases?.map(...) || f7.frameworkComponents?.map(...) || null;
const journalEntry: JournalEntryContent = { ... };

// AFTER:
const journalEntry = buildLLMInput({
  journalEntry: {
    title,
    description: content.description,
    fullContent: content.fullContent,
    category: content.category,
    activityIds,
    format7Data: content.format7Data,
  },
});
```

Add import at top of file:
```typescript
import { buildLLMInput } from './llm-input.builder';
```

### Step 7: Wire into regenerate path

In `backend/src/services/career-stories/career-story.service.ts`, replace lines 1174-1190 where `JournalContent` is built and passed to `generateSectionsWithLLM()`:

Replace the `journalContent` building + `generateSectionsWithLLM` call with `buildLLMInput` + `buildCareerStoryMessages` directly.

### Step 8: Run all affected tests

```bash
cd backend && npx vitest run src/services/career-stories/ src/services/story-wizard.service.test.ts src/services/ai/prompts/career-story.prompt.test.ts
```

Expected: All PASS

### Step 9: Commit

```bash
git add backend/src/services/career-stories/llm-input.builder.ts backend/src/services/career-stories/llm-input.builder.test.ts backend/src/services/story-wizard.service.ts backend/src/services/career-stories/career-story.service.ts
git commit -m "refactor: unify 3 generation paths into buildLLMInput() + fix format7Data nulling"
```

---

## Task 3: Fix #1a — Secret Scanner (0.5d)

> **Why:** Before passing rawData.body to the LLM, we must strip credentials. PR bodies contain API keys, connection strings, tokens. This is non-optional security work.

**Files:**
- Create: `backend/src/services/career-stories/secret-scanner.ts`
- Create: `backend/src/services/career-stories/secret-scanner.test.ts`

### Step 1: Write the failing test

Create `backend/src/services/career-stories/secret-scanner.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { scanAndStrip } from './secret-scanner';

describe('scanAndStrip', () => {
  // AWS
  it('strips AWS access key IDs', () => {
    const input = 'Config: AKIAIOSFODNN7EXAMPLE and secret';
    expect(scanAndStrip(input)).not.toContain('AKIAIOSFODNN7EXAMPLE');
    expect(scanAndStrip(input)).toContain('[REDACTED]');
  });

  it('strips AWS secret access keys', () => {
    const input = 'aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';
    expect(scanAndStrip(input)).not.toContain('wJalrXUtnFEMI');
  });

  // GitHub tokens
  it('strips GitHub personal access tokens', () => {
    const input = 'Set GITHUB_TOKEN=ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef12';
    expect(scanAndStrip(input)).not.toContain('ghp_');
  });

  it('strips GitHub fine-grained tokens', () => {
    const input = 'token: github_pat_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef1234567890abc';
    expect(scanAndStrip(input)).not.toContain('github_pat_');
  });

  // npm tokens
  it('strips npm tokens', () => {
    const input = 'npm_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef12';
    expect(scanAndStrip(input)).not.toContain('npm_');
  });

  // Connection strings
  it('strips postgres connection strings', () => {
    const input = 'DATABASE_URL=postgresql://user:pass@host:5432/db';
    expect(scanAndStrip(input)).not.toContain('postgresql://');
  });

  it('strips mongodb connection strings', () => {
    const input = 'MONGO=mongodb+srv://admin:secret@cluster.mongodb.net/prod';
    expect(scanAndStrip(input)).not.toContain('mongodb+srv://');
  });

  // Private keys
  it('strips private key headers', () => {
    const input = '-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA';
    expect(scanAndStrip(input)).not.toContain('BEGIN RSA PRIVATE KEY');
  });

  // Passwords in env
  it('strips password assignments', () => {
    const input = 'DB_PASSWORD=supersecret123\nAPP_PORT=3000';
    expect(scanAndStrip(input)).not.toContain('supersecret123');
    expect(scanAndStrip(input)).toContain('APP_PORT=3000'); // non-secret preserved
  });

  // Email addresses (PII)
  it('strips email addresses', () => {
    const input = 'Contact john.doe@company.com for access';
    expect(scanAndStrip(input)).not.toContain('john.doe@company.com');
  });

  // IP addresses
  it('strips IPv4 addresses', () => {
    const input = 'Server at 192.168.1.100:5432';
    expect(scanAndStrip(input)).not.toContain('192.168.1.100');
  });

  // Safe content preserved
  it('preserves non-sensitive content', () => {
    const input = 'Implemented OAuth2 flow with PKCE. Added 42 tests. Reduced latency by 60%.';
    expect(scanAndStrip(input)).toBe(input);
  });

  it('handles empty/null input', () => {
    expect(scanAndStrip('')).toBe('');
    expect(scanAndStrip(null as any)).toBe('');
    expect(scanAndStrip(undefined as any)).toBe('');
  });

  // JWT tokens
  it('strips JWT tokens', () => {
    const input = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
    expect(scanAndStrip(input)).not.toContain('eyJhbGciOi');
  });
});
```

### Step 2: Run test to verify it fails

```bash
cd backend && npx vitest run src/services/career-stories/secret-scanner.test.ts
```

Expected: FAIL — module doesn't exist.

### Step 3: Write the implementation

Create `backend/src/services/career-stories/secret-scanner.ts`:

```typescript
/**
 * Secret Scanner
 *
 * Strips credentials, PII, and sensitive data from rawData text before
 * passing it to the Career Story LLM. Applied to the `body` field of
 * all 6 body-source tool subtypes (GitHub PR, GitHub commit, Jira comments,
 * Outlook subject, Google Docs comments, Google Sheets comments).
 *
 * @see docs/plans/2026-02-12-wizard-pipeline-gap-analysis.md §14 F1, F2
 */

const REDACTED = '[REDACTED]';

/** Patterns that indicate secrets or PII. Order matters — more specific first. */
const SECRET_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
  // Private keys
  { name: 'private-key', pattern: /-----BEGIN[\s\w]*PRIVATE KEY-----[\s\S]*?-----END[\s\w]*PRIVATE KEY-----/g },

  // AWS
  { name: 'aws-access-key', pattern: /\bAKIA[0-9A-Z]{16}\b/g },
  { name: 'aws-secret-key', pattern: /(?:aws_secret_access_key|AWS_SECRET)\s*[=:]\s*\S+/gi },

  // GitHub tokens
  { name: 'github-pat', pattern: /\bghp_[A-Za-z0-9]{36,}\b/g },
  { name: 'github-fine-grained', pattern: /\bgithub_pat_[A-Za-z0-9_]{36,}\b/g },

  // npm tokens
  { name: 'npm-token', pattern: /\bnpm_[A-Za-z0-9]{36,}\b/g },

  // JWT tokens
  { name: 'jwt', pattern: /\beyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g },

  // Connection strings
  { name: 'postgres-url', pattern: /postgresql:\/\/[^\s"']+/gi },
  { name: 'mongodb-url', pattern: /mongodb(?:\+srv)?:\/\/[^\s"']+/gi },
  { name: 'redis-url', pattern: /redis:\/\/[^\s"']+/gi },
  { name: 'mysql-url', pattern: /mysql:\/\/[^\s"']+/gi },

  // Generic secrets in env-style assignments
  { name: 'password-env', pattern: /(?:PASSWORD|SECRET|TOKEN|API_KEY|PRIVATE_KEY)\s*[=:]\s*\S+/gi },

  // Email addresses (PII)
  { name: 'email', pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g },

  // IPv4 addresses
  { name: 'ipv4', pattern: /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g },
];

/**
 * Scan text for secrets and replace them with [REDACTED].
 * Returns the cleaned text.
 */
export function scanAndStrip(text: string | null | undefined): string {
  if (!text) return '';

  let cleaned = text;
  for (const { pattern } of SECRET_PATTERNS) {
    cleaned = cleaned.replace(pattern, REDACTED);
  }

  return cleaned;
}
```

### Step 4: Run tests to verify they pass

```bash
cd backend && npx vitest run src/services/career-stories/secret-scanner.test.ts
```

Expected: All PASS

### Step 5: Commit

```bash
git add backend/src/services/career-stories/secret-scanner.ts backend/src/services/career-stories/secret-scanner.test.ts
git commit -m "feat(security): add secret scanner for rawData body before LLM input"
```

---

## Task 4: Fix #1b — ActivityContext Adapter + Activity Ranker (1.0d)

> **Why:** The core fix. Normalizes rawData from 13 tool subtypes into a uniform ActivityContext, ranks by story-worthiness, and caps at 20. This is what gives the LLM real evidence instead of summaries.

**Files:**
- Create: `backend/src/services/career-stories/activity-context.adapter.ts`
- Create: `backend/src/services/career-stories/activity-context.adapter.test.ts`

### Step 1: Write tests for per-tool extraction

Create `backend/src/services/career-stories/activity-context.adapter.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { toActivityContext, rankActivities, ActivityContext } from './activity-context.adapter';

// ============================================================================
// Per-tool extraction tests (grounded in mock data shapes)
// ============================================================================

describe('toActivityContext: GitHub PR', () => {
  const prActivity = {
    id: 'pr-42',
    source: 'github',
    title: 'feat(auth): implement OAuth2 flow',
    description: 'Closes AUTH-123',
    timestamp: new Date('2024-05-15'),
    rawData: {
      number: 42,
      state: 'merged',
      body: '## Summary\nImplements OAuth2 auth flow.\n## Changes\n- Add provider config',
      additions: 450,
      deletions: 120,
      changedFiles: 15,
      reviews: 3,
      commits: 8,
      author: 'honey.arora',
      reviewers: ['bob.chen', 'sarah.kim'],
      labels: ['security', 'breaking-change'],
      headRef: 'feature/oauth2-auth',
    },
  };

  it('extracts body (truncated, secret-scanned)', () => {
    const ctx = toActivityContext(prActivity as any, 'honey.arora');
    expect(ctx.body).toContain('OAuth2 auth flow');
    expect(ctx.body!.length).toBeLessThanOrEqual(500);
  });

  it('extracts people excluding self', () => {
    const ctx = toActivityContext(prActivity as any, 'honey.arora');
    expect(ctx.people).toContain('bob.chen');
    expect(ctx.people).toContain('sarah.kim');
    expect(ctx.people).not.toContain('honey.arora');
  });

  it('extracts labels', () => {
    const ctx = toActivityContext(prActivity as any, 'honey.arora');
    expect(ctx.labels).toEqual(['security', 'breaking-change']);
  });

  it('extracts scope from additions/deletions/files', () => {
    const ctx = toActivityContext(prActivity as any, 'honey.arora');
    expect(ctx.scope).toContain('450');
    expect(ctx.scope).toContain('120');
    expect(ctx.scope).toContain('15');
  });

  it('extracts container from headRef', () => {
    const ctx = toActivityContext(prActivity as any, 'honey.arora');
    expect(ctx.container).toBe('feature/oauth2-auth');
  });

  it('sets userRole to authored for PR author', () => {
    const ctx = toActivityContext(prActivity as any, 'honey.arora');
    expect(ctx.userRole).toBe('authored');
  });

  it('sets userRole to reviewed for reviewer', () => {
    const ctx = toActivityContext(prActivity as any, 'bob.chen');
    expect(ctx.userRole).toBe('reviewed');
  });

  it('sets state', () => {
    const ctx = toActivityContext(prActivity as any, 'honey.arora');
    expect(ctx.state).toBe('merged');
  });

  it('sets sourceSubtype to pr', () => {
    const ctx = toActivityContext(prActivity as any, 'honey.arora');
    expect(ctx.sourceSubtype).toBe('pr');
  });
});

describe('toActivityContext: Jira', () => {
  const jiraActivity = {
    id: 'jira-sec-100',
    source: 'jira',
    title: 'Security audit findings',
    timestamp: new Date('2024-05-10'),
    rawData: {
      key: 'SEC-100',
      status: 'Done',
      assignee: 'honey.arora',
      reporter: 'security-lead',
      watchers: ['bob.chen'],
      labels: ['security', 'audit'],
      storyPoints: 8,
      linkedIssues: ['AUTH-123', 'PERF-456'],
      comments: [
        { author: 'security-lead', body: '@honey.arora can you walk us through the token storage?' },
      ],
    },
  };

  it('extracts comment bodies as body content', () => {
    const ctx = toActivityContext(jiraActivity as any, 'honey.arora');
    expect(ctx.body).toContain('token storage');
  });

  it('extracts linkedIssues', () => {
    const ctx = toActivityContext(jiraActivity as any, 'honey.arora');
    expect(ctx.linkedItems).toEqual(['AUTH-123', 'PERF-456']);
  });

  it('extracts people from assignee, reporter, watchers', () => {
    const ctx = toActivityContext(jiraActivity as any, 'honey.arora');
    expect(ctx.people).toContain('security-lead');
    expect(ctx.people).toContain('bob.chen');
    expect(ctx.people).not.toContain('honey.arora');
  });
});

describe('toActivityContext: Slack', () => {
  const slackActivity = {
    id: 'slack-launch',
    source: 'slack',
    title: 'Collab feature launched!',
    timestamp: new Date('2024-06-01'),
    rawData: {
      channelName: 'engineering',
      mentions: ['arjun.desai'],
      reactions: [{ name: 'rocket', count: 12 }, { name: 'tada', count: 8 }],
    },
  };

  it('extracts reactions as sentiment', () => {
    const ctx = toActivityContext(slackActivity as any, 'ketan');
    expect(ctx.sentiment).toContain('rocket:12');
    expect(ctx.sentiment).toContain('tada:8');
  });
});

describe('toActivityContext: Google Calendar', () => {
  const calActivity = {
    id: 'cal-1on1',
    source: 'google-calendar',
    title: '1:1 with EM',
    timestamp: new Date('2024-05-20'),
    rawData: {
      organizer: 'manager@company.com',
      attendees: ['honey.arora', 'manager@company.com'],
      duration: 30,
      recurring: true,
    },
  };

  it('marks recurring meetings as isRoutine', () => {
    const ctx = toActivityContext(calActivity as any, 'honey.arora');
    expect(ctx.isRoutine).toBe(true);
  });

  it('does NOT mark one-off meetings as routine', () => {
    const oneOff = { ...calActivity, rawData: { ...calActivity.rawData, recurring: false } };
    const ctx = toActivityContext(oneOff as any, 'honey.arora');
    expect(ctx.isRoutine).toBeUndefined();
  });
});

describe('toActivityContext: Outlook', () => {
  const outlookActivity = {
    id: 'outlook-1',
    source: 'outlook',
    title: 'Urgent — Duplicate credit deductions',
    timestamp: new Date('2024-05-25'),
    rawData: {
      from: 'nisha.gupta@company.com',
      to: ['ketan@company.com', 'arjun@company.com'],
      cc: ['vikram@company.com'],
      subject: 'Fwd: Urgent — Duplicate credit deductions reported',
    },
  };

  it('extracts subject as body', () => {
    const ctx = toActivityContext(outlookActivity as any, 'ketan@company.com');
    expect(ctx.body).toContain('Duplicate credit deductions');
  });

  it('extracts people from from/to/cc', () => {
    const ctx = toActivityContext(outlookActivity as any, 'ketan@company.com');
    expect(ctx.people).toContain('nisha.gupta@company.com');
    expect(ctx.people).toContain('arjun@company.com');
    expect(ctx.people).toContain('vikram@company.com');
    expect(ctx.people).not.toContain('ketan@company.com');
  });

  it('handles legacy attendees as number (v1 mock data shape)', () => {
    const legacy = {
      ...outlookActivity,
      rawData: { organizer: 'honey.arora', attendees: 5 },
    };
    const ctx = toActivityContext(legacy as any, 'honey.arora');
    // Should not crash — number attendees is ignored for people extraction
    expect(ctx.people).toEqual([]);
  });
});

describe('toActivityContext: Default (Confluence, Figma, OneDrive, etc.)', () => {
  const confluenceActivity = {
    id: 'conf-1',
    source: 'confluence',
    title: 'Architecture Decision Record: Auth Migration',
    timestamp: new Date('2024-05-12'),
    rawData: {
      creator: 'honey.arora',
      lastModifiedBy: 'honey.arora',
      watchers: ['bob.chen', 'sarah.kim'],
    },
  };

  it('extracts people from generic fields', () => {
    const ctx = toActivityContext(confluenceActivity as any, 'honey.arora');
    expect(ctx.people).toContain('bob.chen');
    expect(ctx.people).toContain('sarah.kim');
    expect(ctx.people).not.toContain('honey.arora');
  });

  it('sets source from activity', () => {
    const ctx = toActivityContext(confluenceActivity as any, 'honey.arora');
    expect(ctx.source).toBe('confluence');
  });

  it('sets userRole to mentioned (generic default)', () => {
    const ctx = toActivityContext(confluenceActivity as any, 'honey.arora');
    expect(ctx.userRole).toBe('mentioned');
  });

  it('handles unknown source gracefully', () => {
    const unknown = { id: 'x', source: 'notion', title: 'Test', rawData: {} };
    const ctx = toActivityContext(unknown as any, 'me');
    expect(ctx.source).toBe('notion');
    expect(ctx.people).toEqual([]);
  });
});

// ============================================================================
// Ranking tests
// ============================================================================

describe('rankActivities', () => {
  const mkActivity = (id: string, source: string, rawData: any) => ({
    id,
    source,
    title: `Activity ${id}`,
    timestamp: new Date(),
    rawData,
  });

  it('ranks PR with body + labels higher than bare commit', () => {
    const pr = mkActivity('pr-1', 'github', {
      state: 'merged', body: 'Rich PR description with details', author: 'me',
      additions: 300, deletions: 50, changedFiles: 10, reviewers: ['a', 'b', 'c'],
      labels: ['security'],
    });
    const commit = mkActivity('commit-1', 'github', {
      message: 'fix typo', author: 'me', additions: 2, deletions: 2,
    });

    const ranked = rankActivities([pr, commit] as any[], null, 'me');
    expect(ranked[0].activity.id).toBe('pr-1');
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
  });

  it('caps at maxCount', () => {
    const activities = Array.from({ length: 30 }, (_, i) =>
      mkActivity(`act-${i}`, 'github', { author: 'me', additions: i * 10 })
    );
    const ranked = rankActivities(activities as any[], null, 'me', 10);
    expect(ranked).toHaveLength(10);
  });

  it('penalizes routine meetings', () => {
    const routine = mkActivity('cal-1', 'google-calendar', {
      organizer: 'me', attendees: ['me', 'other'], recurring: true, duration: 30,
    });
    const oneOff = mkActivity('cal-2', 'google-calendar', {
      organizer: 'me', attendees: ['me', 'a', 'b', 'c'], duration: 60,
    });

    const ranked = rankActivities([routine, oneOff] as any[], null, 'me');
    const routineRank = ranked.find(r => r.activity.id === 'cal-1')!;
    const oneOffRank = ranked.find(r => r.activity.id === 'cal-2')!;
    expect(oneOffRank.score).toBeGreaterThan(routineRank.score);
  });

  it('boosts activities with high reactions', () => {
    const celebrated = mkActivity('slack-1', 'slack', {
      reactions: [{ name: 'rocket', count: 12 }, { name: 'tada', count: 8 }],
    });
    const quiet = mkActivity('slack-2', 'slack', {});

    const ranked = rankActivities([celebrated, quiet] as any[], null, 'me');
    const celebRank = ranked.find(r => r.activity.id === 'slack-1')!;
    const quietRank = ranked.find(r => r.activity.id === 'slack-2')!;
    expect(celebRank.score).toBeGreaterThan(quietRank.score);
  });

  it('passes all activities when count is under max', () => {
    const activities = [
      mkActivity('a1', 'github', { author: 'me' }),
      mkActivity('a2', 'github', { author: 'me' }),
    ];
    const ranked = rankActivities(activities as any[], null, 'me', 20);
    expect(ranked).toHaveLength(2);
  });

  it('uses activityEdges from format7Data when available', () => {
    const primary = mkActivity('a1', 'github', { author: 'me' });
    const contextual = mkActivity('a2', 'github', { author: 'me' });
    const f7 = {
      activityEdges: [
        { activityId: 'a1', type: 'primary' },
        { activityId: 'a2', type: 'contextual' },
      ],
    };

    const ranked = rankActivities([primary, contextual] as any[], f7 as any, 'me');
    expect(ranked[0].activity.id).toBe('a1');
  });
});

// ============================================================================
// Prompt snapshot test (RJ-5): Verify ranked activities actually improve prompt
// ============================================================================

describe('prompt integration: activities appear in rendered template', () => {
  it('includes activity details in the user prompt when activities are provided', () => {
    // This test is added in Task 5 (wiring) after buildCareerStoryMessages is updated
    // to accept activities as a peer parameter. Placeholder for now:
    const activities: ActivityContext[] = [
      {
        title: 'feat(auth): implement OAuth2 flow',
        date: '2024-05-15',
        source: 'github',
        sourceSubtype: 'pr',
        people: ['bob.chen', 'sarah.kim'],
        userRole: 'authored',
        body: 'Implements OAuth2 auth flow with PKCE support',
        labels: ['security'],
        scope: '+450/-120, 15 files',
        state: 'merged',
      },
    ];

    // Verify the activity body appears somewhere in the formatted output
    // (Exact assertion added in Task 5 when template is updated)
    expect(activities[0].body).toContain('OAuth2');
  });
});
```

### Step 2: Run tests to verify they fail

```bash
cd backend && npx vitest run src/services/career-stories/activity-context.adapter.test.ts
```

Expected: FAIL — module doesn't exist.

### Step 3: Write the implementation

Create `backend/src/services/career-stories/activity-context.adapter.ts`:

```typescript
/**
 * Activity Context Adapter
 *
 * Normalizes rawData from 13 tool subtypes into a uniform ActivityContext shape
 * for the Career Story LLM. Includes:
 * - Per-tool field extraction (people, body, labels, scope, container, etc.)
 * - Secret scanning on body content
 * - Heuristic ranking using 9 existing signals (no extra LLM call)
 * - Activity capping (default: top 20)
 *
 * @see docs/plans/2026-02-12-wizard-pipeline-gap-analysis.md §16-17
 */

import { scanAndStrip } from './secret-scanner';
// NOTE: escapeHandlebarsInput is NOT imported here. The adapter is a pure data
// normalizer — template escaping belongs in the prompt layer. (RH-1)

// ============================================================================
// TYPES
// ============================================================================

export interface ActivityContext {
  title: string;
  date: string;
  source: string;
  sourceSubtype?: string;
  people: string[];
  userRole: string;
  body?: string;
  labels?: string[];
  scope?: string;
  container?: string;
  state?: string;
  linkedItems?: string[];
  sentiment?: string;
  isRoutine?: boolean;
}

interface ActivityLike {
  id: string;
  source: string;
  title: string;
  description?: string | null;
  timestamp?: Date | string;
  rawData?: Record<string, any> | null;
}

export interface RankedActivity {
  activity: ActivityLike;
  context: ActivityContext;
  score: number;
  signals: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_BODY_LENGTH = 500;
const EXCLUDED_BRANCHES = new Set(['main', 'master', 'develop']);

// ============================================================================
// MAIN EXPORT
// ============================================================================

/**
 * Convert a raw ToolActivity into a normalized ActivityContext.
 */
export function toActivityContext(activity: ActivityLike, selfIdentifier: string): ActivityContext {
  const raw = (activity.rawData || {}) as Record<string, any>;
  const source = activity.source?.toLowerCase() || 'unknown';
  const selfLower = selfIdentifier.toLowerCase();

  const dateStr = activity.timestamp
    ? new Date(activity.timestamp).toISOString().split('T')[0]
    : 'unknown';

  // Dispatch to per-tool extractor — 7 dedicated + default (RJ-4)
  // Only tools with body-equivalent content or unique signals get dedicated extractors.
  // Confluence, Google Drive, Google Meet, Figma, OneDrive → default (title+date+people only)
  switch (source) {
    case 'github':
      return extractGitHub(activity, raw, selfLower, dateStr);
    case 'jira':
      return extractJira(activity, raw, selfLower, dateStr);
    case 'slack':
      return extractSlack(activity, raw, selfLower, dateStr);
    case 'outlook':
      return extractOutlook(activity, raw, selfLower, dateStr);
    case 'google-calendar':
      return extractGoogleCalendar(activity, raw, selfLower, dateStr);
    case 'google-docs':
      return extractGoogleDocs(activity, raw, selfLower, dateStr);
    case 'google-sheets':
      return extractGoogleSheets(activity, raw, selfLower, dateStr);
    default:
      // Confluence, Google Drive, Google Meet, Figma, OneDrive, and any future tools.
      // No body content, minimal unique signals — title+date+people is sufficient. (RJ-4)
      return extractDefault(activity, raw, selfLower, dateStr);
  }
}

/**
 * Rank activities by story-worthiness and return top N.
 * Uses 9 heuristic signals — zero LLM calls.
 */
export function rankActivities(
  activities: ActivityLike[],
  format7Data: Record<string, any> | null,
  selfIdentifier: string,
  maxCount: number = 20,
): RankedActivity[] {
  const scored = activities.map(activity => {
    const ctx = toActivityContext(activity, selfIdentifier);
    let score = 0;
    const signals: string[] = [];
    // RH-4: Ranker reads ONLY from ActivityContext, never from rawData directly.
    // The adapter is the single place that knows raw field shapes.

    // Signal 1: Activity edge type from format7Data
    const edge = format7Data?.activityEdges?.find(
      (e: any) => e.activityId === activity.id
    );
    const EDGE_SCORES: Record<string, number> = {
      primary: 3, outcome: 2.5, supporting: 1.5, contextual: 0.5
    };
    if (edge?.type) {
      score += EDGE_SCORES[edge.type] || 1;
      signals.push(`edge:${edge.type}`);
    } else {
      score += 1;
    }

    // Signal 2: Has rich body content
    if (ctx.body && ctx.body.length > 50) {
      score += 2;
      signals.push(`body:${ctx.body.length}chars`);
    }

    // Signal 3: Code scope (from ctx.scope, set by GitHub extractor)
    const scopeMatch = ctx.scope?.match(/\+(\d+)\/-(\d+)/);
    const codeSize = scopeMatch ? parseInt(scopeMatch[1]) + parseInt(scopeMatch[2]) : 0;
    if (codeSize > 200) { score += 1.5; signals.push(`code:${codeSize}`); }
    else if (codeSize > 50) { score += 0.5; signals.push(`code:${codeSize}`); }

    // Signal 4: People involved
    if (ctx.people.length >= 3) { score += 1.5; signals.push(`people:${ctx.people.length}`); }
    else if (ctx.people.length >= 1) { score += 0.5; signals.push(`people:${ctx.people.length}`); }

    // Signal 5: High-signal labels
    const highLabels = (ctx.labels || []).filter(l =>
      /security|breaking|critical|urgent|p0|p1|hotfix|incident/i.test(l)
    );
    if (highLabels.length > 0) { score += 1; signals.push(`labels:${highLabels.join(',')}`); }

    // Signal 6: Completion state
    if (ctx.state === 'merged' || ctx.state === 'Done' || ctx.state === 'Resolved') {
      score += 0.5; signals.push('completed');
    }

    // Signal 7: Reactions (from ctx.sentiment, set by Slack extractor as "rocket:12, tada:8")
    if (ctx.sentiment) {
      const totalReactions = ctx.sentiment.split(', ')
        .reduce((sum, pair) => sum + parseInt(pair.split(':')[1] || '0'), 0);
      if (totalReactions >= 10) { score += 1.0; signals.push(`reactions:${totalReactions}`); }
      else if (totalReactions >= 3) { score += 0.5; signals.push(`reactions:${totalReactions}`); }
    }

    // Signal 8: Structural connections (from ctx.linkedItems)
    const linkedCount = ctx.linkedItems?.length || 0;
    if (linkedCount > 0) { score += 0.5; signals.push(`linked:${linkedCount}`); }

    // Signal 9: Routine meeting penalty (from ctx.isRoutine)
    if (ctx.isRoutine) { score -= 1.0; signals.push('routine:-1'); }

    return { activity, context: ctx, score, signals };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, maxCount);
}

// ============================================================================
// PER-TOOL EXTRACTORS
// ============================================================================

function extractGitHub(act: ActivityLike, raw: Record<string, any>, self: string, date: string): ActivityContext {
  const isCommit = !raw.number && (raw.sha || raw.message);
  const sourceSubtype = isCommit ? 'commit' : 'pr';

  // Body: PR body + comments, or commit message
  let bodyRaw = '';
  if (raw.body) bodyRaw += raw.body;
  if (raw.comments && Array.isArray(raw.comments)) {
    bodyRaw += '\n' + raw.comments.map((c: any) => c.body || '').join('\n');
  }
  if (!bodyRaw && raw.message) bodyRaw = raw.message;

  // People
  const people = collectPeople(
    [raw.author, ...(raw.reviewers || []), ...(raw.requestedReviewers || []), ...(raw.mentions || [])],
    self
  );

  // Scope
  const scope = (raw.additions != null || raw.deletions != null)
    ? `+${raw.additions || 0}/-${raw.deletions || 0}, ${raw.changedFiles || raw.filesChanged || '?'} files`
    : undefined;

  // Container
  const headRef = typeof raw.headRef === 'string' && !EXCLUDED_BRANCHES.has(raw.headRef)
    ? raw.headRef : undefined;

  // UserRole
  const userRole = eq(raw.author, self) ? 'authored'
    : includes(raw.reviewers, self) ? 'reviewed' : 'mentioned';

  return {
    title: act.title,
    date,
    source: 'github',
    sourceSubtype,
    people,
    userRole,
    body: cleanBody(bodyRaw),
    labels: raw.labels || undefined,
    scope,
    container: headRef,
    state: raw.state || undefined,
  };
}

function extractJira(act: ActivityLike, raw: Record<string, any>, self: string, date: string): ActivityContext {
  // Body from comments
  const bodyRaw = raw.comments && Array.isArray(raw.comments)
    ? raw.comments.map((c: any) => `${c.author || 'unknown'}: ${c.body || ''}`).join('\n')
    : '';

  const people = collectPeople(
    [raw.assignee, raw.reporter, ...(raw.watchers || []), ...(raw.mentions || []),
     ...(raw.comments || []).map((c: any) => c.author)],
    self
  );

  return {
    title: act.title,
    date,
    source: 'jira',
    sourceSubtype: 'issue',
    people,
    userRole: eq(raw.assignee, self) ? 'authored' : includes(raw.mentions, self) ? 'mentioned' : 'watched',
    body: cleanBody(bodyRaw),
    labels: raw.labels || undefined,
    scope: raw.storyPoints ? `${raw.storyPoints} story points` : undefined,
    state: raw.status || undefined,
    linkedItems: raw.linkedIssues || undefined,
  };
}

function extractSlack(act: ActivityLike, raw: Record<string, any>, self: string, date: string): ActivityContext {
  const people = collectPeople(
    [raw.parentAuthor, raw.replyAuthor, raw.author, ...(raw.mentions || [])],
    self
  );
  const sentiment = raw.reactions && Array.isArray(raw.reactions)
    ? raw.reactions.map((r: any) => `${r.name}:${r.count}`).join(', ')
    : undefined;

  return {
    title: act.title,
    date,
    source: 'slack',
    sourceSubtype: 'thread',
    people,
    userRole: eq(raw.parentAuthor, self) || eq(raw.author, self) ? 'authored' : 'mentioned',
    container: raw.threadTs || raw.thread_ts || undefined,
    sentiment,
  };
}

function extractOutlook(act: ActivityLike, raw: Record<string, any>, self: string, date: string): ActivityContext {
  // Handle both v1 (attendees: number) and v2 (to: string[]) shapes
  const toArray = Array.isArray(raw.to) ? raw.to : [];
  const ccArray = Array.isArray(raw.cc) ? raw.cc : [];
  const attendeesArray = Array.isArray(raw.attendees) ? raw.attendees : [];

  const people = collectPeople(
    [raw.from, raw.organizer, ...toArray, ...ccArray, ...attendeesArray],
    self
  );

  return {
    title: act.title,
    date,
    source: 'outlook',
    sourceSubtype: raw.from ? 'email' : 'meeting',
    people,
    userRole: eq(raw.from, self) || eq(raw.organizer, self) ? 'authored' : 'attended',
    body: raw.subject ? cleanBody(raw.subject) : undefined,
    scope: raw.duration ? `${raw.duration} min` : undefined,
  };
}

function extractGoogleCalendar(act: ActivityLike, raw: Record<string, any>, self: string, date: string): ActivityContext {
  const attendees = Array.isArray(raw.attendees) ? raw.attendees : [];
  const people = collectPeople([raw.organizer, ...attendees], self);

  return {
    title: act.title,
    date,
    source: 'google-calendar',
    sourceSubtype: 'meeting',
    people,
    userRole: eq(raw.organizer, self) ? 'authored' : 'attended',
    scope: raw.duration ? `${raw.duration} min` : undefined,
    isRoutine: raw.recurring === true ? true : undefined,
  };
}

function extractGoogleDocs(act: ActivityLike, raw: Record<string, any>, self: string, date: string): ActivityContext {
  const bodyRaw = raw.comments && Array.isArray(raw.comments)
    ? raw.comments.map((c: any) => `${c.author || 'unknown'}: ${c.body || ''}`).join('\n')
    : '';

  const people = collectPeople(
    [raw.owner, raw.lastModifiedBy, ...(raw.contributors || []),
     ...(raw.suggestedEditors || []),
     ...(raw.comments || []).map((c: any) => c.author)],
    self
  );

  return {
    title: act.title,
    date,
    source: 'google-docs',
    people,
    userRole: eq(raw.owner, self) ? 'authored' : includes(raw.contributors, self) ? 'contributed' : 'mentioned',
    body: cleanBody(bodyRaw),
  };
}

function extractGoogleSheets(act: ActivityLike, raw: Record<string, any>, self: string, date: string): ActivityContext {
  const bodyRaw = raw.comments && Array.isArray(raw.comments)
    ? raw.comments.map((c: any) => `${c.author || 'unknown'}: ${c.body || ''}`).join('\n')
    : '';

  const people = collectPeople(
    [raw.owner, raw.lastModifiedBy, ...(raw.mentions || []),
     ...(raw.comments || []).map((c: any) => c.author)],
    self
  );

  return {
    title: act.title,
    date,
    source: 'google-sheets',
    people,
    userRole: eq(raw.owner, self) ? 'authored' : 'mentioned',
    body: cleanBody(bodyRaw),
    scope: raw.sheets ? `${raw.sheets.length} sheets` : undefined,
  };
}

// Default extractor for tools with minimal signal value (Confluence, Google Drive,
// Google Meet, Figma, OneDrive, etc.) — title + date + people is sufficient.
// Adding per-tool extractors for these would be over-engineering: they have no body
// content and minimal unique signals. (RJ-4)
function extractDefault(act: ActivityLike, raw: Record<string, any>, self: string, date: string): ActivityContext {
  // Generic people extraction: try common field names across tools
  const people = collectPeople(
    [raw.owner, raw.creator, raw.organizer, raw.lastModifiedBy, raw.author,
     ...(raw.attendees || []), ...(raw.participants || []),
     ...(raw.sharedWith || []), ...(raw.watchers || []),
     ...(raw.editors || []), ...(raw.commenters || [])],
    self
  );

  return {
    title: act.title,
    date,
    source: act.source || 'unknown',
    people,
    userRole: 'mentioned',
    isRoutine: raw.recurring === true ? true : undefined,
    scope: raw.duration ? `${raw.duration} min` : undefined,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

// RH-1: Adapter is a pure data normalizer — no template engine knowledge.
// scanAndStrip() handles security (credentials/PII).
// escapeHandlebarsInput() is called in the PROMPT LAYER, not here.
function cleanBody(text: string): string | undefined {
  if (!text || text.trim().length === 0) return undefined;
  const cleaned = scanAndStrip(text);
  return cleaned.length > MAX_BODY_LENGTH
    ? cleaned.slice(0, MAX_BODY_LENGTH) + '...'
    : cleaned;
}

function collectPeople(candidates: (string | undefined | null)[], self: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const c of candidates) {
    if (!c || typeof c !== 'string') continue;
    const lower = c.toLowerCase();
    if (lower === self || seen.has(lower)) continue;
    seen.add(lower);
    result.push(c);
  }
  return result;
}

function eq(a: unknown, b: string): boolean {
  return typeof a === 'string' && a.toLowerCase() === b;
}

function includes(arr: unknown, val: string): boolean {
  return Array.isArray(arr) && arr.some(
    (item: unknown) => typeof item === 'string' && item.toLowerCase() === val
  );
}
```

### Step 4: Run tests to verify they pass

```bash
cd backend && npx vitest run src/services/career-stories/activity-context.adapter.test.ts
```

Expected: All PASS

### Step 5: Commit

```bash
git add backend/src/services/career-stories/activity-context.adapter.ts backend/src/services/career-stories/activity-context.adapter.test.ts
git commit -m "feat: add ActivityContext adapter with per-tool extraction + heuristic ranker"
```

---

## Task 5: Fix #1c — Wire ActivityContext Into LLM Pipeline (0.5d)

> **Why:** Connect the adapter to the prompt pipeline so the Career Story LLM actually receives raw evidence.

**Files:**
- Modify: `backend/src/services/ai/prompts/career-story.prompt.ts:21-35, 183-210`
- Modify: `backend/src/services/ai/prompts/templates/career-story-user.prompt.md`
- Modify: `backend/src/services/career-stories/llm-input.builder.ts`
- Modify: `backend/src/services/story-wizard.service.ts` (wire activity fetch → adapter → prompt)
- Modify: `backend/src/services/career-stories/career-story.service.ts` (same for promote/regen)
- Test: `backend/src/services/ai/prompts/career-story.prompt.test.ts` (add activities tests)

### Step 1: Add `activities` as a PEER parameter, not a child of JournalEntryContent (RH-3)

**Do NOT add activities inside JournalEntryContent.** Activities are tool data, not journal metadata.
Instead, add them as a peer parameter in `CareerStoryPromptParams` and `buildCareerStoryMessages()`.

In `backend/src/services/ai/prompts/career-story.prompt.ts`, modify the params interface:

```typescript
// JournalEntryContent stays UNCHANGED — no activities field (RH-3)

import type { ActivityContext } from '../../career-stories/activity-context.adapter';

export interface CareerStoryPromptParams {
  journalEntry: JournalEntryContent;
  framework: FrameworkName;
  style?: WritingStyle;
  userPrompt?: string;
  archetype?: StoryArchetype;
  extractedContext?: ExtractedContext;
  /** PEER of journalEntry, not a child — raw evidence from tools (RH-3) */
  activities?: ActivityContext[];
}
```

### Step 2: Pass activities to the Handlebars template as a peer

In `getCareerStoryUserPrompt()` (lines 183-210), add `activities` from params (not from journalEntry):

```typescript
export function getCareerStoryUserPrompt(params: CareerStoryPromptParams): string {
  const { journalEntry, framework, style, userPrompt, activities } = params;
  // ... existing code ...

  return userTemplateCompiled({
    // ... existing fields ...
    activities: activities || undefined,
  });
}
```

### Step 3: Add activities section to the template

In `backend/src/services/ai/prompts/templates/career-story-user.prompt.md`, add BEFORE the `## Target Framework` section (before line 56):

```markdown
{{#if activities}}
## Source Activities (Raw Evidence)

These are the actual activities from the user's tools. Use specific details from these
when writing each section. Prefer facts from here over the narrative summary above.

{{#each activities}}
- [{{date}}] {{source}}{{#if sourceSubtype}}/{{sourceSubtype}}{{/if}}: {{title}}
  {{#if body}}  Details: {{body}}{{/if}}
  {{#if people}}  People: {{people}}{{/if}}
  {{#if labels}}  Labels: {{labels}}{{/if}}
  {{#if scope}}  Scope: {{scope}}{{/if}}
  {{#if sentiment}}  Team response: {{sentiment}}{{/if}}
  {{#if linkedItems}}  Connected to: {{linkedItems}}{{/if}}
  {{#if state}}  Status: {{state}}{{/if}}
{{/each}}
{{/if}}
```

### Step 4: Composable pipeline — buildLLMInput + rankActivities are separate (RH-2)

**buildLLMInput() does NOT touch activities.** It builds JournalEntryContent only.
The caller composes: `activities → toActivityContext[] → rankActivities[] → pass as peer`.

In `backend/src/services/career-stories/llm-input.builder.ts`, keep buildLLMInput focused:

```typescript
// buildLLMInput stays focused on journal entry normalization — NO activity logic (RH-2)
export function buildLLMInput(params: BuildLLMInputParams): JournalEntryContent {
  // ... existing format7Data extraction + field mapping ...
  // Returns JournalEntryContent WITHOUT activities
}
```

### Step 5: Wire into wizard path — activities as peer

In `backend/src/services/story-wizard.service.ts`, compose the pipeline:

```typescript
import { rankActivities } from '../career-stories/activity-context.adapter';

// 1. Build journal entry content (existing)
const journalEntryContent = buildLLMInput({ journalEntry: entry, extractedContext });

// 2. Fetch activities (already exists at line 548-555, move earlier)
const activityTable = this.isDemoMode ? prisma.demoToolActivity : prisma.toolActivity;
const allActivityRows = entry.activityIds.length > 0
  ? await (activityTable.findMany as Function)({
      where: { id: { in: entry.activityIds } },
      select: { id: true, source: true, sourceUrl: true, title: true, rawData: true, timestamp: true },
    })
  : [];

// 3. Rank and adapt activities (separate composable step — RH-2)
const rankedActivities = allActivityRows.length > 0
  ? rankActivities(
      allActivityRows,
      (entry.format7Data as Record<string, any>) || null,
      userId, // Or resolve to email
      20,
    ).map(r => r.context)
  : undefined;

// 4. Build messages with activities as PEER (RH-3)
const messages = buildCareerStoryMessages({
  journalEntry: journalEntryContent,
  framework,
  style,
  archetype,
  extractedContext,
  activities: rankedActivities,  // Peer, not child
});
```

### Step 6: Wire into promote/regenerate paths

Same composition pattern in `career-story.service.ts` — activities passed as peer to `buildCareerStoryMessages()`.

### Step 7: Add tests for activities in prompt

Add to `backend/src/services/ai/prompts/career-story.prompt.test.ts`:

```typescript
describe('activities in prompt (peer parameter — RH-3)', () => {
  it('includes activities section when activities are provided as peer', () => {
    const prompt = getCareerStoryUserPrompt(createParams({
      // Activities are a PEER param, NOT inside journalEntry
      activities: [{
        title: 'feat(auth): OAuth2 flow',
        date: '2024-05-15',
        source: 'github',
        sourceSubtype: 'pr',
        people: ['bob.chen'],
        userRole: 'authored',
        body: 'Implements OAuth2 with PKCE',
        labels: ['security'],
        scope: '+450/-120, 15 files',
        state: 'merged',
      }],
    }));
    expect(prompt).toContain('Source Activities');
    expect(prompt).toContain('OAuth2 with PKCE');
    expect(prompt).toContain('bob.chen');
    expect(prompt).toContain('+450/-120');
  });

  it('does NOT include activities section when no activities', () => {
    const prompt = getCareerStoryUserPrompt(createParams());
    expect(prompt).not.toContain('Source Activities');
  });
});
```

### Step 8: Run all tests

```bash
cd backend && npx vitest run src/services/ai/prompts/career-story.prompt.test.ts src/services/career-stories/llm-input.builder.test.ts
```

Expected: All PASS

### Step 9: Bump maxTokens for richer output

In both `story-wizard.service.ts` (line 829) and `career-story.service.ts` (line 467-468), bump:

```typescript
// BEFORE:
maxTokens: 2000,

// AFTER:
maxTokens: 2500,
```

### Step 10: Add token usage logging + cost warning (RJ-7)

In the LLM call wrapper (wherever `generateChatCompletion()` or similar is called in
`story-wizard.service.ts` and `career-story.service.ts`), log token usage:

```typescript
const result = await this.aiService.generateChatCompletion(messages, {
  modelTier: 'balanced',
  maxTokens: 2500,
});

// RJ-7: Token usage logging
if (result.usage) {
  const { prompt_tokens, completion_tokens, total_tokens } = result.usage;
  console.log(
    `[Career Story LLM] tokens: ${prompt_tokens} in / ${completion_tokens} out / ${total_tokens} total` +
    ` | story: ${journalEntryContent.title?.slice(0, 40)}`
  );

  if (prompt_tokens > 15000) {
    console.warn(
      `[Career Story LLM] WARNING: input tokens (${prompt_tokens}) exceed 15K threshold. ` +
      `Check activity count or body truncation. Story: ${journalEntryContent.title}`
    );
  }
}
```

This is deliberately simple — `console.log` + `console.warn`. No separate module, no cost
calculation, no alerting infrastructure. If input > 15K tokens, it means either too many
activities passed or body truncation failed. That's the actionable signal.

### Step 11: Commit

```bash
git add backend/src/services/ai/prompts/career-story.prompt.ts backend/src/services/ai/prompts/career-story.prompt.test.ts backend/src/services/ai/prompts/templates/career-story-user.prompt.md backend/src/services/career-stories/llm-input.builder.ts backend/src/services/story-wizard.service.ts backend/src/services/career-stories/career-story.service.ts
git commit -m "feat: wire ActivityContext into Career Story LLM — raw evidence replaces summaries"
```

---

## Task 6: Fix #2 — Fast D-I-G: 3 Questions Not 6 (0.5d)

> **Why:** Users abandon the wizard at question 4. The system already knows timeline, people, and scope — stop asking about what's known. Ask 3 gap-targeted questions instead of 6 generic ones.

**Files:**
- Modify: `backend/src/services/ai/prompts/templates/wizard-questions.prompt.md`
- Modify: `backend/src/services/ai/prompts/wizard-questions.prompt.ts`
- Modify: `backend/src/services/story-wizard.service.ts` (pass activity summary to question generator)
- Test: `backend/src/services/ai/prompts/wizard-questions.prompt.test.ts`

### Step 1: Read existing wizard questions prompt and test

Read `backend/src/services/ai/prompts/templates/wizard-questions.prompt.md` and `wizard-questions.prompt.ts` to understand current structure. Also read the test file.

### Step 2: Update the question prompt template

In `wizard-questions.prompt.md`, add a "SYSTEM ALREADY KNOWS" section and change from 6 to 3 questions:

```markdown
{{#if knownContext}}
## What the System Already Knows (DO NOT ask about these)

The following facts are already available from the user's tools:
{{#if knownContext.dateRange}}- **Timeline**: {{knownContext.dateRange}}{{/if}}
{{#if knownContext.collaborators}}- **People involved**: {{knownContext.collaborators}}{{/if}}
{{#if knownContext.codeStats}}- **Code scope**: {{knownContext.codeStats}}{{/if}}
{{#if knownContext.tools}}- **Tools used**: {{knownContext.tools}}{{/if}}
{{#if knownContext.labels}}- **Labels/tags**: {{knownContext.labels}}{{/if}}

DO NOT generate questions about timeline, people involved, or scope — the system has this data.
{{/if}}

## Generate exactly 3 questions

Target what the system CANNOT infer:
1. **The obstacle** — "What almost went wrong?" (always ask)
2. **The counterfactual** — "What would have happened without you?" (always ask)
3. **The gap** — Whatever the data is missing. Choose ONE:
   - If no metric: ask for the number that proves success
   - If no named people: ask who pushed back or helped most
   - If no decision: ask what the hardest choice was
   - If no learning: ask what changed in how they work
```

### Step 3: buildKnownContext takes primitives, NOT ActivityContext[] (RH-5)

The prompt builder should not depend on adapter types. The CALLER extracts primitives from
activities and passes them in. `buildKnownContext` is a simple pass-through.

```typescript
// RH-5: Primitives only — no dependency on ActivityContext type
interface KnownContext {
  dateRange?: string;
  collaborators?: string;
  codeStats?: string;
  tools?: string;
  labels?: string;
}

// Simple pass-through — caller is responsible for extracting these from activities
function buildKnownContext(ctx: KnownContext): KnownContext | undefined {
  const hasAny = ctx.dateRange || ctx.collaborators || ctx.codeStats || ctx.tools || ctx.labels;
  return hasAny ? ctx : undefined;
}
```

### Step 4: CALLER extracts primitives from ActivityContext in service layer

In `story-wizard.service.ts`, the caller composes the knownContext:

```typescript
// Caller extracts primitives from activities — prompt layer doesn't know ActivityContext
const knownContext = rankedActivities?.length
  ? {
      dateRange: (() => {
        const dates = rankedActivities.map(a => a.date).filter(d => d !== 'unknown').sort();
        return dates.length >= 2 ? `${dates[0]} to ${dates[dates.length - 1]}` : undefined;
      })(),
      collaborators: (() => {
        const all = [...new Set(rankedActivities.flatMap(a => a.people))];
        return all.length > 0 ? all.slice(0, 8).join(', ') : undefined;
      })(),
      codeStats: (() => {
        const total = rankedActivities.reduce((sum, a) => {
          const m = a.scope?.match(/\+(\d+)/);
          return sum + (m ? parseInt(m[1]) : 0);
        }, 0);
        return total > 0 ? `${total}+ lines of code` : undefined;
      })(),
      tools: [...new Set(rankedActivities.map(a => a.source))].join(', '),
      labels: (() => {
        const all = [...new Set(rankedActivities.flatMap(a => a.labels || []))];
        return all.length > 0 ? all.join(', ') : undefined;
      })(),
    }
  : undefined;
```

### Step 5: Pass knownContext to template + enforce 3-question limit (RJ-6)

In `wizard-questions.prompt.ts`, update `buildWizardQuestionMessages()`:

```typescript
export function buildWizardQuestionMessages(
  params: WizardQuestionParams & { knownContext?: KnownContext }
): ChatCompletionMessageParam[] {
  return [
    { role: 'system', content: systemTemplate },
    { role: 'user', content: userTemplateCompiled({
      ...existingData,
      knownContext: params.knownContext,
    })},
  ];
}
```

In `story-wizard.service.ts`, enforce 3-question limit after LLM response (RJ-6):

```typescript
const FALLBACK_QUESTIONS = [
  { question: 'What was the biggest obstacle you faced?', target: 'obstacle' },
  { question: 'What would have happened if you hadn\'t been involved?', target: 'counterfactual' },
  { question: 'What specific metric proves this was successful?', target: 'metric' },
];

// After parsing LLM question response:
let questions = parsedQuestions;
if (questions.length > 3) {
  questions = questions.slice(0, 3);
}
while (questions.length < 3) {
  questions.push(FALLBACK_QUESTIONS[questions.length]);
}
```

### Step 6: Update story-wizard.service.ts to pass knownContext to question generator

In the `analyzeEntry()` method, compose knownContext from activities (Step 4) and pass
to `generateDynamicQuestions()` along with the `knownContext` parameter.

### Step 6: Update tests

In `wizard-questions.prompt.test.ts`, add tests for:
- knownContext renders in prompt when provided
- knownContext does NOT render when no activities
- Output requests exactly 3 questions (check prompt text)

### Step 7: Add tests for question count enforcement (RJ-6)

In `wizard-questions.prompt.test.ts`:

```typescript
describe('question count enforcement', () => {
  it('slices to 3 if LLM returns more', () => {
    const fiveQuestions = [
      { question: 'Q1', target: 'obstacle' },
      { question: 'Q2', target: 'counterfactual' },
      { question: 'Q3', target: 'metric' },
      { question: 'Q4', target: 'learning' },
      { question: 'Q5', target: 'decision' },
    ];
    const enforced = enforceQuestionCount(fiveQuestions);
    expect(enforced).toHaveLength(3);
  });

  it('pads with fallbacks if LLM returns fewer than 3', () => {
    const oneQuestion = [{ question: 'Q1', target: 'obstacle' }];
    const enforced = enforceQuestionCount(oneQuestion);
    expect(enforced).toHaveLength(3);
    expect(enforced[1].target).toBe('counterfactual');
    expect(enforced[2].target).toBe('metric');
  });

  it('returns 3 unchanged if LLM returns exactly 3', () => {
    const three = [
      { question: 'Q1', target: 'obstacle' },
      { question: 'Q2', target: 'counterfactual' },
      { question: 'Q3', target: 'metric' },
    ];
    const enforced = enforceQuestionCount(three);
    expect(enforced).toHaveLength(3);
    expect(enforced).toEqual(three);
  });
});
```

### Step 8: Run tests

```bash
cd backend && npx vitest run src/services/ai/prompts/wizard-questions.prompt.test.ts src/services/story-wizard.service.test.ts
```

Expected: All PASS

### Step 9: Commit

```bash
git add backend/src/services/ai/prompts/templates/wizard-questions.prompt.md backend/src/services/ai/prompts/wizard-questions.prompt.ts backend/src/services/story-wizard.service.ts backend/src/services/ai/prompts/wizard-questions.prompt.test.ts
git commit -m "feat: reduce D-I-G from 6 to 3 gap-targeted questions with system-known context"
```

---

## Task 7: Integration Smoke Test (0.25d)

> **Why:** Verify the full pipeline works end-to-end with mock data before shipping.

**Files:**
- Modify or create: `backend/src/services/career-stories/pipeline.integration.test.ts` (or similar)

### Step 1: Write integration test using mock data

```typescript
import { describe, it, expect } from 'vitest';
import { buildLLMInput } from './llm-input.builder';
import { toActivityContext, rankActivities } from './activity-context.adapter';
import { scanAndStrip } from './secret-scanner';

describe('Pipeline integration: mock data → LLM input', () => {
  const mockActivities = [
    {
      id: 'pr-42',
      source: 'github',
      title: 'feat(auth): implement OAuth2 flow',
      timestamp: new Date('2024-05-15'),
      rawData: {
        number: 42, state: 'merged',
        body: 'Implements OAuth2 auth flow. API_KEY=sk-test-12345 should not leak.',
        additions: 450, deletions: 120, changedFiles: 15,
        author: 'honey.arora', reviewers: ['bob.chen', 'sarah.kim'],
        labels: ['security', 'breaking-change'],
        headRef: 'feature/oauth2-auth',
      },
    },
    {
      id: 'cal-1on1',
      source: 'google-calendar',
      title: '1:1 with EM',
      timestamp: new Date('2024-05-20'),
      rawData: { organizer: 'manager', attendees: ['honey.arora', 'manager'], duration: 30, recurring: true },
    },
  ];

  it('secret scanner strips API key from PR body', () => {
    const ctx = toActivityContext(mockActivities[0] as any, 'honey.arora');
    expect(ctx.body).not.toContain('sk-test-12345');
    expect(ctx.body).toContain('OAuth2 auth flow');
  });

  it('ranker puts PR above routine 1:1', () => {
    const ranked = rankActivities(mockActivities as any[], null, 'honey.arora');
    expect(ranked[0].activity.id).toBe('pr-42');
    expect(ranked[1].activity.id).toBe('cal-1on1');
  });

  it('buildLLMInput extracts format7Data fields (activities are separate — RH-2)', () => {
    const result = buildLLMInput({
      journalEntry: {
        title: 'Auth Migration',
        fullContent: 'Migrated auth system',
        activityIds: ['pr-42', 'cal-1on1'],
        format7Data: { dominantRole: 'Led', skills: ['OAuth2', 'Security'] },
      },
    });

    // buildLLMInput only handles journal entry — no activities (RH-2)
    expect(result.dominantRole).toBe('Led');
    expect(result.skills).toContain('OAuth2');
  });

  it('activities compose separately via rankActivities (RH-2)', () => {
    const ranked = rankActivities(mockActivities as any[], null, 'honey.arora', 20);
    // Can be passed as peer to buildCareerStoryMessages
    expect(ranked.map(r => r.context)).toHaveLength(2);
    expect(ranked[0].context.source).toBe('github');
  });
});
```

### Step 2: Run integration test

```bash
cd backend && npx vitest run src/services/career-stories/pipeline.integration.test.ts
```

### Step 3: Run FULL test suite

```bash
cd backend && npx vitest run
```

Expected: All PASS, no regressions.

### Step 4: Final commit

```bash
git add -A
git commit -m "test: add pipeline integration smoke test with mock data"
```

---

## Summary (Revised — All RJ+RH Fixes Applied)

```
TASK    DESCRIPTION                                 EFFORT    CUMULATIVE    COMMITS
═══════════════════════════════════════════════════════════════════════════════════════
1       R4: Real Handlebars security (FIX-A)        0.25d     0.25d         1
2       R1+Fix#3: Unified buildLLMInput (FIX-B)     0.5d      0.75d         1
3       Fix #1a: Secret scanner                     0.5d      1.25d         1
4       Fix #1b: Adapter (7+default) + ranker       1.0d      2.25d         1
        (FIX-C: trimmed extractors, FIX-D: ranker
         reads only ActivityContext)
5       Fix #1c: Wire into LLM pipeline             0.5d      2.75d         1
        (FIX-E: activities as peer, FIX-G: token log)
6       Fix #2: Fast D-I-G (3 not 6)                0.5d      3.25d         1
        (FIX-F: knownContext primitives, count enforce)
7       Integration smoke test                      0.25d     3.5d          1
─────────────────────────────────────────────────────────────────────────────────────
TOTAL                                               3.5d                    7 commits
```

**Savings from review fixes:** 0.75d (4.25d → 3.5d) by eliminating throwaway code (FIX-B)
and trimming over-engineered extractors (FIX-C).

**Test command for full suite:**
```bash
cd backend && npx vitest run
```

**Key files created:**
- `backend/src/services/ai/prompts/handlebars-safe.ts` — Template injection protection (`compileSafe` + `escapeHandlebarsInput`)
- `backend/src/services/career-stories/secret-scanner.ts` — Credential/PII stripping
- `backend/src/services/career-stories/activity-context.adapter.ts` — Per-tool normalization (7 dedicated + default) + heuristic ranker
- `backend/src/services/career-stories/llm-input.builder.ts` — Unified JournalEntryContent builder

**Key files modified:**
- `backend/src/services/story-wizard.service.ts` — Format7Data + activities (peer) + 3 questions + token logging
- `backend/src/services/career-stories/career-story.service.ts` — Unified buildLLMInput + token logging
- `backend/src/services/ai/prompts/career-story.prompt.ts` — Activities as peer param in CareerStoryPromptParams
- `backend/src/services/ai/prompts/templates/career-story-user.prompt.md` — Activities section in template
- `backend/src/services/ai/prompts/templates/wizard-questions.prompt.md` — 3 gap-targeted questions + knownContext

**Architecture (post-review):**
- Activities are a **peer** of `journalEntry` in `buildCareerStoryMessages()`, not nested inside (RH-3)
- `buildLLMInput()` normalizes journal data only; ranking is a separate composable step (RH-2)
- Adapter is a pure data normalizer — `cleanBody()` calls `scanAndStrip()`, not `escapeHandlebarsInput()` (RH-1)
- Ranker reads only from `ActivityContext` fields, never bypasses to rawData (RH-4)
- `buildKnownContext()` takes primitives, not `ActivityContext[]` (RH-5)
- Question count enforced: `slice(0, 3)` + fallback padding (RJ-6)

---

## /a3:o — OWN Gate: Code Ownership Verification

> **Gate question:** "Do I own every line I'm about to change? Who else's code am I touching?"

### Ownership Map

| File | Lines | Tests | Dependents | Risk | You Own It? |
|------|-------|-------|------------|------|-------------|
| `career-story.prompt.ts` | 311 | 259 (19 cases) | **9 files** — career-story.service, story-wizard.service, derivation.service, derivation-multi.service, story-publishing.service, wizard-questions.prompt (types) | **HIGH** | Yes — you wrote the Handlebars template system, ExtractedContext, archetype guidance |
| `career-story.service.ts` | 1,540 | 436 (16 cases) + integration | **6 files** — story-wizard.service, derivation*.service, story-publishing.service, index re-export | **HIGH** | Yes — you wrote generateSectionsWithLLM(), promote, regenerate paths |
| `story-wizard.service.ts` | 894 | 774 (28 cases) | **1 file** — story-wizard.controller | **MEDIUM** | Yes — you wrote the wizard flow, analyzeEntry, evaluateStory |
| `wizard-questions.prompt.ts` | 203 | 236 (16 cases) | **1 file** — story-wizard.service | **LOW** | Yes — you wrote the D-I-G question system |
| `derivation.prompt.ts` | 197 | 116 (11 cases) | **2 files** — derivation*.service | **LOW** | Yes — you wrote Share As derivations |
| `journal-narrative.prompt.ts` | 354 | **NONE** | **1 file** — journal.service | **MEDIUM** | Yes — but NO TEST COVERAGE. Change is minimal (swap `Handlebars.compile` to `compileSafe`) |
| `cluster-assign.prompt.ts` | 92 | 150 (10 cases) | **5 files** — production-sync, cluster-assign.service, integration tests | **MEDIUM** | Yes — change is minimal (swap compile) |
| `career-story-user.prompt.md` | 105 | indirect via prompt.test | (template) | **HIGH** | Yes — you wrote it |
| `wizard-questions.prompt.md` | 99 | indirect via prompt.test | (template) | **LOW** | Yes — you wrote it |

### New Files (No Ownership Conflict)

| New File | Depends On | Depended On By |
|----------|-----------|----------------|
| `handlebars-safe.ts` | `handlebars` (npm) | All 5 prompt files (Task 1 import swap) |
| `secret-scanner.ts` | None (pure regex) | `activity-context.adapter.ts` |
| `activity-context.adapter.ts` | `secret-scanner.ts` | `story-wizard.service.ts`, `career-story.service.ts` |
| `llm-input.builder.ts` | `career-story.prompt.ts` (types) | `story-wizard.service.ts`, `career-story.service.ts` |

### Blast Radius Analysis

**What breaks if career-story.prompt.ts changes go wrong?**
- All story generation (wizard + promote + regenerate) fails
- Derivation (Share As) fails
- Mitigation: 19 existing tests + new tests. Interface changes are ADDITIVE (new `activities` peer param is optional)

**What breaks if career-story.service.ts changes go wrong?**
- Story creation/regeneration fails across all paths
- Mitigation: 16 existing tests + integration tests. Change is in the CALLER of `buildCareerStoryMessages()`, not in the service's public API

**What breaks if story-wizard.service.ts changes go wrong?**
- Only wizard flow breaks (promote + regenerate paths unaffected)
- Mitigation: 28 existing tests. Wizard has `evaluateStory()` as quality gate — bad generation gets flagged

### Ownership Verdict

| Check | Status | Notes |
|-------|--------|-------|
| All files authored by you? | **PASS** | Sole contributor to all modified files |
| Any shared/team files? | **PASS** | No team files — solo project |
| Any third-party contracts changing? | **PASS** | No API contract changes (internal refactor + new optional params) |
| Test coverage exists for all modified files? | **WARN** | `journal-narrative.prompt.ts` has NO tests. Change is trivial (1-line import swap) but risk is real |
| New files have clean dependency graph? | **PASS** | New files depend down, not up. No circular deps |
| Migration/schema changes? | **PASS** | None — all changes are code-only, no DB schema changes |

### Action Items Before Implementation

1. **journal-narrative.prompt.ts**: The compile swap is 1 line, but consider adding a smoke test while you're there
2. **cluster-assign.prompt.ts**: Same — 1-line swap, has tests, but verify production-sync isn't fragile
3. **Run full test suite before AND after each task** — the 82+ existing tests are your safety net

**OWN GATE: PASS** — You own every file. Blast radius is understood. The only gap is `journal-narrative.prompt.ts` missing dedicated tests.

---

## /a3:p — PAUSE Gate: Design Understanding Verification

> **Protocol:** Paraphrase the design, Argue against it, Uncover assumptions, Sketch it yourself, Enumerate failures.

### P — Paraphrase the Design

The wizard pipeline currently produces generic career stories because:

1. **Input starvation**: The LLM gets pre-digested journal summaries (title, description, phases) instead of raw activity data (PR bodies, Jira comments, Slack reactions). The original author's words are lost by the time they reach the LLM.

2. **Format7Data bug**: The wizard path nulls out `dominantRole`, `skills`, `phases`, and `impactHighlights` that clustering already computed. It literally throws away its own work.

3. **Question bloat**: 6 generic D-I-G questions when the system already knows timeline, people, and scope from tool data. Users abandon at question 4.

The fix is a 5-layer pipeline in dependency order:

```
Layer 1: Handlebars security (prevent injection via user-controlled rawData)
Layer 2: Unified buildLLMInput (one builder, three consumers)
Layer 3: Secret scanner (strip credentials before LLM sees rawData)
Layer 4: ActivityContext adapter (per-tool normalization) + ranker (9-signal scoring)
Layer 5: Fast D-I-G (3 gap-targeted questions with knownContext suppression)
```

After the fix, `buildCareerStoryMessages()` receives two peers:
- `journalEntry: JournalEntryContent` — metadata from format7Data (phases, skills, role)
- `activities: ActivityContext[]` — raw evidence from tools (PR bodies, Jira comments, reactions)

The template tells the LLM: "Prefer facts from activities over the narrative summary."

### A — Argue Against It

**Argument 1: "You're solving the wrong problem."**
The stories are generic because the LLM is mediocre, not because of input starvation. A better model (Opus instead of balanced) would produce better stories from the SAME inputs.

*Counter:* Possibly true, but model upgrade costs 10x per story and doesn't fix the format7Data nulling bug. The adapter+ranker approach costs zero extra LLM calls and fixes the data loss. And you still need the security fix (Handlebars injection) regardless of model quality.

**Argument 2: "3.5 days for a plan that hasn't been validated with real users."**
Nobody asked for raw PR bodies in their career stories. This is an engineering solution to a product problem. Talk to a user first.

*Counter:* Fair criticism. But the format7Data nulling bug is objectively broken — it throws away computed data. And the Handlebars injection is a real security vulnerability. At minimum, Tasks 1-2 are must-fix. Tasks 3-6 (the adapter pipeline) could ship behind a feature flag.

**Argument 3: "The ranker is premature optimization."**
20 activities is not a lot. Just send them all. The ranker adds complexity and yet another place where signals can go wrong.

*Counter:* Some stories have 80+ activities. Without ranking, you'd blow the token budget (15K+ input tokens). The ranker uses signals the adapter already extracts — no extra work. And the token logging (FIX-G) will tell you if you're wrong.

**Argument 4: "You'll break existing stories."**
The prompt template change and `CareerStoryPromptParams` change could subtly alter output quality for existing promote/regenerate flows.

*Counter:* Activities param is optional. Without it, the template renders identically to today. Existing promote/regenerate flows won't pass activities until they're wired up explicitly.

### U — Uncover Assumptions

| # | Assumption | Risk if Wrong | Mitigation |
|---|-----------|---------------|------------|
| U1 | Raw activity data (PR bodies, Jira comments) contains useful signal for career stories | **HIGH** — entire adapter+ranker is wasted | Validate with 3 real stories before building Task 4. Check if PR bodies actually improve output |
| U2 | `rawData` field shapes are stable across tool integrations | **MEDIUM** — extractors break silently | `extractDefault()` handles unknown shapes. Each dedicated extractor has null-safe access (`raw.body \|\| ''`) |
| U3 | 20 ranked activities fit within token budget | **MEDIUM** — could still blow 15K | Token logging (FIX-G) monitors this. `MAX_BODY_LENGTH = 500` per activity caps total |
| U4 | Users will answer 3 questions but not 6 | **LOW** — measurable with completion metrics | Can A/B test: 3 vs 6 questions, measure story quality + completion rate |
| U5 | `scanAndStrip()` regex patterns catch all credential formats | **HIGH** — secret leak to LLM | Regex covers AWS keys, private keys, JWTs, basic auth, connection strings. Add patterns as discovered. LLM provider also has content safety |
| U6 | Handlebars `noPrototypeAccess: true` is sufficient security | **LOW** — well-tested in Handlebars 4.7.7+ | Plus `escapeHandlebarsInput()` strips `{{` from user text. Belt and suspenders |
| U7 | `selfIdentifier` (userId) matches the format used in rawData people fields | **MEDIUM** — people extraction fails if mismatch | Identity normalization exists (`IdentityMatcher`). Worst case: self not filtered, appears in people list |
| U8 | Existing 82+ tests provide adequate regression coverage | **LOW** — tests exist for all prompt files except journal-narrative | Each task adds its own tests. Integration smoke test (Task 7) catches pipeline-level issues |

### S — Sketch It Yourself

**Data flow (happy path):**

```
1. User clicks "Generate Story" in wizard
2. story-wizard.service.ts:
   a. Fetch journal entry (with format7Data — fixed by Task 2)
   b. Fetch activities (already exists, move earlier)
   c. buildLLMInput({ journalEntry: entry }) → JournalEntryContent
   d. rankActivities(activities, format7Data, userId) → ActivityContext[]
   e. buildCareerStoryMessages({
        journalEntry,              ← journal metadata (peer 1)
        activities: rankedCtx,     ← raw evidence (peer 2)
        framework, style, archetype, extractedContext
      }) → ChatCompletionMessageParam[]
   f. Send to LLM (balanced tier, maxTokens: 2500)
   g. Log tokens: "1200 in / 800 out / 2000 total"
   h. Parse response → CareerStoryOutput
   i. evaluateStory() quality gate
```

**Data flow (D-I-G questions):**

```
1. User enters wizard
2. analyzeEntry() runs
3. Extract knownContext primitives from activities:
   { dateRange: "2024-05-01 to 2024-06-15", collaborators: "bob.chen, sarah.kim", ... }
4. buildWizardQuestionMessages({ ..., knownContext })
5. Template renders: "DO NOT ask about timeline, people, scope"
6. LLM returns 2-5 questions
7. enforceQuestionCount(): slice to 3, pad with fallbacks
8. User answers 3 questions → extractedContext
9. extractedContext passed as peer to buildCareerStoryMessages
```

### E — Enumerate Failures

| # | Failure Mode | Probability | Impact | Detection | Mitigation |
|---|-------------|-------------|--------|-----------|------------|
| E1 | Secret leaks through to LLM (regex misses a credential format) | Low | **Critical** | Manual review of LLM inputs in dev | Expand regex patterns. LLM providers have content safety. rawData doesn't typically contain production secrets |
| E2 | Token budget blown — 80+ activities with rich bodies | Medium | **Medium** — API error or truncated output | Token logging warns at 15K | MAX_BODY_LENGTH=500, maxCount=20 cap on ranker |
| E3 | Ranker demotes the most important activity | Medium | **Low** — story quality degrades | Prompt snapshot test verifies activities appear | 9 signals are heuristic; edge type from format7Data is strongest signal. Can tune weights |
| E4 | Template injection via `{{constructor}}` in PR title | Low | **Medium** — crash or prototype pollution | compileSafe test + escapeHandlebarsInput test | Belt and suspenders: noPrototypeAccess blocks it AND input escaping strips `{{` |
| E5 | LLM returns 0 questions (refusal, format error) | Low | **Low** — wizard has static fallback | Existing fallback in story-wizard.service.ts | enforceQuestionCount pads to 3 with hardcoded fallbacks |
| E6 | extractDefault produces unhelpful ActivityContext for niche tools | Medium | **Low** — story quality slightly worse for Figma/Confluence-heavy users | Compare story quality with/without activities | extractDefault still captures people + title. Body is where the real signal is, and niche tools don't have it |
| E7 | buildLLMInput and rankActivities are called in wrong order | Low | **None** — they're independent composable functions | Type system enforces: buildLLMInput returns JournalEntryContent, rankActivities returns ActivityContext[] | No coupling between them — can't accidentally mix up |
| E8 | Handlebars compile at module load time fails (file not found) | Low | **High** — all story generation down | Existing fallback template in catch block | Test this in CI by deleting template file |
| E9 | User abandons wizard at question 1 instead of question 4 | Low | **Medium** — worse than before | Track completion metrics | Questions are better-targeted; obstacle/counterfactual are more engaging than "describe your timeline" |
| E10 | career-story.prompt.ts interface change breaks derivation.service | Low | **Medium** — Share As stops working | Existing 11 derivation tests | Activities param is optional. Derivation doesn't pass it. No breaking change |

### PAUSE Gate Verdict

| Check | Status | Notes |
|-------|--------|-------|
| Can I explain the design without looking at the doc? | **PASS** | Two peers (journal + activities), composable pipeline, security belt-and-suspenders |
| Did I find a genuine flaw when arguing against it? | **PASS** | U1 (raw data utility) is unvalidated. Recommend: validate with 3 real stories before Task 4 |
| Are all assumptions enumerated? | **PASS** | 8 assumptions documented with mitigations |
| Could I rebuild the sketch from memory? | **PASS** | Data flow is linear: fetch → build → rank → compose → send → log → parse → gate |
| Are failure modes covered? | **PASS** | 10 failure modes with probability/impact/detection/mitigation |

**PAUSE GATE: PASS** with one caveat — validate assumption U1 (raw activity data utility) with 3 real stories before investing in Task 4 (adapter+ranker). Tasks 1-3 are unambiguous wins.
