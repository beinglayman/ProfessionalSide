# Quick Sync on Connect — Implementation Plan

## Intent

After a user connects a tool via OAuth (e.g. GitHub), they currently land on a settings page with no data. The goal: **land them on the timeline with real data visible within 2-3 seconds**, then backfill the rest in the background.

Two-phase sync:
1. **Quick sync (blocking)** — 7 days, max 25 activities, no clustering/narratives, persist only → redirect to timeline
2. **Full sync (background)** — 30 days, no limit, full pipeline (clustering + LLM narratives) → SSE updates timeline live

## Pre-Implementation: Explore First

Before writing any code, the implementing agent MUST read and understand these files:

### Backend (sync pipeline)
- `backend/src/controllers/mcp.controller.ts` lines 1824-1956 — `syncAndPersist` handler, date range parsing, tool loop
- `backend/src/services/career-stories/production-sync.service.ts` lines 167-283 — `runProductionSync()` 5-step pipeline
- `backend/src/services/career-stories/production-sync.service.ts` lines 575-600 — `createProductionJournalEntries()` workspace lookup

### Frontend (OAuth callback + sync service)
- `src/pages/mcp/callback.tsx` — OAuth return handler, redirect logic
- `src/services/sync.service.ts` lines 336-465 — `runLiveSync()`, 4-phase progression
- `src/hooks/useSSE.ts` — SSE event listeners, query invalidation

### Frontend (timeline / destination page)
- `src/hooks/useActivities.ts` — activity query (what timeline needs to render)
- `src/components/dashboard/activity-timeline.tsx` — timeline component

## Changes

### 1. Backend: Add `quickMode` to sync endpoint

**File:** `backend/src/controllers/mcp.controller.ts`

In the `syncAndPersist` handler:
- Accept new body params: `quickMode?: boolean`, `maxActivities?: number`
- When `quickMode: true`:
  - Override `dateRange` to 7 days if not explicitly provided
  - After fetching activities from all tools, slice to `maxActivities` (default 25), keeping most recent first (sort by timestamp desc, then slice)
  - Call `runProductionSync()` with new option `{ quickMode: true }` which skips clustering + journal entry creation + narrative generation
  - Return immediately with `{ activityCount, activitiesBySource }` (no entries/narratives)

### 2. Backend: Add `quickMode` option to `runProductionSync`

**File:** `backend/src/services/career-stories/production-sync.service.ts`

In `runProductionSync()`:
- Accept `quickMode?: boolean` in options
- When `quickMode: true`: run Step 2 (persist activities) only, skip Steps 3-5 (clustering, journal entries, narratives)
- Return early with `{ activities: persistedCount, entries: [], temporalCount: 0, clusterCount: 0 }`

### 3. Frontend: New `runQuickSync()` function

**File:** `src/services/sync.service.ts`

Add a new exported function:
```typescript
export async function runQuickSync(toolTypes: string[]): Promise<{ activityCount: number }> {
  // POST /mcp/sync-and-persist with quickMode: true, maxActivities: 25
  // No phase callbacks, no progress UI — just await and return count
}
```

### 4. Frontend: OAuth callback triggers quick sync + redirect

**File:** `src/pages/mcp/callback.tsx`

On success:
- Instead of waiting 2s and redirecting to `/settings?tab=integrations`:
  1. Show "Importing your recent activity..." message
  2. Call `runQuickSync([tool])` — blocks for ~2-3s
  3. Navigate to `/journal` (timeline page)
  4. Fire `runLiveSync()` in background (fire-and-forget, no await) — this does the full 30-day sync with clustering + narratives
  5. SSE `data-changed` and `narratives-complete` events update the timeline automatically as full sync progresses

### 5. Frontend: Timeline handles incremental data

**No changes needed.** The timeline already:
- Fetches activities via `useActivities()`
- Listens for SSE `data-changed` events that invalidate the query
- Re-renders when new data arrives

## Verification

1. Connect GitHub via OAuth → see "Importing..." briefly → land on timeline with activities visible
2. Within 10-30s, more activities appear as full sync completes in background
3. Journal entries and narratives appear as background generation completes
4. Disconnect all tools, delete user (Cmd+E → E2E tab), re-register → full flow works end to end
5. Connect a second tool (e.g. Jira) → same quick-sync-then-full-sync pattern

## Edge Cases

- **No activities in last 7 days:** Quick sync returns 0 → still navigate to timeline, show empty state. Full sync will backfill 30 days.
- **OAuth fails:** Existing error handling in callback.tsx covers this — no sync attempted.
- **Quick sync fails:** Catch error, still navigate to timeline. Full sync will run and populate data.
- **Full sync already running:** The `runProductionSync` with `clearExisting: false` upserts, so duplicate activities are deduplicated by `(userId, source, sourceId)`.

## Files to modify

| File | What changes |
|------|-------------|
| `backend/src/controllers/mcp.controller.ts` | Accept `quickMode`, `maxActivities` params; slice activities when quick |
| `backend/src/services/career-stories/production-sync.service.ts` | `quickMode` option skips steps 3-5 |
| `src/services/sync.service.ts` | New `runQuickSync()` function |
| `src/pages/mcp/callback.tsx` | Quick sync on success → navigate to timeline → full sync in background |

## Files unchanged (reference only)

- `src/hooks/useSSE.ts` — already handles `data-changed` and `narratives-complete`
- `src/hooks/useActivities.ts` — already fetches and displays activities
- `src/components/dashboard/activity-timeline.tsx` — already renders timeline
- `backend/src/services/sse.service.ts` — already broadcasts events
