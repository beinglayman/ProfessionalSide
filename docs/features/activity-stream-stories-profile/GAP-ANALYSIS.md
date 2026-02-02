# GAP Analysis: Three-Tab Architecture

**Date**: 2026-01-31
**Status**: Complete

---

## Summary

| Tab | Completion | Critical Gaps |
|-----|------------|---------------|
| **Journal** | ~70% | Activity Stream component, temporal/source filters |
| **Stories** | ~80% | Publishing controls, visibility (frameworks COMPLETE) |
| **Profile** | ~50% | Publishing panel, stories display, analytics |

### Framework Coverage (COMPLETE)

**Narrative Frameworks**: STAR, STAR-L, CAR, PAR, SAR, SOAR, SHARE, CARL
**Journal Frameworks**: ONE_ON_ONE, SKILL_GAP, PROJECT_IMPACT
**Grouping Methods**: Temporal (daily/weekly/sprint), Cluster-based (AI)

---

## TAB 1: JOURNAL (Raw Activities + Drafts)

### What Exists

**Backend APIs** (`/api/v1/journal/*`):
- ✅ CRUD operations (create, read, update, delete)
- ✅ Feed with rechronicles
- ✅ Publishing with visibility (private/workspace/network)
- ✅ Engagement (like, appreciate, rechronicle)
- ✅ Comments and artifacts
- ✅ Analytics tracking

**Frontend**:
- ✅ Journal list page (`/src/pages/journal/list.tsx`)
- ✅ Activity feed page (`/src/pages/activity/feed.tsx`)
- ✅ Full hook coverage (`useJournal.ts`)

### What's Missing

| Gap | Priority | Description |
|-----|----------|-------------|
| **Activity Stream Component** | HIGH | Unified view of raw `DemoToolActivity` with tool logos |
| **Temporal Filters** | HIGH | Today / Yesterday / This Week / Last 15 Days |
| **Source Filters** | HIGH | GitHub / Jira / Figma / Outlook / Slack / Teams |
| **Raw Activity API** | HIGH | `GET /api/v1/activities` for `DemoToolActivity` |
| **Background Draft Status** | MEDIUM | Show "generating..." while AI processes |

### Required New Endpoints

```
GET /api/v1/activities                    # List raw DemoToolActivity
GET /api/v1/activities?source=github      # Filter by source
GET /api/v1/activities?temporal=today     # Filter by time
```

### Required New Components

```
src/components/activity-stream/
├── ActivityStream.tsx          # Main unified view
├── ActivityCard.tsx            # Raw activity card with tool logo
├── TemporalFilter.tsx          # Today/Yesterday/Week selector
├── SourceFilter.tsx            # GitHub/Jira/etc. selector
└── DraftIndicator.tsx          # "Generating draft..." status
```

---

## TAB 2: STORIES (STAR Narratives)

### What Exists

**Backend APIs** (`/api/v1/career-stories/*`):
- ✅ Tool activity ingestion (`ToolActivity`, `DemoToolActivity`)
- ✅ Cluster management (create, update, delete, merge)
- ✅ STAR generation (`generate-star` endpoint)
- ✅ Demo mode with separate tables

**Database Models**:
- ✅ `CareerStory` / `DemoCareerStory` with STAR fields (situation, task, action, result)
- ✅ `StoryCluster` / `DemoStoryCluster` for activity grouping
- ✅ Verification field for claim validation

**Narrative Frameworks** (8 career story formats):
- ✅ STAR, STAR-L, CAR, PAR, SAR, SOAR, SHARE, CARL
- ✅ Full component definitions with prompts
- ✅ `recommendFrameworks()` - context-based recommendations
- ✅ `QUESTION_TO_FRAMEWORK` - question-type mapping

**Journal Frameworks** (3 additional):
- ✅ ONE_ON_ONE (Wins, Challenges, Focus, Asks, Feedback)
- ✅ SKILL_GAP (Demonstrated, Learned, Gaps, Plan)
- ✅ PROJECT_IMPACT (Project, Contribution, Impact, Collaboration)

**Grouping Methods**:
- ✅ Temporal (daily/weekly/sprint) via `journal-auto-generator.service.ts`
- ✅ Cluster-based (AI-detected) via `clustering.service.ts`

**Frontend**:
- ✅ CareerStoriesPage component
- ✅ ClusterList, ClusterCard components
- ✅ STARPreview component
- ✅ FrameworkSelector component

### What's Missing

| Gap | Priority | Description |
|-----|----------|-------------|
| **Story Visibility** | CRITICAL | No `visibility` field on CareerStory |
| **Story Publishing** | CRITICAL | No `isPublished`, `publishedAt` fields |
| **Publish Endpoint** | CRITICAL | `POST /api/v1/career-stories/:id/publish` |
| **Story Comments** | HIGH | No comments on stories |
| **Story Engagement** | HIGH | No like/appreciate for stories |
| **Profile Display** | HIGH | Stories don't appear on profile page |
| **Verification UI** | MEDIUM | No UI for verification field |

