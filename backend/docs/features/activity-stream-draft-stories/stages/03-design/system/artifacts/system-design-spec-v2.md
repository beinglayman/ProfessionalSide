# System Design Specification v2: Activity Stream & Draft Stories

**Author:** The Architect (Maker)
**Date:** 2026-01-31
**Status:** Draft (API Nerd Review Applied)
**Traceability:** requirements-doc-v1.md → Gate 2 PASS

---

## API Design Philosophy

This design follows REST resource principles with honest naming:

| What | URL | Why |
|------|-----|-----|
| Activities for a draft story | `GET /journal-entries/:id/activities` | Activities are a sub-resource of journal entries |
| Activity counts/stats | `GET /activity-stats?groupBy=...` | Stats are aggregations, not resources |
| Journal entries with metadata | `GET /journal?includeActivityMeta=true` | Enrich existing resource with optional data |

**Key Principle:** `sourceMode` is derived from the journal entry data, not sent by the client. This prevents header/data mismatches.

---

## 1. System Architecture Overview

### 1.1 High-Level Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    Journal Page (Two-Column Layout)                  │    │
│  │  ┌──────────────────────┐    ┌────────────────────────────────────┐ │    │
│  │  │  DraftStoriesPanel   │    │      ActivitiesPanel               │ │    │
│  │  │  - By Source Tab     │    │      - Activity Cards              │ │    │
│  │  │  - By Temporal Tab   │    │      - Pagination                  │ │    │
│  │  │  - Draft Story List  │    │      - Tree Lines (SVG)            │ │    │
│  │  └──────────────────────┘    └────────────────────────────────────┘ │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│                      ┌─────────────┴─────────────┐                          │
│                      │      React Query Hooks     │                          │
│                      │  - useJournalEntries()    │                          │
│                      │  - useActivities()        │                          │
│                      │  - useActivityGroups()    │                          │
│                      └─────────────┬─────────────┘                          │
└────────────────────────────────────┼────────────────────────────────────────┘
                                     │ HTTP/REST
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BACKEND (Express)                               │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         API Routes                                   │    │
│  │  GET /api/v1/journal                    (existing, enhanced)        │    │
│  │  GET /api/v1/journal-entries/:id/activities  (NEW)                  │    │
│  │  GET /api/v1/activity-stats             (NEW - aggregations)        │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│  ┌─────────────────────────────────┴─────────────────────────────────┐      │
│  │                       Activity Service                             │      │
│  │  - getActivitiesForJournalEntry()                                 │      │
│  │  - getActivitiesGroupedBySource()                                 │      │
│  │  - getActivitiesGroupedByTemporal()                               │      │
│  │  - getJournalEntriesWithActivityMeta()                            │      │
│  └─────────────────────────────────┬─────────────────────────────────┘      │
│                                    │                                         │
│  ┌─────────────────────────────────┴─────────────────────────────────┐      │
│  │                    Data Access Layer                               │      │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐   │      │
│  │  │ JournalEntry    │  │ DemoToolActivity│  │ ToolActivity    │   │      │
│  │  │ (Draft Stories) │  │ (Demo Mode)     │  │ (Production)    │   │      │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘   │      │
│  └───────────────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PostgreSQL Database                                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │
│  │ journal_entries │  │demo_tool_       │  │ tool_activities │              │
│  │                 │  │activities       │  │                 │              │
│  │ - activityIds[] │◄─┤                 │  │                 │              │
│  │ - groupingMethod│  │ - source        │  │ - source        │              │
│  │ - sourceMode    │  │ - timestamp     │  │ - timestamp     │              │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Separate activity endpoints | Allows flexible grouping without overloading journal endpoint |
| Demo/Prod routing in service layer | `sourceMode` on JournalEntry determines which activity table to query |
| Temporal grouping computed at query time | Avoids storing redundant time buckets, uses SQL date functions |
| Source grouping as aggregation | COUNT + GROUP BY on activities, not stored metadata |

---

## 2. API Specifications

### 2.1 GET /api/v1/journal-entries/:id/activities

**Purpose:** Fetch raw activities for a specific Draft Story (Journal Entry)

