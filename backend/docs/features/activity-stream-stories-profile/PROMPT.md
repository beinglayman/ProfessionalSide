# Activity Stream & Draft Stories View

## Terminology

| Term | Definition |
|------|------------|
| **Raw Activity** | Individual event from a connected tool (GitHub PR, Jira ticket, Teams meeting, etc.) |
| **Journal Entry** | = **Draft Story**. Auto-generated grouping of raw activities (by time or cluster) |
| **Career Story** | User-promoted narrative from Draft Story with explicit framework (STAR, SOAR, etc.) |

## Data Hierarchy

```
Raw Activities (from connected tools: GitHub, Jira, Teams, etc.)
        ↓ [Auto: Sync/Clustering]
Journal Entry = Draft Story (groupingMethod: 'time' | 'cluster')
        ↓ [User Action: Promote + Choose narrative template]
Career Story (framework: 'STAR' | 'SOAR' | 'CAR' | ...)
```

## Current Problem

The existing Journal tab lacks:
1. A way to view raw activities by source or temporal grouping
2. A clear connection between Draft Stories and their underlying raw activities
3. Visual representation of how raw activities roll up into Draft Stories

## Required UI Structure

### Journal Tab Layout (Two-Column)

```
┌─────────────────────────────────────────────────────────────────┐
│  [By Source]  [By Temporal]                          (tabs)    │
├─────────────────────┬───────────────────────────────────────────┤
│                     │                                           │
│  Draft Stories      │  Raw Activities Stream                    │
│  (Left Column)      │  (Right Panel)                            │
│                     │                                           │
│  ┌───────────────┐  │  ┌─────────────────────────────────────┐  │
│  │ Week of Jan 27│◄─┼──│ PR #1247 merged (GitHub)            │  │
│  │ 5 activities  │  │  │ Meeting: API review (Teams)         │  │
│  └───────────────┘  │  │ PLAT-892 closed (Jira)              │  │
│                     │  │ Doc updated (Confluence)            │  │
│  ┌───────────────┐  │  │ Email: Feedback (Outlook)           │  │
│  │ AUTH-123 Work │  │  └─────────────────────────────────────┘  │
│  │ 3 activities  │  │                                           │
│  └───────────────┘  │                                           │
│                     │                                           │
└─────────────────────┴───────────────────────────────────────────┘
```

### Tab Views

**1. By Source Tab**
- Left column: Draft Stories grouped/filtered by source tool
- Click a Draft Story → Right panel shows its raw activities from that source
- Source icons: GitHub, Jira, Teams, Outlook, Confluence, Figma, Slack

**2. By Temporal Tab**
- Left column: Draft Stories (Journal Entries) grouped by time
  - Time-based entries: "Week of Jan 27-30", "Jan 20-26", etc.
  - Cluster-based entries: "AUTH-123: OAuth2 Work", etc.
- Click a Draft Story → Right panel shows associated raw tool activities

### Interaction Flow

1. User lands on Journal tab (default: By Temporal)
2. Left column shows list of Draft Stories (Journal Entries)
3. User clicks a Draft Story
4. Right panel loads the raw activities that compose that Draft Story
5. Tree-line connections visually link the selected Draft Story to its activities
6. From here, user can promote a Draft Story to a Career Story (separate feature)

## Data Structure

### Draft Story (Journal Entry)
```typescript
interface DraftStory {
  id: string;
  userId: string;
  title: string;
  groupingMethod: 'time' | 'cluster';

  // Time-based
  startDate?: Date;
  endDate?: Date;

  // Cluster-based
  clusterKey?: string;  // e.g., "AUTH-123"

  // Counts
  activityCount: number;
  sources: string[];  // Which tools contributed

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}
```

### Raw Activity
```typescript
interface RawActivity {
  id: string;
  userId: string;
  journalEntryId: string;  // Links to Draft Story

  source: 'github' | 'jira' | 'teams' | 'outlook' | 'confluence' | 'figma' | 'slack';
  sourceRef: string;  // PR #1247, PLAT-892, etc.
  sourceUrl?: string;

  title: string;
  description: string;
  timestamp: Date;

  // Source-specific metadata
  metadata: Record<string, any>;
}
```

## Visual Design

### Left Column (Draft Stories)

```
┌─────────────────────────────┐
│ 📅 Week of Jan 27-30        │  ← Time-based
│ 8 activities · 4 sources    │
│ [GitHub] [Jira] [Teams] ... │
└─────────────────────────────┘

┌─────────────────────────────┐
│ 🔗 AUTH-123: OAuth2 Work    │  ← Cluster-based
│ 5 activities · 2 sources    │
│ [GitHub] [Jira]             │
└─────────────────────────────┘
```

### Right Panel (Raw Activities)

```
┌─────────────────────────────────────────────┐
│ [GitHub] PR #1247 · acme/platform           │
│ Merged: Elasticsearch query optimizer       │
│ Today 2:30 PM                               │
│ [elasticsearch] [performance]               │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ [Teams] Meeting · Platform Engineering      │
│ API Standards Working Group - Week 3        │
│ Today 11:15 AM                              │
│ [api-design] [collaboration]                │
└─────────────────────────────────────────────┘
```

### Tree Line Connections

When a Draft Story is selected:
- SVG lines connect from the selected Draft Story to each raw activity
- Color matches the source or uses a neutral connecting color
- Animated for visual feedback on selection

## Implementation Tasks

### Backend

1. **Raw Activities API**
   - `GET /api/v1/activities` - List raw activities
   - Query params: `journalEntryId`, `source`, `dateRange`, `page`, `limit`

2. **Draft Stories API** (existing Journal API)
   - `GET /api/v1/journal` - List Draft Stories (Journal Entries)
   - Already returns entries with `groupingMethod`

3. **Activity Aggregation**
   - Count activities per Draft Story
   - List distinct sources per Draft Story

### Frontend

1. **Two-Tab Layout**
   - Tab switcher: By Source | By Temporal
   - Responsive two-column grid

2. **Draft Stories List (Left Column)**
   - Clickable cards with activity count and source icons
   - Active state styling when selected

3. **Raw Activities Stream (Right Panel)**
   - Filtered by selected Draft Story
   - Source-branded entry cards
   - Chronological ordering

4. **Tree Line Visualization**
   - SVG overlay connecting selected Draft Story to activities
   - Smooth animations on selection change

## Success Criteria

1. Users see Draft Stories (Journal Entries) in left column
2. Clicking a Draft Story shows its raw activities in right panel
3. By Source tab filters/groups by connected tool
4. By Temporal tab shows time and cluster groupings
5. Tree lines visually connect selection to activities
6. Source icons and colors correctly identify each tool
7. Activity counts are accurate per Draft Story

## Relationship to Career Stories

This feature shows the **source material** (Draft Stories + Raw Activities).

The separate **Career Stories Creation Flow** feature handles:
- Promoting Draft Stories to Career Stories
- Selecting narrative template (STAR, SOAR, etc.)
- AI generation of structured narrative
- Publishing and sharing

## Demo Reference

The demo-v2 files provide design patterns:
- `index.html` - Multi-view filtering, entry cards, tree lines
- `story-flow.html` - Visual connections (for Career Story flow, not this feature)
- `styles.css` - Source colors, card styling, animations
