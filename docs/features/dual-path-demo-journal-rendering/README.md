# Dual-Path Demo Journal Rendering

**Feature Slug:** `dual-path-demo-journal-rendering`

**Status:** Implemented

---

## Summary

Display demo activities on screen using both temporal and cluster-based grouping methods, with the journal API automatically switching between demo/real tables based on demo mode.

## Key Changes

### Architecture

**Old Flow:**
```
Frontend (isDemoMode?) → calls /api/v1/demo/journal-entries → DemoJournalEntry table
Frontend (live mode)   → calls /api/v1/journal/entries     → JournalEntry table
```

**New Flow:**
```
Frontend → sends X-Demo-Mode header → /api/v1/journal/entries
Backend  → checks header → queries Demo* tables OR real tables
```

### Files Modified

| File | Change |
|------|--------|
| `src/lib/api.ts` | Added X-Demo-Mode header in request interceptor |
| `backend/src/middleware/demo-mode.middleware.ts` | New - helper to check demo mode |
| `backend/src/controllers/journal.controller.ts` | Check demo mode, route to demo tables |
| `backend/src/services/career-stories/demo.service.ts` | Added cluster-based entry seeding |
| `src/components/journal/journal-card.tsx` | Added grouping method badge |
| `src/types/journal.ts` | Added groupingMethod field |
| `src/hooks/useJournal.ts` | Removed demo branching (backend handles it) |

## UI Output

- **Temporal entries:** Blue badge "Daily" with Calendar icon
- **Cluster entries:** Purple badge "Clustered" with Network icon
- **Manual entries:** Gray badge "Manual" with Settings icon

## Verification

1. Toggle demo mode (Cmd/Ctrl+E)
2. Sync demo data (click Sync button)
3. View journal feed - should show both temporal AND cluster entries
4. Check badges - temporal entries show "Daily", cluster entries show "Clustered"
5. Toggle off demo mode - should show real entries (or empty if none)

## Expected Output

After sync, demo user should see ~4-5 journal entries:
- 1-2 **temporal entries**: "Week of Jan 15 - Jan 28" (14-day windows)
- 2-3 **cluster entries**: "AUTH-123: Authentication Work", "PERF-456: Performance Work"
