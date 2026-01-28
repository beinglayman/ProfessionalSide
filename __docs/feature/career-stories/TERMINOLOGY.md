# Career Stories Terminology

**PGC + GSE Decision: January 2026**

---

## The Problem

We had a nomenclature mess:
- "journal entry" vs "activity" vs "tool activity" vs "work stream entry" vs "entry" vs "enhanced entry"
- Used interchangeably across docs, code, and UI concepts
- Collision with existing `JournalEntry` model (user-written journal entries)

### Current State Audit

**Database (Prisma schema):**
- `JournalEntry` — User-written journal content (EXISTING, ~30 references)
- `ToolActivity` — Data from external tools (NEW, correct name)
- `StoryCluster` — Grouped activities (NEW, correct name)
- `CareerStory` — STAR narrative (NEW, correct name)

**UI Components (MCP folder):**
- Uses "activity" and "activities" heavily (correct for tool data)
- Uses "entry" for journal entries (correct)
- User-facing text: "work activity", "journal entry" (good)

**Docs (01-DEFINE.md):**
- Uses "entry/entries" 100+ times for BOTH concepts (BAD)
- "Enhanced Entry", "Entry Persistence", etc. (confusing)

---

## The Decision

### One Term Per Concept

| Concept | Code (Prisma/Services) | API Responses | User-Facing (UI) | Tech Docs |
|---------|------------------------|---------------|------------------|-----------|
| Data from GitHub/Jira/etc | `ToolActivity` | `activities` | **activity** | "tool activity" |
| User-written journal | `JournalEntry` | `entries` | **journal entry** | "journal entry" |
| Group of related activities | `StoryCluster` | `clusters` | **cluster** | "story cluster" |
| STAR narrative | `CareerStory` | `stories` | **career story** | "career story" |

### Why "Activity" (not "Work Item")

After reviewing existing UI code, the pattern is already established:
- MCP components use "activity" everywhere
- `MCPActivityReview.tsx`, `AnalyzedActivity` interface
- User sees "Fetch recent **activity** from your GitHub account"
- "Import work **activity**"

**GSE says:** Don't invent new terms. The codebase already uses "activity". Ship it.

### Disambiguation

| When you mean... | Say... | NOT... |
|------------------|--------|--------|
| PR/ticket/commit from a tool | "activity" or "tool activity" | "entry" |
| User-written reflection | "journal entry" | "entry" (ambiguous) |
| Never say... | — | "enhanced entry", "work stream entry", "entry" alone |

---

## Banned Terms

| Term | Why Banned | Use Instead |
|------|------------|-------------|
| "entry" (alone) | Ambiguous — JournalEntry or ToolActivity? | "activity" or "journal entry" |
| "enhanced entry" | Implementation jargon from old design | "activity" or "tool activity" |
| "work stream entry" | Corporate jargon, three words | "activity" |
| "work item" | Not established in codebase | "activity" |
| "EnhancedEntry" | Old model name | `ToolActivity` |

---

## Code Conventions

### Prisma Models
```prisma
model ToolActivity { ... }    // Correct
model StoryCluster { ... }    // Correct
model CareerStory { ... }     // Correct
```

### Service/Controller Names
```typescript
// File names
activity-persistence.service.ts  // ✓ (internal, "activity" ok)
clustering.service.ts           // ✓

// Method names
persistActivity()              // ✓
getActivities()                // ✓
clusterActivities()            // ✓ (verb form ok)

// Variable names
const activities = ...         // ✓ (internal)
const workItems = ...          // ✓ (if mapping to UI)
```

### API Response (User-Facing)
```json
{
  "workItems": [...],           // ✓ User-facing
  "clusters": [...],            // ✓
  "stories": [...]              // ✓
}
```

### Internal API Paths
```
GET /api/v1/career-stories/activities     // ✓ (internal path, "activities" ok)
GET /api/v1/career-stories/clusters       // ✓
POST /api/v1/career-stories/stories       // ✓
```

---

## Documentation Rules

1. **User-facing docs** (README, help text, UI copy): Use "work item", "cluster", "career story"
2. **Technical docs** (architecture, API spec): Use code names `ToolActivity`, `StoryCluster`, `CareerStory`
3. **Mixed docs** (like 00-CONCEPT.md): Use code names with user term in parentheses on first mention

### Example
> The `ToolActivity` model (shown to users as "work items") stores data fetched from GitHub, Jira, and other tools.

---

## Migration Checklist

**Code (Already Correct):**
- [x] Prisma: `ToolActivity`, `StoryCluster`, `CareerStory`
- [x] Services: `ActivityPersistenceService`, `ClusteringService`
- [x] Controller: `career-stories.controller.ts`
- [x] Routes: `/api/v1/career-stories/activities/*`

**Docs (Need Cleanup):**
- [ ] 00-CONCEPT.md: Replace "entry/entries" (when referring to tool data) with "activity/activities"
- [ ] 01-DEFINE.md: Major cleanup needed
  - Epic names: "Entry Persistence" → "Activity Persistence"
  - "EnhancedEntry" → "ToolActivity"
  - "enhanced_entries table" → "tool_activities table"
  - Keep "journal entry" for user-written content
- [ ] User story language cleanup

**UI (Already Correct):**
- [x] MCP components use "activity" for tool data
- [x] Journal components use "entry" for user content

---

## Sign-off

- **PGC verdict:** "Work item" is the simplest user-facing term. One word would be better but "item" alone is too vague.
- **GSE verdict:** Keep `ToolActivity` in code. Don't rename Prisma models. Fix docs in 15 minutes. Ship.
