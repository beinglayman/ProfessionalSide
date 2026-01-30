# Demo Mode - Global App Design

## Problem Statement

Need demo mode for YC pitch that:
1. Works locally without backend deployment
2. Shows full pipeline: Sync → Journal entries → Career Stories clustering → STAR narratives
3. Clean UI (no demo banners) - looks like real app
4. Hidden Cmd/Ctrl+E toggle for developers
5. **Real pipeline execution** - not pre-baked, actual LLM calls

---

## Core Architecture: Unified Activity Model

### Principles

1. **Tool Activities = Single source of truth** (immutable raw facts)
2. **Groupings are user-editable** (both clusters and journal windows)
3. **LLM generates narratives on-demand** (not pre-baked)
4. **Provenance always preserved** (traceability to source activities)
5. **N:M relationship** - same activity can appear in multiple groupings

### Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         SYNC                                    │
│                                                                 │
│  Demo Mode: Seeds 45 synthetic activities (deterministic input) │
│  Real Mode: Fetches from integrations (GitHub, Jira, etc.)      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    TOOL ACTIVITIES                              │
│                 (Immutable raw facts)                           │
│                                                                 │
│  - source, sourceId, sourceUrl                                  │
│  - title, description, timestamp                                │
│  - crossToolRefs (for clustering)                               │
│  - rawData (full API response)                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┴────────────────────┐
         │                                         │
         ▼                                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                     GROUPINGS (User Editable)                   │
│                                                                 │
│  ┌─────────────────────┐         ┌─────────────────────┐        │
│  │   STORY CLUSTER     │         │   JOURNAL WINDOW    │        │
│  │                     │         │                     │        │
│  │ Initial: Algorithm  │         │ Initial: Time-based │        │
│  │ (clustering by refs)│         │ (or AI suggested)   │        │
│  │                     │         │                     │        │
│  │ User can:           │         │ User can:           │        │
│  │ • Add activity      │         │ • Add activity      │        │
│  │ • Remove activity   │         │ • Remove activity   │        │
│  │ • Merge clusters    │         │ • Change time range │        │
│  │ • Split cluster     │         │ • Merge windows     │        │
│  │ • Rename            │         │ • Rename            │        │
│  └─────────────────────┘         └─────────────────────┘        │
│                                                                 │
│  Same activity can exist in MULTIPLE groupings                  │
│  (different perspectives on same work)                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ User triggers "Generate"
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  LLM NARRATIVE GENERATION                       │
│                                                                 │
│  Input: Current grouping (whatever user configured)             │
│  Output: Narrative with provenance                              │
│                                                                 │
│  • Real LLM calls (not pre-baked)                               │
│  • User can regenerate anytime                                  │
│  • User can edit narrative manually                             │
│  • Multiple narratives possible for same grouping               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   PERSISTED ARTIFACTS                           │
│                                                                 │
│  Journal Entry                    Career Story                  │
│  ─────────────                    ────────────                  │
│  narrative: string                narrative: STAR               │
│  activityIds: [a,b,c]            clusterId → activityIds        │
│  timeRange: {start,end}          framework: STAR|CAR|...        │
│  groupingMethod: manual|auto     groupingMethod: manual|auto    │
│                                                                 │
│  Both preserve:                                                 │
│  • Provenance (which activities)                                │
│  • Generation metadata (when, how)                              │
│  • Edit history (who changed what)                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Correlator vs Clustering: Resolution

### The Problem

Two systems find relationships between activities:

1. **Correlator Agent** (Journal Pipeline) - AI-based, semantic
2. **Clustering Service** (Career Stories) - Graph-based, reference matching

### Decision

**Separate concerns, both user-editable:**

| Aspect | Journal Entry | Career Story |
|--------|---------------|--------------|
| Initial grouping | Time-based or AI-suggested | Ref-based clustering |
| User can edit | Yes - add/remove activities | Yes - add/remove activities |
| Narrative gen | LLM on-demand | LLM on-demand |
| Regenerate | Anytime | Anytime |

**They're parallel VIEWS, not competing truths:**
- Journal: "Here's what I did this week" (time-oriented)
- Cluster: "Here's a project" (reference-oriented)
- Same activity can appear in both
- User controls final grouping in both

---

## Data Model

### Tool Activity (Immutable)
```
Table: tool_activities / demo_tool_activities

id: string
userId: string
source: 'github' | 'jira' | 'confluence' | 'slack' | 'figma' | ...
sourceId: string
sourceUrl: string?
title: string
description: string?
timestamp: DateTime
crossToolRefs: string[]    ← For clustering algorithm
rawData: Json              ← Full API response
createdAt: DateTime
```

### Story Cluster (Editable Grouping)
```
Table: story_clusters / demo_story_clusters

id: string
userId: string
name: string

# Grouping (editable by user)
activityIds: string[]              ← User can add/remove
groupingMethod: 'auto' | 'manual' | 'hybrid'
lastGroupingEditAt: DateTime?

# Metadata
createdAt: DateTime
updatedAt: DateTime
```

### Career Story (Generated Narrative)
```
Table: career_stories / demo_career_stories

id: string
clusterId: string                  ← Provenance

# Narrative (editable by user)
framework: 'STAR' | 'CAR' | 'SOAR' | ...
situation: Json { text, sources, confidence }
task: Json { text, sources, confidence }
action: Json { text, sources, confidence }
result: Json { text, sources, confidence }

# Generation metadata
generatedAt: DateTime?
polished: boolean
lastEditedAt: DateTime?
lastEditedBy: string?
```

