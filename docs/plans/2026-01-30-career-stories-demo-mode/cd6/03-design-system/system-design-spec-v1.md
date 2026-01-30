# System Design Specification: Career Stories Demo Mode v1

**Stage:** Design System (D₂ᵦ)
**Date:** 2026-01-30
**Status:** Gate 3 PASSED (v1.1 with revisions)

---

## 1. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (React/Next.js)                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │ CareerStories   │  │ Journal         │  │ DevConsole      │             │
│  │ Page            │  │ List Page       │  │ (DemoTab)       │             │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘             │
│           │                    │                    │                       │
│           ▼                    ▼                    ▼                       │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │                    demo-mode.service.ts                          │       │
│  │  - isDemoMode()     - toggleDemoMode()                          │       │
│  │  - getDemoSyncStatus()  - setDemoSyncStatus()                   │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │                    demo-sync.service.ts                          │       │
│  │  - syncDemoData()                                                │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                    │                                        │
└────────────────────────────────────┼────────────────────────────────────────┘
                                     │ HTTP API
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BACKEND (Express)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │                    demo.routes.ts                                │       │
│  │  POST /api/v1/demo/sync                                         │       │
│  │  GET  /api/v1/demo/journal-entries                              │       │
│  │  POST /api/v1/demo/journal-entries/:id/regenerate               │       │
│  │  PATCH /api/v1/demo/clusters/:id/activities                     │       │
│  │  PATCH /api/v1/demo/journal-entries/:id/activities              │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │                    demo.service.ts                               │       │
│  │  - seedDemoData()        - getDemoClusters()                    │       │
│  │  - updateClusterActivities()  - getDemoJournalEntries()         │       │
│  │  - updateJournalActivities()  - regenerateJournalNarrative()    │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │                    star-generation.service.ts                    │       │
│  │  (Existing - for real LLM calls)                                │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DATABASE (PostgreSQL)                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  REAL TABLES                      DEMO TABLES (Parallel)                   │
│  ────────────                     ─────────────────────                    │
│  tool_activities          ←→      demo_tool_activities                     │
│  story_clusters           ←→      demo_story_clusters                      │
│  career_stories           ←→      demo_career_stories                      │
│  journal_entries          ←→      demo_journal_entries  ← NEW              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Data Model Changes

### 2.1 Schema Migration: JournalEntry - NO CHANGE (Risk Mitigation)

**Decision:** Do NOT add `activityIds` to the production `JournalEntry` model.

**Rationale:** (See `risk-assessment-journal-flow.md`)
- `JournalEntry` already tracks activities via `format7Data.activities[]`
- Adding `activityIds[]` creates dual source of truth risk
- Existing 7-step journal creation flow doesn't need modification
- Demo mode uses separate `DemoJournalEntry` table

**Deferred Work:** Post-demo, evaluate if `activityIds` should be promoted to `JournalEntry` by deriving from `format7Data`.

### 2.2 Schema Migration: StoryCluster Updates

**File:** `backend/prisma/schema.prisma`

```prisma
model StoryCluster {
  // ... existing fields ...

  // NEW: Grouping metadata (US-1)
  activityIds          String[]  @default([])           // Explicit list (vs FK relationship)
  groupingMethod       String?   @default("auto")       // 'auto' | 'manual'
  lastGroupingEditAt   DateTime?                        // When user last edited grouping

  // ... rest of existing fields ...
}

model DemoStoryCluster {
  // ... existing fields ...

  // NEW: Same fields as StoryCluster
  activityIds          String[]  @default([])
  groupingMethod       String?   @default("auto")
  lastGroupingEditAt   DateTime?

  // ... rest of existing fields ...
}
```

### 2.3 New Table: DemoJournalEntry (US-2)

**File:** `backend/prisma/schema.prisma`

```prisma
// Demo journal entries - mirrors JournalEntry for demo mode isolation
model DemoJournalEntry {
  id              String   @id @default(cuid())
  userId          String
  workspaceId     String

  // Content
  title           String
  description     String
  fullContent     String
  networkContent  String?

  // Activity provenance
  activityIds          String[]  @default([])
  groupingMethod       String?   @default("auto")       // 'time' | 'manual' | 'ai_suggested'
  lastGroupingEditAt   DateTime?

  // Time range for grouping
  timeRangeStart  DateTime?
  timeRangeEnd    DateTime?

  // Generation metadata
  generatedAt     DateTime?
  lastEditedAt    DateTime?

  // Timestamps
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // GIN index for array queries (Technical Review Issue #1)
  @@index([userId])
  @@index([activityIds], type: Gin)
  @@map("demo_journal_entries")
}
```

