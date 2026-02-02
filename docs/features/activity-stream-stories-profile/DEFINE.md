# CD6 DEFINE STAGE - Invariant-Focused Requirements

**Date**: 2026-01-31
**Status**: IN_PROGRESS
**Previous**: CONCEPT (Complete)
**Next**: DESIGN_SYSTEM

---

## Overview

This document defines requirements through **invariants** - properties that must always hold true for the system to be correct. Unlike user stories that describe what to build, invariants describe what must **always be true** regardless of implementation details.

---

## 1. ACTIVITY STREAM (Journal Tab)

### 1.1 Information Invariants

**Data Model**: `DemoToolActivity`

| Field | Required | Constraint |
|-------|----------|------------|
| `id` | YES | Unique CUID |
| `userId` | YES | Valid user reference |
| `source` | YES | One of: `github`, `jira`, `confluence`, `outlook`, `figma`, `slack`, `teams` |
| `sourceId` | YES | Non-empty string from source system |
| `title` | YES | Non-empty, max 500 chars |
| `timestamp` | YES | Valid datetime, cannot be future |
| `description` | NO | Max 5000 chars if present |
| `sourceUrl` | NO | Valid URL format if present |
| `rawData` | NO | Valid JSON if present |
| `clusterId` | NO | Valid cluster reference if present |

**Invariant A1**: Every activity MUST have a source and sourceId
```
∀ activity: activity.source ≠ null ∧ activity.sourceId ≠ null
```

**Invariant A2**: Activity timestamps MUST be in the past or present
```
∀ activity: activity.timestamp ≤ now()
```

**Invariant A3**: Activity-user binding is immutable
```
∀ activity: activity.userId = constant (never changes after creation)
```

**Invariant A4**: Source + sourceId is unique per user
```
∀ a1, a2 where a1.userId = a2.userId:
  (a1.source = a2.source ∧ a1.sourceId = a2.sourceId) → a1.id = a2.id
```

### 1.2 Output Invariants

**API Response Shape**: `GET /api/v1/activities`

```typescript
interface ActivitiesResponse {
  activities: Activity[];      // ALWAYS present, may be empty array
  pagination: {
    total: number;             // >= 0
    page: number;              // >= 1
    pageSize: number;          // 1-100
    hasMore: boolean;          // true if more pages exist
  };
  filters: {
    temporal: TemporalFilter;  // ALWAYS present
    sources: string[];         // ALWAYS present, empty = all
  };
}

interface Activity {
  id: string;                  // ALWAYS
  source: SourceType;          // ALWAYS
  sourceId: string;            // ALWAYS
  title: string;               // ALWAYS
  timestamp: string;           // ISO8601, ALWAYS
  description?: string;        // OPTIONAL
  sourceUrl?: string;          // OPTIONAL
  sourceRef: SourceRef;        // ALWAYS - derived from source type
  clusterId?: string;          // OPTIONAL
  storyId?: string;            // OPTIONAL - if linked to story
  importance?: 'high' | 'medium' | 'low';  // OPTIONAL
}
```

**Invariant O1**: Response ALWAYS includes pagination metadata
```
∀ response: response.pagination ≠ null
```

**Invariant O2**: Activities are sorted by timestamp descending (newest first)
```
∀ i, j where i < j: response.activities[i].timestamp >= response.activities[j].timestamp
```

**Invariant O3**: Filter state is always reflected in response
```
∀ response: response.filters reflects actual applied filters
```

### 1.3 UI State Invariants

**Required States**:

| State | Must Exist | Display |
|-------|------------|---------|
| `loading` | YES | Skeleton or spinner |
| `empty` | YES | "No activities yet" message |
| `populated` | YES | Activity list |
| `error` | YES | Error message with retry |
| `filtered-empty` | YES | "No activities match filters" |

**Invariant U1**: Exactly one UI state is active at any time
```
states = {loading, empty, populated, error, filtered-empty}
∀ time: |active_states| = 1
```

**Invariant U2**: Loading state shown during any data fetch
```
isFetching → state = loading
```

**Invariant U3**: Empty state distinguishes between "no data" and "no matches"
```
activities.length = 0 ∧ filtersApplied → state = filtered-empty
activities.length = 0 ∧ ¬filtersApplied → state = empty
```

