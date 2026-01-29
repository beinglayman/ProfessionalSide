# Career Stories UI Design

**Date:** 2026-01-29
**Status:** Approved
**Phase:** MVP (Option B)

---

## Overview

UI for viewing work activity clusters and generating STAR narratives for interview prep, portfolio building, and work journaling.

### Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Navigation | Dashboard widget + `/career-stories` page | Progressive disclosure; widget surfaces feature, page for deep work |
| Layout | Two-column master-detail | Rapid browse-and-generate for interview prep |
| Mobile | Stacked + slide-up sheet | Responsive adaptation |
| Generation UX | Inline with skeleton loading | 1-3s is perfect for inline; no modal overhead |

---

## MVP Scope (Phase 2 UI)

**In Scope:**
- Clusters list (left panel)
- STAR preview/generation (right panel)
- Generate STAR button with inline loading
- Polish toggle (enable/disable LLM polish)
- Basic inline editing of STAR text
- Mobile responsive (stacked layout + sheet)

**Out of Scope (Phase 3):**
- Dashboard widget
- Activities list view
- Copy to clipboard
- Export/share features
- Saved stories management

---

## Page Layout

### Desktop (≥1024px)

```
┌─────────────────────────────────────────────────────────────────┐
│  Career Stories                              [Generate Clusters]│
├────────────────────────────────┬────────────────────────────────┤
│  Clusters (5)                  │  Select a cluster              │
│  ┌──────────────────────────┐  │                                │
│  │ Auth Migration           │  │  ┌────────────────────────────┐│
│  │ 6 activities • Jan 15-22 │  │  │                            ││
│  │ GitHub, Jira             │  │  │   Click a cluster to       ││
│  │ [Generate STAR]          │  │  │   preview or generate      ││
│  └──────────────────────────┘  │  │   a STAR narrative         ││
│  ┌──────────────────────────┐  │  │                            ││
│  │ API Refactor             │  │  └────────────────────────────┘│
│  │ 4 activities • Jan 10-18 │  │                                │
│  │ GitHub, Slack            │  │                                │
│  │ [Generate STAR]          │  │                                │
│  └──────────────────────────┘  │                                │
│                                │                                │
│  Unclustered (12)              │                                │
│  [Run clustering to group]     │                                │
└────────────────────────────────┴────────────────────────────────┘
```

### With STAR Generated

```
┌─────────────────────────────────────────────────────────────────┐
│  Career Stories                              [Generate Clusters]│
├────────────────────────────────┬────────────────────────────────┤
│  Clusters (5)                  │  Auth Migration                │
│  ┌──────────────────────────┐  │  6 activities • Jan 15-22      │
│  │ ● Auth Migration         │  ├────────────────────────────────┤
│  │   ✓ Story ready          │  │  Situation                     │
│  └──────────────────────────┘  │  ┌────────────────────────────┐│
│  ┌──────────────────────────┐  │  │ Our legacy authentication  ││
│  │   API Refactor           │  │  │ system was causing 500ms   ││
│  │   4 activities           │  │  │ latency on every request...││
│  └──────────────────────────┘  │  └────────────────────────────┘│
│                                │  Task                          │
│                                │  ┌────────────────────────────┐│
│                                │  │ Migrate 50,000 users to    ││
│                                │  │ JWT-based auth without     ││
│                                │  │ downtime...                ││
│                                │  └────────────────────────────┘│
│                                │  Action                        │
│                                │  ┌────────────────────────────┐│
│                                │  │ Implemented feature flags  ││
│                                │  │ for gradual rollout...     ││
│                                │  └────────────────────────────┘│
│                                │  Result                        │
│                                │  ┌────────────────────────────┐│
│                                │  │ Reduced auth latency from  ││
│                                │  │ 500ms to 50ms (90%)...     ││
│                                │  └────────────────────────────┘│
│                                ├────────────────────────────────┤
│                                │  ☑ Polish with AI              │
│                                │  [Regenerate] [Save]           │
└────────────────────────────────┴────────────────────────────────┘
```

### Mobile (<768px)

```
┌─────────────────────────┐
│  Career Stories     [+] │
├─────────────────────────┤
│  Clusters (5)           │
│  ┌─────────────────────┐│
│  │ Auth Migration    → ││
│  │ 6 activities        ││
│  │ ✓ Story ready       ││
│  └─────────────────────┘│
│  ┌─────────────────────┐│
│  │ API Refactor      → ││
│  │ 4 activities        ││
│  └─────────────────────┘│
└─────────────────────────┘

(Tap cluster → Sheet slides up)

┌─────────────────────────┐
│  ← Auth Migration       │
├─────────────────────────┤
│  Situation              │
│  Our legacy auth...     │
├─────────────────────────┤
│  Task                   │
│  Migrate 50k users...   │
├─────────────────────────┤
│  Action                 │
│  Implemented flags...   │
├─────────────────────────┤
│  Result                 │
│  Reduced latency 90%... │
├─────────────────────────┤
│  ☑ Polish with AI       │
│  [Regenerate] [Save]    │
└─────────────────────────┘
```

---

## Components

### 1. ClusterCard

