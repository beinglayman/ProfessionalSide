# Concept Brief v1: Activity Stream & Draft Stories View

**Author:** The Visionary (Maker)
**Date:** 2026-01-31
**Status:** Draft

---

## 1. Problem Statement

Users cannot see the connection between their raw work activities and the Draft Stories (Journal Entries) created from them.

**Current state:**
- Raw activities sync from tools (GitHub, Jira, Teams, Outlook, Confluence, Figma, Slack)
- Activities automatically become Journal Entries (Draft Stories) via time or cluster grouping
- UI only shows Draft Stories — users cannot see *what went into them*
- No way to filter by source tool or explore raw evidence

**The pain:**
> "I see this journal entry about OAuth work, but I can't remember which PRs, tickets, or meetings contributed to it. I want to drill down into the actual activities."

---

## 2. User Persona Sketch

**Name:** Sarah, Senior Software Engineer
**Context:** Uses WorkStream to document career achievements for promotion prep

**Goals:**
- Understand what work activities contribute to each Draft Story
- Filter activities by tool (GitHub for code, Jira for planning)
- See the temporal flow of work evidence
- Promote Draft Stories to polished Career Stories

**Frustrations:**
- Can't trace back Draft Stories to source activities
- All entries look the same regardless of source
- No visual hierarchy between raw activities and synthesized drafts

**Quote:**
> "I know I did great work on the auth migration, but the journal entry doesn't show me the 12 PRs and 8 Jira tickets that prove it."

---

## 3. Opportunity Hypothesis

**Why worth solving now:**

1. **Data exists** — `DemoToolActivity` / `ToolActivity` tables store raw activities
2. **Relationship exists** — `JournalEntry.activityIds[]` links to source activities
3. **UX validated** — Demo-v2 prototypes prove the pattern works
4. **Blocks monetization** — Career Stories promotion requires visible source material

**Market signal:** Users ask "where did this come from?" — evidence discoverability is an unmet need.

**Timing:** This unlocks the Career Stories Creation Flow feature (separate CD6 project).

---

## 4. Solution Directions

### Direction A: Two-Column Master-Detail (Recommended)
```
┌─────────────────────┬───────────────────────────────────────────┐
│  [By Source]  [By Temporal]                          (tabs)    │
├─────────────────────┬───────────────────────────────────────────┤
│ Draft Stories       │  Raw Activities Stream                    │
│ (Left Column)       │  (Right Panel)                            │
│                     │                                           │
│ ┌───────────────┐   │  ┌─────────────────────────────────────┐  │
│ │ Week of Jan 27│◄──┼──│ PR #1247 merged (GitHub)            │  │
│ │ 5 activities  │   │  │ Meeting: API review (Teams)         │  │
│ └───────────────┘   │  │ PLAT-892 closed (Jira)              │  │
│                     │  └─────────────────────────────────────┘  │
└─────────────────────┴───────────────────────────────────────────┘
```

**Pros:** Clear mental model, matches demo-v2, incremental buildable
**Cons:** Requires two-column responsive layout

### Direction B: Unified Stream with Grouping
Single timeline with collapsible Draft Story groups, each expandable to show activities.

**Pros:** Simpler layout, mobile-friendly
**Cons:** Loses side-by-side comparison, harder to scan

### Direction C: Graph Visualization
Visual network of activities → Draft Stories → Career Stories.

**Pros:** Powerful for complex relationships
**Cons:** High complexity, long build time, overkill for MVP

**Recommendation:** Direction A (Two-Column Master-Detail)

---

## 5. Value Proposition Draft

> **See exactly what work evidence powers your Draft Stories.**
>
> Filter by tool, explore by time, click any Draft Story to reveal the raw activities that created it. Full traceability from connected tools to career narratives.

---

## 6. Success Vision

When this succeeds:

1. **Traceability** — Users click a Draft Story and immediately see "this came from 5 GitHub PRs and 2 Jira tickets"

2. **Filtering** — "Show me only Draft Stories with GitHub evidence" works

3. **Trust** — Users verify source material, building confidence in the system

4. **Flow** — Clear visual path: Raw Activity → Draft Story → Career Story

5. **Engagement** — Users explore their work history, discovering forgotten contributions

---

## 7. Key Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Performance with 100+ activities per Draft Story | Medium | High | Pagination, virtual scroll |
| Confusing "By Source" semantics | Medium | Medium | Clear UI labels, tooltips |
| Demo vs Production data mismatch | Low | Medium | Unified `sourceMode` pattern |

---

## 8. Data Model Alignment

**Existing models support this feature:**

```
DemoToolActivity / ToolActivity
├── id, userId, source, sourceId
├── title, description, timestamp
├── crossToolRefs[]
└── rawData (JSON)

JournalEntry (Draft Story)
├── id, userId, title, description
├── activityIds[]          ← Links to raw activities
├── groupingMethod         ← 'time' | 'cluster'
├── clusterRef             ← e.g., 'AUTH-123'
├── timeRangeStart/End
└── sourceMode             ← 'demo' | 'production'
```

**No schema changes required** — relationships already exist.

---

## 9. Demo Reference

Design patterns from demo-v2 prototypes:
- `__docs/plans/.../demo-v2/index.html` — Activity Stream, filtering, tree-lines
- `__docs/plans/.../demo-v2/styles.css` — Source colors, card styling

---

## Next Steps

1. **Checker Review** — Strategist validates strategic fit
2. **Gate 1** — Pass/fail decision
3. **Define Stage** — User stories and acceptance criteria