### 1.4 Process Invariants

**Activity Display Flow**:
```
1. Page Load → Fetch activities with default filters
2. Filter Change → Fetch activities with new filters
3. Scroll → Load more (infinite scroll) OR pagination click
```

**Invariant P1**: Filter changes MUST trigger new fetch
```
filterState(t) ≠ filterState(t-1) → fetch() called
```

**Invariant P2**: Activities display MUST complete within 100ms (client-side render)
```
∀ fetch_complete: time_to_render ≤ 100ms
```

**Invariant P3**: Temporal filter interpretation is deterministic
```
"today"     → timestamp >= startOfDay(now())
"yesterday" → startOfDay(now()-1) ≤ timestamp < startOfDay(now())
"this_week" → timestamp >= startOfWeek(now())
"last_15"   → timestamp >= now() - 15 days
```

### 1.5 Error Invariants

**Must Handle**:

| Error | Recovery |
|-------|----------|
| Network failure | Show error + retry button |
| 401 Unauthorized | Redirect to login |
| 500 Server error | Show error + retry button |
| Invalid filter | Reset to defaults + show message |
| Empty response | Show empty state (not error) |

**Invariant E1**: Network errors are recoverable
```
∀ network_error: retry_action_available = true
```

**Invariant E2**: Auth errors force re-authentication
```
response.status = 401 → redirect_to_login()
```

**Invariant E3**: Invalid inputs never crash the UI
```
∀ invalid_input: graceful_degradation = true (no exceptions to user)
```

### 1.6 CLI Testing Invariants

**Required Commands**:

```bash
# Nouns: activity, activities
# Verbs: list, get, filter, count

ws activities list                           # List all activities
ws activities list --source=github           # Filter by source
ws activities list --temporal=today          # Filter by time
ws activities list --format=json             # JSON output
ws activities list --format=table            # Table output (default)
ws activities get <id>                       # Get single activity
ws activities count                          # Count activities
ws activities count --source=github          # Count by source
```

**Output Format Invariants**:

```bash
# JSON mode: Valid JSON to stdout
ws activities list --format=json | jq .  # MUST parse

# Table mode: Human-readable columns
ID          SOURCE    TITLE                    TIMESTAMP
abc123      github    Merged: PR #1247         2026-01-24 14:30

# Count mode: Single number
ws activities count
> 42
```

**Invariant C1**: CLI output is always parseable in JSON mode
```
--format=json → output is valid JSON
```

**Invariant C2**: CLI exit codes follow convention
```
success → exit 0
user_error → exit 1
server_error → exit 2
```

### 1.7 Testing Invariants

**Required Test Cases**:

| Test | Assertion |
|------|-----------|
| `list_empty` | Returns empty array, not error |
| `list_with_data` | Returns activities sorted by timestamp desc |
| `filter_by_source` | Only returns activities from that source |
| `filter_by_temporal` | Only returns activities in time range |
| `filter_combined` | AND logic for multiple filters |
| `pagination` | Correct page, total, hasMore |
| `invalid_source` | Returns 400 with message |
| `invalid_temporal` | Returns 400 with message |

**Performance Boundaries**:

| Metric | Boundary |
|--------|----------|
| API response time (p95) | < 200ms |
| Client render time | < 100ms |
| Activities per page | 20-50 |
| Max activities fetched | 1000 |

**Security Constraints**:

| Constraint | Enforcement |
|------------|-------------|
| User isolation | Activities only visible to owner |
| Demo mode isolation | DemoToolActivity separate from production |
| Input sanitization | All query params validated |
| Rate limiting | 100 requests/minute per user |

---

## 2. STORY PUBLISHING (Stories Tab)

### 2.1 Information Invariants

**Data Model**: `DemoCareerStory` (Extended)

| Field | Required | Constraint |
|-------|----------|------------|
| `id` | YES | Unique CUID |
| `clusterId` | YES | Valid cluster reference |
| `intent` | YES | Non-empty string |
| `situation` | YES | Valid JSON with framework fields |
| `task` | YES | Valid JSON with framework fields |
| `action` | YES | Valid JSON with framework fields |
| `result` | YES | Valid JSON with framework fields |
| **`visibility`** | YES | One of: `private`, `workspace`, `network` |
| **`isPublished`** | YES | Boolean |
| **`publishedAt`** | NO | DateTime, only if isPublished=true |