**Design Note:** Activities are a sub-resource of journal entries. The `sourceMode` is derived from the journal entry itself — no client header needed.

**Request:**
```http
GET /api/v1/journal-entries/{id}/activities?page=1&limit=20&source=github
Authorization: Bearer {token}
```

**Path Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Journal Entry (Draft Story) ID |

**Query Parameters:**
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| page | number | No | 1 | Page number |
| limit | number | No | 20 | Items per page (max: 100) |
| source | string | No | - | Filter by source (github, jira, etc.) |

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "act_abc123",
      "source": "github",
      "sourceId": "pr-1247",
      "sourceUrl": "https://github.com/acme/platform/pull/1247",
      "title": "Merged: Query optimizer improvements",
      "description": "Reduced p95 latency from 450ms to 45ms",
      "timestamp": "2026-01-24T14:30:00Z",
      "crossToolRefs": ["PLAT-892"]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3,
    "hasMore": true
  },
  "meta": {
    "journalEntryId": "je_xyz789",
    "sourceMode": "demo"
  }
}
```

**Response Headers:**
```http
Cache-Control: private, max-age=30
ETag: "abc123-1706745600"
```

**Error Responses:**
- `404 Not Found` — Journal entry not found
- `403 Forbidden` — User doesn't own journal entry

---

### 2.2 GET /api/v1/activity-stats

**Purpose:** Get activity aggregations (counts by source or temporal bucket)

**Design Note:** This is an aggregation endpoint, not a resource endpoint. It returns *counts*, not activities. The name reflects this honestly.

**Request:**
```http
GET /api/v1/activity-stats?groupBy=source
GET /api/v1/activity-stats?groupBy=temporal&timezone=America/New_York
Authorization: Bearer {token}
X-Demo-Mode: true|false
```

**Query Parameters:**
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| groupBy | enum | Yes | - | `source` or `temporal` |
| timezone | string | No | UTC | User's timezone (only for `groupBy=temporal`) |

**Response (200 OK) — groupBy=source:**
```json
{
  "data": [
    {
      "source": "github",
      "displayName": "GitHub",
      "color": "#24292e",
      "icon": "github",
      "activityCount": 45,
      "journalEntryCount": 8
    },
    {
      "source": "jira",
      "displayName": "Jira",
      "color": "#0052CC",
      "icon": "jira",
      "activityCount": 32,
      "journalEntryCount": 6
    },
    {
      "source": "teams",
      "displayName": "Microsoft Teams",
      "color": "#6264a7",
      "icon": "teams",
      "activityCount": 28,
      "journalEntryCount": 5
    }
  ],
  "meta": {
    "groupBy": "source",
    "totalActivities": 150,
    "totalJournalEntries": 12,
    "sourceCount": 3,
    "maxSources": 20
  }
}
```

**Response (200 OK) — groupBy=temporal:**
```json
{
  "data": [
    {
      "bucket": "today",
      "displayName": "Today",
      "dateRange": {
        "start": "2026-01-31T00:00:00Z",
        "end": "2026-01-31T23:59:59Z"
      },
      "activityCount": 5,
      "journalEntryCount": 1
    },
    {
      "bucket": "yesterday",
      "displayName": "Yesterday",
      "dateRange": {
        "start": "2026-01-30T00:00:00Z",
        "end": "2026-01-30T23:59:59Z"
      },
      "activityCount": 8,
      "journalEntryCount": 2
    },
    {
      "bucket": "this_week",
      "displayName": "This Week (excl. today/yesterday)",
      "dateRange": {
        "start": "2026-01-27T00:00:00Z",
        "end": "2026-01-29T23:59:59Z"
      },
      "activityCount": 12,
      "journalEntryCount": 1
    },
    {
      "bucket": "last_week",
      "displayName": "Last Week",
      "dateRange": {
        "start": "2026-01-20T00:00:00Z",
        "end": "2026-01-26T23:59:59Z"
      },
      "activityCount": 42,
      "journalEntryCount": 3
    },
    {
      "bucket": "this_month",
      "displayName": "This Month (excl. above)",
      "dateRange": {
        "start": "2026-01-01T00:00:00Z",
        "end": "2026-01-19T23:59:59Z"
      },
      "activityCount": 53,
      "journalEntryCount": 3
    },
    {
      "bucket": "older",
      "displayName": "Older",
      "dateRange": {
        "start": null,
        "end": "2025-12-31T23:59:59Z"
      },
      "activityCount": 30,
      "journalEntryCount": 2
    }
  ],
  "meta": {
    "groupBy": "temporal",
    "timezone": "America/New_York",
    "totalActivities": 150,
    "totalJournalEntries": 12
  }
}
```

**Response Headers:**
```http
Cache-Control: private, max-age=60
ETag: "stats-1706745600"
```

**Use Case:** Populate the "By Source" and "By Temporal" tab filter buttons with counts.

**Note on Temporal Buckets:** Buckets are **mutually exclusive filters**. An activity in "today" is NOT also counted in "this_week". Each activity belongs to exactly one bucket. The `dateRange` reflects the exclusive window for that bucket.

**Temporal Bucket Definitions (Mutually Exclusive):**
| Bucket | Definition |
|--------|------------|
| today | Current calendar day in user's timezone |
| yesterday | Previous calendar day only |
| this_week | Monday through day-before-yesterday of current week |
| last_week | Monday-Sunday of previous week |
| this_month | Days in current month not covered by above buckets |
| older | Everything before current month |

---

### 2.4 How to Get Raw Activities (Usage Patterns)

The API is designed around the primary use case: **selecting a draft story shows its activities**.

#### Pattern 1: By Draft Story (Primary)
User clicks a draft story → fetch its activities:
```http
GET /api/v1/journal-entries/je_xyz789/activities
```
Returns the actual activity records linked to that draft story.

#### Pattern 2: By Source Filter
User clicks "GitHub" tab → show draft stories with GitHub activities:
```http
GET /api/v1/journal?filterBySource=github&includeActivityMeta=true
```
Returns draft stories that contain at least one GitHub activity. User then clicks a draft story to see its activities (Pattern 1).

#### Pattern 3: By Temporal Filter
User clicks "Yesterday" tab → show draft stories from yesterday:
```http
GET /api/v1/journal?timeRangeStart=2026-01-30T00:00:00Z&timeRangeEnd=2026-01-30T23:59:59Z&includeActivityMeta=true
```
Returns draft stories whose time range overlaps with yesterday. User then clicks a draft story to see its activities (Pattern 1).

**Key Insight:** The `/activity-stats` endpoint provides **counts for navigation** (populating tabs with badges). The actual activities are always fetched through a draft story context.

#### Why Not `/activities?source=github`?
Activities only make sense in the context of a draft story. A raw list of 500 GitHub activities without story context isn't useful. The UI flow is:
1. See stats (counts per source/temporal bucket)
2. Filter draft stories by that dimension
3. Select a draft story
4. View its activities

This matches the two-column layout: left side filters/selects draft stories, right side shows activities for the selected story.

---

### 2.3 GET /api/v1/journal (Enhanced)

**Purpose:** Existing endpoint, enhanced with activity metadata

**Request:**
```http
GET /api/v1/journal?includeActivityMeta=true&filterBySource=github
Authorization: Bearer {token}
X-Demo-Mode: true|false
```

**Query Parameters (new):**
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| includeActivityMeta | boolean | No | false | Include activity counts/sources |
| filterBySource | string | No | - | Filter journal entries by contributing source |

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "je_xyz789",
      "title": "Week of Jan 27-30",
      "groupingMethod": "time",
      "timeRangeStart": "2026-01-27T00:00:00Z",
      "timeRangeEnd": "2026-01-30T23:59:59Z",

      "activityMeta": {
        "totalCount": 8,
        "sources": [
          { "source": "github", "count": 3 },
          { "source": "jira", "count": 2 },
          { "source": "teams", "count": 3 }
        ],
        "dateRange": {
          "earliest": "2026-01-27T09:15:00Z",
          "latest": "2026-01-30T17:45:00Z"
        }
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 12,
    "totalPages": 1,
    "hasMore": false
  },
  "meta": {
    "sourceMode": "demo",
    "filters": {
      "includeActivityMeta": true,
      "filterBySource": "github"
    }
  }
}
```

