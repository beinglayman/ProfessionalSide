# CD6 DESIGN SYSTEM STAGE - Technical Architecture

**Date**: 2026-01-31
**Status**: IN_PROGRESS
**Previous**: DEFINE (Complete)
**Next**: DESIGN_UX

---

## 1. ARCHITECTURE OVERVIEW

### 1.1 System Context

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (React)                                │
├─────────────────────────────────────────────────────────────────────────────┤
│  Journal Tab          │  Stories Tab           │  Profile Tab               │
│  ┌─────────────────┐  │  ┌─────────────────┐   │  ┌─────────────────┐       │
│  │ ActivityStream  │  │  │ CareerStories   │   │  │ ProfileView     │       │
│  │ TemporalFilter  │  │  │ STARPreview     │   │  │ StoriesTab      │       │
│  │ SourceFilter    │  │  │ PublishButton   │   │  │ StoryCard       │       │
│  └─────────────────┘  │  └─────────────────┘   │  └─────────────────┘       │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BACKEND (Express)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  /api/v1/activities    │  /api/v1/career-stories   │  /api/v1/users         │
│  ├── GET /             │  ├── POST /:id/publish    │  ├── GET /:id/stories  │
│  ├── GET /:id          │  ├── POST /:id/unpublish  │  └── (existing)        │
│  └── (filters)         │  └── PUT /:id/visibility  │                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DATABASE (PostgreSQL)                           │
├─────────────────────────────────────────────────────────────────────────────┤
│  DemoToolActivity  →  DemoStoryCluster  →  DemoCareerStory  →  Profile      │
│  (raw events)         (groupings)          (STAR narratives)   (published)  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Data Flow

```
Source Tools (GitHub, Jira, etc.)
         │
         ▼
┌─────────────────┐
│ DemoToolActivity│ ← Instant render in Activity Stream
│ (immutable raw) │
└────────┬────────┘
         │ clustering (AI or manual)
         ▼
┌─────────────────┐
│DemoStoryCluster │ ← Groups related activities
│ (1:N activities)│
└────────┬────────┘
         │ STAR generation
         ▼
┌─────────────────┐
│ DemoCareerStory │ ← Editable STAR narrative
│ (1:1 cluster)   │
│ + visibility    │
│ + isPublished   │
└────────┬────────┘
         │ publish action
         ▼
┌─────────────────┐
│ Profile Stories │ ← Filtered by viewer access
│ (public view)   │
└─────────────────┘
```

---

## 2. SCHEMA CHANGES

### 2.1 DemoCareerStory (Extended)

```prisma
model DemoCareerStory {
  id        String @id @default(cuid())
  clusterId String @unique

  intent String

  situation Json
  task      Json
  action    Json
  result    Json

  verification Json?

  // NEW: Publishing fields
  visibility    String    @default("private")  // "private" | "workspace" | "network"
  isPublished   Boolean   @default(false)
  publishedAt   DateTime?

  // NEW: Framework tracking
  framework     String    @default("STAR")     // "STAR" | "STAR_L" | "CAR" | "PAR" | etc.

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  cluster DemoStoryCluster @relation(fields: [clusterId], references: [id], onDelete: Cascade)

  // NEW: Indexes for filtering
  @@index([isPublished])
  @@index([visibility])
  @@index([isPublished, visibility])

  @@map("demo_career_stories")
}
```

### 2.2 Migration Script

```sql
-- Migration: add_publishing_fields_to_demo_career_stories
-- Date: 2026-01-31

ALTER TABLE demo_career_stories
ADD COLUMN visibility VARCHAR(20) NOT NULL DEFAULT 'private',
ADD COLUMN is_published BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN published_at TIMESTAMP,
ADD COLUMN framework VARCHAR(20) NOT NULL DEFAULT 'STAR';

-- Add check constraint for visibility
ALTER TABLE demo_career_stories
ADD CONSTRAINT chk_visibility
CHECK (visibility IN ('private', 'workspace', 'network'));

-- Add constraint: publishedAt required when isPublished = true
-- (enforced at application level for flexibility)

-- Create indexes
CREATE INDEX idx_demo_career_stories_is_published
ON demo_career_stories(is_published);

CREATE INDEX idx_demo_career_stories_visibility
ON demo_career_stories(visibility);

CREATE INDEX idx_demo_career_stories_published_visibility
ON demo_career_stories(is_published, visibility);
```

---

## 3. API CONTRACTS

### 3.1 Activities API

#### GET /api/v1/activities

List raw activities with filtering.

**Request**:
```http
GET /api/v1/activities?temporal=today&sources=github,jira&page=1&pageSize=20
Authorization: Bearer <token>
X-Timezone: America/New_York
X-Demo-Mode: true
```

**Query Parameters**:
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `temporal` | enum | `all` | `today`, `yesterday`, `this_week`, `last_15`, `all` |
| `sources` | string | all | Comma-separated: `github,jira,confluence,outlook,figma,slack,teams` |
| `page` | int | 1 | Page number (1-indexed) |
| `pageSize` | int | 20 | Items per page (1-100) |
| `clusterId` | string | - | Filter by cluster |
| `hasStory` | bool | - | Filter by story linkage |

**Response** (200 OK):
```typescript
{
  "activities": [
    {
      "id": "clx1abc123",
      "source": "github",
      "sourceId": "PR-1247",
      "sourceUrl": "https://github.com/acme/platform/pull/1247",
      "title": "Merged: Elasticsearch query optimizer",
      "description": "Implemented query caching and result pagination...",
      "timestamp": "2026-01-24T14:30:00Z",
      "sourceRef": {
        "type": "pull_request",
        "repo": "acme/platform",
        "number": 1247
      },
      "clusterId": "clx1cluster456",
      "storyId": "clx1story789",
      "importance": "high",
      "createdAt": "2026-01-24T14:35:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 142,
    "hasMore": true
  },
  "filters": {
    "temporal": "today",
    "sources": ["github", "jira"],
    "applied": true
  }
}
```