### Required Schema Changes

```prisma
model CareerStory {
  // ... existing fields

  // ADD THESE:
  visibility    String    @default("private")  // private, workspace, network
  isPublished   Boolean   @default(false)
  publishedAt   DateTime?
  networkContent Json?    // Sanitized for network display
}
```

### Required New Endpoints

```
POST /api/v1/career-stories/:id/publish     # Publish to profile
PUT  /api/v1/career-stories/:id/visibility  # Set visibility
POST /api/v1/career-stories/:id/like        # Like story
POST /api/v1/career-stories/:id/comments    # Add comment
GET  /api/v1/career-stories/:id/comments    # Get comments
```

---

## TAB 3: PROFILE (Publishing Layer)

### What Exists

**Backend APIs** (`/api/v1/users/*`):
- ✅ Profile CRUD
- ✅ Skills with endorsement
- ✅ Privacy settings
- ✅ Data export

**Frontend**:
- ✅ Profile view page with tabs (journal, skills, achievements)
- ✅ Public profile view
- ✅ Privacy settings component
- ✅ Profile completeness widget

### What's Missing

| Gap | Priority | Description |
|-----|----------|-------------|
| **Publishing Control Panel** | CRITICAL | No unified "what's published" view |
| **Stories on Profile** | CRITICAL | No Career Stories tab on profile |
| **Per-Item Visibility Toggles** | HIGH | Can't toggle individual items |
| **Published Content Dashboard** | HIGH | No preview of public profile |
| **Profile Analytics** | MEDIUM | No view counts, engagement stats |
| **Audience Preview** | MEDIUM | No "view as visitor" mode |

### Required New Pages

```
/profile/publishing    # Publishing control panel
/profile/published     # View all published content
/profile/analytics     # Engagement stats
```

### Required New Endpoints

```
GET  /api/v1/users/profile/publishing-status     # All published items
PUT  /api/v1/users/profile/visibility/:type/:id  # Toggle per item
GET  /api/v1/users/profile/analytics             # View/engagement stats
GET  /api/v1/users/:userId/published-stories     # Public stories for profile
```

### Required New Components

```
src/components/profile/
├── PublishingControlPanel.tsx   # Master toggle dashboard
├── PublishedContentList.tsx     # What's currently public
├── VisibilityToggle.tsx         # Per-item toggle
├── ProfilePreview.tsx           # "View as visitor" mode
└── StoriesTab.tsx               # Career stories on profile
```

---

## Implementation Phases

### Phase 1: Activity Stream (Journal Tab)
**Goal**: Instant visibility of raw activities

1. Create `GET /api/v1/activities` endpoint for `DemoToolActivity`
2. Build `ActivityStream` component with demo-v2 styling
3. Add temporal and source filters
4. Integrate with existing journal list page

### Phase 2: Story Publishing (Stories Tab)
**Goal**: STAR stories can be published to profile

1. Add visibility/publishing fields to `CareerStory` schema
2. Create publish endpoint
3. Add Stories tab to profile page
4. Build story publishing UI

### Phase 3: Publishing Control (Profile Tab)
**Goal**: Unified control over what's public

1. Create publishing control panel page
2. Add per-item visibility toggles
3. Build published content dashboard
4. Add audience preview mode

### Phase 4: Engagement & Analytics
**Goal**: Track and display engagement

1. Add view/like counts to published content
2. Build analytics dashboard
3. Add notification for engagement events

---

## Feature Matrix

| Feature | Journal | Stories | Profile |
|---------|:-------:|:-------:|:-------:|
| CRUD operations | ✅ | ✅ | ✅ |
| Visibility controls | ✅ | ❌ | ⚠️ |
| Publishing flow | ✅ | ❌ | ⚠️ |
| Comments | ✅ | ❌ | - |
| Like/Appreciate | ✅ | ❌ | - |
| Display on profile | ⚠️ | ❌ | ⚠️ |
| Analytics | ⚠️ | ❌ | ❌ |
| Filters (temporal/source) | ❌ | - | - |
| Raw activity view | ❌ | - | - |

**Legend**: ✅ Complete | ⚠️ Partial | ❌ Missing | - Not applicable

---

## Existing File Locations

### Backend
- Routes: `backend/src/routes/journal.routes.ts`, `career-stories.routes.ts`, `user.routes.ts`
- Controllers: `backend/src/controllers/journal.controller.ts`, `career-stories.controller.ts`
- Services: `backend/src/services/journal.service.ts`, `career-stories/`
- Schema: `backend/prisma/schema.prisma`

### Frontend
- Pages: `src/pages/journal/`, `src/pages/activity/`, `src/pages/profile/`
- Components: `src/components/career-stories/`, `src/components/journal/`
- Hooks: `src/hooks/useJournal.ts`, `src/hooks/useCareerStories.ts`
- Services: `src/services/journal.service.ts`, `src/services/career-stories.service.ts`