**Note:** `activityMeta` is only included when `includeActivityMeta=true`. This avoids N+1 queries for clients that don't need the metadata.

---

## 3. Data Model

### 3.1 Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│   ┌─────────────────┐         ┌─────────────────┐                       │
│   │      User       │         │  JournalEntry   │                       │
│   │                 │ 1     * │  (Draft Story)  │                       │
│   │  id             │─────────│                 │                       │
│   │  email          │         │  id             │                       │
│   │  ...            │         │  authorId (FK)  │                       │
│   └─────────────────┘         │  title          │                       │
│                               │  activityIds[]  │◄──────────┐           │
│                               │  groupingMethod │           │           │
│                               │  sourceMode     │           │ References│
│                               │  clusterRef     │           │           │
│                               │  timeRangeStart │           │           │
│                               │  timeRangeEnd   │           │           │
│                               └─────────────────┘           │           │
│                                                             │           │
│   ┌─────────────────────────────────────────────────────────┴───┐       │
│   │                                                              │       │
│   │  sourceMode = 'demo'           sourceMode = 'production'    │       │
│   │         │                               │                    │       │
│   │         ▼                               ▼                    │       │
│   │  ┌─────────────────┐           ┌─────────────────┐          │       │
│   │  │DemoToolActivity │           │  ToolActivity   │          │       │
│   │  │                 │           │                 │          │       │
│   │  │  id             │           │  id             │          │       │
│   │  │  userId (FK)    │           │  userId (FK)    │          │       │
│   │  │  source         │           │  source         │          │       │
│   │  │  sourceId       │           │  sourceId       │          │       │
│   │  │  title          │           │  title          │          │       │
│   │  │  description    │           │  description    │          │       │
│   │  │  timestamp      │           │  timestamp      │          │       │
│   │  │  crossToolRefs[]│           │  crossToolRefs[]│          │       │
│   │  │  rawData (JSON) │           │  rawData (JSON) │          │       │
│   │  └─────────────────┘           └─────────────────┘          │       │
│   │                                                              │       │
│   └──────────────────────────────────────────────────────────────┘       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Key Data Relationships