**Invariant S1**: Every story has a visibility level
```
∀ story: story.visibility ∈ {private, workspace, network}
```

**Invariant S2**: Published stories MUST have publishedAt
```
∀ story: story.isPublished = true → story.publishedAt ≠ null
```

**Invariant S3**: Unpublished stories MUST NOT have publishedAt
```
∀ story: story.isPublished = false → story.publishedAt = null
```

**Invariant S4**: STAR fields are never empty for published stories
```
∀ story where story.isPublished:
  story.situation ≠ {} ∧ story.task ≠ {} ∧ story.action ≠ {} ∧ story.result ≠ {}
```

**Invariant S5**: Visibility hierarchy
```
network → workspace → private (network implies workspace implies private)
visibility = network → visible_to(workspace) = true
visibility = workspace → visible_to(private) = true
```

### 2.2 Output Invariants

**API Response Shape**: `POST /api/v1/career-stories/:id/publish`

```typescript
interface PublishResponse {
  success: boolean;            // ALWAYS
  story: {
    id: string;                // ALWAYS
    visibility: Visibility;    // ALWAYS
    isPublished: boolean;      // ALWAYS true after publish
    publishedAt: string;       // ISO8601, ALWAYS after publish
  };
  profileUrl?: string;         // URL where story appears on profile
}
```

**Invariant O4**: Publish action is idempotent
```
publish(story) then publish(story) → same result (no error)
```

**Invariant O5**: Publish response includes profile URL when successful
```
response.success = true → response.profileUrl ≠ null
```

### 2.3 UI State Invariants

**Publish Button States**:

| State | Condition | Display |
|-------|-----------|---------|
| `ready` | story.isPublished = false | "Publish to Profile" |
| `publishing` | publish request in flight | "Publishing..." (disabled) |
| `published` | story.isPublished = true | "Published ✓" + view link |
| `error` | publish failed | "Retry" + error message |

**Invariant U4**: Publish button reflects actual publication state
```
story.isPublished = true → button_state ∈ {published}
```

**Visibility Selector States**:

| Level | Icon | Description |
|-------|------|-------------|
| `private` | 🔒 | Only you can see |
| `workspace` | 🏢 | Your team can see |
| `network` | 🌐 | Anyone with link can see |

**Invariant U5**: Visibility change requires confirmation for published stories
```
story.isPublished ∧ visibility_change → confirmation_required
```

### 2.4 Process Invariants

**Publishing Flow**:
```
1. User selects visibility level
2. User clicks "Publish"
3. System validates STAR completeness
4. System sets isPublished=true, publishedAt=now()
5. Story appears on profile
```

**Invariant P4**: Publishing requires complete STAR
```
¬star_complete → publish_blocked with message
```

**Invariant P5**: Visibility can change after publish
```
∀ published_story: can_change_visibility = true
```

**Invariant P6**: Unpublish is reversible
```
unpublish(story) → story.isPublished = false ∧ story.publishedAt = null
profile_removes(story)
```

### 2.5 Error Invariants

**Must Handle**:

| Error | Recovery |
|-------|----------|
| Incomplete STAR | Show which fields missing |
| Network failure | Retry button |
| Concurrent edit | Refresh and show conflict |
| Already published | Show current state (idempotent) |

**Invariant E4**: Incomplete STAR provides actionable feedback
```
¬star_complete → list_missing_fields()
```

**Invariant E5**: Publish failure preserves draft
```
publish_fails → story state unchanged
```

### 2.6 CLI Testing Invariants

**Required Commands**:

```bash
# Nouns: story, stories
# Verbs: list, get, publish, unpublish, set-visibility

ws stories list                              # List all stories
ws stories list --published                  # Only published
ws stories list --visibility=workspace       # Filter by visibility
ws stories get <id>                          # Get single story
ws stories publish <id>                      # Publish story
ws stories publish <id> --visibility=network # Publish with visibility
ws stories unpublish <id>                    # Unpublish story
ws stories set-visibility <id> workspace    # Change visibility
```

**Invariant C3**: Publish command validates before execution
```
ws stories publish <id> with incomplete STAR → error message, exit 1
```

