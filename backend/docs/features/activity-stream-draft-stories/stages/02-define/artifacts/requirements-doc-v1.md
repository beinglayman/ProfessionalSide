# Requirements Document v1: Activity Stream & Draft Stories View

**Author:** The Specifier (Maker)
**Date:** 2026-01-31
**Status:** Draft
**Traceability:** concept-brief-v1.md → Gate 1 PASS

---

## 1. Overview

### 1.1 Purpose
Enable users to view the connection between Draft Stories (Journal Entries) and the raw work activities that compose them, with filtering by source tool or temporal grouping.

### 1.2 Scope Statement

**In Scope:**
- Two-tab navigation: "By Source" and "By Temporal"
- Left column: Draft Stories list (clickable)
- Right panel: Raw Activities for selected Draft Story
- Tree-line visual connections between selected Draft Story and activities
- Source-branded activity cards (GitHub, Jira, Teams, etc.)
- Demo and Production mode support via `sourceMode`

**Out of Scope:**
- Career Story promotion wizard (separate feature)
- Activity editing or deletion
- Real-time sync from tools (uses existing sync)
- Mobile-specific layouts (responsive desktop/tablet only)
- Drag-and-drop reordering

### 1.3 Terminology

| Term | Definition |
|------|------------|
| Raw Activity | Individual event from a connected tool (PR, ticket, meeting, etc.) |
| Draft Story | = Journal Entry. Auto-generated grouping of raw activities |
| Source | Connected tool: GitHub, Jira, Teams, Outlook, Confluence, Figma, Slack |
| Temporal Grouping | Draft Stories grouped by time period (daily, weekly) |
| Cluster Grouping | Draft Stories grouped by cross-tool reference (e.g., AUTH-123) |

---

## 2. User Stories

### US-01: View Draft Stories List

```
AS A user viewing the Journal tab
I WANT to see a list of my Draft Stories in the left column
SO THAT I can select one to explore its source activities

ACCEPTANCE CRITERIA:
- GIVEN I am on the Journal tab
  WHEN the page loads
  THEN I see a list of Draft Stories in the left column

- GIVEN Draft Stories exist
  WHEN I view the list
  THEN each Draft Story shows: title, activity count, source icons

- GIVEN no Draft Stories exist
  WHEN I view the list
  THEN I see empty state: "Connect tools and sync to see your work"

EDGE CASES:
- If Draft Story has 0 activities (manual entry): show "Manual entry" badge
- If loading fails: show error with retry button

OUT OF SCOPE:
- Creating new Draft Stories from this view
- Deleting Draft Stories
```

**Priority:** MUST

---

### US-02: Filter by Temporal Tab

```
AS A user exploring my work history
I WANT to filter Draft Stories by time period
SO THAT I can find work from specific timeframes

ACCEPTANCE CRITERIA:
- GIVEN I click the "By Temporal" tab
  WHEN the tab activates
  THEN Draft Stories are grouped/sorted by time period

- GIVEN I am on the Temporal tab
  WHEN I view the list
  THEN I see both time-based and cluster-based Draft Stories

- GIVEN time-based Draft Story
  WHEN displayed
  THEN shows date range (e.g., "Jan 27-30, 2026")

- GIVEN cluster-based Draft Story
  WHEN displayed
  THEN shows cluster reference (e.g., "AUTH-123: OAuth2 Work")

EDGE CASES:
- If time range spans multiple months: show "Jan 27 - Feb 3"

OUT OF SCOPE:
- Date range picker filter
- Custom time period selection
```

**Priority:** MUST

---

### US-03: Filter by Source Tab

```
AS A user tracking work from specific tools
I WANT to filter Draft Stories by contributing source
SO THAT I can focus on code work (GitHub) or meetings (Teams)

ACCEPTANCE CRITERIA:
- GIVEN I click the "By Source" tab
  WHEN the tab activates
  THEN I see source filter buttons: All, GitHub, Jira, Teams, etc.

- GIVEN I select a source filter (e.g., "GitHub")
  WHEN the filter applies
  THEN only Draft Stories with GitHub activities are shown

- GIVEN a Draft Story has activities from multiple sources
  WHEN I filter by one source
  THEN the Draft Story is shown (it contains that source)

- GIVEN no Draft Stories match the filter
  WHEN I view the list
  THEN I see: "No stories with [Source] activities"

EDGE CASES:
- Source with 0 activities: show disabled/grayed filter button

OUT OF SCOPE:
- Multi-source selection (OR filter)
- Activity-level source filtering in right panel
```