**Error Responses**:
| Status | Condition | Body |
|--------|-----------|------|
| 400 | Invalid temporal | `{ "error": "Invalid temporal filter", "valid": ["today", ...] }` |
| 400 | Invalid source | `{ "error": "Invalid source", "valid": ["github", ...] }` |
| 401 | Not authenticated | `{ "error": "Unauthorized" }` |
| 500 | Server error | `{ "error": "Internal server error" }` |

---

#### GET /api/v1/activities/:id

Get single activity by ID.

**Response** (200 OK):
```typescript
{
  "activity": {
    "id": "clx1abc123",
    "source": "github",
    "sourceId": "PR-1247",
    "sourceUrl": "https://github.com/acme/platform/pull/1247",
    "title": "Merged: Elasticsearch query optimizer",
    "description": "Implemented query caching...",
    "timestamp": "2026-01-24T14:30:00Z",
    "sourceRef": {
      "type": "pull_request",
      "repo": "acme/platform",
      "number": 1247
    },
    "clusterId": "clx1cluster456",
    "storyId": "clx1story789",
    "rawData": { /* original payload */ },
    "crossToolRefs": ["JIRA-123", "CONF-456"],
    "createdAt": "2026-01-24T14:35:00Z"
  }
}
```

---

### 3.2 Story Publishing API

#### POST /api/v1/career-stories/:id/publish

Publish a story to the user's profile.

**Request**:
```http
POST /api/v1/career-stories/clx1story789/publish
Authorization: Bearer <token>
Content-Type: application/json
X-Demo-Mode: true

{
  "visibility": "workspace"
}
```

**Request Body**:
| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `visibility` | enum | No | `private` | `private`, `workspace`, `network` |

**Response** (200 OK):
```typescript
{
  "success": true,
  "story": {
    "id": "clx1story789",
    "intent": "Led migration from legacy search to Elasticsearch",
    "visibility": "workspace",
    "isPublished": true,
    "publishedAt": "2026-01-31T10:30:00Z",
    "framework": "STAR"
  },
  "profileUrl": "/profile/user123#stories"
}
```

**Error Responses**:
| Status | Condition | Body |
|--------|-----------|------|
| 400 | Incomplete STAR | `{ "error": "Incomplete story", "missingFields": ["result.summary"] }` |
| 403 | Not owner | `{ "error": "Cannot publish stories you don't own" }` |
| 404 | Not found | `{ "error": "Story not found" }` |

---

#### POST /api/v1/career-stories/:id/unpublish

Unpublish a story from the profile.

**Request**:
```http
POST /api/v1/career-stories/clx1story789/unpublish
Authorization: Bearer <token>
X-Demo-Mode: true
```

**Response** (200 OK):
```typescript
{
  "success": true,
  "story": {
    "id": "clx1story789",
    "visibility": "workspace",  // preserved
    "isPublished": false,
    "publishedAt": null
  }
}
```

---

#### PUT /api/v1/career-stories/:id/visibility

Change story visibility.

**Request**:
```http
PUT /api/v1/career-stories/clx1story789/visibility
Authorization: Bearer <token>
Content-Type: application/json
X-Demo-Mode: true

{
  "visibility": "network"
}
```

**Response** (200 OK):
```typescript
{
  "success": true,
  "story": {
    "id": "clx1story789",
    "visibility": "network",
    "isPublished": true,
    "publishedAt": "2026-01-31T10:30:00Z"
  }
}
```

---

### 3.3 Profile Stories API

#### GET /api/v1/users/:userId/published-stories

Get published stories for a user's profile.

**Request**:
```http
GET /api/v1/users/user123/published-stories?page=1&pageSize=10
Authorization: Bearer <token>  # optional for public
X-Demo-Mode: true
```

**Response** (200 OK):
```typescript
{
  "stories": [
    {
      "id": "clx1story789",
      "intent": "Led migration from legacy search to Elasticsearch",
      "framework": "STAR",
      "situation": "Our legacy search was causing 500ms+ queries...",
      "task": "Migrate to Elasticsearch while maintaining uptime...",
      "action": "Designed incremental migration strategy...",
      "result": "Reduced p95 latency from 450ms to 45ms...",
      "publishedAt": "2026-01-31T10:30:00Z",
      "evidenceCount": 7,
      "visibility": "workspace"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "total": 3,
    "hasMore": false
  },
  "owner": {
    "id": "user123",
    "name": "Alex Chen",
    "title": "Senior Software Engineer",
    "avatarUrl": "https://..."
  },
  "viewerAccess": "workspace"  // "owner" | "workspace" | "public"
}
```

**Access Filtering Logic**:
```typescript
// Server-side filtering
function filterStoriesByAccess(stories: Story[], viewerAccess: AccessLevel): Story[] {
  return stories.filter(story => {
    if (viewerAccess === 'owner') return true;
    if (viewerAccess === 'workspace') return story.visibility !== 'private';
    if (viewerAccess === 'public') return story.visibility === 'network';
    return false;
  });
}

function determineAccess(viewer: User | null, profileOwner: User): AccessLevel {
  if (!viewer) return 'public';
  if (viewer.id === profileOwner.id) return 'owner';
  if (viewer.workspaceId === profileOwner.workspaceId) return 'workspace';
  return 'public';
}
```

---

## 4. SERVICE LAYER

### 4.1 ActivityService

