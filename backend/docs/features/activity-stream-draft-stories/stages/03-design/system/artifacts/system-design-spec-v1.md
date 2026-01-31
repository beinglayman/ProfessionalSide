# System Design Specification v1: Activity Stream & Draft Stories

**Author:** The Architect (Maker)
**Date:** 2026-01-31
**Status:** Draft
**Traceability:** requirements-doc-v1.md → Gate 2 PASS

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
│  │  GET /api/v1/journal                    (existing)                  │    │
│  │  GET /api/v1/activities                 (NEW)                       │    │
│  │  GET /api/v1/activities/by-source       (NEW)                       │    │
│  │  GET /api/v1/activities/by-temporal     (NEW)                       │    │
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

### 2.1 GET /api/v1/activities

**Purpose:** Fetch raw activities for a specific Draft Story (Journal Entry)

**Request:**
```http
GET /api/v1/activities?journalEntryId={id}&page=1&limit=20
Authorization: Bearer {token}
X-Demo-Mode: true|false
```

**Query Parameters:**
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| journalEntryId | string | Yes | - | Draft Story ID to fetch activities for |
| page | number | No | 1 | Page number |
| limit | number | No | 20 | Items per page (max: 100) |

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

**Error Responses:**
- `400 Bad Request` — Missing journalEntryId
- `404 Not Found` — Journal entry not found
- `403 Forbidden` — User doesn't own journal entry

---

### 2.2 GET /api/v1/activities/by-source

**Purpose:** Get activity counts grouped by source tool for filtering

**Request:**
```http
GET /api/v1/activities/by-source
Authorization: Bearer {token}
X-Demo-Mode: true|false
```

**Response (200 OK):**
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
    "totalActivities": 150,
    "totalJournalEntries": 12
  }
}
```

**Use Case:** Populate the "By Source" tab filter buttons with counts

---

### 2.3 GET /api/v1/activities/by-temporal

**Purpose:** Get activity counts grouped by temporal buckets

**Request:**
```http
GET /api/v1/activities/by-temporal?timezone=America/New_York
Authorization: Bearer {token}
X-Demo-Mode: true|false
```

**Query Parameters:**
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| timezone | string | No | UTC | User's timezone for bucket calculation |

**Response (200 OK):**
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
      "displayName": "This Week",
      "dateRange": {
        "start": "2026-01-27T00:00:00Z",
        "end": "2026-01-31T23:59:59Z"
      },
      "activityCount": 25,
      "journalEntryCount": 4
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
      "displayName": "This Month",
      "dateRange": {
        "start": "2026-01-01T00:00:00Z",
        "end": "2026-01-31T23:59:59Z"
      },
      "activityCount": 120,
      "journalEntryCount": 10
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
  ]
}
```

**Temporal Bucket Definitions:**
| Bucket | Definition |
|--------|------------|
| today | Current calendar day in user's timezone |
| yesterday | Previous calendar day |
| this_week | Monday-Sunday of current week |
| last_week | Monday-Sunday of previous week |
| this_month | First to last day of current month |
| older | Everything before current month |

---

### 2.4 GET /api/v1/journal (Enhanced)

**Purpose:** Existing endpoint, enhanced with activity metadata

**Additional Response Fields:**
```json
{
  "data": [
    {
      "id": "je_xyz789",
      "title": "Week of Jan 27-30",
      "groupingMethod": "time",
      "timeRangeStart": "2026-01-27T00:00:00Z",
      "timeRangeEnd": "2026-01-30T23:59:59Z",

      // NEW: Activity metadata
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
  ]
}
```