**Priority:** MUST

---

### US-04: View Raw Activities for Selected Draft Story

```
AS A user who selected a Draft Story
I WANT to see all raw activities that compose it
SO THAT I can understand what work evidence created this story

ACCEPTANCE CRITERIA:
- GIVEN I click a Draft Story in the left column
  WHEN the selection activates
  THEN the right panel shows raw activities for that Draft Story

- GIVEN activities are loaded
  WHEN displayed
  THEN each activity shows: source icon, title, timestamp, description preview

- GIVEN the Draft Story has many activities
  WHEN first loaded
  THEN show first 20 activities with "Load more" button

- GIVEN Demo mode is active
  WHEN loading activities
  THEN query DemoToolActivity table

- GIVEN Production mode is active
  WHEN loading activities
  THEN query ToolActivity table

EDGE CASES:
- If Draft Story has 0 activities: show "This entry was created manually"
- If activities fail to load: show error with retry

OUT OF SCOPE:
- Activity search/filter within right panel
- Activity detail modal
```

**Priority:** MUST

---

### US-05: Visual Tree-Line Connections

```
AS A user viewing selected Draft Story's activities
I WANT to see visual lines connecting them
SO THAT the relationship is clear and scannable

ACCEPTANCE CRITERIA:
- GIVEN I select a Draft Story
  WHEN activities load in right panel
  THEN SVG tree-lines connect the Draft Story card to each activity

- GIVEN tree-lines are displayed
  WHEN I scroll the activity list
  THEN lines redraw to maintain connections

- GIVEN a source filter is active (By Source tab)
  WHEN tree-lines display
  THEN lines use the source's brand color

EDGE CASES:
- If right panel is collapsed/hidden: hide tree-lines
- If window resizes: redraw tree-lines

OUT OF SCOPE:
- Animated line drawing
- Line highlighting on activity hover
```

**Priority:** SHOULD

---

### US-06: Source-Branded Activity Cards

```
AS A user scanning raw activities
I WANT each activity to be visually branded by its source
SO THAT I can quickly identify the tool it came from

ACCEPTANCE CRITERIA:
- GIVEN an activity is displayed
  WHEN rendered
  THEN shows source icon with correct brand color

- GIVEN activity from GitHub
  WHEN displayed
  THEN icon is GitHub logo, color is #24292e

- GIVEN activity from Jira
  WHEN displayed
  THEN icon is Jira logo, color is #0052CC

- GIVEN activity from Teams
  WHEN displayed
  THEN icon is Teams logo, color is #6264a7

EDGE CASES:
- Unknown source: show generic "link" icon with gray color

OUT OF SCOPE:
- Source-specific metadata display (PR number, ticket ID in card)
```

**Priority:** SHOULD

---

### US-07: Activity Count Badge

```
AS A user scanning the Draft Stories list
I WANT to see how many activities each Draft Story contains
SO THAT I can gauge its size at a glance

ACCEPTANCE CRITERIA:
- GIVEN a Draft Story is displayed
  WHEN rendered
  THEN shows activity count badge (e.g., "5 activities")

- GIVEN activity count is 0
  WHEN displayed
  THEN shows "Manual entry" instead of count

- GIVEN activity count is 100+
  WHEN displayed
  THEN shows "100+ activities"

EDGE CASES:
- None identified

OUT OF SCOPE:
- Activity breakdown by source in badge
```

**Priority:** SHOULD

---

### US-08: Source Icons on Draft Story Card

```
AS A user scanning Draft Stories
I WANT to see which sources contributed to each
SO THAT I can find stories with specific tool evidence

ACCEPTANCE CRITERIA:
- GIVEN a Draft Story is displayed
  WHEN rendered
  THEN shows small icons for each contributing source

- GIVEN Draft Story has 5+ sources
  WHEN displayed
  THEN shows first 4 icons + "+N" overflow

EDGE CASES:
- If source is unknown: omit from icon list

OUT OF SCOPE:
- Source icon tooltips
```

**Priority:** COULD

---