**JournalEntry → Activities (via activityIds[])**
```typescript
// JournalEntry stores activity IDs as string array
interface JournalEntry {
  id: string;
  activityIds: string[];  // References to DemoToolActivity or ToolActivity
  sourceMode: 'demo' | 'production';  // Determines which table to query
  groupingMethod: 'time' | 'cluster' | 'manual';
}

// Query logic:
if (journalEntry.sourceMode === 'demo') {
  activities = await prisma.demoToolActivity.findMany({
    where: { id: { in: journalEntry.activityIds } }
  });
} else {
  activities = await prisma.toolActivity.findMany({
    where: { id: { in: journalEntry.activityIds } }
  });
}
```

### 3.3 Source Enumeration

```typescript
const SUPPORTED_SOURCES = {
  github: {
    displayName: 'GitHub',
    color: '#24292e',
    icon: 'github'
  },
  jira: {
    displayName: 'Jira',
    color: '#0052CC',
    icon: 'jira'
  },
  confluence: {
    displayName: 'Confluence',
    color: '#172B4D',
    icon: 'confluence'
  },
  teams: {
    displayName: 'Microsoft Teams',
    color: '#6264a7',
    icon: 'teams'
  },
  outlook: {
    displayName: 'Outlook',
    color: '#0078d4',
    icon: 'outlook'
  },
  slack: {
    displayName: 'Slack',
    color: '#4A154B',
    icon: 'slack'
  },
  figma: {
    displayName: 'Figma',
    color: '#F24E1E',
    icon: 'figma'
  },
  'google-calendar': {
    displayName: 'Google Calendar',
    color: '#4285F4',
    icon: 'google-calendar'
  }
} as const;
```

---

## 4. Service Layer Design

### 4.1 ActivityService

