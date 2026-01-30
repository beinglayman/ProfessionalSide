# Requirements Document: Career Stories Demo Mode v1

**Stage:** Define (D₁)
**Date:** 2026-01-30
**Status:** Gate 2 PASSED

---

## Project Context

Career Stories is a feature that helps users create compelling STAR narratives from their work activities for job interviews and performance reviews. Demo mode enables showcasing the full pipeline during YC pitch without requiring real integrations.

---

## 1. Scope Statement

### In Scope
- Schema migrations adding `activityIds`, `groupingMethod`, `lastGroupingEditAt` fields
- `demo_journal_entries` table creation
- Expanded mock activities (60-90 days coverage)
- UI for editing cluster groupings (add/remove activities)
- UI for editing journal entry activity selection
- Journal page reads from demo entries when in demo mode
- Wiring "Generate" buttons to real LLM calls
- E2E testing of full flow

### Out of Scope
- Real integrations sync (post-demo)
- Scheduled eager sync with rate limiting (post-demo)
- Version history for narratives
- Diff view for regenerated content
- Merge/split cluster operations (phase 2 - manual add/remove sufficient for demo)

---

## 2. User Stories

### US-1: Schema Migration for Activity Provenance

```
AS A developer
I WANT activityIds tracked on both journal entries and story clusters
SO THAT we preserve provenance linking narratives to source activities

ACCEPTANCE CRITERIA:
- GIVEN the database schema
  WHEN I add activityIds field to JournalEntry model
  THEN it stores an array of activity IDs
- GIVEN the database schema
  WHEN I add groupingMethod field (enum: 'time'|'manual'|'ai_suggested')
  THEN it indicates how activities were grouped
- GIVEN the database schema
  WHEN I add lastGroupingEditAt timestamp
  THEN it tracks when user last edited the grouping

EDGE CASES:
- If activityIds is empty, entry was created without linked activities (legacy)
- If groupingMethod is null, assume 'auto' for backward compatibility

OUT OF SCOPE:
- Migrating existing entries (they remain without activityIds)
```

### US-2: Demo Journal Entries Table

```
AS A developer
I WANT a separate demo_journal_entries table
SO THAT demo data is isolated from real user data

ACCEPTANCE CRITERIA:
- GIVEN demo mode is enabled
  WHEN journal entries are created
  THEN they persist to demo_journal_entries table
- GIVEN the demo_journal_entries schema
  WHEN creating the table
  THEN it mirrors journal_entries with identical columns
- GIVEN a user disables demo mode
  WHEN they view journal entries
  THEN demo entries are not visible

EDGE CASES:
- If user toggles demo mode mid-session, page refreshes to show correct data

OUT OF SCOPE:
- Automatic cleanup of demo data
```

### US-3: Expanded Mock Activities

```
AS A YC pitch demonstrator
I WANT 60-90 days of synthetic activities
SO THAT the demo shows realistic longitudinal data

ACCEPTANCE CRITERIA:
- GIVEN demo mode is enabled
  WHEN activities are seeded
  THEN at least 60 unique activities are created
- GIVEN the synthetic activities
  WHEN viewing the data
  THEN activities span realistic time range (60-90 days)
- GIVEN the synthetic activities
  WHEN clustering runs
  THEN at least 3 clusters are created with 3+ activities each
- GIVEN the clustering result
  WHEN viewing cluster names
  THEN names are meaningful (not "Cluster 1", "Cluster 2")

EDGE CASES:
- If activities lack crossToolRefs, clustering may create many small clusters

OUT OF SCOPE:
- Activities from real API responses (synthetic only)
```

### US-4: Edit Cluster Grouping UI

```
AS A demo user
I WANT to add/remove activities from a story cluster
SO THAT I can curate which activities inform my STAR narrative

ACCEPTANCE CRITERIA:
- GIVEN I'm viewing a story cluster
  WHEN I click "Edit Activities"
  THEN I see a list of current activities with remove buttons
- GIVEN the edit modal is open
  WHEN I click remove on an activity
  THEN it's removed from the cluster (not deleted)
- GIVEN the edit modal is open
  WHEN I click "Add Activities"
  THEN I see available activities not in this cluster
- GIVEN I add an activity
  WHEN I save changes
  THEN groupingMethod updates to 'manual' and lastGroupingEditAt updates

EDGE CASES:
- If cluster has only one activity, warn user before allowing removal
- If no activities left after removal, cluster should be deletable

OUT OF SCOPE:
- Drag-and-drop reordering
- Bulk operations
```

### US-5: Edit Journal Activity Selection UI

