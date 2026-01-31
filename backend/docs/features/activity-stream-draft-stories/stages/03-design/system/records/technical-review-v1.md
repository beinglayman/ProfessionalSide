# Technical Review v1: Activity Stream & Draft Stories

**Reviewer:** The Technical Reviewer (Checker)
**Date:** 2026-01-31
**Artifact Reviewed:** system-design-spec-v1.md

---

## Evaluation Criteria

| Criterion | Weight | Score | Notes |
|-----------|--------|-------|-------|
| Scalability | 20% | 8/10 | Pagination handles growth; index recommendations solid |
| Security | 20% | 9/10 | User ownership checks, input validation with Zod |
| Maintainability | 15% | 9/10 | Clean service pattern, follows existing codebase conventions |
| Performance | 15% | 8/10 | Batch fetching good; temporal bucket queries could optimize |
| Operability | 15% | 8/10 | Standard patterns; could add more logging/metrics |
| Feasibility | 10% | 9/10 | Uses existing tables, no schema changes needed |
| UX Alignment | 5% | 9/10 | API design matches UI requirements well |

**Weighted Score: 8.5/10**

---

## Strengths

1. **No schema changes required** — Uses existing `activityIds[]` relationship, reducing migration risk

2. **Clean API design** — Three focused endpoints instead of one overloaded endpoint

3. **Demo/Production parity** — Same code path, different tables based on `sourceMode`

4. **Request-scoped services** — Follows established pattern in codebase (`JournalService`)

5. **Comprehensive security** — User ownership validation before any data access

6. **Source enumeration** — Centralized color/icon definitions prevent inconsistency

---

## Concerns & Recommendations

### Concern 1: Temporal Bucket Query Efficiency (Medium)

**Issue:** `getActivitiesGroupedByTemporal` makes 6 separate COUNT queries (one per bucket).

**Impact:** 6 round-trips to database for a single endpoint call.

**Recommendation:** Use a single raw SQL query with CASE statements:

```sql
SELECT
  CASE
    WHEN timestamp >= $today_start AND timestamp <= $today_end THEN 'today'
    WHEN timestamp >= $yesterday_start AND timestamp <= $yesterday_end THEN 'yesterday'
    -- ...etc
  END as bucket,
  COUNT(*) as count
FROM demo_tool_activities
WHERE user_id = $userId
GROUP BY bucket;
```

**Decision:** REVISE — Should optimize before merge, but not a blocker for Gate 3.

---

### Concern 2: Activity Count on JournalEntry (Low)

**Issue:** `getJournalEntriesWithActivityMeta` fetches counts per entry in a loop.

**Impact:** N+1 query pattern for large entry lists.

**Recommendation:** Batch the metadata fetch:

```typescript
// Instead of:
entries.map(e => getActivityMeta(e.id))

// Use:
const metaMap = await getActivityMetaForEntries(entries.map(e => e.id));
```

**Decision:** Already addressed in design (Section 8.2 shows batch approach). ✓

---

### Concern 3: Missing Error Handling Types (Low)

**Issue:** Custom errors like `NotFoundError`, `ForbiddenError` referenced but not defined.

**Recommendation:** Ensure these exist or define them:

```typescript
// src/errors/index.ts
export class NotFoundError extends Error { statusCode = 404; }
export class ForbiddenError extends Error { statusCode = 403; }
```

**Decision:** Implementation detail — APPROVE with note to verify error classes exist.

---

### Concern 4: Timezone Handling (Low)

**Issue:** Timezone string validation uses `isValidTimezone` but no fallback specified.

**Recommendation:** Add fallback behavior:

```typescript
const timezone = isValidTimezone(input.timezone)
  ? input.timezone
  : 'UTC';  // Safe fallback
```

**Decision:** APPROVE with recommendation to add logging when fallback used.

---

## Key Questions Answered

| Question | Answer |
|----------|--------|
| Can it handle 10x growth? | Yes — pagination, indexed queries, no unbounded fetches |
| Single points of failure? | No — standard request/response, no long-lived state |
| Secure by design? | Yes — user ownership checks, input validation |
| Can it be monitored? | Needs more logging; recommend adding request timing |
| Can we build with available resources? | Yes — uses existing patterns and tables |

---

## Test Scenarios for System Design

### API Contract Tests
- [ ] GET /activities returns paginated results
- [ ] GET /activities returns 404 for non-existent journal entry
- [ ] GET /activities returns 403 for other user's journal entry
- [ ] GET /activities/by-source returns all sources with counts
- [ ] GET /activities/by-temporal returns all buckets with counts
- [ ] Temporal buckets respect user timezone

### Integration Tests
- [ ] Demo mode queries DemoToolActivity table
- [ ] Production mode queries ToolActivity table
- [ ] Activity metadata enriches journal entries correctly

### Performance Tests
- [ ] 50 activities load under 500ms
- [ ] 100+ activities paginate correctly

---

## Decision

**APPROVE** — Proceed to Gate 3

The system design is solid, follows existing patterns, and addresses the core requirements. Minor optimizations (temporal bucket query) can be addressed during implementation.

---

## Recommendations for Development

1. **Optimize temporal bucket query** — Use single SQL with CASE statements
2. **Add request logging** — Include timing for performance monitoring
3. **Verify error classes** — Ensure `NotFoundError`, `ForbiddenError` exist
4. **Add timezone fallback logging** — Track when fallback to UTC occurs