```typescript
// src/services/activity.service.ts

export class ActivityService {
  constructor(private isDemoMode: boolean) {}

  /**
   * Get activities for a specific journal entry
   * Note: sourceMode is derived from the journal entry, not from headers
   */
  async getActivitiesForJournalEntry(
    journalEntryId: string,
    userId: string,
    options: { page: number; limit: number; source?: string }
  ): Promise<PaginatedActivities> {
    // 1. Fetch journal entry to get activityIds and sourceMode
    const journalEntry = await prisma.journalEntry.findFirst({
      where: { id: journalEntryId, authorId: userId }
    });

    if (!journalEntry) throw new NotFoundError('Journal entry not found');

    // 2. Query appropriate table based on journal entry's sourceMode (not header!)
    const activityTable = journalEntry.sourceMode === 'demo'
      ? prisma.demoToolActivity
      : prisma.toolActivity;

    // 3. Build where clause with optional source filter
    const whereClause: any = { id: { in: journalEntry.activityIds } };
    if (options.source) {
      whereClause.source = options.source;
    }

    // 4. Fetch activities by IDs with pagination
    const [activities, total] = await Promise.all([
      activityTable.findMany({
        where: whereClause,
        orderBy: { timestamp: 'desc' },
        skip: (options.page - 1) * options.limit,
        take: options.limit
      }),
      activityTable.count({ where: whereClause })
    ]);

    return {
      data: activities,
      pagination: {
        page: options.page,
        limit: options.limit,
        total,
        totalPages: Math.ceil(total / options.limit),
        hasMore: options.page * options.limit < total
      },
      meta: {
        journalEntryId,
        sourceMode: journalEntry.sourceMode
      }
    };
  }

  /**
   * Get activity stats grouped by source or temporal bucket
   * Note: This uses isDemoMode from header since there's no journal entry context
   */
  async getActivityStats(
    userId: string,
    groupBy: 'source' | 'temporal',
    timezone?: string
  ): Promise<ActivityStats> {
    if (groupBy === 'source') {
      return this.getStatsGroupedBySource(userId);
    } else {
      return this.getStatsGroupedByTemporal(userId, timezone || 'UTC');
    }
  }

  /**
   * Get activity counts grouped by source
   */
  private async getStatsGroupedBySource(userId: string): Promise<SourceStats> {
    const activityTable = this.isDemoMode
      ? prisma.demoToolActivity
      : prisma.toolActivity;

    // Aggregate by source (limited to prevent unbounded response)
    const groups = await activityTable.groupBy({
      by: ['source'],
      where: { userId },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20  // Max 20 sources to prevent unbounded response
    });

    // Count journal entries per source
    const journalEntryCounts = await this.getJournalEntryCountsBySource(userId);

    const totalActivities = groups.reduce((sum, g) => sum + g._count.id, 0);

    return {
      data: groups.map(g => ({
        source: g.source,
        ...SUPPORTED_SOURCES[g.source],
        activityCount: g._count.id,
        journalEntryCount: journalEntryCounts[g.source] || 0
      })),
      meta: {
        groupBy: 'source',
        totalActivities,
        totalJournalEntries: Object.values(journalEntryCounts).reduce((a, b) => a + b, 0),
        sourceCount: groups.length,
        maxSources: 20
      }
    };
  }

  /**
   * Get activity counts grouped by temporal bucket (mutually exclusive)
   * Uses single SQL query with CASE for efficiency
   */
  private async getStatsGroupedByTemporal(
    userId: string,
    timezone: string
  ): Promise<TemporalStats> {
    const activityTable = this.isDemoMode ? 'demo_tool_activities' : 'tool_activities';

    const now = new Date();
    const buckets = this.computeMutuallyExclusiveBuckets(now, timezone);

    // Single optimized SQL query with CASE statements
    const result = await prisma.$queryRaw`
      SELECT
        CASE
          WHEN timestamp >= ${buckets.today.start} AND timestamp <= ${buckets.today.end} THEN 'today'
          WHEN timestamp >= ${buckets.yesterday.start} AND timestamp <= ${buckets.yesterday.end} THEN 'yesterday'
          WHEN timestamp >= ${buckets.this_week.start} AND timestamp <= ${buckets.this_week.end} THEN 'this_week'
          WHEN timestamp >= ${buckets.last_week.start} AND timestamp <= ${buckets.last_week.end} THEN 'last_week'
          WHEN timestamp >= ${buckets.this_month.start} AND timestamp <= ${buckets.this_month.end} THEN 'this_month'
          ELSE 'older'
        END as bucket,
        COUNT(*) as activity_count
      FROM ${Prisma.raw(activityTable)}
      WHERE user_id = ${userId}
      GROUP BY bucket
    `;

    // Get journal entry counts per bucket (separate query)
    const journalEntryCounts = await this.getJournalEntryCountsByTemporal(userId, buckets);

    const totalActivities = result.reduce((sum: number, r: any) => sum + Number(r.activity_count), 0);

    return {
      data: Object.entries(buckets).map(([key, range]) => ({
        bucket: key,
        displayName: range.displayName,
        dateRange: { start: range.start, end: range.end },
        activityCount: Number(result.find((r: any) => r.bucket === key)?.activity_count || 0),
        journalEntryCount: journalEntryCounts[key] || 0
      })),
      meta: {
        groupBy: 'temporal',
        timezone,
        totalActivities,
        totalJournalEntries: Object.values(journalEntryCounts).reduce((a, b) => a + b, 0)
      }
    };
  }

  /**
   * Compute mutually exclusive temporal bucket boundaries
   * Each activity belongs to exactly one bucket
   */
  private computeMutuallyExclusiveBuckets(now: Date, timezone: string): TemporalBuckets {
    const zonedNow = utcToZonedTime(now, timezone);
    const dayBeforeYesterday = endOfDay(subDays(zonedNow, 2));

    return {
      today: {
        displayName: 'Today',
        start: startOfDay(zonedNow),
        end: endOfDay(zonedNow)
      },
      yesterday: {
        displayName: 'Yesterday',
        start: startOfDay(subDays(zonedNow, 1)),
        end: endOfDay(subDays(zonedNow, 1))
      },
      this_week: {
        displayName: 'This Week (excl. today/yesterday)',
        start: startOfWeek(zonedNow, { weekStartsOn: 1 }),
        end: dayBeforeYesterday  // Excludes today and yesterday
      },
      last_week: {
        displayName: 'Last Week',
        start: startOfWeek(subWeeks(zonedNow, 1), { weekStartsOn: 1 }),
        end: endOfWeek(subWeeks(zonedNow, 1), { weekStartsOn: 1 })
      },
      this_month: {
        displayName: 'This Month (excl. above)',
        start: startOfMonth(zonedNow),
        end: subDays(startOfWeek(subWeeks(zonedNow, 1), { weekStartsOn: 1 }), 1)
      },
      older: {
        displayName: 'Older',
        start: null,
        end: subDays(startOfMonth(zonedNow), 1)
      }
    };
  }
}
```

