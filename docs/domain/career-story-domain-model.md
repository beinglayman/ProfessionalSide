# Career Story Domain Model

> Progressive disclosure: TL;DR → Data Model → Generation Pipeline → UI Rendering → Citations Gap Analysis

---

## TL;DR (30 seconds)

A **Career Story** is a structured narrative (STAR, SOAR, CAR, etc.) generated from **raw tool activities** (GitHub commits, Jira tickets, etc.) via an LLM pipeline. Each story has **sections** (situation, task, action, result...) with embedded **evidence** linking back to source activities. Stories are published to a profile organized as a **brag document**.

**Current evidence model**: `section.evidence[].activityId` — links narrative claims to raw activities.
**Missing**: No explicit citations for user inputs, wizard Q&A answers, or confidence tiers per source.

---

## Data Model (2 minutes)

### Entity Relationship

```
User
 ├── ToolActivity[]        (raw work: commits, PRs, tickets)
 │    ├── source            github | jira | confluence | slack | figma | outlook | google
 │    ├── sourceUrl?        link back to original (e.g., PR URL)
 │    ├── rawData?          full original payload (JSON)
 │    └── crossToolRefs[]   cross-references ("PROJ-123", "org/repo#42")
 │
 ├── StoryCluster[]         (grouped activities by similarity)
 │    └── activities[]       → ToolActivity (via clusterId FK)
 │
 ├── JournalEntry[]         (user's working notes, raw material)
 │    ├── activityIds[]      → ToolActivity (denormalized array)
 │    ├── fullContent?       rich narrative text
 │    ├── format7Data?       structured phases + components (JSON)
 │    └── groupingMethod     time | cluster | manual | ai
 │
 ├── CareerStory[]          (refined, publishable output)
 │    ├── journalEntryId?    → JournalEntry (provenance FK)
 │    ├── activityIds[]      → ToolActivity (denormalized array)
 │    ├── framework          STAR | STARL | CAR | PAR | SAR | SOAR | SHARE | CARL
 │    ├── sections           { [key]: { summary, evidence[] } }  (JSON)
 │    ├── archetype?         firefighter | architect | diplomat | multiplier | ...
 │    ├── category?          projects-impact | leadership | growth | external
 │    ├── role?              led | contributed | participated
 │    ├── visibility         private | workspace | network
 │    ├── isPublished        boolean
 │    └── verification?      [{ claim, status, suggestion }]  ← EXISTS BUT UNUSED
 │
 └── Follow[]               (one-way, 100-cap)
      └── followingId → User
```

### The Sections JSON (core data structure)

```typescript
// CareerStory.sections
{
  "situation": {
    "summary": "Dashboard had 8-second load times causing user complaints...",
    "evidence": [
      { "activityId": "act-1", "description": "Initial performance audit" },
      { "activityId": "act-2", "description": "User complaint ticket PERF-456" }
    ]
  },
  "action": {
    "summary": "I profiled queries, identified N+1 patterns, added caching...",
    "evidence": [
      { "activityId": "act-3", "description": "Query optimization PR #789" }
    ]
  },
  "result": {
    "summary": "Load time dropped from 8s to 1.2s (85% improvement)...",
    "evidence": []  // ← no activity linked (user-stated claim)
  }
}
```

### Key Schema Files

| File | What |
|------|------|
| `backend/prisma/schema.prisma` | Prisma models (CareerStory lines 1422-1482, ToolActivity 1367-1399) |
| `src/types/career-stories.ts` | Frontend types (CareerStory, CareerStorySection, WizardQuestion) |
| `backend/src/services/career-stories/career-story.service.ts` | Core CRUD + generation (1241 lines) |

---

## Generation Pipeline (5 minutes)

### Data Lineage

```
LAYER 1: External Tool                    LAYER 2: Raw Activity
GitHub PR merged ──────────────────────► ToolActivity {
                                           source: "github",
                                           sourceId: "pr-456",
                                           title: "add auth caching",
                                           rawData: { additions: 45, ... },
                                           crossToolRefs: ["INFRA-789"],
                                           sourceUrl: "https://github.com/..."
                                         }

LAYER 3: Journal Entry                   LAYER 4: Career Story
JournalEntry {                           CareerStory {
  activityIds: ["act-1","act-2"],          journalEntryId: "je-1",
  fullContent: "This sprint...",           framework: "STAR",
  format7Data: { phases: [...] },          sections: { situation: {...}, ... },
  groupingMethod: "cluster"                activityIds: ["act-1","act-2","act-3"]
}                                        }
     └──── promotion via wizard ────────────┘
```

### Three Generation Paths