## 3. Use Cases

### UC-01: Explore Work by Time Period

**Actor:** User (Sarah, Senior Engineer)
**Precondition:** User has synced activities and has Draft Stories
**Trigger:** User opens Journal tab

**Main Flow:**
1. User sees "By Temporal" tab active (default)
2. User sees list of Draft Stories: "Week of Jan 27-30", "AUTH-123 Work"
3. User clicks "Week of Jan 27-30"
4. Right panel loads 8 activities from that week
5. User sees: 3 GitHub PRs, 2 Jira tickets, 3 Teams meetings
6. User understands what work contributed to that weekly summary

**Alternative Flow:**
- 3a. No activities exist → Show "This entry was created manually"

---

### UC-02: Find GitHub-Only Evidence

**Actor:** User preparing for code review discussion
**Precondition:** User wants to find code-related work
**Trigger:** User clicks "By Source" tab

**Main Flow:**
1. User clicks "By Source" tab
2. User sees source filter buttons
3. User clicks "GitHub" filter
4. List shows only Draft Stories containing GitHub activities
5. User clicks a Draft Story
6. Right panel shows the GitHub PRs, issues, commits

---

## 4. Dependency Map

```
┌─────────────────────────────────────────────────────────────────┐
│                        DEPENDENCIES                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [DemoToolActivity / ToolActivity]                              │
│              │                                                   │
│              ▼                                                   │
│  [JournalEntry.activityIds[]]  ◄── Existing relationship        │
│              │                                                   │
│              ▼                                                   │
│  [THIS FEATURE: Activity Stream View]                           │
│              │                                                   │
│              ▼                                                   │
│  [Career Stories Creation Flow] ◄── Downstream feature          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Backend Dependencies:**
- `GET /api/v1/journal` — List Draft Stories (existing)
- `GET /api/v1/activities?journalEntryId={id}` — NEW: List activities for Draft Story

**Frontend Dependencies:**
- Journal page component (existing, needs refactor)
- Demo mode service (existing)

---

## 5. Priority Summary (MoSCoW)

| Priority | Stories | Description |
|----------|---------|-------------|
| **MUST** | US-01, US-02, US-03, US-04 | Core two-column layout, tabs, activity loading |
| **SHOULD** | US-05, US-06, US-07 | Tree-lines, branding, counts |
| **COULD** | US-08 | Source icons on Draft Story card |
| **WON'T** | — | Mobile layout, activity editing, real-time sync |

---

## 6. Non-Functional Requirements

### NFR-01: Performance
- Activity list must load within 500ms for ≤50 activities
- Pagination for >20 activities (load more pattern)

### NFR-02: Accessibility
- Tab navigation must be keyboard accessible
- Activity cards must have proper ARIA labels
- Tree-lines must not convey meaning without text alternative

### NFR-03: Responsiveness
- Two-column layout collapses to single column below 768px
- Right panel becomes modal/drawer on narrow screens

---

## 7. API Specification

### GET /api/v1/activities

**Purpose:** Retrieve raw activities for a Draft Story

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| journalEntryId | string | Yes | Draft Story ID |
| page | number | No | Page number (default: 1) |
| limit | number | No | Items per page (default: 20, max: 100) |

**Response:**
```json
{
  "data": [
    {
      "id": "act_123",
      "source": "github",
      "sourceId": "pr-1247",
      "sourceUrl": "https://github.com/...",
      "title": "Merged: Query optimizer",
      "description": "Reduced p95 latency...",
      "timestamp": "2026-01-24T14:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "hasMore": true
  }
}
```

---

## 8. Glossary

| Term | Definition |
|------|------------|
| Draft Story | Auto-generated Journal Entry from synced activities |
| Raw Activity | Single event from a connected tool |
| Source | Integration tool (GitHub, Jira, Teams, etc.) |
| Temporal Grouping | Grouping by time period (groupingMethod: 'time') |
| Cluster Grouping | Grouping by cross-tool reference (groupingMethod: 'cluster') |
| Tree-Line | SVG visual connection between Draft Story and activities |
| sourceMode | Field distinguishing demo vs production data |

---

## Next Steps

1. **Clarifier Review** — Validate completeness and testability
2. **Gate 2** — Pass/fail decision
3. **Design Stage** — UX wireframes and system architecture