### 4.2 Service Instantiation Pattern

```typescript
// Request-scoped service pattern (existing pattern in codebase)
export function createActivityService(req: Request): ActivityService {
  // Only use header for stats endpoint; activities endpoint derives from journal entry
  const isDemoMode = req.headers['x-demo-mode'] === 'true';
  return new ActivityService(isDemoMode);
}

// Controller for journal entry activities (sub-resource pattern)
router.get('/journal-entries/:id/activities', async (req, res) => {
  const service = createActivityService(req);
  const result = await service.getActivitiesForJournalEntry(
    req.params.id,  // Path param, not query param
    req.user.id,
    {
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
      source: req.query.source as string | undefined
    }
  );

  // Add cache headers
  res.set('Cache-Control', 'private, max-age=30');
  res.set('ETag', `"${req.params.id}-${Date.now()}"`);
  res.json(result);
});

// Controller for activity stats (aggregation endpoint)
router.get('/activity-stats', async (req, res) => {
  const service = createActivityService(req);
  const result = await service.getActivityStats(
    req.user.id,
    req.query.groupBy as 'source' | 'temporal',
    req.query.timezone as string | undefined
  );

  // Aggregations can be cached longer
  res.set('Cache-Control', 'private, max-age=60');
  res.set('ETag', `"stats-${Date.now()}"`);
  res.json(result);
});
```

---

## 5. Sequence Diagrams

### 5.1 Load Activities for Selected Draft Story

