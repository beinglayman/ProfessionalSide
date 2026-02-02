# Session Handover: Activity Stream, Stories & Profile

**Created**: 2026-01-31
**Updated**: 2026-01-31 (Session 3)
**Branch**: `feature/dual-path-draft-generation`
**Last Commit**: `9f92ea4 docs: add instructions for dropping demo mode`

---

## Quick Resume Prompt

Copy this to start a new session:

```
Continue work on the Three-Tab Architecture feature (Activity Stream + Stories + Profile).

Read the handover doc first:
/Users/ketankhairnar/_work/code/portfolio/ProfessionalSide/docs/features/activity-stream-stories-profile/HANDOVER.md

Current stage: CD6 DEVELOP ready to start.
CONCEPT, DEFINE, DESIGN_SYSTEM, and DESIGN_UX stages are COMPLETE.

Next action: Run /cd6:develop to implement the feature.

Key context:
- Full UX spec in DESIGN-UX.md with wireframes and flows
- API contracts in DESIGN-SYSTEM.md with TypeScript interfaces
- Demo-v2 mockups as reference (index.html, stories.html)
- Implementation phases defined in DEFINE.md (Activity Stream → Publishing → Profile)
```

---

## CD6 Progress Summary

| Stage | Status | Artifacts | Roles Completed |
|-------|--------|-----------|-----------------|
| CONCEPT | ✅ COMPLETE | `CONCEPT.md` | Visionary, Strategist, Balancer |
| DEFINE | ✅ COMPLETE | `DEFINE.md` | Specifier, Clarifier, Scope Guardian |
| DESIGN_SYSTEM | ✅ COMPLETE | `DESIGN-SYSTEM.md` | Architect, Technical Reviewer, Integration Arbiter |
| DESIGN_UX | ✅ COMPLETE | `DESIGN-UX.md` | Experience Designer, Usability Advocate |
| DEVELOP | 🔜 READY | - | Builder, Code Reviewer, Tech Lead |
| DETECT | ⏳ PENDING | - | Test Engineer, Quality Gatekeeper, Quality Arbiter |
| DEPLOY | ⏳ PENDING | - | Releaser, Gatekeeper, Risk Assessor |

---

## What Was Completed This Session

### Session 3: DESIGN_UX Stage (Full)

**File**: `docs/features/activity-stream-stories-profile/DESIGN-UX.md` (~750 lines)

Created comprehensive UX specification:
- **User Flow Diagrams**: Activity Stream, Story Publishing, Profile Stories
- **Wireframes**: All 7 key screens with ASCII representations
- **Interaction Specifications**: Tab switching, filter selection, publish flow
- **Accessibility Annotations**: WCAG 2.1 AA compliance, ARIA roles, keyboard nav
- **Design Rationale**: Key decisions with alternatives considered
- **Edge Case Designs**: Loading, empty, error states
- **Responsive Considerations**: Desktop, tablet, mobile breakpoints
- **Component Inventory**: 13 new components, 3 modified components

**Roles Completed**:
- Experience Designer: User flows, wireframes, prototypes
- Usability Advocate: Heuristic evaluation (4.3/5), accessibility audit

**Key UX Decisions**:
- Three-view architecture (Timeline, By Source, By Story) with tab navigation
- Tree lines visualization connecting filters to matching entries
- Story badges on entries for quick navigation
- Progressive disclosure for publishing (STAR validation → visibility → confirm)
- Visibility selector with icons and descriptions (🔒 🏢 🌐)

---

### Session 2: DEFINE + DESIGN_SYSTEM (Previous)

### 1. DEFINE Stage (Full)

**File**: `docs/features/activity-stream-stories-profile/DEFINE.md` (~940 lines)

Created invariant-focused requirements:
- **30+ formal invariants** (A1-A6, S1-S7, P7-P11, D1-D3, etc.)
- **Information invariants**: Data model constraints
- **Output invariants**: API response shape guarantees
- **UI State invariants**: Required states (loading, empty, populated, error)
- **Process invariants**: Filter behavior, render timing
- **Error invariants**: Graceful handling requirements
- **CLI Testing invariants**: Command structure for validation
- **Testing invariants**: Required test cases, performance boundaries

**Roles Completed**:
- Specifier: Requirements via invariants
- Clarifier: Testability assessment, ambiguity resolution, edge cases
- Scope Guardian: MVP scope, deferred items, implementation phases

### 2. DESIGN_SYSTEM Stage (Full)