**Invariant C4**: Visibility commands are atomic
```
set-visibility succeeds OR fails entirely (no partial state)
```

### 2.7 Testing Invariants

**Required Test Cases**:

| Test | Assertion |
|------|-----------|
| `publish_complete_star` | Sets isPublished, publishedAt |
| `publish_incomplete_star` | Returns 400 with missing fields |
| `publish_idempotent` | Second publish succeeds, same state |
| `unpublish` | Clears isPublished, publishedAt |
| `visibility_change_private_to_workspace` | Updates visibility |
| `visibility_change_published` | Requires same auth level |
| `publish_nonexistent` | Returns 404 |

**Security Constraints**:

| Constraint | Enforcement |
|------------|-------------|
| Owner only | Only story owner can publish |
| Workspace members | Workspace visibility requires membership |
| Visibility downgrade | Always allowed (network→workspace→private) |
| Visibility upgrade | Allowed with owner permission |

---

## 3. PUBLISHED STORIES (Profile Tab)

### 3.1 Information Invariants

**Profile Stories View**

| Field | Required | Constraint |
|-------|----------|------------|
| `stories` | YES | Array of published stories |
| `totalCount` | YES | Number of published stories |
| `lastUpdated` | YES | Most recent publishedAt |

**Invariant P7**: Profile only shows published stories
```
∀ story in profile.stories: story.isPublished = true
```

**Invariant P8**: Profile respects visibility
```
viewer = owner → sees all published
viewer = workspace_member → sees workspace + network
viewer = public → sees network only
```

**Invariant P9**: Profile stories sorted by publishedAt (newest first)
```
∀ i, j where i < j: stories[i].publishedAt >= stories[j].publishedAt
```

### 3.2 Output Invariants

**API Response Shape**: `GET /api/v1/users/:userId/published-stories`

```typescript
interface PublishedStoriesResponse {
  stories: PublishedStory[];   // ALWAYS, may be empty
  totalCount: number;          // ALWAYS >= 0
  owner: {
    id: string;                // ALWAYS
    name: string;              // ALWAYS
    title?: string;            // OPTIONAL
    avatarUrl?: string;        // OPTIONAL
  };
  viewerAccess: 'owner' | 'workspace' | 'public';  // ALWAYS
}

interface PublishedStory {
  id: string;                  // ALWAYS
  intent: string;              // ALWAYS
  situation: string;           // Summary, not full JSON
  task: string;                // Summary
  action: string;              // Summary
  result: string;              // Summary
  publishedAt: string;         // ISO8601, ALWAYS
  evidenceCount: number;       // Number of linked activities
  framework: FrameworkType;    // STAR, CAR, etc.
}
```

**Invariant O6**: Public view omits sensitive fields
```
viewerAccess = public → stories contain only public-safe fields
```

**Invariant O7**: Evidence count is accurate
```
∀ story: story.evidenceCount = count(linked_activities)
```

### 3.3 UI State Invariants

**Profile Stories Tab States**:

| State | Condition | Display |
|-------|-----------|---------|
| `loading` | fetching | Skeleton |
| `empty` | stories.length = 0 | "No published stories yet" + CTA |
| `populated` | stories.length > 0 | Story cards |
| `error` | fetch failed | Error + retry |

**Invariant U6**: Empty state includes call-to-action for owners
```
viewerAccess = owner ∧ stories.length = 0 → show_publish_cta
```

**Story Card Display**:

| Element | Required | Content |
|---------|----------|---------|
| Title/Intent | YES | Story intent |
| Framework badge | YES | STAR, CAR, etc. |
| Published date | YES | Relative time |
| Evidence count | YES | "Based on N activities" |
| Summary | YES | First 200 chars of situation |

**Invariant U7**: Story cards are consistent across profile views
```
owner_view.card_layout = public_view.card_layout (same component)
```

### 3.4 Process Invariants

**Profile Viewing Flow**:
```
1. Viewer requests /profile/:userId
2. System determines viewer access level
3. System filters stories by visibility
4. System returns appropriate stories
```

**Invariant P10**: Access level determination is consistent
```
viewer_access(user, profile) is deterministic:
  user = profile.owner → owner
  user in profile.workspace → workspace
  otherwise → public
```