### Journal Entry (Editable Grouping + Narrative)
```
Table: journal_entries / demo_journal_entries

id: string
userId: string
workspaceId: string

# Grouping (editable by user)
activityIds: string[]              ← User can add/remove
timeRange: Json { start, end }?    ← User can adjust
groupingMethod: 'time' | 'manual' | 'ai_suggested'
lastGroupingEditAt: DateTime?

# Narrative (editable by user)
title: string
description: string
fullContent: string
networkContent: string?
format7Data: Json?

# Generation metadata
generatedAt: DateTime?
lastEditedAt: DateTime?
lastEditedBy: string?
```

---

## User Editing Flows

### Career Story - Edit Cluster Grouping
```
1. View cluster "OAuth2 Authentication" [A, B, C, D, E]
2. User: "Activity E doesn't belong here" → Remove E
3. User: "Missing activity F" → Add F
4. Cluster now: [A, B, C, D, F]
5. User: "Regenerate STAR"
6. New STAR generated from updated grouping
```

### Journal Entry - Edit Activity Selection
```
1. Create entry for "This week" [A, B, C, D]
2. User: "Also include activity E from last week" → Add E
3. User: "Activity C was minor, remove" → Remove C
4. Entry now covers: [A, B, D, E]
5. User: "Regenerate narrative"
6. New narrative generated from updated selection
```

### N:M Relationship (Valid)
```
Activity A ──┬──→ Cluster 1 "OAuth Project"
             ├──→ Cluster 2 "Security Initiatives"
             ├──→ Journal "Week 12 Summary"
             └──→ Journal "Q1 Retrospective"

Different perspectives on same work - all valid.
```

---

## Demo Mode Flow (Real Pipeline)

```
1. User clicks "Sync"
   └──→ Seeds 45 demo activities (synthetic but realistic)
   └──→ Activities appear in system

2. User goes to Career Stories
   └──→ Clicks "Generate Clusters"
   └──→ REAL clustering algorithm runs
   └──→ 3-5 clusters created based on crossToolRefs

3. User views/edits clusters
   └──→ Rename cluster
   └──→ Move activity between clusters
   └──→ Merge or split clusters

4. User selects cluster, clicks "Generate STAR"
   └──→ REAL LLM call (not pre-baked)
   └──→ STAR narrative generated
   └──→ User can edit text or regenerate

5. User goes to Journal
   └──→ Clicks "New Entry" → select activities or time range
   └──→ REAL LLM call generates narrative
   └──→ User can edit grouping or narrative
   └──→ User can regenerate anytime
```

---

## Implementation Status

### Done (Session 1) ✅
- [x] Global demo mode service (`src/services/demo-mode.service.ts`)
- [x] Demo sync service (`src/services/demo-sync.service.ts`)
- [x] Sync progress modal (`src/components/sync/SyncProgressModal.tsx`)
- [x] Demo tab in DevConsole (`src/components/dev/DemoTab.tsx`)
- [x] Unified DevConsole with Errors | Traces | Demo tabs
- [x] Sync button in Journal header
- [x] Backend demo routes (`backend/src/routes/demo.routes.ts`)
- [x] `syncDemoData` controller endpoint
- [x] Removed demo banner from CareerStoriesPage (clean UI)

### TODO (Next Session)
- [ ] Add `activityIds` field to JournalEntry schema
- [ ] Add `groupingMethod` and `lastGroupingEditAt` to both schemas
- [ ] Create `demo_journal_entries` table
- [ ] Expand mock activities to 60-90 days (currently 31)
- [ ] UI for editing cluster groupings (add/remove activities)
- [ ] UI for editing journal activity selection
- [ ] Journal page reads from demo entries in demo mode
- [ ] Wire "Generate" buttons to real LLM calls
- [ ] Test E2E: Sync → Edit Groupings → Generate → Edit Narrative

---

## Files Changed (Session 1)

### New Files
```
src/services/demo-mode.service.ts          ✅ Created
src/services/demo-sync.service.ts          ✅ Created
src/components/sync/SyncProgressModal.tsx  ✅ Created
src/components/dev/DemoTab.tsx             ✅ Created
backend/src/routes/demo.routes.ts          ✅ Created
```

### Modified Files
```
src/pages/journal/list.tsx                 ✅ Added Sync button + modal
src/components/dev/ErrorConsole.tsx        ✅ Added Demo tab
src/contexts/ErrorConsoleContext.tsx       ✅ Added 'demo' tab type
src/services/career-stories-demo-data.ts   ✅ Re-exports from global service
src/components/career-stories/CareerStoriesPage.tsx  ✅ Removed demo banner
backend/src/controllers/career-stories.controller.ts  ✅ Added syncDemoData
backend/src/app.ts                         ✅ Registered demo routes
```

### Removed Files
```
src/contexts/DemoModeContext.tsx           ✅ Removed (using ErrorConsoleContext)
src/components/demo/DemoModeModal.tsx      ✅ Removed (using DemoTab in DevConsole)
```

---

## Open Items (Deferred)

- [ ] Real mode sync from all integrations (post-demo)
- [ ] Scheduled eager sync with rate limiting (post-demo)
- [ ] Version history for narratives (nice-to-have)
- [ ] Diff view for regenerated content (nice-to-have)