**File**: `docs/features/activity-stream-stories-profile/DESIGN-SYSTEM.md` (~900 lines)

Created technical architecture:
- **System context diagram** and **data flow diagram**
- **Schema changes**: visibility, isPublished, publishedAt, framework fields
- **API contracts** with full request/response TypeScript interfaces:
  - `GET /api/v1/activities` (with temporal/source filters)
  - `POST /api/v1/career-stories/:id/publish`
  - `POST /api/v1/career-stories/:id/unpublish`
  - `PUT /api/v1/career-stories/:id/visibility`
  - `GET /api/v1/users/:userId/published-stories`
- **Service layer** implementations:
  - `ActivityService` - listing, filtering, formatting
  - `StoryPublishingService` - publish, unpublish, visibility
  - `ProfileStoriesService` - access control, filtering
- **Controller** implementations
- **Route** definitions
- **Frontend TypeScript types**

**Appendices** (full role reports):
- **Appendix A**: Architect Report - deliverables, decisions, component inventory
- **Appendix B**: Technical Reviewer Report - scalability, security, feasibility (8.5 days)
- **Appendix C**: Integration Arbiter Report - 5 trade-off decisions with rationale
- **Appendix D**: Stage Gate Summary - criteria, sign-offs, blocking issues

### 3. Updated Project State

**File**: `docs/features/activity-stream-stories-profile/CD6-STATE.md`

Updated with:
- Current stage: DESIGN_UX (READY)
- All key decisions documented
- All artifacts listed

---

## Key Technical Decisions (from Integration Arbiter)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Demo mode detection | `X-Demo-Mode: true` header | Existing pattern, clean URLs |
| Visibility storage | Column on DemoCareerStory | Simple queries, index-friendly |
| STAR validation | On publish only | Flexible drafts, quality gate on publish |
| Profile access | Compute in service | Correctness first, cache later |
| Published stories endpoint | `/users/:userId/published-stories` | RESTful, profile-centric |

---

## Schema Changes Required

```prisma
model DemoCareerStory {
  // Existing fields...

  // NEW FIELDS:
  visibility    String    @default("private")  // "private" | "workspace" | "network"
  isPublished   Boolean   @default(false)
  publishedAt   DateTime?
  framework     String    @default("STAR")

  @@index([isPublished])
  @@index([visibility])
}
```

---

## Implementation Phases (from Scope Guardian)

### Phase 1: Activity Stream (HIGH PRIORITY)
- Create `GET /api/v1/activities` endpoint
- Build `ActivityStream` component
- Add temporal/source filter UI
- Integrate with journal list page

### Phase 2: Story Publishing (HIGH PRIORITY)
- Add visibility/isPublished to schema
- Create publish/unpublish endpoints
- Add visibility selector UI
- Add publish button to story card

### Phase 3: Profile Stories (MEDIUM PRIORITY)
- Create `GET /users/:id/published-stories` endpoint
- Add Stories tab to profile page
- Build story card component
- Implement visibility filtering

**Estimated Total Effort**: 8.5 days

---

## Existing UX Assets (for DESIGN_UX stage)

### Demo V2 Mockups (Already Built)
Located at: `__docs/plans/2026-01-24-journal-settings-ux-analysis/journal-page/demo-v2/`

| File | Content | Lines |
|------|---------|-------|
| `index.html` | Activity Stream with tree lines, temporal/source filters | ~1150 |
| `stories.html` | STAR stories view, timeline, export format | ~500+ |
| `styles.css` | Full styling for demo-v2 | - |
| `mock-data.json` | Sample data structure | ~430 |

**Key UX Patterns in Demo V2**:
- Three view tabs: Timeline, By Source, By Story
- Left panel: Dynamic filters based on active view
- Right panel: Entry stream with tree lines connecting to filters
- Source icons with brand colors (GitHub, Jira, Figma, etc.)
- Story badges on entries linking to stories
- STAR progress visualization (S-T-A-R breakdown)

### Existing Profile Page
Located at: `src/pages/profile/view.tsx`

**Current Tabs**:
- Journal (shows entries)
- Skills (with endorsements)
- Achievements

**Missing**: Stories tab (to be added)

---

## Files to Create (from DESIGN-SYSTEM.md)

**Backend**:
```
backend/src/routes/activities.routes.ts (NEW)
backend/src/controllers/activities.controller.ts (NEW)
backend/src/controllers/story-publishing.controller.ts (NEW)
backend/src/controllers/profile-stories.controller.ts (NEW)
backend/src/services/activity.service.ts (NEW)
backend/src/services/story-publishing.service.ts (NEW)
backend/src/services/profile-stories.service.ts (NEW)
```