```typescript
// backend/src/services/activity.service.ts

import { PrismaClient } from '@prisma/client';
import { startOfDay, startOfWeek, subDays } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

export interface ActivityFilters {
  temporal?: 'today' | 'yesterday' | 'this_week' | 'last_15' | 'all';
  sources?: string[];
  clusterId?: string;
  hasStory?: boolean;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export class ActivityService {
  constructor(
    private prisma: PrismaClient,
    private isDemoMode: boolean
  ) {}

  async listActivities(
    userId: string,
    filters: ActivityFilters,
    pagination: PaginationParams,
    timezone: string = 'UTC'
  ) {
    const { temporal, sources, clusterId, hasStory } = filters;
    const { page, pageSize } = pagination;

    // Build where clause
    const where: any = { userId };

    // Temporal filter
    if (temporal && temporal !== 'all') {
      const now = toZonedTime(new Date(), timezone);
      where.timestamp = this.buildTemporalFilter(temporal, now);
    }

    // Source filter
    if (sources && sources.length > 0) {
      where.source = { in: sources };
    }

    // Cluster filter
    if (clusterId) {
      where.clusterId = clusterId;
    }

    // Has story filter
    if (hasStory !== undefined) {
      where.cluster = hasStory
        ? { story: { isNot: null } }
        : { OR: [{ story: null }, { is: null }] };
    }

    // Select table based on demo mode
    const table = this.isDemoMode
      ? this.prisma.demoToolActivity
      : this.prisma.toolActivity;

    // Query with pagination
    const [activities, total] = await Promise.all([
      table.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          cluster: {
            include: { story: { select: { id: true } } }
          }
        }
      }),
      table.count({ where })
    ]);

    return {
      activities: activities.map(this.formatActivity),
      pagination: {
        page,
        pageSize,
        total,
        hasMore: page * pageSize < total
      },
      filters: {
        temporal: temporal || 'all',
        sources: sources || [],
        applied: !!(temporal || sources?.length || clusterId)
      }
    };
  }

  private buildTemporalFilter(temporal: string, now: Date) {
    switch (temporal) {
      case 'today':
        return { gte: startOfDay(now) };
      case 'yesterday':
        return {
          gte: startOfDay(subDays(now, 1)),
          lt: startOfDay(now)
        };
      case 'this_week':
        return { gte: startOfWeek(now, { weekStartsOn: 1 }) };
      case 'last_15':
        return { gte: subDays(now, 15) };
      default:
        return undefined;
    }
  }

  private formatActivity(activity: any) {
    return {
      id: activity.id,
      source: activity.source,
      sourceId: activity.sourceId,
      sourceUrl: activity.sourceUrl,
      title: activity.title,
      description: activity.description,
      timestamp: activity.timestamp.toISOString(),
      sourceRef: this.parseSourceRef(activity),
      clusterId: activity.clusterId,
      storyId: activity.cluster?.story?.id || null,
      importance: this.inferImportance(activity),
      createdAt: activity.createdAt.toISOString()
    };
  }

  private parseSourceRef(activity: any) {
    const rawData = activity.rawData || {};
    switch (activity.source) {
      case 'github':
        return {
          type: rawData.type || 'unknown',
          repo: rawData.repo,
          number: rawData.number
        };
      case 'jira':
        return {
          type: 'ticket',
          project: rawData.project,
          key: activity.sourceId
        };
      // ... other sources
      default:
        return { type: 'unknown' };
    }
  }

  private inferImportance(activity: any): 'high' | 'medium' | 'low' {
    const rawData = activity.rawData || {};
    // Heuristics for importance
    if (rawData.merged || rawData.closed || rawData.type === 'release') return 'high';
    if (rawData.type === 'comment' || rawData.type === 'review') return 'medium';
    return 'low';
  }
}
```

### 4.2 StoryPublishingService