**Query Parameters (new):**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| includeActivityMeta | boolean | No | Include activity counts/sources (default: false) |
| filterBySource | string | No | Filter journal entries by contributing source |

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
   */
  async getActivitiesForJournalEntry(
    journalEntryId: string,
    userId: string,
    options: { page: number; limit: number }
  ): Promise<PaginatedActivities> {
    // 1. Fetch journal entry to get activityIds and sourceMode
    const journalEntry = await prisma.journalEntry.findFirst({
      where: { id: journalEntryId, authorId: userId }
    });

    if (!journalEntry) throw new NotFoundError('Journal entry not found');

    // 2. Query appropriate table based on sourceMode
    const activityTable = journalEntry.sourceMode === 'demo'
      ? prisma.demoToolActivity
      : prisma.toolActivity;

    // 3. Fetch activities by IDs with pagination
    const [activities, total] = await Promise.all([
      activityTable.findMany({
        where: { id: { in: journalEntry.activityIds } },
        orderBy: { timestamp: 'desc' },
        skip: (options.page - 1) * options.limit,
        take: options.limit
      }),
      activityTable.count({
        where: { id: { in: journalEntry.activityIds } }
      })
    ]);

    return { data: activities, pagination: { page, limit, total, hasMore } };
  }

  /**
   * Get activity counts grouped by source
   */
  async getActivitiesGroupedBySource(userId: string): Promise<SourceGroup[]> {
    const activityTable = this.isDemoMode
      ? prisma.demoToolActivity
      : prisma.toolActivity;

    // Aggregate by source
    const groups = await activityTable.groupBy({
      by: ['source'],
      where: { userId },
      _count: { id: true }
    });

    // Count journal entries per source
    const journalEntryCounts = await this.getJournalEntryCountsBySource(userId);

    return groups.map(g => ({
      source: g.source,
      ...SUPPORTED_SOURCES[g.source],
      activityCount: g._count.id,
      journalEntryCount: journalEntryCounts[g.source] || 0
    }));
  }

  /**
   * Get activity counts grouped by temporal bucket
   */
  async getActivitiesGroupedByTemporal(
    userId: string,
    timezone: string
  ): Promise<TemporalGroup[]> {
    const activityTable = this.isDemoMode
      ? prisma.demoToolActivity
      : prisma.toolActivity;

    const now = new Date();
    const buckets = this.computeTemporalBuckets(now, timezone);

    // Query each bucket
    const results = await Promise.all(
      buckets.map(async (bucket) => {
        const [activityCount, journalEntryCount] = await Promise.all([
          activityTable.count({
            where: {
              userId,
              timestamp: {
                gte: bucket.dateRange.start,
                lte: bucket.dateRange.end
              }
            }
          }),
          this.getJournalEntryCountForDateRange(
            userId,
            bucket.dateRange.start,
            bucket.dateRange.end
          )
        ]);

        return { ...bucket, activityCount, journalEntryCount };
      })
    );

    return results;
  }

  /**
   * Compute temporal bucket boundaries
   */
  private computeTemporalBuckets(now: Date, timezone: string): TemporalBucket[] {
    // Use date-fns-tz for timezone-aware calculations
    const zonedNow = utcToZonedTime(now, timezone);

    return [
      {
        bucket: 'today',
        displayName: 'Today',
        dateRange: {
          start: startOfDay(zonedNow),
          end: endOfDay(zonedNow)
        }
      },
      {
        bucket: 'yesterday',
        displayName: 'Yesterday',
        dateRange: {
          start: startOfDay(subDays(zonedNow, 1)),
          end: endOfDay(subDays(zonedNow, 1))
        }
      },
      {
        bucket: 'this_week',
        displayName: 'This Week',
        dateRange: {
          start: startOfWeek(zonedNow, { weekStartsOn: 1 }),
          end: endOfWeek(zonedNow, { weekStartsOn: 1 })
        }
      },
      {
        bucket: 'last_week',
        displayName: 'Last Week',
        dateRange: {
          start: startOfWeek(subWeeks(zonedNow, 1), { weekStartsOn: 1 }),
          end: endOfWeek(subWeeks(zonedNow, 1), { weekStartsOn: 1 })
        }
      },
      {
        bucket: 'this_month',
        displayName: 'This Month',
        dateRange: {
          start: startOfMonth(zonedNow),
          end: endOfMonth(zonedNow)
        }
      },
      {
        bucket: 'older',
        displayName: 'Older',
        dateRange: {
          start: null,
          end: subMonths(startOfMonth(zonedNow), 1)
        }
      }
    ];
  }
}
```

### 4.2 Service Instantiation Pattern

```typescript
// Request-scoped service pattern (existing pattern in codebase)
export function createActivityService(req: Request): ActivityService {
  const isDemoMode = req.headers['x-demo-mode'] === 'true';
  return new ActivityService(isDemoMode);
}