### 2.4 User Model Update

```prisma
model User {
  // ... existing fields ...

  // Add relation to demo journal entries
  demoJournalEntries  DemoJournalEntry[]

  // ... rest of existing fields ...
}
```

---

## 3. API Specifications

### 3.1 Demo Sync Endpoint (Existing - Enhanced)

```
POST /api/v1/demo/sync
```

**Request:** None (uses authenticated user)

**Response:**
```json
{
  "success": true,
  "data": {
    "activityCount": 65,
    "clusterCount": 4,
    "entryCount": 5
  },
  "message": "Demo data synced successfully"
}
```

**Changes:**
- Add journal entry seeding (currently returns 0)
- Generate 60-90 days of activities (currently 31)

### 3.2 Update Cluster Activities (US-4)

```
PATCH /api/v1/demo/clusters/:id/activities
```

**Request:**
```json
{
  "activityIds": ["act_1", "act_2", "act_3"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "cluster_1",
    "name": "OAuth Implementation",
    "activityCount": 3,
    "groupingMethod": "manual",
    "lastGroupingEditAt": "2026-01-30T10:00:00Z",
    "activities": [...]
  }
}
```

**Validation:**
- All activityIds must exist in demo_tool_activities
- All activityIds must belong to the authenticated user
- Cluster must belong to the authenticated user

### 3.3 Get Demo Journal Entries (US-6)

```
GET /api/v1/demo/journal-entries
```

**Query Params:**
- `limit` (optional, default: 20)
- `offset` (optional, default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "entry_1",
      "title": "Week 12 Summary",
      "description": "...",
      "activityIds": ["act_1", "act_2"],
      "groupingMethod": "time",
      "timeRange": {
        "start": "2026-01-20T00:00:00Z",
        "end": "2026-01-26T23:59:59Z"
      },
      "generatedAt": "2026-01-27T09:00:00Z",
      "createdAt": "2026-01-27T09:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5
  }
}
```

### 3.4 Update Journal Entry Activities (US-5)

```
PATCH /api/v1/demo/journal-entries/:id/activities
```

**Request:**
```json
{
  "activityIds": ["act_1", "act_2", "act_5"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "entry_1",
    "title": "Week 12 Summary",
    "activityIds": ["act_1", "act_2", "act_5"],
    "groupingMethod": "manual",
    "lastGroupingEditAt": "2026-01-30T10:00:00Z"
  }
}
```

### 3.5 Regenerate Journal Narrative (US-7)

```
POST /api/v1/demo/journal-entries/:id/regenerate
```

**Request:**
```json
{
  "options": {
    "style": "professional",
    "maxRetries": 3
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "entry_1",
    "title": "Week 12 Summary",
    "description": "This week I focused on...",
    "fullContent": "...",
    "generatedAt": "2026-01-30T10:05:00Z"
  }
}
```

**Error Response (LLM failure):**
```json
{
  "success": false,
  "error": "Generation unavailable, please try later",
  "code": "LLM_RETRY_EXHAUSTED",
  "retryAfter": 60
}
```

**Note:** `retryAfter` is the number of seconds before the user should retry. This field is only present when `code` is `LLM_RETRY_EXHAUSTED` or `LLM_RATE_LIMITED`. (Technical Review Issue #5)

---

## 4. Sequence Diagrams

### 4.1 Demo Sync Flow

```
┌────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────┐
│  User  │     │   Frontend   │     │   Backend   │     │ Database │
└───┬────┘     └──────┬───────┘     └──────┬──────┘     └────┬─────┘
    │                 │                    │                  │
    │  Click "Sync"   │                    │                  │
    │────────────────▶│                    │                  │
    │                 │                    │                  │
    │                 │  POST /demo/sync   │                  │
    │                 │───────────────────▶│                  │
    │                 │                    │                  │
    │                 │                    │  Clear existing  │
    │                 │                    │  demo data       │
    │                 │                    │─────────────────▶│
    │                 │                    │                  │
    │                 │                    │  Insert 65+      │
    │                 │                    │  activities      │
    │                 │                    │─────────────────▶│
    │                 │                    │                  │
    │                 │                    │  Run clustering  │
    │                 │                    │  algorithm       │
    │                 │                    │─────────────────▶│
    │                 │                    │                  │
    │                 │                    │  Create journal  │
    │                 │                    │  entries         │
    │                 │                    │─────────────────▶│
    │                 │                    │                  │
    │                 │  { counts }        │                  │
    │                 │◀───────────────────│                  │
    │                 │                    │                  │
    │                 │  Update local      │                  │
    │                 │  sync status       │                  │
    │                 │                    │                  │
    │  Show success   │                    │                  │
    │◀────────────────│                    │                  │
