# Technical Review: System Design Spec v1

**Stage:** Design System (D₂ᵦ) - Phase 2
**Reviewer:** The Technical Reviewer (Senior Architect persona)
**Date:** 2026-01-30

---

## Evaluation Criteria

| Criterion | Weight | Score | Notes |
|-----------|--------|-------|-------|
| **Scalability** | 20% | 90% | Separate demo tables good. Consider index on `activityIds` array |
| **Security** | 20% | 95% | User ownership verified, data isolation strong |
| **Maintainability** | 15% | 90% | Shared EditActivitiesModal is good design |
| **Performance** | 15% | 85% | Batch inserts good, but 65+ activities + clustering may be slow |
| **Operability** | 15% | 90% | Clear migration path, rollback plan solid |
| **Feasibility** | 10% | 95% | Builds on existing patterns, no new technologies |
| **UX Alignment** | 5% | 100% | Maps directly to user stories |

**Weighted Score: 91%**

---

## Review Findings

### Issue 1: Array Field Indexing (Medium)

**Description:** `activityIds` is stored as `String[]` in Prisma/PostgreSQL. Array contains-queries can be slow without proper indexing.

**Recommendation:** Add GIN index for array queries:
```sql
CREATE INDEX idx_demo_journal_entries_activity_ids
ON demo_journal_entries USING GIN (activity_ids);
```

**Resolution:** ✅ Accepted - Add to migration

### Issue 2: Sync Performance (Low)

**Description:** Seeding 65+ activities, running clustering, AND creating journal entries in one request may exceed 5s target on cold start.

**Recommendation:** Consider progress streaming or chunked response:
```typescript
// Option A: SSE for progress
// Option B: Return immediately, poll for status
```

**Resolution:** ✅ Accepted with caveat - Monitor in practice, optimize if needed. Current modal shows progress steps which provides feedback.

### Issue 3: Missing Journal Entry Seeding Logic (Medium)

**Description:** Design mentions `seedDemoData` will create journal entries but doesn't specify the grouping logic (time-based? random?).

**Recommendation:** Specify in design:
```typescript
// Journal entry seeding strategy:
// - Create 4-6 entries spanning the activity time range
// - Each entry covers ~2 weeks of activities
// - Group by time proximity (activities within 7 days)
```

**Resolution:** ✅ Accepted - Add journal seeding spec to design

### Issue 4: Concurrent Edit Race Condition (Low)

**Description:** If user rapidly clicks add/remove in EditActivitiesModal, concurrent PATCH requests could cause inconsistent state.

**Recommendation:**
- Frontend: Disable buttons during save
- Backend: Use optimistic locking or last-write-wins (acceptable for demo)

**Resolution:** ✅ Noted - Frontend debouncing is sufficient for demo

### Issue 5: LLM Error Response Schema (Minor)

**Description:** Error response includes `retryAfter: 60` but this isn't documented in the API spec.

**Recommendation:** Document the retry-after header/field in error responses.

**Resolution:** ✅ Accepted - Add to API spec

---

## Key Questions Answered

| Question | Answer |
|----------|--------|
| Can it handle 10x growth? | Yes - demo data per-user, no cross-user queries |
| Are there single points of failure? | LLM is external dependency, handled with retry + fallback |
| Is it secure by design? | Yes - all queries scoped to authenticated userId |
| Can it be monitored? | Yes - existing audit logs, add LLM latency metrics |
| Can we build with available resources? | Yes - extends existing services |

---

## Revision Requests

1. **Add GIN index** for `activityIds` array fields in migration
2. **Add journal entry seeding specification** to design doc
3. **Document `retryAfter`** in error response schema

---

## Decision

**APPROVE with minor revisions**

The design is solid, builds on existing patterns, and appropriately isolates demo data. Minor revisions needed before Gate 3.
