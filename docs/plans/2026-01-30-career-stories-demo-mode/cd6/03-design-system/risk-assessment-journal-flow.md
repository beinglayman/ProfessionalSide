# Risk Assessment: Adding activityIds to Journal Entry Flow

**Date:** 2026-01-30
**Scope:** Impact of proposed schema changes on existing journal entry creation

---

## Executive Summary

**Overall Risk Level: MEDIUM**

The existing journal entry flow already uses `format7Data` (JSON blob) to store rich activity data. Adding `activityIds` as a separate field creates a **dual-source-of-truth risk** that must be carefully managed.

---

## Current State Analysis

### Existing Activity Tracking

The journal system already tracks activities via **Format7 structure** in `format7Data`:

```typescript
// format7Data.activities[] contains:
{
  id: string,              // Activity ID
  source: MCPToolType,     // github, slack, jira...
  type: string,
  description: string,
  timestamp: string,
  related_activities: string[]  // Links between activities
}

// format7Data.correlations[] links activities:
{
  activities: string[],    // Array of activity IDs
  description: string,
  confidence: number
}
```

### Files That Will Need Updates

| File | Current State | Required Changes |
|------|---------------|------------------|
| `backend/prisma/schema.prisma` | No activityIds field | Add `activityIds String[]` |
| `backend/src/types/journal.types.ts` | No activityIds in Zod schema | Add to create/update schemas |
| `backend/src/services/journal.service.ts` | Creates entry without activityIds | Extract from format7Data OR accept as input |
| `frontend NewEntryModalRefactored.tsx` | 7-step flow, no activity selection | No change needed (optional field) |

---

## Risk Analysis

### Risk 1: Dual Source of Truth (HIGH)

**Description:**
Activity IDs will exist in two places:
1. `activityIds[]` field (new, top-level)
2. `format7Data.activities[].id` (existing, embedded JSON)

**Impact:** Data inconsistency if they diverge.

**Mitigation Options:**

| Option | Pros | Cons |
|--------|------|------|
| A. Derive `activityIds` from `format7Data` on read | Single source of truth | Compute overhead, complex migration |
| B. Sync on write | Maintains both for different query patterns | Must sync both directions |
| C. Use `activityIds` only for demo entries | No impact on existing flow | Inconsistent data model |

**Recommendation:** **Option C** - For demo mode, use `activityIds` only on `DemoJournalEntry`. Keep existing `JournalEntry` unchanged until post-demo when we can properly reconcile the two approaches.

### Risk 2: Schema Migration on Production Table (MEDIUM)

**Description:**
Adding `activityIds String[] @default([])` to `JournalEntry` requires migration on production table.

**Impact:**
- ~0 downtime (additive change with default)
- Existing entries get empty `activityIds[]`
- No data migration needed

**Mitigation:**
- Run migration during low-traffic window
- Verify with `prisma migrate diff` first

### Risk 3: Zod Schema Mismatch (LOW)

**Description:**
If we add `activityIds` to Zod schema, existing frontend calls will pass validation (optional field).

**Impact:** None if field is optional with default.

**Mitigation:**
```typescript
// Add to createJournalEntrySchema
activityIds: z.array(z.string()).default([]).optional(),
groupingMethod: z.enum(['auto', 'time', 'manual', 'ai_suggested']).default('auto').optional(),
lastGroupingEditAt: z.date().optional()
```

### Risk 4: Format7 Activity Extraction Complexity (LOW)

**Description:**
If we want to auto-populate `activityIds` from `format7Data`, we need extraction logic.

**Impact:** Additional code complexity.

**Mitigation:** Don't auto-populate for now. `activityIds` is for explicit user curation (demo mode). Let `format7Data` remain the rich data store.

### Risk 5: API Contract Change (LOW)

**Description:**
GET `/journal/entries` response will include new fields.

**Impact:** Frontend must handle new optional fields gracefully.

**Mitigation:**
- Fields are optional, default to `[]` and `null`
- Frontend already uses TypeScript with optional chaining

---

## Recommendation: Minimal Change Approach

### For This Sprint (Demo Mode)

1. **DO NOT modify `JournalEntry` model** in production
2. **Create `DemoJournalEntry`** with `activityIds` as designed
3. **Keep Format7** as the source of truth for real journal entries
4. **Use `activityIds`** only for demo entries where user explicitly curates activities

### Post-Demo (Future Work)

1. Evaluate if `activityIds` should be promoted to `JournalEntry`
2. Consider deriving it from `format7Data.activities[].id` on write
3. Add reconciliation service if both are kept

---

## Updated Design Decision

### Before (Proposed in system-design-spec-v1.md)

```prisma
model JournalEntry {
  // NEW: Activity provenance (US-1)
  activityIds          String[]  @default([])
  groupingMethod       String?   @default("auto")
  lastGroupingEditAt   DateTime?
}
```

### After (Risk-Mitigated)

```prisma
// NO CHANGE to JournalEntry - avoid dual source of truth

model DemoJournalEntry {
  // Activity provenance (demo-only)
  activityIds          String[]  @default([])
  groupingMethod       String?   @default("auto")
  lastGroupingEditAt   DateTime?
}
```

---

## Decision Matrix

| Change | Risk | Impact on Existing Flow | Recommendation |
|--------|------|-------------------------|----------------|
| Add `activityIds` to `JournalEntry` | HIGH | Creates dual source of truth | **DEFER** |
| Add `activityIds` to `DemoJournalEntry` | LOW | No impact (new table) | **DO** |
| Add `activityIds` to `StoryCluster` | LOW | No existing data | **DO** |
| Add `activityIds` to `DemoStoryCluster` | LOW | No impact | **DO** |
| Modify Zod schemas for journal | MEDIUM | Must be backwards compatible | **DEFER** |

---

## Action Items

1. **Update system-design-spec-v1.md** to remove `activityIds` from `JournalEntry`
2. **Keep `activityIds` on demo tables only** (`DemoJournalEntry`, `DemoStoryCluster`)
3. **Document deferred work** for post-demo reconciliation
4. **Add to gate-3-result.md** as accepted technical debt

---

## Approval

**Risk Assessment Status:** Complete
**Reviewer:** The Technical Reviewer (Architect persona)
**Decision:** Proceed with minimal-change approach to protect existing journal flow