```

### 4.2 Edit Cluster Activities Flow

```
┌────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────┐
│  User  │     │   Frontend   │     │   Backend   │     │ Database │
└───┬────┘     └──────┬───────┘     └──────┬──────┘     └────┬─────┘
    │                 │                    │                  │
    │  Click "Edit    │                    │                  │
    │  Activities"    │                    │                  │
    │────────────────▶│                    │                  │
    │                 │                    │                  │
    │                 │  GET /demo/        │                  │
    │                 │  activities        │                  │
    │                 │  ?unclustered=true │                  │
    │                 │───────────────────▶│                  │
    │                 │                    │                  │
    │                 │  [available        │                  │
    │                 │   activities]      │                  │
    │                 │◀───────────────────│                  │
    │                 │                    │                  │
    │  Show modal     │                    │                  │
    │  with current   │                    │                  │
    │  + available    │                    │                  │
    │◀────────────────│                    │                  │
    │                 │                    │                  │
    │  Add/remove     │                    │                  │
    │  activities     │                    │                  │
    │────────────────▶│                    │                  │
    │                 │                    │                  │
    │                 │  PATCH /demo/      │                  │
    │                 │  clusters/:id/     │                  │
    │                 │  activities        │                  │
    │                 │───────────────────▶│                  │
    │                 │                    │                  │
    │                 │                    │  Validate        │
    │                 │                    │  ownership       │
    │                 │                    │─────────────────▶│
    │                 │                    │                  │
    │                 │                    │  Update cluster  │
    │                 │                    │  activityIds     │
    │                 │                    │─────────────────▶│
    │                 │                    │                  │
    │                 │                    │  Set grouping    │
    │                 │                    │  Method='manual' │
    │                 │                    │─────────────────▶│
    │                 │                    │                  │
    │                 │  { updated         │                  │
    │                 │    cluster }       │                  │
    │                 │◀───────────────────│                  │
    │                 │                    │                  │
    │  Close modal,   │                    │                  │
    │  show "Regen"   │                    │                  │
    │  button         │                    │                  │
    │◀────────────────│                    │                  │
```

### 4.3 Generate STAR with Real LLM

```
┌────────┐     ┌──────────────┐     ┌─────────────┐     ┌─────────┐     ┌──────────┐
│  User  │     │   Frontend   │     │   Backend   │     │   LLM   │     │ Database │
└───┬────┘     └──────┬───────┘     └──────┬──────┘     └────┬────┘     └────┬─────┘
    │                 │                    │                  │               │
    │  Click          │                    │                  │               │
    │  "Generate"     │                    │                  │               │
    │────────────────▶│                    │                  │               │
    │                 │                    │                  │               │
    │  Show loading   │                    │                  │               │
    │  spinner        │                    │                  │               │
    │◀────────────────│                    │                  │               │
    │                 │                    │                  │               │
    │                 │  POST /demo/       │                  │               │
    │                 │  clusters/:id/     │                  │               │
    │                 │  generate-star     │                  │               │
    │                 │───────────────────▶│                  │               │
    │                 │                    │                  │               │
    │                 │                    │  Get cluster     │               │
    │                 │                    │  + activities    │               │
    │                 │                    │─────────────────────────────────▶│
    │                 │                    │                  │               │
    │                 │                    │  Build prompt    │               │
    │                 │                    │  from activities │               │
    │                 │                    │                  │               │
    │                 │                    │  Generate STAR   │               │
    │                 │                    │─────────────────▶│               │
    │                 │                    │                  │               │
    │                 │                    │  { STAR          │               │
    │                 │                    │    narrative }   │               │
    │                 │                    │◀─────────────────│               │
    │                 │                    │                  │               │
    │                 │                    │  Save to         │               │
    │                 │                    │  demo_career_    │               │
    │                 │                    │  stories         │               │
    │                 │                    │─────────────────────────────────▶│
    │                 │                    │                  │               │
    │                 │  { star,           │                  │               │
    │                 │    processingMs }  │                  │               │
    │                 │◀───────────────────│                  │               │
    │                 │                    │                  │               │
    │  Display STAR   │                    │                  │               │
    │  narrative      │                    │                  │               │
    │◀────────────────│                    │                  │               │
