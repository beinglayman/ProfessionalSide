# Unified Service Architecture

> **Status: IMPLEMENTED** (2026-01-31)
>
> This architecture has been fully implemented. See the Implementation Summary below.

## The Problem (SOLVED)

We had **two separate services** with **different contracts**:

```
DemoService  → getDemoJournalEntries() → Demo Tables → Different shape
JournalService → getJournalEntries()   → Real Tables → Different shape
```

This was wrong. Demo mode should NOT be a separate service with its own contract.

---

## The Correct Architecture (IMPLEMENTED)

```
JournalService (ONE service, ONE contract)
    ↓
    if (isDemoMode) → query Demo Tables
    else            → query Real Tables
    ↓
Same response shape for both
```

### Key Principles

1. **Demo tables are exact mirrors of real tables** - same schema, same relationships
2. **Service layer is agnostic** - doesn't know demo vs real, just queries the right tables
3. **Demo data is just seeded data** - not a different format, just pre-populated
4. **One contract everywhere** - frontend never knows the difference

---

## Current State (What's Wrong)

| Aspect | Current | Should Be |
|--------|---------|-----------|
| Demo journal entries | `DemoService.getDemoJournalEntries()` | `JournalService.getJournalEntries()` with demo flag |
| Response shape | Different (hardcoded fields) | Identical to real |
| `groupingMethod` field | Only in demo | In both (real schema) |
| Prisma queries | Separate demo queries | Same query, different table |

---

## Implementation Plan

### Phase 1: Align Demo Tables to Real Tables

Ensure `DemoJournalEntry` has **exact same fields** as `JournalEntry`:

```prisma
model DemoJournalEntry {
  // Must match JournalEntry exactly
  id            String   @id @default(cuid())
  title         String
  description   String
  fullContent   String
  // ... ALL fields from JournalEntry ...

  // Plus the new dual-path fields (add to BOTH models)
  groupingMethod   String?
  activityIds      String[]
  timeRangeStart   DateTime?
  timeRangeEnd     DateTime?
}

model JournalEntry {
  // ... existing fields ...

  // Add dual-path fields here too
  groupingMethod   String?
  activityIds      String[]
  timeRangeStart   DateTime?
  timeRangeEnd     DateTime?
}
```

### Phase 2: Unified Query Layer

Create a table selector that JournalService uses:

```typescript
// backend/src/lib/demo-tables.ts
import { isDemoModeRequest } from '../middleware/demo-mode.middleware';

export function getJournalEntryTable(req: Request) {
  return isDemoModeRequest(req)
    ? prisma.demoJournalEntry
    : prisma.journalEntry;
}

export function getToolActivityTable(req: Request) {
  return isDemoModeRequest(req)
    ? prisma.demoToolActivity
    : prisma.toolActivity;
}
```

### Phase 3: Update JournalService

```typescript
// backend/src/services/journal.service.ts
async getJournalEntries(userId: string, filters: GetJournalEntriesInput, isDemoMode: boolean) {
  const table = isDemoMode ? prisma.demoJournalEntry : prisma.journalEntry;

  // SAME query logic for both
  const entries = await table.findMany({
    where: { /* same filters */ },
    include: { /* same relations */ },
  });

  // SAME transformation for both
  return this.transformEntries(entries);
}
```

### Phase 4: Remove DemoService Journal Methods

- Delete `getDemoJournalEntries()` from demo.service.ts
- Keep only seeding logic in demo.service.ts
- All reads go through JournalService

### Phase 5: Update Controller

```typescript
// backend/src/controllers/journal.controller.ts
export const getUserFeed = asyncHandler(async (req, res) => {
  const isDemoMode = isDemoModeRequest(req);
  const result = await journalService.getUserFeed(userId, filters, isDemoMode);
  sendPaginated(res, result.entries, result.pagination);
});
```

---

## Migration Required

```sql
-- Add dual-path fields to REAL JournalEntry table
ALTER TABLE journal_entries ADD COLUMN grouping_method VARCHAR;
ALTER TABLE journal_entries ADD COLUMN activity_ids TEXT[];
ALTER TABLE journal_entries ADD COLUMN time_range_start TIMESTAMP;
ALTER TABLE journal_entries ADD COLUMN time_range_end TIMESTAMP;
```

---

## Benefits of Unified Architecture

1. **One contract** - Frontend code is simpler
2. **One service** - Less code to maintain
3. **Testable** - Same tests work for both modes
4. **No contract drift** - Demo and real always match
5. **Seamless transition** - User can switch modes without UI changes