**Frontend**:
```
src/types/activities.ts (NEW)
src/components/activity-stream/ActivityStream.tsx (NEW)
src/components/activity-stream/ActivityCard.tsx (NEW)
src/components/activity-stream/TemporalFilter.tsx (NEW)
src/components/activity-stream/SourceFilter.tsx (NEW)
src/components/profile/StoriesTab.tsx (NEW)
```

**Existing Files to Modify**:
```
backend/prisma/schema.prisma (add publishing fields)
backend/src/routes/career-stories.routes.ts (add publish routes)
backend/src/routes/user.routes.ts (add published-stories route)
backend/src/app.ts (register activities routes)
src/pages/profile/view.tsx (add Stories tab)
```

---

## Three-Tab Architecture Vision

```
┌─────────────────────────────────────────────────────────────────┐
│  TAB 1: JOURNAL (Private)                                       │
│  Raw DemoToolActivity + Draft DemoJournalEntry                  │
│  - Instant render with tool logos (GitHub, Jira, etc.)          │
│  - Temporal filters: Today/Yesterday/This Week/Last 15          │
│  - Source filters: GitHub/Jira/Figma/Outlook/Slack/Teams        │
│  - Background AI processing for drafts                          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  TAB 2: STORIES (Private → Publishable)                         │
│  DemoCareerStory with STAR framework                            │
│  - 8 narrative frameworks: STAR, STAR-L, CAR, PAR, SAR, etc.   │
│  - 3 journal frameworks: ONE_ON_ONE, SKILL_GAP, PROJECT_IMPACT │
│  - Evidence links to source activities                          │
│  - Publish to Workspace/Network                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  TAB 3: PROFILE (Shareable)                                     │
│  Published stories aggregate here                               │
│  - Visibility: Private / Workspace / Network                    │
│  - Owner sees all published                                     │
│  - Workspace members see workspace + network                    │
│  - Public sees network only                                     │
│  - Shareable link for interviews/promotions                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Feature Documentation Inventory

| File | Purpose | Status |
|------|---------|--------|
| `CD6-STATE.md` | Stage tracking, key decisions | ✅ Current |
| `CONCEPT.md` | Problem/opportunity analysis | ✅ Complete |
| `GAP-ANALYSIS.md` | API and screen inventory | ✅ Complete |
| `DEFINE.md` | Invariant-focused requirements | ✅ Complete |
| `DESIGN-SYSTEM.md` | Technical architecture | ✅ Complete |
| `DESIGN-UX.md` | User flows, wireframes | ✅ Complete |
| `HANDOVER.md` | Session handover (this file) | ✅ Current |
| `README.md` | Architecture overview | ✅ Complete |

---

## Commands

```bash
# Run backend
cd backend && npm run dev

# Run frontend
npm run dev

# Run tests
cd backend && npm test

# Check demo mode in browser
Cmd+E to toggle demo console

# View demo-v2 mockups
open __docs/plans/2026-01-24-journal-settings-ux-analysis/journal-page/demo-v2/index.html
```

---

## What's Next

### Ready for DEVELOP Stage

All design stages are complete. Run `/cd6:develop` to begin implementation.

**Implementation Phases** (from DEFINE.md):

1. **Phase 1: Activity Stream** (HIGH PRIORITY)
   - Create `GET /api/v1/activities` endpoint
   - Build `ActivityStream` component with view tabs
   - Add temporal/source filter UI
   - Implement tree lines visualization

2. **Phase 2: Story Publishing** (HIGH PRIORITY)
   - Add visibility/isPublished to schema (migration)
   - Create publish/unpublish endpoints
   - Add visibility selector UI
   - Add publish button to story card

3. **Phase 3: Profile Stories** (MEDIUM PRIORITY)
   - Create `GET /users/:id/published-stories` endpoint
   - Add Stories tab to profile page
   - Build ProfileStoryCard component
   - Implement visibility filtering

**Estimated Total Effort**: 8.5 days

---

## Session Notes

- User prefers **invariant-focused requirements** over traditional user stories
- User wants **full role reports** with gate results in design docs
- Demo-v2 mockups are comprehensive - capture the UX vision well
- Publishing flow: Story → Visibility (private/workspace/network) → Publish → Profile
- Activities render instantly; AI processing happens in background
- Stories tab is the "alpha" differentiator - evidence-backed STAR narratives