```

---

## 5. Frontend Component Architecture

### 5.1 Edit Activities Modal (Shared)

```tsx
// src/components/shared/EditActivitiesModal.tsx

interface EditActivitiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentActivityIds: string[];
  availableActivities: DemoActivity[];
  onSave: (activityIds: string[]) => Promise<void>;
  minActivities?: number;  // Default: 1
  title?: string;          // "Edit Cluster Activities" | "Edit Entry Activities"
}

export function EditActivitiesModal({
  isOpen,
  onClose,
  currentActivityIds,
  availableActivities,
  onSave,
  minActivities = 1,
  title = "Edit Activities"
}: EditActivitiesModalProps) {
  // State: selectedIds, loading, error
  // UI: Two columns - Current (with remove) | Available (with add)
  // Validation: Warn if removing would leave < minActivities
}
```

### 5.2 Career Stories Page Updates

```tsx
// src/components/career-stories/ClusterCard.tsx

// Add "Edit Activities" button
<Button
  variant="ghost"
  size="sm"
  onClick={() => setEditModalOpen(true)}
>
  Edit Activities
</Button>

// Add "Regenerate" indicator when groupingMethod === 'manual'
{cluster.groupingMethod === 'manual' && (
  <Badge variant="warning">Modified - Regenerate</Badge>
)}
```

### 5.3 Journal Page Updates

```tsx
// src/pages/journal/list.tsx

// Conditional data fetching based on demo mode
const { data: entries } = useQuery({
  queryKey: ['journal-entries', isDemoMode],
  queryFn: () => isDemoMode
    ? fetchDemoJournalEntries()
    : fetchJournalEntries()
});

// Add "Edit Activities" button to each entry card
```

---

## 6. Mock Data Expansion (US-3)

### 6.1 Activity Generation Rules

```typescript
// backend/src/services/career-stories/mock-data.service.ts

interface MockActivityConfig {
  daysToGenerate: number;        // 60-90 days
  activitiesPerDay: {
    min: number;                  // 0-2
    max: number;                  // 2-5
  };
  projectThemes: string[];        // 4-5 distinct themes
  crossToolRefDensity: number;    // 0.6 = 60% have cross-refs
}

const DEFAULT_CONFIG: MockActivityConfig = {
  daysToGenerate: 75,
  activitiesPerDay: { min: 0, max: 4 },
  projectThemes: [
    'OAuth2 Authentication',
    'Payment Gateway Integration',
    'Performance Optimization',
    'Mobile App Launch',
    'API Redesign'
  ],
  crossToolRefDensity: 0.65
};
```

### 6.2 Expected Clustering Output

| Cluster Name | Min Activities | Tool Mix |
|--------------|----------------|----------|
| OAuth2 Authentication | 8-12 | GitHub, Jira, Confluence |
| Payment Gateway Integration | 6-10 | GitHub, Jira, Slack |
| Performance Optimization | 5-8 | GitHub, Confluence |
| Mobile App Launch | 8-12 | Figma, Jira, Slack |
| API Redesign | 5-8 | GitHub, Confluence, Jira |

### 6.3 Journal Entry Seeding Strategy (Technical Review Issue #3)

```typescript
// Journal entry seeding rules:
interface JournalSeedingConfig {
  entriesPerMonth: number;      // 2-3 entries per month
  windowSizeDays: number;       // 14 days per entry (bi-weekly)
  minActivitiesPerEntry: number; // 3 activities minimum
  maxActivitiesPerEntry: number; // 12 activities maximum
}

