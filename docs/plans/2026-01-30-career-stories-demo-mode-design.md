# Career Stories Demo Mode - Design Brainstorm

## Problem Statement

We need a demo mode for Career Stories that:
1. Works locally without backend deployment
2. Allows testing the full pipeline (clustering, STAR generation, LLM polish)
3. Supports framework switching with real extraction logic
4. Does NOT affect other features (journal entries, etc.)

## Current State

- **Demo tables exist**: `demo_tool_activities`, `demo_story_clusters`, `demo_career_stories`
- **Frontend**: Uses client-side mock data in demo mode (no API calls)
- **Toggle**: Cmd/Ctrl+E switches between demo and live mode
- **Issue**: Client-side mock data doesn't exercise real pipeline code

## Requirements

1. **Isolation**: Demo mode only affects Career Stories, not journal entries or other features
2. **Real Pipeline**: Use actual clustering, STAR extraction, LLM polish code
3. **Framework Testing**: Switching frameworks should call real backend logic
4. **No Backend Deploy**: Should work without deploying backend changes
5. **Seed Data**: Need the 31 test activities seeded in demo tables

## Options to Discuss

### Option A: Feature-Scoped Demo Flag
- Pass `demo=true` only to `/career-stories/*` endpoints
- Backend career-stories service checks flag and uses demo tables
- Other features unaffected

### Option B: Demo User/Tenant
- Create a special demo user ID
- All demo data belongs to this user
- Switch user context in demo mode

### Option C: URL-Based Demo Mode
- `/career-stories?demo=true` triggers demo mode
- Backend reads from query param
- Scoped to career-stories routes only

### Option D: Separate Demo API Prefix
- `/api/v1/demo/career-stories/*` routes
- Completely separate route handlers
- More duplication but cleaner isolation

## Data Seeding Questions

1. When to seed demo data?
   - On first visit to demo mode?
   - Manual "Reset Demo" button?
   - Pre-seeded in migration?

2. Per-user or global demo data?
   - If per-user: each user gets their own demo clusters
   - If global: shared read-only demo data

3. Should demo STAR generation call LLM?
   - Cost implications
   - Could cache demo STAR results

## Open Questions

- [ ] How to handle LLM costs in demo mode?
- [ ] Should demo mode be available in production?
- [ ] How to reset demo data if user experiments?
- [ ] Should demo clusters be editable?

## Next Steps

1. Decide on isolation approach (A, B, C, or D)
2. Define seeding strategy
3. Implement backend changes
4. Update frontend to use real API in demo mode