```typescript
// backend/src/services/story-publishing.service.ts

import { PrismaClient } from '@prisma/client';

export type Visibility = 'private' | 'workspace' | 'network';

export interface PublishResult {
  success: boolean;
  story: {
    id: string;
    visibility: Visibility;
    isPublished: boolean;
    publishedAt: string | null;
    framework: string;
  };
  profileUrl?: string;
  error?: string;
  missingFields?: string[];
}

export class StoryPublishingService {
  constructor(
    private prisma: PrismaClient,
    private isDemoMode: boolean
  ) {}

  async publish(
    storyId: string,
    userId: string,
    visibility: Visibility = 'private'
  ): Promise<PublishResult> {
    const table = this.isDemoMode
      ? this.prisma.demoCareerStory
      : this.prisma.careerStory;

    // Fetch story with cluster for ownership check
    const story = await table.findUnique({
      where: { id: storyId },
      include: { cluster: true }
    });

    if (!story) {
      return { success: false, error: 'Story not found', story: null as any };
    }

    // Ownership check
    if (story.cluster.userId !== userId) {
      return { success: false, error: 'Cannot publish stories you don\'t own', story: null as any };
    }

    // Validate STAR completeness
    const missingFields = this.validateStarCompleteness(story);
    if (missingFields.length > 0) {
      return {
        success: false,
        error: 'Incomplete story',
        missingFields,
        story: this.formatStoryResponse(story)
      };
    }

    // Idempotent publish
    const updatedStory = await table.update({
      where: { id: storyId },
      data: {
        visibility,
        isPublished: true,
        publishedAt: story.isPublished ? story.publishedAt : new Date()
      }
    });

    return {
      success: true,
      story: this.formatStoryResponse(updatedStory),
      profileUrl: `/profile/${story.cluster.userId}#stories`
    };
  }

  async unpublish(storyId: string, userId: string): Promise<PublishResult> {
    const table = this.isDemoMode
      ? this.prisma.demoCareerStory
      : this.prisma.careerStory;

    const story = await table.findUnique({
      where: { id: storyId },
      include: { cluster: true }
    });

    if (!story) {
      return { success: false, error: 'Story not found', story: null as any };
    }

    if (story.cluster.userId !== userId) {
      return { success: false, error: 'Cannot unpublish stories you don\'t own', story: null as any };
    }

    const updatedStory = await table.update({
      where: { id: storyId },
      data: {
        isPublished: false,
        publishedAt: null
        // visibility is preserved
      }
    });

    return {
      success: true,
      story: this.formatStoryResponse(updatedStory)
    };
  }

  async setVisibility(
    storyId: string,
    userId: string,
    visibility: Visibility
  ): Promise<PublishResult> {
    const table = this.isDemoMode
      ? this.prisma.demoCareerStory
      : this.prisma.careerStory;

    const story = await table.findUnique({
      where: { id: storyId },
      include: { cluster: true }
    });

    if (!story) {
      return { success: false, error: 'Story not found', story: null as any };
    }

    if (story.cluster.userId !== userId) {
      return { success: false, error: 'Cannot modify stories you don\'t own', story: null as any };
    }

    const updatedStory = await table.update({
      where: { id: storyId },
      data: { visibility }
    });

    return {
      success: true,
      story: this.formatStoryResponse(updatedStory)
    };
  }

  private validateStarCompleteness(story: any): string[] {
    const missing: string[] = [];
    const fields = ['situation', 'task', 'action', 'result'];

    for (const field of fields) {
      const data = story[field];
      if (!data || typeof data !== 'object') {
        missing.push(`${field}`);
        continue;
      }
      // Check for summary key (required for publishing)
      if (!data.summary || data.summary.trim() === '') {
        missing.push(`${field}.summary`);
      }
    }

    return missing;
  }

  private formatStoryResponse(story: any) {
    return {
      id: story.id,
      intent: story.intent,
      visibility: story.visibility,
      isPublished: story.isPublished,
      publishedAt: story.publishedAt?.toISOString() || null,
      framework: story.framework || 'STAR'
    };
  }
}
```

### 4.3 ProfileStoriesService

```typescript
// backend/src/services/profile-stories.service.ts

import { PrismaClient } from '@prisma/client';

export type AccessLevel = 'owner' | 'workspace' | 'public';

export class ProfileStoriesService {
  constructor(
    private prisma: PrismaClient,
    private isDemoMode: boolean
  ) {}

  async getPublishedStories(
    profileUserId: string,
    viewerId: string | null,
    page: number = 1,
    pageSize: number = 10
  ) {
    // Determine viewer access level
    const viewerAccess = await this.determineAccess(viewerId, profileUserId);

    // Build visibility filter based on access
    const visibilityFilter = this.buildVisibilityFilter(viewerAccess);

    const storyTable = this.isDemoMode
      ? this.prisma.demoCareerStory
      : this.prisma.careerStory;

    const clusterTable = this.isDemoMode
      ? this.prisma.demoStoryCluster
      : this.prisma.storyCluster;

    // Query published stories with access filter
    const [stories, total] = await Promise.all([
      storyTable.findMany({
        where: {
          isPublished: true,
          ...visibilityFilter,
          cluster: { userId: profileUserId }
        },
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          cluster: {
            include: {
              activities: { select: { id: true } },
              _count: { select: { activities: true } }
            }
          }
        }
      }),
      storyTable.count({
        where: {
          isPublished: true,
          ...visibilityFilter,
          cluster: { userId: profileUserId }
        }
      })
    ]);

    // Get profile owner info
    const owner = await this.prisma.user.findUnique({
      where: { id: profileUserId },
      select: {
        id: true,
        name: true,
        title: true,
        avatarUrl: true
      }
    });

    return {
      stories: stories.map(story => this.formatPublishedStory(story, viewerAccess)),
      pagination: {
        page,
        pageSize,
        total,
        hasMore: page * pageSize < total
      },
      owner,
      viewerAccess
    };
  }

  private async determineAccess(
    viewerId: string | null,
    profileUserId: string
  ): Promise<AccessLevel> {
    if (!viewerId) return 'public';
    if (viewerId === profileUserId) return 'owner';

    // Check workspace membership
    const [viewer, profileOwner] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: viewerId },
        select: { workspaceId: true }
      }),
      this.prisma.user.findUnique({
        where: { id: profileUserId },
        select: { workspaceId: true }
      })
    ]);

    if (viewer?.workspaceId && viewer.workspaceId === profileOwner?.workspaceId) {
      return 'workspace';
    }

    return 'public';
  }

  private buildVisibilityFilter(access: AccessLevel) {
    switch (access) {
      case 'owner':
        return {}; // See all published
      case 'workspace':
        return { visibility: { in: ['workspace', 'network'] } };
      case 'public':
        return { visibility: 'network' };
    }
  }

  private formatPublishedStory(story: any, access: AccessLevel) {
    const base = {
      id: story.id,
      intent: story.intent,
      framework: story.framework || 'STAR',
      situation: this.extractSummary(story.situation),
      task: this.extractSummary(story.task),
      action: this.extractSummary(story.action),
      result: this.extractSummary(story.result),
      publishedAt: story.publishedAt.toISOString(),
      evidenceCount: story.cluster?._count?.activities || 0
    };

    // Include visibility only for owner/workspace
    if (access !== 'public') {
      return { ...base, visibility: story.visibility };
    }

    return base;
  }

  private extractSummary(field: any): string {
    if (!field) return '';
    if (typeof field === 'string') return field.slice(0, 200);
    if (typeof field === 'object' && field.summary) {
      return field.summary.slice(0, 200);
    }
    return '';
  }
}
```

---

## 5. CONTROLLER LAYER

### 5.1 Activities Controller

```typescript
// backend/src/controllers/activities.controller.ts