```tsx
interface ClusterCardProps {
  cluster: Cluster;
  isSelected: boolean;
  status: 'idle' | 'generating' | 'ready' | 'error';
  onSelect: () => void;
  onGenerate: () => void;
}
```

**States:**
- `idle` - No STAR generated yet, show "Generate STAR" button
- `generating` - Show spinner, "Generating..."
- `ready` - Show checkmark, "Story ready"
- `error` - Show error icon, "Failed"

### 2. STARPreview

```tsx
interface STARPreviewProps {
  star: ScoredSTAR | null;
  isLoading: boolean;
  error: string | null;
  onRegenerate: () => void;
  onSave: () => void;
  polishEnabled: boolean;
  onPolishToggle: (enabled: boolean) => void;
}
```

**States:**
- Empty - "Select a cluster to preview"
- Loading - Skeleton sections for S/T/A/R
- Loaded - Full STAR with edit capability
- Error - "Couldn't generate. [Try again]"

### 3. STARSection

```tsx
interface STARSectionProps {
  label: 'Situation' | 'Task' | 'Action' | 'Result';
  text: string;
  confidence: number;
  isEditing: boolean;
  onEdit: (newText: string) => void;
}
```

Editable text area with confidence indicator.

### 4. CareerStoriesPage

Main page component orchestrating the layout.

---

## State Management

Using React Query for server state:

```tsx
// Queries
const { data: clusters } = useClusters();
const { data: star } = useClusterStar(selectedClusterId);

// Mutations
const generateMutation = useGenerateStar();
const saveMutation = useSaveStar();
```

Local state:
- `selectedClusterId` - Currently selected cluster
- `polishEnabled` - Toggle for LLM polish
- `editedStar` - Local edits before save

---

## Loading States

| Component | Loading State |
|-----------|---------------|
| Clusters list | 3 skeleton cards |
| STAR preview | 4 skeleton sections (S/T/A/R) |
| Generate button | Spinner + "Generating..." |
| Save button | Spinner + "Saving..." |

### Skeleton Example

```
┌────────────────────────────────┐
│ Situation                      │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ ░░░░░░░░░░░░░░░░░░           │
└────────────────────────────────┘
```

---

## Error States

| Error | Message | Action |
|-------|---------|--------|
| Clusters fail to load | "Couldn't load clusters" | [Retry] button |
| Generation fails | "Couldn't generate story" | [Try again] button |
| Validation fails | "This cluster needs more activities" | Show failed gates |
| Save fails | "Couldn't save changes" | [Retry] button |

---

## API Integration

### Endpoints Used

| Endpoint | Hook | Purpose |
|----------|------|---------|
| `GET /career-stories/clusters` | `useClusters()` | List clusters |
| `GET /career-stories/clusters/:id` | `useCluster(id)` | Cluster details |
| `POST /career-stories/clusters/:id/generate-star` | `useGenerateStar()` | Generate STAR |
| `POST /career-stories/clusters/generate` | `useGenerateClusters()` | Run clustering |

### Request/Response

**Generate STAR:**
```typescript
// Request
POST /clusters/:id/generate-star
{
  options: {
    polish: true,
    framework: 'STAR'
  }
}

// Response (success)
{
  success: true,
  data: {
    star: {
      clusterId: "...",
      situation: { text: "...", confidence: 0.85 },
      task: { text: "...", confidence: 0.90 },
      action: { text: "...", confidence: 0.88 },
      result: { text: "...", confidence: 0.82 },
      validation: { passed: true, score: 0.86 }
    },
    polishStatus: "applied",
    processingTimeMs: 1250
  }
}

// Response (validation failed)
{
  success: true,
  data: {
    star: null,
    reason: "VALIDATION_GATES_FAILED",
    failedGates: ["MIN_ACTIVITIES", "TOOL_DIVERSITY"]
  }
}
```

---

## File Structure

```
src/
├── types/
│   └── career-stories.ts          # Types for Cluster, STAR, etc.
├── services/
│   └── career-stories.service.ts  # API client
├── hooks/
│   └── useCareerStories.ts        # React Query hooks
├── pages/
│   └── career-stories/
│       └── index.tsx              # Main page
└── components/
    └── career-stories/
        ├── ClusterCard.tsx
        ├── ClusterList.tsx
        ├── STARPreview.tsx
        ├── STARSection.tsx
        └── EmptyState.tsx
```

---

## Accessibility

| Element | A11y Requirement |
|---------|------------------|
| Cluster list | `role="listbox"`, arrow key navigation |
| Selected cluster | `aria-selected="true"` |
| STAR preview | `aria-live="polite"` for updates |
| Loading states | `aria-busy="true"` |
| Edit mode | Focus management, `aria-label` for sections |
| Mobile sheet | Focus trap, Escape to close |

---

## Phase 3 Additions

For next phase:
1. Dashboard widget showing cluster count + CTA
2. Activities list view (expandable section)
3. Copy to clipboard button
4. Export as PDF/markdown
5. Saved stories management
6. Share/public link feature

---

## Approval

| Role | Decision |
|------|----------|
| UX Advocate | Approved (F-L-E-A validated) |
| User | Approved Option B scope |
