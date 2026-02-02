# Technical Review v2: Activity Stream & Draft Stories

**Reviewer:** The Technical Reviewer (Checker) + API Nerd
**Date:** 2026-01-31
**Artifact Reviewed:** system-design-spec-v2.md

---

## Review History

| Version | Reviewer | Score | Outcome |
|---------|----------|-------|---------|
| v1 | Technical Reviewer | 8.5/10 | APPROVE with recommendations |
| v2 | API Nerd | 6.5→8.5/10 | APPROVE after fixes applied |

---

## API Nerd Review (Applied)

### Issues Fixed

| Issue | Severity | Resolution |
|-------|----------|------------|
| `/activities/by-source` and `/by-temporal` are verbs disguised as resources | HIGH | Renamed to `/activity-stats?groupBy=source\|temporal` |
| Redundant `X-Demo-Mode` header on `/activities` | HIGH | Removed; `sourceMode` derived from journal entry |
| Missing `source` filter on activities endpoint | MEDIUM | Added `?source=github` query param |
| Inconsistent response envelope | MEDIUM | Standardized `{data, meta}` across all endpoints |
| Overlapping temporal buckets | MEDIUM | Changed to mutually exclusive buckets |
| Missing cache headers | LOW | Added `Cache-Control` and `ETag` |
| Missing pagination on source groups | LOW | Added `maxSources: 20` limit |
| Query param for identity | LOW | Changed to path param: `/journal-entries/:id/activities` |

### API Nerd Score: 6.5/10 → 8.5/10 (after fixes)

---

## Evaluation Criteria (Updated)

| Criterion | Weight | Score | Notes |
|-----------|--------|-------|-------|
| Scalability | 20% | 8/10 | Pagination, bounded source groups (max 20) |
| Security | 20% | 9/10 | User ownership checks, sourceMode derived from data |
| Maintainability | 15% | 9/10 | Honest resource naming, clear sub-resource pattern |
| Performance | 15% | 9/10 | Single SQL for temporal buckets, cache headers |
| Operability | 15% | 8/10 | ETags enable conditional requests |
| Feasibility | 10% | 9/10 | Uses existing tables, no schema changes |
| API Design | 5% | 9/10 | REST-compliant, honest naming |

**Weighted Score: 8.7/10** (up from 8.5)

---

## Key Improvements in v2

### 1. Honest Resource Naming
```diff
- GET /api/v1/activities/by-source
- GET /api/v1/activities/by-temporal
+ GET /api/v1/activity-stats?groupBy=source
+ GET /api/v1/activity-stats?groupBy=temporal
```
Stats are aggregations, not activities. The URL now reflects this.

### 2. Sub-Resource Pattern
```diff
- GET /api/v1/activities?journalEntryId={id}
+ GET /api/v1/journal-entries/{id}/activities
```
Activities belong to journal entries. Path params for identity, query params for filtering.

### 3. Derived sourceMode
```diff
- X-Demo-Mode: true|false  // Client header
+ sourceMode from journalEntry.sourceMode  // Data-driven
```
Prevents header/data mismatches. The journal entry knows its mode.

### 4. Mutually Exclusive Temporal Buckets
```diff
- today: 0:00-23:59, this_week: Mon-Sun (overlapping!)
+ today: 0:00-23:59, this_week: Mon-day_before_yesterday (exclusive)
```
Each activity belongs to exactly one bucket. Counts are accurate.

### 5. Cache Headers
```http
Cache-Control: private, max-age=60
ETag: "stats-1706745600"
```
Enables conditional requests and reduces unnecessary API calls.

---

## Remaining Recommendations

### 1. Verify Error Classes (Carry-over from v1)
```typescript
// Ensure these exist:
export class NotFoundError extends Error { statusCode = 404; }
export class ForbiddenError extends Error { statusCode = 403; }
```

### 2. Add Request Logging (Carry-over from v1)
```typescript
// Log timing for performance monitoring
logger.info('activity-stats', { groupBy, duration: ms });
```

### 3. Consider Conditional Request Support
```typescript
// Check If-None-Match header
if (req.headers['if-none-match'] === etag) {
  return res.status(304).end();
}
```

---

## Test Scenarios (Updated)

### API Contract Tests
- [x] `GET /journal-entries/:id/activities` returns paginated results
- [x] `GET /journal-entries/:id/activities?source=github` filters by source
- [x] `GET /journal-entries/:id/activities` returns 404 for non-existent entry
- [x] `GET /journal-entries/:id/activities` returns 403 for other user's entry
- [x] `GET /activity-stats?groupBy=source` returns max 20 sources
- [x] `GET /activity-stats?groupBy=temporal` returns mutually exclusive buckets
- [x] Temporal buckets respect user timezone
- [x] Response includes `Cache-Control` and `ETag` headers

### Security Tests
- [x] Activities only returned for journal entries owned by user
- [x] sourceMode derived from data, not header
- [x] Input validated with Zod schemas

---

## Decision

**APPROVE** — Proceed to Gate 3 Re-evaluation

The v2 design addresses all API Nerd concerns. The API is now REST-compliant with honest naming, proper sub-resource patterns, and secure sourceMode derivation.

---

## Summary of Changes

| Endpoint (v1) | Endpoint (v2) | Change |
|---------------|---------------|--------|
| `GET /activities?journalEntryId=...` | `GET /journal-entries/:id/activities` | Path param for identity |
| `GET /activities/by-source` | `GET /activity-stats?groupBy=source` | Honest naming for aggregations |
| `GET /activities/by-temporal` | `GET /activity-stats?groupBy=temporal` | Honest naming for aggregations |
| `GET /journal` | `GET /journal` | No change (enhanced in v1) |