**Invariant P11**: Publishing immediately reflects on profile
```
publish(story) → profile.stories includes story (eventual consistency < 1s)
```

### 3.5 Error Invariants

**Must Handle**:

| Error | Recovery |
|-------|----------|
| Profile not found | 404 page |
| No permission | Show public stories only |
| Network failure | Retry button |
| Story deleted after publish | Remove from profile |

**Invariant E6**: Permission errors degrade gracefully
```
insufficient_permission → show_lower_permission_content (not error)
```

### 3.6 CLI Testing Invariants

**Required Commands**:

```bash
# Nouns: profile
# Verbs: view, stories

ws profile view                              # View own profile
ws profile view <userId>                     # View other's profile
ws profile stories                           # List own published stories
ws profile stories <userId>                  # List other's public stories
ws profile stories --format=json             # JSON output
```

**Invariant C5**: CLI respects same access levels as API
```
ws profile stories <userId> shows same stories as API
```

### 3.7 Testing Invariants

**Required Test Cases**:

| Test | Assertion |
|------|-----------|
| `view_own_profile` | Shows all published stories |
| `view_workspace_profile` | Shows workspace + network |
| `view_public_profile` | Shows network only |
| `no_published_stories` | Returns empty array, not error |
| `story_unpublished` | Removed from profile |
| `concurrent_viewers` | Consistent data |

**Performance Boundaries**:

| Metric | Boundary |
|--------|----------|
| Profile load time (p95) | < 500ms |
| Stories per page | 10-20 |
| Max stories displayed | 100 |

**Security Constraints**:

| Constraint | Enforcement |
|------------|-------------|
| Visibility enforcement | Server-side filter |
| No visibility bypass | API validates access |
| Profile enumeration | Rate limit profile views |

---

## 4. CROSS-CUTTING INVARIANTS

### 4.1 Data Flow Invariants

```
DemoToolActivity → DemoStoryCluster → DemoCareerStory → Profile

∀ path through system:
  activities remain immutable
  stories link back to activities (evidence)
  profile displays only published stories
```

**Invariant X1**: Activity-to-Story traceability
```
∀ story: story.cluster.activities ≠ empty
```

**Invariant X2**: Story-to-Profile consistency
```
story.isPublished = true ↔ story appears on owner's profile
```

### 4.2 Demo Mode Invariants

**Invariant D1**: Demo mode isolation
```
isDemoMode = true → use Demo* tables exclusively
isDemoMode = false → use production tables exclusively
```

**Invariant D2**: Demo data never leaks to production
```
∀ DemoToolActivity, DemoCareerStory: never written to production tables
```

**Invariant D3**: Demo mode toggle is session-scoped
```
isDemoMode determined at request start, immutable for request
```

### 4.3 Audit Invariants

**Invariant AU1**: All publish actions are logged
```
publish(story) → audit_log entry created
```

**Invariant AU2**: Visibility changes are logged
```
change_visibility(story) → audit_log entry created
```

---

## 5. ACCEPTANCE CRITERIA CHECKLIST

### Activity Stream
- [ ] Activities load within 200ms (p95)
- [ ] Temporal filters work: today, yesterday, this_week, last_15
- [ ] Source filters work: github, jira, figma, outlook, slack, teams, confluence
- [ ] Combined filters use AND logic
- [ ] Empty state distinguishes "no data" from "no matches"
- [ ] Error states show retry option
- [ ] CLI commands work with JSON and table output

### Story Publishing
- [ ] Visibility field added to CareerStory schema
- [ ] isPublished and publishedAt fields added
- [ ] Publish endpoint validates STAR completeness
- [ ] Publish is idempotent
- [ ] Unpublish removes from profile
- [ ] Visibility change works for published stories
- [ ] CLI publish command validates before execution

### Profile Stories
- [ ] Published stories appear on profile
- [ ] Visibility filtering works (owner/workspace/public)
- [ ] Stories sorted by publishedAt descending
- [ ] Empty state includes CTA for owners
- [ ] Story cards show framework badge and evidence count
- [ ] CLI profile commands respect access levels

---

## 6. SCHEMA CHANGES REQUIRED