```
AS A demo user
I WANT to modify which activities are included in a journal entry
SO THAT I can curate my work narrative accurately

ACCEPTANCE CRITERIA:
- GIVEN I'm viewing a journal entry
  WHEN I click "Edit Activities"
  THEN I see current activities with remove buttons
- GIVEN the edit modal is open
  WHEN I add/remove activities
  THEN the activityIds array updates accordingly
- GIVEN I save changes
  WHEN the modal closes
  THEN groupingMethod is 'manual' and lastGroupingEditAt updates
- GIVEN I modified activities
  WHEN I view the entry
  THEN I see a "Regenerate" button to update narrative

EDGE CASES:
- If entry has no activities and user removes all, entry can still exist (manual narrative only)

OUT OF SCOPE:
- Time range adjustment UI (phase 2)
```

### US-6: Journal Demo Mode Reads

```
AS A developer
I WANT the journal page to read from demo_journal_entries in demo mode
SO THAT demo and real data are cleanly separated

ACCEPTANCE CRITERIA:
- GIVEN demo mode is enabled
  WHEN journal list page loads
  THEN it queries demo_journal_entries table
- GIVEN demo mode is disabled
  WHEN journal list page loads
  THEN it queries regular journal_entries table
- GIVEN demo mode toggle
  WHEN user presses Cmd/Ctrl+E
  THEN page re-fetches from appropriate table

EDGE CASES:
- If demo_journal_entries is empty, show empty state with "Run Sync" CTA

OUT OF SCOPE:
- Automatic migration of entries between tables
```

### US-7: Real LLM Generation

```
AS A demo user
I WANT "Generate" buttons to make real LLM calls
SO THAT the demo shows actual AI narrative generation

ACCEPTANCE CRITERIA:
- GIVEN a story cluster
  WHEN I click "Generate STAR"
  THEN a real LLM call is made with cluster activities
- GIVEN a journal entry
  WHEN I click "Regenerate"
  THEN a real LLM call generates new narrative from activityIds
- GIVEN LLM generation succeeds
  WHEN narrative is returned
  THEN it displays with loading state during generation

EDGE CASES:
- If LLM call fails, show error with retry option (max 3 retries)
- If all retries exhausted, show "Generation unavailable, please try later"
- If rate limited, show remaining cooldown time

OUT OF SCOPE:
- LLM model selection
- Custom prompts
```

### US-8: E2E Flow Test

```
AS A developer
I WANT to verify the complete demo pipeline
SO THAT I'm confident it works for YC pitch

ACCEPTANCE CRITERIA:
- GIVEN a fresh demo state
  WHEN user clicks Sync
  THEN activities populate (60+ activities)
- GIVEN activities exist
  WHEN user navigates to Career Stories
  THEN they can generate clusters
- GIVEN clusters exist
  WHEN user edits cluster grouping
  THEN changes persist and groupingMethod updates
- GIVEN edited cluster
  WHEN user generates STAR
  THEN real LLM returns narrative based on updated activities
- GIVEN full flow complete
  WHEN user repeats for Journal
  THEN similar flow works for journal entries

EDGE CASES:
- Flow should work with no backend (local-only mode)

OUT OF SCOPE:
- Automated E2E tests in CI (manual verification acceptable)
```

---

## 3. Dependency Map

```
US-1 (Schema Migration)
  │
  ├──→ US-2 (Demo Journal Table) ─┐
  │                                │
  ├──→ US-4 (Edit Cluster UI) ────┼──→ US-7 (Real LLM) ──→ US-8 (E2E)
  │                                │
  ├──→ US-5 (Edit Journal UI) ────┤
  │                                │
  └──→ US-3 (Expanded Activities)─┘
              │
              └──→ US-6 (Journal Demo Reads)
```

---

## 4. Priority (MoSCoW)

| Story | Priority | Rationale |
|-------|----------|-----------|
| US-1 | MUST | Foundational - all editing features depend on this |
| US-2 | MUST | Required for demo data isolation |
| US-3 | MUST | Demo needs realistic data volume |
| US-4 | MUST | Core demo feature - cluster editing |
| US-5 | SHOULD | Important but could demo with read-only journal |
| US-6 | MUST | Demo must show journal in demo mode |
| US-7 | MUST | Core value prop - real LLM generation |
| US-8 | MUST | Validation before pitch |

---

## 5. Glossary

| Term | Definition |
|------|------------|
| **Tool Activity** | Immutable record of work from an integration (GitHub PR, Jira ticket, etc.) |
| **Story Cluster** | Editable grouping of related activities for career story generation |
| **Career Story** | STAR/CAR narrative generated from a cluster |
| **Journal Entry** | Periodic work summary with linked activities |
| **Grouping Method** | How activities were selected: 'auto', 'manual', 'time', 'ai_suggested' |
| **Provenance** | Traceability from narrative back to source activities |
| **Demo Mode** | Local testing mode with synthetic data and real LLM calls |

---

## 6. Recommended Implementation Order

1. US-1: Schema Migration (foundation)
2. US-2: Demo Journal Table
3. US-3: Expanded Mock Activities
4. US-4: Edit Cluster UI + US-5: Edit Journal UI (parallel)
5. US-6: Journal Demo Reads
6. US-7: Real LLM Generation
7. US-8: E2E Flow Test