---

## Files to Modify

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add dual-path fields to JournalEntry |
| `backend/src/services/journal.service.ts` | Accept isDemoMode param, query correct table |
| `backend/src/controllers/journal.controller.ts` | Pass isDemoMode to service |
| `backend/src/services/career-stories/demo.service.ts` | Remove getDemoJournalEntries, keep only seeding |
| `backend/src/lib/demo-tables.ts` | New - table selector utility |

---

## What DemoService Should Contain (After Refactor)

Only seeding/setup logic:
- `seedDemoData()` - populate demo tables
- `clearDemoData()` - clean demo tables
- `seedDemoActivities()` - create mock activities
- `clusterDemoActivities()` - run clustering algorithm

**NOT** read operations - those go through the unified JournalService.

---

## Implementation Summary (Completed 2026-01-31)

### What Was Done

1. **Schema Migration**
   - Added dual-path fields to `JournalEntry`: `activityIds`, `groupingMethod`, `timeRangeStart`, `timeRangeEnd`, `generatedAt`, `lastGroupingEditAt`
   - Migration: `20260131083523_add_dual_path_fields_to_journal_entry`

2. **Unified JournalService**
   - `getJournalEntries(userId, filters, isDemoMode)` - routes to demo or production
   - `getUserFeed(userId, filters, isDemoMode)` - same unified interface
   - Private methods: `getDemoJournalEntries()`, `getProductionJournalEntries()`
   - Both return identical `JournalEntryResponse` shape

3. **Shared Response Type**
   - `JournalEntryResponse` interface in `journal.types.ts`
   - `JournalEntriesResponse` for paginated results
   - TypeScript enforces consistent shape

4. **Controller Update**
   - `getUserFeed` passes `isDemoMode` flag based on `X-Demo-Mode` header
   - Removed direct call to `getDemoJournalEntries`

5. **DemoService Cleanup**
   - Removed `getDemoJournalEntries()` function
   - Removed `DemoJournalEntryFormatted` type
   - DemoService now only handles seeding operations

6. **Frontend Alignment**
   - Removed `getDemoJournalEntries()` from frontend JournalService
   - API interceptor adds `X-Demo-Mode` header automatically
   - `useUserFeed` hook uses unified backend endpoint

### Test Coverage

- **Unit tests**: 15 tests in `journal.service.test.ts`
  - Response shape consistency
  - Edge cases (empty results, pagination boundaries, search)
  - Data isolation verification
- **Integration tests**: 15 tests in `demo-pipeline.integration.test.ts`
  - Full pipeline execution
  - Unified service verification
  - Provenance chain verification

### Architecture Diagram

```
Frontend (isDemoMode())
    ↓
api.interceptor → adds X-Demo-Mode: true header
    ↓
GET /api/v1/journal/feed (same endpoint)
    ↓
Controller: isDemoModeRequest(req)
    ↓
JournalService.getUserFeed(userId, filters, isDemoMode)
    ↓
    ├─ isDemoMode=true  → getDemoJournalEntries()
    │                     → prisma.demoJournalEntry
    │                     → transformDemoEntryToResponse()
    │
    └─ isDemoMode=false → getProductionJournalEntries()
                          → prisma.journalEntry
                          → transform with relations
    ↓
Same JournalEntryResponse shape
```

### Known Limitations / TODOs

1. **Demo entries lack relations** - Demo tables don't have collaborators, reviewers, artifacts. These are returned as empty arrays.
2. **Social features disabled** - Demo entries always show `likes: 0`, `hasLiked: false`, etc.
3. **Skill extraction is heuristic** - Uses regex patterns, not actual skill tags from demo data.

### Files Modified

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Added dual-path fields to JournalEntry |
| `backend/src/services/journal.service.ts` | Unified getJournalEntries with isDemoMode |
| `backend/src/controllers/journal.controller.ts` | Pass isDemoMode to service |
| `backend/src/services/career-stories/demo.service.ts` | Removed getDemoJournalEntries |
| `backend/src/types/journal.types.ts` | Added JournalEntryResponse type |
| `backend/src/lib/demo-tables.ts` | New table selector utility |
| `src/services/journal.service.ts` | Removed getDemoJournalEntries |
| `src/hooks/useJournal.ts` | Uses unified getUserFeed |
| `src/lib/api.ts` | Adds X-Demo-Mode header |