```prisma
model DemoCareerStory {
  // ... existing fields ...

  // ADD THESE:
  visibility    String    @default("private")  // private, workspace, network
  isPublished   Boolean   @default(false)
  publishedAt   DateTime?

  @@index([isPublished])
  @@index([visibility])
}
```

---

## 7. CLARIFIER REVIEW - Testability & Completeness

### 7.1 Testability Assessment

| Invariant | Testable? | Test Method | Gap? |
|-----------|-----------|-------------|------|
| **A1-A4** (Activity Data) | ✅ YES | Unit tests on model validation | None |
| **O1-O3** (API Response) | ✅ YES | Integration tests on endpoints | None |
| **U1-U3** (UI States) | ✅ YES | Component tests with React Testing Library | None |
| **P1-P3** (Process) | ⚠️ PARTIAL | P2 (100ms render) needs performance test harness | **Add perf test** |
| **E1-E3** (Errors) | ✅ YES | Mock network failures, assert recovery | None |
| **S1-S5** (Story Data) | ✅ YES | Unit tests on model + publish validation | None |
| **P7-P11** (Profile) | ✅ YES | Integration tests with different viewer contexts | None |
| **D1-D3** (Demo Mode) | ✅ YES | Test isolation between Demo* and production tables | None |

### 7.2 Ambiguity Clarifications

| Question | Clarification |
|----------|---------------|
| **Q1**: What timezone for "today"/"yesterday"? | **A**: User's timezone, sent as header `X-Timezone` |
| **Q2**: What's "start of week"? | **A**: Monday 00:00 in user's timezone |
| **Q3**: Can visibility be set before publish? | **A**: YES - visibility is independent, publish just flips `isPublished` |
| **Q4**: What happens to visibility on unpublish? | **A**: Visibility PRESERVED - unpublish only clears `isPublished` |
| **Q5**: Is "workspace" tied to a specific entity? | **A**: YES - user's primary workspace from `workspaceId` |
| **Q6**: How is "network" visibility scoped? | **A**: Anyone with the URL (public link sharing) |
| **Q7**: What's the STAR "completeness" threshold? | **A**: All 4 fields must have non-empty `summary` key in JSON |

### 7.3 Missing Invariants Identified

| Gap | Added Invariant |
|-----|-----------------|
| Timezone handling | **A5**: Temporal filters use `X-Timezone` header, default to UTC |
| Concurrent publish | **S6**: Concurrent publish requests are serialized (last-write-wins with optimistic locking) |
| Story deletion | **S7**: Deleting a story unpublishes it first (cascade) |
| Activity updates | **A6**: Activities from source sync are upserted (idempotent by source+sourceId) |

### 7.4 Edge Cases to Test

| Scenario | Expected Behavior |
|----------|-------------------|
| User has 0 activities | Empty state, no error |
| User has 10,000 activities | Pagination works, no timeout |
| Story published then cluster deleted | Story orphaned but still visible |
| Visibility downgrade while someone viewing | Viewer sees cached version until refresh |
| Demo mode toggled mid-request | Request completes with original mode (D3) |
| Publish with network error | Retry available, no duplicate publish |
| Two users with same source activity | Each has own copy (userId scoped) |

### 7.5 Completeness Checklist

- [x] All data fields have validation rules
- [x] All API responses have defined shapes
- [x] All UI states enumerated
- [x] All error conditions have recovery paths
- [x] CLI commands mirror API capabilities
- [x] Performance boundaries defined
- [x] Security constraints explicit
- [ ] **TODO**: Add rate limit specifics for profile views
- [ ] **TODO**: Define cache invalidation strategy for published stories

---

## 8. SCOPE GUARDIAN REVIEW - Prioritization & Trade-offs

### 8.1 Scope Assessment

| Feature | In Scope (MVP) | Deferred | Rationale |
|---------|----------------|----------|-----------|
| **Activity Stream** | ✅ | | Core value - instant visibility |
| **Temporal Filters** | ✅ | | Essential for usability |
| **Source Filters** | ✅ | | Essential for usability |
| **Story Publishing** | ✅ | | Alpha differentiator |
| **Visibility Controls** | ✅ | | Required for publishing |
| **Profile Stories Tab** | ✅ | | Publishing destination |
| Story Comments | | ✅ | Nice-to-have, defer to Phase 2 |
| Story Likes | | ✅ | Nice-to-have, defer to Phase 2 |
| Profile Analytics | | ✅ | Defer until publishing proven |
| Audience Preview | | ✅ | Defer until publishing proven |
| Network cross-company | | ✅ | Defer until workspace proven |