| Path | Input | Quality | When Used |
|------|-------|---------|-----------|
| **LLM + journal content** | Journal fullContent + format7Data + activities | Best | Journal has rich text or phases |
| **Pattern matching** | Activity titles + descriptions | Medium | No journal content, just activities |
| **Template fallback** | Framework section names + basic info | Minimal | Both above fail |

### LLM Generation Flow

```
JournalEntry content ──► Handlebars template ──► Azure OpenAI (GPT-4o-mini) ──► JSON response
                         ├── {{framework}}        ├── temp: 0.7                  ├── sections{}
                         ├── {{fullContent}}       ├── max_tokens: 2000          ├── title
                         ├── {{phases}}            └── quality: balanced         └── role
                         ├── {{style}}
                         ├── {{archetype}}
                         └── {{userPrompt}}
```

Template files:
- System: `backend/src/services/ai/prompts/templates/career-story-system.prompt.md`
- User: `backend/src/services/ai/prompts/templates/career-story-user.prompt.md`

### Regeneration (FormatSwitchModal)

User can re-run generation with different knobs:
- **Framework**: STAR → SOAR (changes section structure)
- **Style**: professional → storytelling (changes tone)
- **Archetype**: architect → firefighter (changes narrative emphasis)
- **User prompt**: "Emphasize the technical challenges" (appended to LLM prompt)

API: `POST /api/v1/career-stories/stories/:id/regenerate`

---

## UI Rendering (5 minutes)

### Component Hierarchy

```
CareerStoriesPage (master-detail layout, 1194 lines)
├── StoryCard[]                 (list items, 202 lines)
│   ├── Title + preview text
│   ├── Status badge: Draft | Saved | Published · Network
│   ├── Framework chip (clickable → FormatSwitchModal)
│   ├── Activity count, speaking time, date
│   └── Key metrics (regex-extracted: percentages, dollar amounts)
│
├── NarrativePreview            (detail panel, 1620 lines)
│   ├── Header: title, status, archetype, role, stats
│   ├── Toolbar: framework selector, regenerate, edit, practice, copy, publish
│   ├── PracticeTimer (when enabled): section timings, elapsed vs target
│   ├── NarrativeSection[] (per framework section)
│   │   ├── Section label (Situation, Action, Result...)
│   │   ├── Narrative text with typography highlighting:
│   │   │   ├── Metrics → bold + amber       (\d+[%xX])
│   │   │   ├── Action verbs → bold indigo   (led, built, designed...)
│   │   │   ├── Design patterns → green + tooltip
│   │   │   └── Tech terms → dotted underline + tooltip
│   │   ├── Evidence links (collapsible):
│   │   │   ├── Tool icon (GitHub, Jira, etc.)
│   │   │   ├── Activity title (truncated)
│   │   │   └── External link if sourceUrl exists
│   │   └── Coaching tips (margin notes, desktop only)
│   └── Footer: polish status, suggestion count
│
├── FormatSwitchModal           (side-by-side comparison, 500+ lines)
│   ├── Left: Current narrative sections
│   ├── Right: New framework preview + guidelines
│   ├── Framework picker (3-column: Popular/Concise/Detailed)
│   ├── Writing style picker (4 pills)
│   ├── Archetype selector (grouped: Proactive/Reactive/People)
│   └── Optional user prompt (500 char limit)
│
└── PublishModal                (publish ceremony, 150+ lines)
    ├── Left: Story preview (title, sections, metrics)
    └── Right: Category picker (4 brag doc categories)
         → "Publish to Network" button
```

### How Evidence Renders Today

In `NarrativePreview.tsx:1565-1571`:
```typescript
// Story sections → STARComponent adapter
component = {
  text: section.summary,
  sources: section.evidence?.map((e) => e.activityId) || [],  // just IDs
  confidence: section.summary ? 0.8 : 0.3,
};
```

Then `NarrativeSection` renders evidence as a collapsible list of activity cards with tool icons and external links. **No distinction between source types** — all evidence looks the same regardless of whether it came from a GitHub commit (high confidence) or pattern matching (low confidence).

### What the User Sees on Profile

- `/profile/:userId` → "Published Work" tab
- Career stories grouped by brag doc category
- Each story shows: title, framework, archetype badge, role badge, section previews
- Drill-down to evidence chain: story → journal entry → raw activities

---

## Citations Gap Analysis (the task)

### Current State: Evidence ≠ Citations

The system tracks **evidence** (which activities support which sections), but this is NOT a citation system:

| What We Have | What's Missing |
|---|---|
| `evidence[].activityId` → raw activity link | No confidence tier per source |
| `evidence[].description` → free text | No source type classification |
| `verification[]` schema field (unused) | No user input tracking |
| `activityIds[]` on story level | No wizard Q&A persistence |
| `sourceUrl` on ToolActivity | No inline citation rendering |