// In controller:
router.get('/activities', async (req, res) => {
  const service = createActivityService(req);
  const result = await service.getActivitiesForJournalEntry(
    req.query.journalEntryId,
    req.user.id,
    { page: req.query.page, limit: req.query.limit }
  );
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
     │ GET /activities?journalEntryId=X   │                    │                  │
     │───────────────►│                   │                    │                  │
     │                │                   │                    │                  │
     │                │ getActivities(X)  │                    │                  │
     │                │──────────────────►│                    │                  │
     │                │                   │                    │                  │
     │                │                   │ findFirst(id=X)    │                  │
     │                │                   │───────────────────►│                  │
     │                │                   │                    │                  │
     │                │                   │◄───────────────────│                  │
     │                │                   │  {activityIds[],   │                  │
     │                │                   │   sourceMode}      │                  │
     │                │                   │                    │                  │
     │                │                   │ if sourceMode='demo'                  │
     │                │                   │ findMany(ids)      │                  │
     │                │                   │─────────────────────────────────────►│
     │                │                   │                    │                  │
     │                │                   │◄─────────────────────────────────────│
     │                │                   │     activities[]   │                  │
     │                │                   │                    │                  │
     │                │◄──────────────────│                    │                  │
     │                │  {data, pagination}                    │                  │
     │◄───────────────│                   │                    │                  │
     │ 200 OK         │                   │                    │                  │
     │                │                   │                    │                  │
```

### 5.2 Load Source Groupings

```
┌──────────┐     ┌──────────┐     ┌──────────────┐     ┌─────────┐
│ Frontend │     │   API    │     │ActivityService│    │Activities│
│          │     │  Router  │     │              │     │  Table   │
└────┬─────┘     └────┬─────┘     └──────┬───────┘     └────┬────┘
     │                │                   │                  │
     │ GET /activities/by-source          │                  │
     │───────────────►│                   │                  │
     │                │                   │                  │
     │                │ getGroupedBySource│                  │
     │                │──────────────────►│                  │
     │                │                   │                  │
     │                │                   │ groupBy(source)  │
     │                │                   │─────────────────►│
     │                │                   │                  │
     │                │                   │◄─────────────────│
     │                │                   │ [{source, count}]│
     │                │                   │                  │
     │                │                   │ enrich with      │
     │                │                   │ SUPPORTED_SOURCES│
     │                │                   │                  │
     │                │◄──────────────────│                  │
     │                │  [{source,        │                  │
     │                │    displayName,   │                  │
     │                │    color, count}] │                  │
     │◄───────────────│                   │                  │
     │ 200 OK         │                   │                  │
```

---

## 6. Security Design

### 6.1 Authentication & Authorization

| Endpoint | Auth Required | Authorization Rule |
|----------|---------------|-------------------|
| GET /activities | Yes (JWT) | User can only access activities linked to their own journal entries |
| GET /activities/by-source | Yes (JWT) | User can only see their own activity aggregates |
| GET /activities/by-temporal | Yes (JWT) | User can only see their own activity aggregates |

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
// Zod schema for query validation
const GetActivitiesSchema = z.object({
  journalEntryId: z.string().cuid(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

const GetTemporalSchema = z.object({
  timezone: z.string().refine(isValidTimezone).default('UTC')
});
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
// src/hooks/useActivities.ts

export function useActivitiesForJournalEntry(
  journalEntryId: string | null,
  options?: { page?: number; limit?: number }
) {
  return useQuery({
    queryKey: ['activities', journalEntryId, options],
    queryFn: () => activityService.getActivities(journalEntryId, options),
    enabled: !!journalEntryId
  });
}

export function useActivitySourceGroups() {
  return useQuery({
    queryKey: ['activities', 'by-source'],
    queryFn: () => activityService.getSourceGroups()
  });
}

export function useActivityTemporalGroups(timezone: string) {
  return useQuery({
    queryKey: ['activities', 'by-temporal', timezone],
    queryFn: () => activityService.getTemporalGroups(timezone)
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
│   └── activities.controller.ts      # NEW
├── routes/
│   └── activities.routes.ts          # NEW
├── services/
│   ├── activity.service.ts           # NEW
│   └── journal.service.ts            # ENHANCED
├── validators/
│   └── activity.validators.ts        # NEW
└── types/
    └── activity.types.ts             # NEW

frontend/src/
├── hooks/
│   └── useActivities.ts              # NEW
├── services/
│   └── activity.service.ts           # NEW
├── components/
│   └── journal/
│       ├── DraftStoriesPanel.tsx     # NEW
│       ├── ActivitiesPanel.tsx       # NEW
│       ├── ActivityCard.tsx          # NEW
│       └── TreeLines.tsx             # NEW
└── pages/
    └── journal/
        └── list.tsx                  # REFACTORED
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