```
┌──────────┐     ┌──────────┐     ┌──────────────┐     ┌──────────────┐     ┌─────────┐
│ Frontend │     │   API    │     │ActivityService│    │ JournalEntry │     │Activities│
│          │     │  Router  │     │              │     │    Table     │     │  Table   │
└────┬─────┘     └────┬─────┘     └──────┬───────┘     └──────┬───────┘     └────┬────┘
     │                │                   │                    │                  │
     │ GET /journal-entries/{id}/activities                    │                  │
     │───────────────►│                   │                    │                  │
     │                │                   │                    │                  │
     │                │ getActivities(id) │                    │                  │
     │                │──────────────────►│                    │                  │
     │                │                   │                    │                  │
     │                │                   │ findFirst(id)      │                  │
     │                │                   │───────────────────►│                  │
     │                │                   │                    │                  │
     │                │                   │◄───────────────────│                  │
     │                │                   │  {activityIds[],   │                  │
     │                │                   │   sourceMode}      │ (derived!)       │
     │                │                   │                    │                  │
     │                │                   │ if sourceMode='demo'                  │
     │                │                   │ findMany(ids)      │                  │
     │                │                   │─────────────────────────────────────►│
     │                │                   │                    │                  │
     │                │                   │◄─────────────────────────────────────│
     │                │                   │     activities[]   │                  │
     │                │                   │                    │                  │
     │                │◄──────────────────│                    │                  │
     │                │  {data, pagination, meta}              │                  │
     │◄───────────────│                   │                    │                  │
     │ 200 OK + ETag  │                   │                    │                  │
     │                │                   │                    │                  │
```

### 5.2 Load Activity Stats (Source Groupings)

```
┌──────────┐     ┌──────────┐     ┌──────────────┐     ┌─────────┐
│ Frontend │     │   API    │     │ActivityService│    │Activities│
│          │     │  Router  │     │              │     │  Table   │
└────┬─────┘     └────┬─────┘     └──────┬───────┘     └────┬────┘
     │                │                   │                  │
     │ GET /activity-stats?groupBy=source │                  │
     │───────────────►│                   │                  │
     │                │                   │                  │
     │                │ getActivityStats  │                  │
     │                │ (groupBy='source')│                  │
     │                │──────────────────►│                  │
     │                │                   │                  │
     │                │                   │ groupBy(source)  │
     │                │                   │ LIMIT 20         │
     │                │                   │─────────────────►│
     │                │                   │                  │
     │                │                   │◄─────────────────│
     │                │                   │ [{source, count}]│
     │                │                   │                  │
     │                │                   │ enrich with      │
     │                │                   │ SUPPORTED_SOURCES│
     │                │                   │                  │
     │                │◄──────────────────│                  │
     │                │  {data, meta}     │                  │
     │◄───────────────│                   │                  │
     │ 200 OK + Cache │                   │                  │
```

---

## 6. Security Design

### 6.1 Authentication & Authorization

| Endpoint | Auth Required | Authorization Rule |
|----------|---------------|-------------------|
| GET /journal-entries/:id/activities | Yes (JWT) | User can only access activities linked to their own journal entries |
| GET /activity-stats | Yes (JWT) | User can only see their own activity aggregates |
| GET /journal | Yes (JWT) | User can only see their own journal entries |

### 6.2 Data Access Control

```typescript
// All activity queries must filter by userId
async getActivitiesForJournalEntry(journalEntryId: string, userId: string) {
  // First verify journal entry belongs to user
  const entry = await prisma.journalEntry.findFirst({
    where: {
      id: journalEntryId,
      authorId: userId  // CRITICAL: User ownership check
    }
  });

  if (!entry) {
    throw new ForbiddenError('Access denied');
  }

  // Then query activities
}
```

### 6.3 Input Validation

```typescript
// Zod schema for journal entry activities
const GetJournalEntryActivitiesSchema = z.object({
  // Path param validated separately
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  source: z.string().optional()
});

// Zod schema for activity stats
const GetActivityStatsSchema = z.object({
  groupBy: z.enum(['source', 'temporal']),
  timezone: z.string().refine(isValidTimezone).default('UTC').optional()
});

// Path param validation
const JournalEntryIdSchema = z.string().cuid();
```

---

## 7. Non-Functional Requirements Mapping