import { Request, Response } from 'express';
import { ActivityService } from '../services/activity.service';
import { prisma } from '../lib/prisma';

const VALID_TEMPORAL = ['today', 'yesterday', 'this_week', 'last_15', 'all'];
const VALID_SOURCES = ['github', 'jira', 'confluence', 'outlook', 'figma', 'slack', 'teams'];

export async function getActivities(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const isDemoMode = req.headers['x-demo-mode'] === 'true';
    const timezone = (req.headers['x-timezone'] as string) || 'UTC';

    // Parse and validate filters
    const temporal = req.query.temporal as string;
    if (temporal && !VALID_TEMPORAL.includes(temporal)) {
      return res.status(400).json({
        error: 'Invalid temporal filter',
        valid: VALID_TEMPORAL
      });
    }

    const sourcesParam = req.query.sources as string;
    const sources = sourcesParam ? sourcesParam.split(',') : [];
    const invalidSources = sources.filter(s => !VALID_SOURCES.includes(s));
    if (invalidSources.length > 0) {
      return res.status(400).json({
        error: 'Invalid source',
        invalid: invalidSources,
        valid: VALID_SOURCES
      });
    }

    // Parse pagination
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 20));

    // Execute query
    const service = new ActivityService(prisma, isDemoMode);
    const result = await service.listActivities(
      userId,
      {
        temporal: temporal as any,
        sources: sources.length > 0 ? sources : undefined,
        clusterId: req.query.clusterId as string,
        hasStory: req.query.hasStory === 'true' ? true : req.query.hasStory === 'false' ? false : undefined
      },
      { page, pageSize },
      timezone
    );

    return res.json(result);
  } catch (error) {
    console.error('Error fetching activities:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getActivityById(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const isDemoMode = req.headers['x-demo-mode'] === 'true';
    const { id } = req.params;

    const table = isDemoMode ? prisma.demoToolActivity : prisma.toolActivity;

    const activity = await table.findFirst({
      where: { id, userId },
      include: {
        cluster: {
          include: { story: { select: { id: true } } }
        }
      }
    });

    if (!activity) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    return res.json({ activity });
  } catch (error) {
    console.error('Error fetching activity:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
```

### 5.2 Story Publishing Controller

```typescript
// backend/src/controllers/story-publishing.controller.ts

import { Request, Response } from 'express';
import { StoryPublishingService, Visibility } from '../services/story-publishing.service';
import { prisma } from '../lib/prisma';

const VALID_VISIBILITY = ['private', 'workspace', 'network'];

export async function publishStory(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const isDemoMode = req.headers['x-demo-mode'] === 'true';
    const { id } = req.params;
    const { visibility = 'private' } = req.body;

    if (!VALID_VISIBILITY.includes(visibility)) {
      return res.status(400).json({
        error: 'Invalid visibility',
        valid: VALID_VISIBILITY
      });
    }

    const service = new StoryPublishingService(prisma, isDemoMode);
    const result = await service.publish(id, userId, visibility as Visibility);

    if (!result.success) {
      const status = result.error === 'Story not found' ? 404 :
                     result.error?.includes('own') ? 403 : 400;
      return res.status(status).json(result);
    }

    return res.json(result);
  } catch (error) {
    console.error('Error publishing story:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function unpublishStory(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const isDemoMode = req.headers['x-demo-mode'] === 'true';
    const { id } = req.params;

    const service = new StoryPublishingService(prisma, isDemoMode);
    const result = await service.unpublish(id, userId);

    if (!result.success) {
      const status = result.error === 'Story not found' ? 404 : 403;
      return res.status(status).json(result);
    }

    return res.json(result);
  } catch (error) {
    console.error('Error unpublishing story:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function setStoryVisibility(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const isDemoMode = req.headers['x-demo-mode'] === 'true';
    const { id } = req.params;
    const { visibility } = req.body;

    if (!visibility || !VALID_VISIBILITY.includes(visibility)) {
      return res.status(400).json({
        error: 'Invalid visibility',
        valid: VALID_VISIBILITY
      });
    }

    const service = new StoryPublishingService(prisma, isDemoMode);
    const result = await service.setVisibility(id, userId, visibility as Visibility);

    if (!result.success) {
      const status = result.error === 'Story not found' ? 404 : 403;
      return res.status(status).json(result);
    }

    return res.json(result);
  } catch (error) {
    console.error('Error setting visibility:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
```

### 5.3 Profile Stories Controller

```typescript
// backend/src/controllers/profile-stories.controller.ts

import { Request, Response } from 'express';
import { ProfileStoriesService } from '../services/profile-stories.service';
import { prisma } from '../lib/prisma';

export async function getPublishedStories(req: Request, res: Response) {
  try {
    const profileUserId = req.params.userId;
    const viewerId = req.user?.id || null;  // Optional auth
    const isDemoMode = req.headers['x-demo-mode'] === 'true';

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize as string) || 10));

    const service = new ProfileStoriesService(prisma, isDemoMode);
    const result = await service.getPublishedStories(
      profileUserId,
      viewerId,
      page,
      pageSize
    );

    if (!result.owner) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json(result);
  } catch (error) {
    console.error('Error fetching published stories:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
```

---

## 6. ROUTES

### 6.1 New Routes to Add

```typescript
// backend/src/routes/activities.routes.ts (NEW FILE)

import { Router } from 'express';
import { getActivities, getActivityById } from '../controllers/activities.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', getActivities);
router.get('/:id', getActivityById);

export default router;
```

```typescript
// backend/src/routes/career-stories.routes.ts (ADD TO EXISTING)

// After existing imports, add:
import {
  publishStory,
  unpublishStory,
  setStoryVisibility
} from '../controllers/story-publishing.controller';

// Add these routes after existing routes:

// ============================================================================
// STORY PUBLISHING
// ============================================================================
router.post('/stories/:id/publish', publishStory);
router.post('/stories/:id/unpublish', unpublishStory);
router.put('/stories/:id/visibility', setStoryVisibility);

// Demo mode publishing
router.post('/demo/stories/:id/publish', publishStory);
router.post('/demo/stories/:id/unpublish', unpublishStory);
router.put('/demo/stories/:id/visibility', setStoryVisibility);
```

```typescript
// backend/src/routes/user.routes.ts (ADD TO EXISTING)

// Add import:
import { getPublishedStories } from '../controllers/profile-stories.controller';

// Add route (after /:userId but before authenticated routes):
router.get('/:userId/published-stories', optionalAuth, getPublishedStories);
```

### 6.2 Register Routes in App

```typescript
// backend/src/app.ts (UPDATE)

import activitiesRoutes from './routes/activities.routes';

// Add in route registration section:
app.use('/api/v1/activities', activitiesRoutes);
```

---

## 7. FRONTEND TYPES

### 7.1 Shared Types

```typescript
// src/types/activities.ts (NEW FILE)

export type SourceType = 'github' | 'jira' | 'confluence' | 'outlook' | 'figma' | 'slack' | 'teams';
export type TemporalFilter = 'today' | 'yesterday' | 'this_week' | 'last_15' | 'all';
export type Visibility = 'private' | 'workspace' | 'network';
export type Importance = 'high' | 'medium' | 'low';

export interface Activity {
  id: string;
  source: SourceType;
  sourceId: string;
  sourceUrl?: string;
  title: string;
  description?: string;
  timestamp: string;
  sourceRef: SourceRef;
  clusterId?: string;
  storyId?: string;
  importance?: Importance;
  createdAt: string;
}

export interface SourceRef {
  type: string;
  repo?: string;
  number?: number;
  project?: string;
  key?: string;
  [key: string]: any;
}

export interface ActivitiesResponse {
  activities: Activity[];
  pagination: Pagination;
  filters: {
    temporal: TemporalFilter;
    sources: SourceType[];
    applied: boolean;
  };
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

export interface PublishedStory {
  id: string;
  intent: string;
  framework: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  publishedAt: string;
  evidenceCount: number;
  visibility?: Visibility;
}

export interface PublishedStoriesResponse {
  stories: PublishedStory[];
  pagination: Pagination;
  owner: {
    id: string;
    name: string;
    title?: string;
    avatarUrl?: string;
  };
  viewerAccess: 'owner' | 'workspace' | 'public';
}

export interface PublishResponse {
  success: boolean;
  story: {
    id: string;
    visibility: Visibility;
    isPublished: boolean;
    publishedAt: string | null;
    framework: string;
  };
  profileUrl?: string;
  error?: string;
  missingFields?: string[];
}
```

---

## 8. TECHNICAL REVIEWER ASSESSMENT

### 8.1 Scalability Review

| Concern | Assessment | Recommendation |
|---------|------------|----------------|
| Activity volume | 10K+ per user | Pagination + indexes adequate |
| Query performance | Compound filters | Add composite index on (userId, timestamp, source) |
| Profile visibility | Per-request check | Cache workspace membership (Redis) |
| Concurrent publish | Race conditions | Use optimistic locking (updatedAt check) |

### 8.2 Security Review

| Concern | Assessment | Mitigation |
|---------|------------|------------|
| User isolation | Query filters | Always include userId in WHERE |
| Demo mode isolation | Header-based | Validate at service layer |
| Visibility bypass | Server-side filter | Never trust client visibility claims |
| Rate limiting | Missing | Add per-user rate limits on publish |

### 8.3 Feasibility Assessment

| Component | Complexity | Risk | Notes |
|-----------|------------|------|-------|
| Activities API | Low | Low | Extends existing pattern |
| Publishing service | Medium | Low | New fields + validation |
| Profile stories | Medium | Medium | Access control complexity |
| Schema migration | Low | Low | Additive changes only |

---

## 9. INTEGRATION ARBITER DECISIONS

### 9.1 Trade-off: Demo Mode Header vs. Path

**Decision**: Use `X-Demo-Mode: true` header

**Rationale**:
- Existing pattern in codebase
- Avoids URL duplication
- Middleware can intercept once
- Client can set globally

### 9.2 Trade-off: Visibility Column vs. Separate Table

**Decision**: Add visibility column to existing table

**Rationale**:
- Simpler queries
- No JOIN required
- Easier migrations
- Visibility is metadata, not separate entity

### 9.3 Trade-off: STAR Validation - Strict vs. Lenient

**Decision**: Require `summary` field for publishing, allow empty for drafts

**Rationale**:
- Quality gate for published content
- Flexible during editing
- Clear feedback on missing fields

---

## 10. APPROVAL

**Architect**: ✅ System design complete
**Technical Reviewer**: ✅ Scalability, security, feasibility reviewed
**Integration Arbiter**: ✅ Trade-offs decided

### Sign-off

- [x] Schema changes defined
- [x] API contracts specified
- [x] Service layer designed
- [x] Controllers implemented
- [x] Routes defined
- [x] Types documented
- [x] Trade-offs resolved

**DESIGN_SYSTEM STAGE: COMPLETE**
**Next**: DESIGN_UX (User flows, wireframes, prototypes)

---

## APPENDIX A: THE ARCHITECT REPORT

### A.1 Role Summary

**Role**: The Architect - System Maker
**Responsibility**: Architecture, APIs, data models
**Date**: 2026-01-31

### A.2 Deliverables Checklist

| Deliverable | Status | Location |
|-------------|--------|----------|
| System context diagram | ✅ | Section 1.1 |
| Data flow diagram | ✅ | Section 1.2 |
| Schema changes | ✅ | Section 2 |
| API contracts | ✅ | Section 3 |
| Service layer design | ✅ | Section 4 |
| Controller implementations | ✅ | Section 5 |
| Route definitions | ✅ | Section 6 |
| Frontend types | ✅ | Section 7 |

### A.3 Key Architectural Decisions

| Decision | Options Considered | Choice | Rationale |
|----------|-------------------|--------|-----------|
| Activity filtering | Client-side vs Server-side | Server-side | Data volume, security |
| Visibility storage | Separate table vs Column | Column | Simpler queries |
| Demo mode detection | URL path vs Header | Header | Existing pattern |
| STAR validation | Schema constraint vs App logic | App logic | Flexibility |
| Access control | Middleware vs Service | Service | Granular control |

### A.4 Component Inventory

**New Files to Create**:
```
backend/src/routes/activities.routes.ts
backend/src/controllers/activities.controller.ts
backend/src/controllers/story-publishing.controller.ts
backend/src/controllers/profile-stories.controller.ts
backend/src/services/activity.service.ts
backend/src/services/story-publishing.service.ts
backend/src/services/profile-stories.service.ts
src/types/activities.ts
```

**Existing Files to Modify**:
```
backend/prisma/schema.prisma (add publishing fields)
backend/src/routes/career-stories.routes.ts (add publish routes)
backend/src/routes/user.routes.ts (add published-stories route)
backend/src/app.ts (register activities routes)
```

### A.5 Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| date-fns | existing | Temporal filter calculations |
| date-fns-tz | existing | Timezone handling |
| prisma | existing | Database access |

---

## APPENDIX B: TECHNICAL REVIEWER REPORT

### B.1 Role Summary

**Role**: The Technical Reviewer - System Checker
**Responsibility**: Scalability, security, feasibility review
**Date**: 2026-01-31

### B.2 Scalability Assessment

#### B.2.1 Data Volume Analysis

| Entity | Expected Volume | Growth Rate | Concern Level |
|--------|-----------------|-------------|---------------|
| DemoToolActivity | 10K/user/year | Linear | LOW |
| DemoCareerStory | 50/user/year | Linear | LOW |
| Published Stories | 20/user/year | Linear | LOW |

#### B.2.2 Query Performance

| Query | Estimated Load | Index Coverage | Recommendation |
|-------|----------------|----------------|----------------|
| List activities (filtered) | High | Partial | Add composite index |
| Get published stories | Medium | Good | Current indexes sufficient |
| Publish story | Low | N/A | No concerns |

**Recommended Index**:
```sql
CREATE INDEX idx_demo_tool_activities_user_time_source
ON demo_tool_activities(user_id, timestamp DESC, source);
```

#### B.2.3 Caching Strategy

| Data | Cache Duration | Invalidation | Priority |
|------|----------------|--------------|----------|
| Activity list | 30s | On new activity | Medium |
| Published stories | 5min | On publish/unpublish | High |
| Workspace membership | 1hr | On membership change | High |

### B.3 Security Assessment

#### B.3.1 Threat Model

| Threat | Likelihood | Impact | Mitigation |
|--------|------------|--------|------------|
| Unauthorized activity access | Medium | High | userId filter in all queries |
| Visibility bypass | Low | High | Server-side filtering only |
| Demo data leak to production | Low | Medium | Service-level isolation |
| Rate limit abuse | Medium | Medium | Per-user rate limiting |

#### B.3.2 Security Checklist

- [x] All endpoints require authentication (except public profile view)
- [x] User isolation enforced at service layer
- [x] Demo mode isolation at service layer
- [x] Input validation on all parameters
- [x] Visibility filtering server-side only
- [ ] **TODO**: Add rate limiting to publish endpoints
- [ ] **TODO**: Add audit logging for visibility changes

#### B.3.3 Data Privacy

| Field | Sensitivity | Exposure Control |
|-------|-------------|------------------|
| Activity rawData | High | Never exposed in list views |
| Story situation/task/action/result | Medium | Summary only in profile |
| User workspaceId | Medium | Never exposed to public |

### B.4 Feasibility Assessment

#### B.4.1 Implementation Complexity

| Component | Complexity | Effort | Dependencies |
|-----------|------------|--------|--------------|
| Activities API | Low | 1 day | Schema exists |
| Publishing service | Medium | 2 days | New schema fields |
| Profile stories | Medium | 2 days | User routes exist |
| Schema migration | Low | 0.5 day | Additive only |
| Frontend integration | Medium | 3 days | Types defined |

**Total Estimated Effort**: 8.5 days

#### B.4.2 Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Schema migration failure | Low | High | Test in staging first |
| Performance regression | Low | Medium | Load testing before deploy |
| Frontend/backend contract mismatch | Medium | Medium | TypeScript types shared |

### B.5 Technical Debt

| Item | Priority | Description |
|------|----------|-------------|
| No caching layer | Medium | Add Redis for profile stories |
| Missing rate limits | High | Add before production |
| No audit logging | Medium | Add for compliance |
| Hardcoded visibility values | Low | Consider enum table |

### B.6 Gate Result

**TECHNICAL REVIEW GATE: ✅ PASSED**

| Criteria | Status | Notes |
|----------|--------|-------|
| Scalability adequate | ✅ | With recommended index |
| Security sufficient | ✅ | With TODO items |
| Feasibility confirmed | ✅ | 8.5 days estimated |
| No blocking issues | ✅ | - |

---

## APPENDIX C: INTEGRATION ARBITER REPORT

### C.1 Role Summary

**Role**: The Integration Arbiter - Technical Trade-off Decisions
**Responsibility**: Resolve technical disagreements, make binding decisions
**Date**: 2026-01-31

### C.2 Trade-offs Adjudicated

#### C.2.1 Demo Mode Detection

**Context**: How should the API determine if a request is in demo mode?

| Option | Pros | Cons |
|--------|------|------|
| URL path (`/demo/activities`) | Explicit, RESTful | Route duplication |
| Query param (`?demo=true`) | Simple | Easy to forget |
| Header (`X-Demo-Mode: true`) | Clean URLs, global | Less visible |
| Cookie/Session | Automatic | Security concerns |

**Decision**: `X-Demo-Mode: true` header

**Binding Rationale**:
1. Existing pattern in codebase (`career-stories.routes.ts` uses headers)
2. Client can set globally via axios interceptor
3. Middleware can process once, pass to services
4. No URL duplication needed

---

#### C.2.2 Visibility Storage

**Context**: How should story visibility be stored?

| Option | Pros | Cons |
|--------|------|------|
| Column on CareerStory | Simple queries | Nullable complexity |
| Separate VisibilitySettings table | Normalized | JOIN overhead |
| JSON field in existing column | Flexible | Query complexity |

**Decision**: Column on `DemoCareerStory`

**Binding Rationale**:
1. Visibility is 1:1 with story (not 1:N)
2. Simple WHERE clause filtering
3. Index-friendly
4. Matches existing `isPublished` pattern

---

#### C.2.3 STAR Validation Strictness

**Context**: When should STAR fields be validated?

| Option | Pros | Cons |
|--------|------|------|
| On save (always strict) | Data quality | Blocks drafts |
| On publish only | Flexible editing | May forget validation |
| Configurable per field | Granular | Complex logic |

**Decision**: Validate on publish only, require `summary` subfield

**Binding Rationale**:
1. Users need freedom to draft incrementally
2. Publish is a clear quality gate
3. `summary` is sufficient for profile display
4. Full STAR can have empty optional fields

---

#### C.2.4 Profile Access Determination

**Context**: How to determine viewer's access level to profile?

| Option | Pros | Cons |
|--------|------|------|
| Precompute in middleware | Fast | Stale if membership changes |
| Compute in service | Always fresh | DB hit per request |
| Cache with TTL | Balanced | Cache invalidation |

**Decision**: Compute in service, add caching later

**Binding Rationale**:
1. Correctness over performance initially
2. Workspace membership rarely changes
3. Cache can be added when needed (measured)
4. Avoids premature optimization

---

#### C.2.5 Published Stories Endpoint Location

**Context**: Where should the published-stories endpoint live?

| Option | Pros | Cons |
|--------|------|------|
| `/api/v1/users/:userId/published-stories` | RESTful, profile-centric | Mixed with user routes |
| `/api/v1/career-stories/published` | Domain-grouped | Query param for userId |
| `/api/v1/profiles/:userId/stories` | Clear separation | New route file |

**Decision**: `/api/v1/users/:userId/published-stories`

**Binding Rationale**:
1. Profile is a view of user data
2. Existing `/users/:userId` pattern
3. No new route files needed
4. Natural URL for sharing (`/profile/user123` → API `/users/user123/published-stories`)

---

### C.3 Deferred Decisions

| Decision | Reason | Revisit When |
|----------|--------|--------------|
| Caching implementation | Not needed yet | Performance issues observed |
| Audit log schema | Compliance unclear | Legal review complete |
| Rate limit values | Need usage data | After beta launch |

### C.4 Gate Result

**INTEGRATION ARBITER GATE: ✅ PASSED**

| Criteria | Status | Notes |
|----------|--------|-------|
| All trade-offs resolved | ✅ | 5 decisions made |
| Decisions are binding | ✅ | Documented with rationale |
| No open conflicts | ✅ | - |
| Deferred items tracked | ✅ | 3 items for later |

---

## APPENDIX D: STAGE GATE SUMMARY

### D.1 Design System Stage Gate

**Gate Date**: 2026-01-31
**Gate Status**: ✅ PASSED

### D.2 Role Sign-offs

| Role | Name | Status | Date |
|------|------|--------|------|
| The Architect | System Maker | ✅ APPROVED | 2026-01-31 |
| The Technical Reviewer | System Checker | ✅ APPROVED | 2026-01-31 |
| The Integration Arbiter | Trade-off Resolver | ✅ APPROVED | 2026-01-31 |

### D.3 Gate Criteria

| Criterion | Required | Status |
|-----------|----------|--------|
| Schema changes documented | Yes | ✅ |
| API contracts defined | Yes | ✅ |
| Service layer designed | Yes | ✅ |
| Security review complete | Yes | ✅ |
| Scalability assessed | Yes | ✅ |
| Trade-offs resolved | Yes | ✅ |
| Feasibility confirmed | Yes | ✅ |
| Effort estimated | Yes | ✅ (8.5 days) |

### D.4 Blocking Issues

**None identified.**

### D.5 Non-Blocking Issues (TODOs)

| Issue | Priority | Owner | Due |
|-------|----------|-------|-----|
| Add rate limiting to publish endpoints | High | Backend | Before launch |
| Add audit logging for visibility changes | Medium | Backend | Phase 2 |
| Add caching for profile stories | Medium | Backend | When needed |
| Add composite index for activities | Medium | DBA | Before launch |

### D.6 Approval for Next Stage

**DESIGN_SYSTEM → DESIGN_UX: ✅ APPROVED**

The technical architecture is complete and approved. The project may proceed to the DESIGN_UX stage for user flow design, wireframes, and prototypes.

---

*Generated by CD6 Design System Stage - Full Report*