### Three Citation Sources (from task spec)

```
Source Type              Confidence    Current Storage           Gap
─────────────────────────────────────────────────────────────────────────
1. Raw Activities        HIGH          ToolActivity table        ✓ Exists, needs confidence tag
   (GitHub commits,                    evidence[].activityId
   PR merges, Jira                     sourceUrl for deep link
   status changes)

2. User Inputs           UNVERIFIED    Nowhere persistent        ✗ Missing entirely
   (context from the                   (passed as prompt params,
   horse's mouth —                     lost after generation)
   "I led this because
   the team was short-
   staffed")

3. Wizard Q&A Answers    CONTEXTUAL    WizardAnswer type exists  ✗ Not persisted on story
   (D-I-G questions:                   in generate request body,
   "What was the real                  lost after generation)
   story?", "What almost
   went wrong?")
```

### Existing Schema Hooks (unused but available)

1. **`CareerStory.verification: Json?`** — Schema: `[{ claim, status, suggestion }]`. Designed for fact-checking claims against evidence. Never populated.

2. **`ToolActivity.rawData: Json?`** — Full original payload from source. Available but not used for citation display.

3. **`WizardQuestion` + `WizardAnswer` types** — Exist in frontend types, passed to generation endpoint, but answers are NOT stored on the resulting CareerStory.

### What "Citations Support" Would Mean

For each claim in a narrative section, trace it back to **where the information came from**:

```
"Load time dropped from 8s to 1.2s (85% improvement)"
                                    │
         ┌──────────────────────────┼──────────────────────┐
         ▼                          ▼                      ▼
[📊 GitHub PR #789]           [💬 User said:]         [❓ Wizard Q&A:]
"Performance metrics           "The team was             Q: "What metric
 show 85% reduction"           targeting sub-2s"         proves this?"
                                                         A: "Lighthouse
confidence: HIGH               confidence: UNVERIFIED     score went 32→89"
source: raw activity           source: user input        confidence: CONTEXTUAL
verifiable: yes (URL)          verifiable: no            verifiable: partially
```

---

## Appendix: Key File Index

| Layer | File | Lines | Purpose |
|-------|------|-------|---------|
| **Schema** | `backend/prisma/schema.prisma` | 1422-1482 | CareerStory model |
| **Schema** | `backend/prisma/schema.prisma` | 1367-1399 | ToolActivity model |
| **Types** | `src/types/career-stories.ts` | 243-267 | CareerStory + CareerStorySection |
| **Types** | `src/types/career-stories.ts` | 301-351 | WizardQuestion, WizardAnswer, WizardGenerateResponse |
| **Service** | `backend/src/services/career-stories/career-story.service.ts` | full | Story CRUD + generation |
| **Service** | `backend/src/services/career-stories/story-publishing.service.ts` | full | Publish/unpublish/visibility |
| **Pipeline** | `backend/src/services/career-stories/pipeline/star-extractor.ts` | full | Pattern matching extractor |
| **Pipeline** | `backend/src/services/career-stories/pipeline/narrative-extractor.ts` | full | Framework-aware extraction |
| **Prompts** | `backend/src/services/ai/prompts/templates/career-story-system.prompt.md` | full | LLM system prompt |
| **Prompts** | `backend/src/services/ai/prompts/templates/career-story-user.prompt.md` | full | LLM user prompt (Handlebars) |
| **Prompts** | `backend/src/services/ai/prompts/career-story.prompt.ts` | full | Framework sections + archetype guidance |
| **UI** | `src/components/career-stories/CareerStoriesPage.tsx` | 1194 | Master-detail layout |
| **UI** | `src/components/career-stories/NarrativePreview.tsx` | 1620 | Story detail + evidence rendering |
| **UI** | `src/components/career-stories/StoryCard.tsx` | 202 | Story list item |
| **UI** | `src/components/career-stories/FormatSwitchModal.tsx` | 500+ | Framework/style/archetype regeneration |
| **UI** | `src/components/career-stories/PublishModal.tsx` | 150+ | Category picker + publish |
| **Hooks** | `src/hooks/useCareerStories.ts` | full | React Query hooks + mutations |
| **API** | `src/services/career-stories.service.ts` | full | Frontend API client |
| **Controller** | `backend/src/controllers/career-stories.controller.ts` | 1162 | All REST endpoints |
| **Constants** | `src/components/career-stories/constants.ts` | full | Frameworks, archetypes, categories, quotes |
| **Tests** | `backend/src/services/career-stories/seed-pipeline.integration.test.ts` | full | Provenance chain verification |
| **Tests** | `backend/src/services/career-stories/unified-flow.integration.test.ts` | full | Full flow + provenance |