| NFR | Requirement | Architecture Solution |
|-----|-------------|----------------------|
| NFR-01: Performance | 500ms load for ≤50 activities | Indexed queries on activityIds, pagination |
| NFR-02: Accessibility | Keyboard navigation | Frontend concern (Tab order) |
| NFR-03: Responsiveness | Works at 768px | Frontend concern (CSS Grid) |

### 7.1 Query Performance

**Index Requirements:**
```sql
-- Already exists
CREATE INDEX idx_demo_tool_activities_user_timestamp
  ON demo_tool_activities(user_id, timestamp DESC);

-- May need to add
CREATE INDEX idx_journal_entries_author_sourcemode
  ON journal_entries(author_id, source_mode);
```

**Query Optimization:**
- Use `findMany` with `in` clause for activity lookups (batch fetch)
- Limit pagination to max 100 items
- Use database-level aggregation for counts (groupBy)

---

## 8. Integration Design

### 8.1 Frontend Integration

**New React Query Hooks:**
```typescript
// src/hooks/useJournalEntryActivities.ts

export function useJournalEntryActivities(
  journalEntryId: string | null,
  options?: { page?: number; limit?: number; source?: string }
) {
  return useQuery({
    queryKey: ['journal-entries', journalEntryId, 'activities', options],
    queryFn: () => activityService.getJournalEntryActivities(journalEntryId!, options),
    enabled: !!journalEntryId,
    staleTime: 30 * 1000  // Match Cache-Control: max-age=30
  });
}

// src/hooks/useActivityStats.ts

export function useActivityStats(
  groupBy: 'source' | 'temporal',
  timezone?: string
) {
  return useQuery({
    queryKey: ['activity-stats', groupBy, timezone],
    queryFn: () => activityService.getActivityStats(groupBy, timezone),
    staleTime: 60 * 1000  // Match Cache-Control: max-age=60
  });
}
```

### 8.2 Existing Service Integration

**JournalService Enhancement:**
```typescript
// Add to existing JournalService
async getJournalEntriesWithActivityMeta(
  userId: string,
  filters: GetJournalEntriesInput & { includeActivityMeta?: boolean }
): Promise<JournalEntriesResponse> {
  const entries = await this.getJournalEntries(userId, filters);

  if (filters.includeActivityMeta) {
    // Batch fetch activity metadata
    const activityMeta = await this.activityService
      .getActivityMetaForEntries(entries.map(e => e.id));

    return entries.map(e => ({
      ...e,
      activityMeta: activityMeta[e.id]
    }));
  }

  return entries;
}
```

---

## 9. File Structure

```
backend/src/
├── controllers/
│   ├── journal-entry-activities.controller.ts  # NEW (sub-resource)
│   └── activity-stats.controller.ts            # NEW (aggregations)
├── routes/
│   ├── journal-entries.routes.ts               # ENHANCED (add activities sub-route)
│   └── activity-stats.routes.ts                # NEW
├── services/
│   ├── activity.service.ts                     # NEW
│   └── journal.service.ts                      # ENHANCED
├── validators/
│   └── activity.validators.ts                  # NEW
└── types/
    └── activity.types.ts                       # NEW

frontend/src/
├── hooks/
│   ├── useJournalEntryActivities.ts            # NEW
│   └── useActivityStats.ts                     # NEW
├── services/
│   └── activity.service.ts                     # NEW
├── components/
│   └── journal/
│       ├── DraftStoriesPanel.tsx               # NEW
│       ├── ActivitiesPanel.tsx                 # NEW
│       ├── ActivityCard.tsx                    # NEW
│       └── TreeLines.tsx                       # NEW
└── pages/
    └── journal/
        └── list.tsx                            # REFACTORED
```

---

## 10. Technical Debt & Future Considerations

### 10.1 Accepted Technical Debt
None — design is straightforward with existing patterns.

### 10.2 Future Enhancements (Out of Scope)
1. **Real-time updates** — WebSocket for live activity sync
2. **Activity search** — Full-text search within activities
3. **Activity editing** — CRUD operations on activities
4. **Bulk operations** — Move activities between journal entries

---

## Next Steps

1. **Technical Reviewer** — Validate scalability, security, feasibility
2. **Gate 3** — Design stage pass/fail
3. **Develop Stage** — Implementation