### 8.2 Implementation Phases (Prioritized)

#### Phase 1: Activity Stream (HIGH PRIORITY)
**Goal**: Instant visibility of raw activities
**Invariants**: A1-A6, O1-O3, U1-U3, P1-P3, E1-E3

| Task | Est. Complexity | Dependencies |
|------|-----------------|--------------|
| 1.1 Create `GET /api/v1/activities` endpoint | Medium | Schema exists |
| 1.2 Build `ActivityStream` component | Medium | 1.1 |
| 1.3 Add temporal filter UI | Low | 1.2 |
| 1.4 Add source filter UI | Low | 1.2 |
| 1.5 Integrate with journal list page | Low | 1.2 |

#### Phase 2: Story Publishing (HIGH PRIORITY)
**Goal**: STAR stories can be published to profile
**Invariants**: S1-S7, O4-O5, U4-U5, P4-P6, E4-E5

| Task | Est. Complexity | Dependencies |
|------|-----------------|--------------|
| 2.1 Add visibility/isPublished to schema | Low | None |
| 2.2 Create publish endpoint | Medium | 2.1 |
| 2.3 Add visibility selector UI | Low | 2.1 |
| 2.4 Add publish button to story card | Low | 2.2 |
| 2.5 Validate STAR completeness | Low | 2.2 |

#### Phase 3: Profile Stories (MEDIUM PRIORITY)
**Goal**: Published stories appear on profile
**Invariants**: P7-P11, O6-O7, U6-U7, E6

| Task | Est. Complexity | Dependencies |
|------|-----------------|--------------|
| 3.1 Create `GET /users/:id/published-stories` | Medium | 2.2 |
| 3.2 Add Stories tab to profile | Medium | 3.1 |
| 3.3 Build story card component | Low | 3.2 |
| 3.4 Implement visibility filtering | Medium | 3.1 |

#### Phase 4: CLI Commands (LOW PRIORITY - Deferred)
**Goal**: Test behaviors via CLI
**Note**: Defer until API complete, then build CLI as validation layer

### 8.3 Risk Trade-offs

| Risk | Decision | Mitigation |
|------|----------|------------|
| Activity Stream may overwhelm users | Accept - filters mitigate | Good default filters (today) |
| STAR completeness too strict | Accept - quality over quantity | Clear feedback on missing fields |
| Visibility hierarchy confusing | Accept - standard pattern | Good UI with icons + descriptions |
| Profile public by default | Reject - too risky | Default to private, explicit publish |

### 8.4 Scope Boundaries

**MUST HAVE** (MVP):
- Raw activity display with filters
- Story publish/unpublish
- Basic visibility (private/workspace/network)
- Profile stories tab

**SHOULD HAVE** (Soon after MVP):
- CLI commands for testing
- Audit logging for publish actions
- Cache invalidation strategy

**WON'T HAVE** (This release):
- Story comments/likes
- Profile analytics
- Audience preview mode
- Network discovery (cross-company)

### 8.5 Success Criteria

| Metric | Target | Measurement |
|--------|--------|-------------|
| Activity render time | < 100ms client | Performance test |
| API response time | < 200ms p95 | Monitoring |
| User publishes first story | Within 5 min of seeing activities | Analytics |
| Profile has 1+ stories | 50% of active users in 30 days | Analytics |

---

## Approval

**Specifier**: ✅ Requirements defined through invariants
**Clarifier**: ✅ Testability confirmed, ambiguities resolved, edge cases identified
**Scope Guardian**: ✅ Scope bounded, phases prioritized, risks accepted

### Sign-off

- [x] All invariants are testable
- [x] All ambiguities clarified
- [x] Scope is bounded and achievable
- [x] Phases are prioritized by value
- [x] Risks have mitigations

**DEFINE STAGE: COMPLETE**
**Next**: DESIGN_SYSTEM (Architecture, APIs, Data Models)

---

*Generated by CD6 Define Stage - Invariant-Focused Approach*