const JOURNAL_SEEDING_CONFIG: JournalSeedingConfig = {
  entriesPerMonth: 2,
  windowSizeDays: 14,
  minActivitiesPerEntry: 3,
  maxActivitiesPerEntry: 12
};

// Algorithm:
// 1. Sort all demo activities by timestamp
// 2. Create sliding windows of 14 days
// 3. For each window with >= 3 activities, create a journal entry
// 4. Group activities by time proximity (within 7 days of each other)
// 5. Generate title like "Week of Jan 15-28" based on date range
// 6. Set groupingMethod = 'time'
// 7. Set generatedAt = null (narrative not yet generated)
```

**Expected Output:**
- 4-6 journal entries spanning the 75-day activity range
- Each entry contains 3-12 activities
- Entries are roughly bi-weekly
- All entries start with `groupingMethod: 'time'` and `generatedAt: null`

---

## 7. Security Design

### 7.1 Authorization

All demo endpoints require:
1. Valid JWT authentication
2. User ownership verification (userId matches authenticated user)

```typescript
// Middleware chain
app.use('/api/v1/demo/*',
  authMiddleware,           // Verify JWT
  demoModeMiddleware        // Optional: verify demo mode enabled
);
```

### 7.2 Data Isolation

- Demo tables are completely separate from production tables
- No foreign keys between demo and production tables
- Demo data cleanup is per-user, never affects other users

### 7.3 Rate Limiting

LLM generation endpoints:
- 10 requests per minute per user
- Exponential backoff on failures (1s, 2s, 4s)
- Max 3 retries before "unavailable" response

---

## 8. Non-Functional Requirements Mapping

| NFR | Requirement | Design Solution |
|-----|-------------|-----------------|
| **Scalability** | Handle 100+ concurrent demo users | Separate demo tables, indexed queries |
| **Performance** | Sync < 5s, Generate < 30s | Batch inserts, streaming LLM |
| **Reliability** | 99% sync success rate | Retry logic, transaction rollback |
| **Usability** | One-click sync | Single API endpoint, progress feedback |
| **Security** | No data leakage | User-scoped queries, auth required |
| **Maintainability** | Easy to extend | Shared activity editing component |

---

## 9. Implementation Files

### 9.1 New Files to Create

| File | Purpose |
|------|---------|
| `backend/prisma/migrations/xxx_add_activity_provenance.sql` | Schema migration |
| `backend/prisma/migrations/xxx_create_demo_journal_entries.sql` | New demo table |
| `src/components/shared/EditActivitiesModal.tsx` | Reusable edit modal |
| `backend/src/services/career-stories/journal-demo.service.ts` | Demo journal logic |

### 9.2 Files to Modify

| File | Changes |
|------|---------|
| `backend/prisma/schema.prisma` | Add new fields and DemoJournalEntry model |
| `backend/src/services/career-stories/demo.service.ts` | Expand seeding, add journal entries |
| `backend/src/services/career-stories/mock-data.service.ts` | 60-90 days of activities |
| `backend/src/routes/demo.routes.ts` | New endpoints for activity editing |
| `backend/src/controllers/career-stories.controller.ts` | Add journal demo handlers |
| `src/pages/journal/list.tsx` | Demo mode conditional fetching |
| `src/components/career-stories/ClusterCard.tsx` | Edit activities button |

---

## 10. Migration Strategy

### 10.1 Order of Operations

1. **Schema migration** (can run independently)
   - Add fields to existing tables
   - Create DemoJournalEntry table
   - No data migration needed (new fields have defaults)

2. **Backend services** (can deploy independently)
   - Update demo.service.ts
   - Add new route handlers
   - Update mock data generation

3. **Frontend components** (requires backend)
   - EditActivitiesModal
   - Update CareerStoriesPage
   - Update JournalListPage

### 10.2 Rollback Plan

- Schema changes are additive (no breaking changes)
- New demo table can be dropped without affecting production
- Feature flag: `isDemoMode()` already gates all demo functionality
