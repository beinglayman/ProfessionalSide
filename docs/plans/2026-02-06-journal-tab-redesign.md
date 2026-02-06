# Journal Tab Redesign (3 → 0 In-Page Tabs) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove the 3-tab in-page switcher (Timeline/Source/Drafts), unify into a single timeline view with inline draft cards, source filtering via dropdown, and a "Drafts (N)" content-level banner.

**Architecture:** The header already provides Activity ↔ Career Stories navigation, so the in-page tab bar is redundant (Tufte review: zero data-ink). We remove `ActivityViewTabs`, always fetch `groupBy: 'temporal'`, add a second `useActivities({ groupBy: 'story' })` call to get draft story groups, and render draft cards inline in the first expanded temporal group. Source filtering uses the existing `useDropdown` hook (not hand-rolled). A content-level "N drafts ready" banner replaces the filter chip.

**Tech Stack:** React, TypeScript, TanStack Query, Tailwind CSS, Vitest + React Testing Library

**Review feedback incorporated (RJ 6.5/10 + GSE):**
- Clean up dead code FIRST, then add features (not after)
- Don't client-side bucket-match drafts to temporal groups — show all drafts in the first expanded group (YAGNI, avoids Sunday/Monday week-start mismatch bug)
- Use existing `useDropdown` hook (`src/hooks/useDropdown.ts`) for source filter — has Escape + click-outside already
- Delete `SourceFilters` component (YAGNI — dropdown replaces it)
- Tests use `vi.useFakeTimers()` to avoid time-dependent flakes
- Tasks 9+10 from v1 eliminated (a11y is inline, verification is `tsc + vitest`)

---

## Task 1: Rip Out Tabs + Dead Code (Clean Surface First)

**Files:**
- Delete: `src/components/journal/activity-view-tabs.tsx`
- Delete: `src/components/journal/activity-view-tabs.test.tsx`
- Modify: `src/pages/journal/list.tsx`
- Modify: `src/components/journal/activity-stream.tsx`
- Modify: `src/components/journal/activity-filters.tsx`

This is one combined task: remove the tab bar, remove all `groupBy` branching, remove dead filter components. We do it all at once so Tasks 2-4 build on a clean surface.

### Step 1: Remove tab imports and state from list.tsx

In `src/pages/journal/list.tsx`:

Remove import (line 74):
```typescript
// DELETE:
import { ActivityViewTabs, ActivityViewType } from '../../components/journal/activity-view-tabs';
```

Remove state (line 99):
```typescript
// DELETE:
const [activityView, setActivityView] = useState<ActivityViewType>('timeline');
```

Replace the activityGroupBy mapping (lines 231-235):
```typescript
// REPLACE entire block with:
const activityParams = useMemo(() => ({
  groupBy: 'temporal' as const,
  limit: 100
}), []);
```

### Step 2: Simplify the page header

Replace the tab bar in the header JSX (lines 667-679):
```tsx
// REPLACE the Left section with:
{/* Left: Page title with count */}
<div className="flex items-center gap-3">
  <h1 className="text-lg font-semibold text-gray-900">Timeline</h1>
  {activityCount > 0 && (
    <span className="text-sm text-gray-400">
      {activityCount} activities
    </span>
  )}
</div>
```

### Step 3: Simplify ActivityStream props in list.tsx

Remove `groupBy` prop from ActivityStream usage (line 738), and simplify emptyMessage (lines 741-748):
```tsx
<ActivityStream
  groups={activitiesData && isGroupedResponse(activitiesData) ? activitiesData.groups : []}
  isLoading={activitiesLoading}
  error={activitiesError ? String(activitiesError) : null}
  emptyMessage="No activities yet. Sync your tools to see your work history."
  onRegenerateNarrative={handleRegenerateNarrative}
  regeneratingEntryId={regeneratingEntryId}
  onDeleteEntry={handleDeleteEntry}
  onPromoteToCareerStory={handlePromoteToCareerStory}
  isEnhancingNarratives={narrativesGenerating}
  pendingEnhancementIds={pendingEnhancementIds}
/>
```

### Step 4: Remove `setActivityView('story')` from handleSyncComplete

In `handleSyncComplete` (line 626), delete:
```typescript
setActivityView('story');
```

### Step 5: Gut ActivityStream — remove groupBy, source/story branches

In `src/components/journal/activity-stream.tsx`:

**Update the interface** — remove `groupBy`:
```typescript
interface ActivityStreamProps {
  groups: ActivityGroup[];
  isLoading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  onRegenerateNarrative?: (entryId: string) => void;
  regeneratingEntryId?: string | null;
  onDeleteEntry?: (entryId: string) => void;
  onPromoteToCareerStory?: (entryId: string) => void;
  isEnhancingNarratives?: boolean;
  pendingEnhancementIds?: Set<string>;
}
```

**Remove from component body:**
1. `selectedStoryMethods`, `selectedRoles` state (lines 47-48)
2. `groupBy === 'source'` branch from `availableSources` memo (lines 89-92) — replace with temporal-aware version (see Task 3)
3. `groupBy === 'source'` branch from `sourceCounts` memo (lines 103-109) — delete entire memo
4. `availableStoryMethods`, `storyMethodCounts` memos (lines 112-132)
5. `availableRoles`, `roleCounts` memos (lines 134-157)
6. `handleStoryMethodToggle`, `handleRoleToggle` handlers (lines 245-261)
7. `showStoryFilters`, `showRoleFilters`, `showSourceFilters` variables (lines 331-333)
8. Story/Role filter JSX in controls bar (lines 387-403)
9. Story drafts explanation banner (lines 436-466, the `groupBy === 'story'` conditional)
10. The entire `groupBy === 'story'` rendering branch (lines 474-499)
11. The entire `StoryGroupSection` component (lines 752-880)
12. `groupBy === 'source'` branch in collapsed state initialization (line 70) — simplify to:
    ```typescript
    const initialCollapsed = new Set(groups.slice(1).map(g => g.key));
    ```

**Simplify `ActivityGroupSection`** — remove `groupBy` prop since always temporal:
```typescript
interface ActivityGroupSectionProps {
  group: ActivityGroup;
  isCollapsed: boolean;
  onToggle: () => void;
}
```
- Remove `sourceInfo`, `SourceIcon`, `labelColor` conditionals — always use temporal style (`'#5D259F'`)
- Remove source icon rendering in group header
- Always pass `showSourceIcon={true}` to `ActivityCard`

**Simplify empty state** — only show Clock icon:
```tsx
<div className="mx-auto w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-3">
  <Clock className="w-5 h-5 text-gray-400" />
</div>
```

**Clean up imports:**
- Remove: `BookOpen`, `Layers` from lucide (keep `Layers` if using in source dropdown later — actually, keep it for Task 3)
- Remove: `StoryGroupHeader`, `UnassignedGroupHeader` from story-group-header
- Remove: `StoryFilters`, `RoleFilters` from activity-filters
- Remove: `SourceIcons` from source-icons
- Remove: `StoryGroupingMethod`, `StoryDominantRole` from types import

### Step 6: Delete unused filter components from activity-filters.tsx

In `src/components/journal/activity-filters.tsx`:
- Delete the `StoryFilters` component (lines 242-310)
- Delete the `RoleFilters` component (lines 312-380)
- Delete the `SourceFilters` component (lines 147-217) — YAGNI, dropdown replaces it
- Delete the `StoryMethodConfig` and `RoleConfig` objects (lines 220-240)
- Keep: `TemporalFilters`, `FilterSeparator`, and the `SourceIcons` object at the top (used by TemporalFilters indirectly — actually check if it's used. If not, delete.)

Also add `aria-pressed` to temporal filter buttons while we're here:
```tsx
<button
  key={bucket}
  onClick={() => onToggle(bucket)}
  aria-pressed={isSelected}
  className={cn(...)}
>
```

### Step 7: Delete tab component files

```bash
rm src/components/journal/activity-view-tabs.tsx
rm src/components/journal/activity-view-tabs.test.tsx
```

### Step 8: Verify

Run: `npx tsc --noEmit`
Expected: Zero errors

Run: `npx vitest run --reporter=verbose 2>&1 | tail -30`
Expected: All pass (deleted test file simply won't run)

### Step 9: Commit

```bash
git add -A && git commit -m "refactor(journal): remove tabs, dead code, simplify to temporal-only view"
```

---

## Task 2: Fetch Story Groups + Render Inline Draft Cards

**Files:**
- Modify: `src/pages/journal/list.tsx` (add second useActivities call)
- Modify: `src/components/journal/activity-stream.tsx` (add storyGroups prop, InlineDraftCard, DraftsBanner)

### Step 1: Add second useActivities call in list.tsx

After the existing `useActivities` call (~line 236), add:
```typescript
// Fetch story groups for inline draft cards
const storyParams = useMemo(() => ({
  groupBy: 'story' as const,
  limit: 100
}), []);
const {
  data: storyData,
} = useActivities(storyParams);

// Extract story groups (drafts) — filter out 'unassigned' (raw activities, not drafts)
const storyGroups = useMemo(() => {
  if (!storyData || !isGroupedResponse(storyData)) return [];
  return storyData.groups.filter(g => g.key !== 'unassigned');
}, [storyData]);
```

### Step 2: Update wizardEntryMeta to search storyGroups

Replace the existing `wizardEntryMeta` useMemo (~line 243):
```typescript
const wizardEntryMeta = useMemo<JournalEntryMeta | undefined>(() => {
  if (!storyWizardEntryId) return undefined;
  const group = storyGroups.find(
    (g) => g.storyMetadata?.id === storyWizardEntryId
  );
  if (!group?.storyMetadata) return undefined;
  const meta = group.storyMetadata;
  return {
    title: meta.title,
    dateRange: meta.timeRangeStart && meta.timeRangeEnd
      ? `${new Date(meta.timeRangeStart).toLocaleDateString()} - ${new Date(meta.timeRangeEnd).toLocaleDateString()}`
      : undefined,
    activityCount: group.count,
    tools: [...new Set(group.activities.map((a) => a.source))],
    topics: meta.topics,
    impactHighlights: meta.impactHighlights,
    skills: meta.skills,
  };
}, [storyWizardEntryId, storyGroups]);
```

### Step 3: Pass storyGroups to ActivityStream

```tsx
<ActivityStream
  groups={activitiesData && isGroupedResponse(activitiesData) ? activitiesData.groups : []}
  storyGroups={storyGroups}
  isLoading={activitiesLoading}
  // ... rest unchanged
/>
```

### Step 4: Add storyGroups to ActivityStreamProps and wire up

In `src/components/journal/activity-stream.tsx`, add to interface:
```typescript
interface ActivityStreamProps {
  groups: ActivityGroup[];
  storyGroups?: ActivityGroup[];
  // ... rest unchanged
}
```

Destructure with default:
```typescript
export function ActivityStream({
  groups,
  storyGroups = [],
  // ... rest unchanged
```

### Step 5: Create InlineDraftCard component

Add inside `activity-stream.tsx`, before `ActivityGroupSection`:

```tsx
/**
 * Inline draft story card — purple left border, sparkle icon, CTA.
 */
interface InlineDraftCardProps {
  group: ActivityGroup;
  onPromoteToCareerStory?: (entryId: string) => void;
}

function InlineDraftCard({ group, onPromoteToCareerStory }: InlineDraftCardProps) {
  const meta = group.storyMetadata;
  if (!meta) return null;

  const sources = [...new Set(group.activities.map(a => a.source))];
  const sourceNames = sources
    .map(s => SUPPORTED_SOURCES[s as ActivitySource]?.displayName || s)
    .slice(0, 3);
  const roleLabel = meta.dominantRole
    ? STORY_ROLE_LABELS[meta.dominantRole]?.label
    : null;

  return (
    <article
      className="border-l-4 border-purple-400 bg-gradient-to-r from-purple-50/40 to-transparent rounded-r-lg p-4 hover:shadow-sm transition-shadow"
      aria-label={`Draft story: ${meta.title} — ${group.count} activities, create career story available`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-purple-500 flex-shrink-0" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-gray-900 truncate">
              {meta.title}
            </h3>
            {roleLabel && (
              <span className="text-[10px] font-medium text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded flex-shrink-0">
                {roleLabel}
              </span>
            )}
          </div>
          {meta.description && (
            <p className="text-xs text-gray-600 line-clamp-2 mb-2">
              {meta.description}
            </p>
          )}
          <div className="flex items-center gap-2 text-[11px] text-gray-500">
            <span>{group.count} activities</span>
            <span className="text-gray-300">&middot;</span>
            <span>{sourceNames.join(', ')}</span>
          </div>
        </div>
        <button
          onClick={() => meta.id && onPromoteToCareerStory?.(meta.id)}
          className="flex-shrink-0 text-xs font-medium text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap"
        >
          Create Career Story &rarr;
        </button>
      </div>
    </article>
  );
}
```

### Step 6: Create DraftsBanner component

Add inside `activity-stream.tsx`:

```tsx
interface DraftsBannerProps {
  draftCount: number;
  showDraftsOnly: boolean;
  onToggle: () => void;
}

function DraftsBanner({ draftCount, showDraftsOnly, onToggle }: DraftsBannerProps) {
  if (draftCount === 0) return null;

  return (
    <div className={cn(
      'flex items-center justify-between px-4 py-2.5 rounded-lg transition-colors',
      showDraftsOnly
        ? 'bg-purple-100 border border-purple-200'
        : 'bg-purple-50/60 border border-purple-100'
    )}>
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-purple-500" aria-hidden="true" />
        <span className="text-sm font-medium text-gray-800">
          {draftCount} draft {draftCount === 1 ? 'story' : 'stories'} ready for review
        </span>
      </div>
      <button
        onClick={onToggle}
        className={cn(
          'text-xs font-medium px-2.5 py-1 rounded-md transition-colors',
          showDraftsOnly
            ? 'text-purple-700 bg-purple-200 hover:bg-purple-300'
            : 'text-purple-600 hover:bg-purple-100'
        )}
        aria-pressed={showDraftsOnly}
      >
        {showDraftsOnly ? 'Show all' : 'Review drafts'}
      </button>
    </div>
  );
}
```

### Step 7: Add showDraftsOnly state + render drafts in first expanded group

In the `ActivityStream` component, add state:
```typescript
const [showDraftsOnly, setShowDraftsOnly] = useState(false);
```

**Placement strategy (GSE feedback — no client-side temporal bucketing):**

Instead of re-bucketing drafts into temporal groups (which risks Sunday/Monday mismatch with the backend), render ALL draft cards in the **first expanded temporal group**. Users have 2-5 drafts — showing them at the top of the first group is natural.

```typescript
// Determine which group is first (non-collapsed) to place drafts there
const firstExpandedKey = filteredGroups.find(g => !isGroupCollapsed(g.key))?.key
  ?? filteredGroups[0]?.key;
```

Render DraftsBanner above groups:
```tsx
<DraftsBanner
  draftCount={storyGroups.length}
  showDraftsOnly={showDraftsOnly}
  onToggle={() => setShowDraftsOnly(prev => !prev)}
/>
```

### Step 8: Update ActivityGroupSection to accept inline drafts

Add to `ActivityGroupSectionProps`:
```typescript
interface ActivityGroupSectionProps {
  group: ActivityGroup;
  isCollapsed: boolean;
  onToggle: () => void;
  inlineDrafts?: ActivityGroup[];
  onPromoteToCareerStory?: (entryId: string) => void;
  showDraftsOnly?: boolean;
}
```

In the render loop:
```tsx
{filteredGroups.map((group) => {
  // Show all drafts in the first expanded group
  const drafts = group.key === firstExpandedKey ? storyGroups : undefined;
  // In drafts-only mode, skip groups that aren't the drafts host
  if (showDraftsOnly && group.key !== firstExpandedKey) return null;

  return (
    <ActivityGroupSection
      key={group.key}
      group={group}
      isCollapsed={isGroupCollapsed(group.key)}
      onToggle={() => toggleGroup(group.key)}
      inlineDrafts={drafts}
      onPromoteToCareerStory={onPromoteToCareerStory}
      showDraftsOnly={showDraftsOnly}
    />
  );
})}
```

In `ActivityGroupSection` expanded body:
```tsx
{!isCollapsed && (
  <>
    {/* Inline draft cards — above activity rows */}
    {inlineDrafts && inlineDrafts.length > 0 && (
      <div className="space-y-2 mb-2">
        {inlineDrafts.map(draft => (
          <InlineDraftCard
            key={draft.key}
            group={draft}
            onPromoteToCareerStory={onPromoteToCareerStory}
          />
        ))}
      </div>
    )}

    {/* Activity rows — hidden in drafts-only mode */}
    {!showDraftsOnly && (
      <div className="bg-white rounded-lg border border-gray-100">
        {visibleActivities.map((activity) => (
          <ActivityCard
            key={activity.id}
            activity={activity}
            showStoryBadge={true}
            showSourceIcon={true}
          />
        ))}
        {hasMore && (
          <button
            onClick={() => setShowAll(true)}
            className="w-full py-2.5 text-[11px] font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50/50 transition-colors border-t border-gray-100 flex items-center justify-center gap-1.5"
          >
            <Plus className="w-3 h-3" />
            Show {hiddenCount} more
          </button>
        )}
      </div>
    )}
  </>
)}
```

### Step 9: Verify

Run: `npx tsc --noEmit`
Expected: Zero errors

Run: `npx vitest run --reporter=verbose 2>&1 | tail -30`
Expected: All pass

### Step 10: Commit

```bash
git add -A && git commit -m "feat(journal): inline draft cards with banner and drafts-only toggle"
```

---

## Task 3: Add Source Filter Dropdown

**Files:**
- Modify: `src/components/journal/activity-stream.tsx` (add SourceFilterDropdown, compute sources, apply filter)

### Step 1: Import useDropdown hook

```typescript
import { useDropdown } from '../../hooks/useDropdown';
```

### Step 2: Compute available sources from temporal groups' activities

Replace the old `availableSources` memo with:
```typescript
const availableSources = useMemo(() => {
  const sourceCounts = new Map<string, number>();
  for (const g of groups) {
    for (const a of g.activities) {
      sourceCounts.set(a.source, (sourceCounts.get(a.source) || 0) + 1);
    }
  }
  return Array.from(sourceCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([source, count]) => ({ source: source as ActivitySource, count }));
}, [groups]);
```

### Step 3: Create SourceFilterDropdown using useDropdown hook

```tsx
interface SourceFilterDropdownProps {
  availableSources: { source: ActivitySource; count: number }[];
  selectedSources: ActivitySource[];
  onToggle: (source: ActivitySource) => void;
}

function SourceFilterDropdown({ availableSources, selectedSources, onToggle }: SourceFilterDropdownProps) {
  const { isOpen, toggle, close, containerRef } = useDropdown();
  const hasFilter = selectedSources.length > 0;

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={toggle}
        className={cn(
          'flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-md whitespace-nowrap transition-all',
          hasFilter
            ? 'bg-primary-500 text-white shadow-sm'
            : 'text-gray-600 hover:text-primary-600 hover:bg-primary-50'
        )}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <Layers className="w-3 h-3" />
        {hasFilter ? `Sources (${selectedSources.length})` : 'Sources'}
        <ChevronDown className={cn('w-3 h-3 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-1 left-0 z-20 bg-white rounded-lg border border-gray-200 shadow-lg py-1 min-w-[160px]" role="listbox">
          {hasFilter && (
            <button
              onClick={() => { selectedSources.forEach(s => onToggle(s)); close(); }}
              className="w-full text-left px-3 py-1.5 text-[11px] text-gray-500 hover:bg-gray-50"
            >
              Clear filters
            </button>
          )}
          {availableSources.map(({ source, count }) => {
            const sourceInfo = SUPPORTED_SOURCES[source];
            const isSelected = selectedSources.includes(source);
            return (
              <button
                key={source}
                onClick={() => onToggle(source)}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-1.5 text-[11px] transition-colors',
                  isSelected ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-50'
                )}
                role="option"
                aria-selected={isSelected}
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: sourceInfo?.color || '#6B7280' }} />
                <span className="flex-1 text-left font-medium">{sourceInfo?.displayName || source}</span>
                <span className="text-[10px] tabular-nums text-gray-400">{count}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

### Step 4: Add dropdown to controls bar

After temporal filters and before spacer:
```tsx
{availableSources.length > 1 && (
  <>
    <FilterSeparator />
    <SourceFilterDropdown
      availableSources={availableSources}
      selectedSources={selectedSources}
      onToggle={handleSourceToggle}
    />
  </>
)}
```

### Step 5: Apply client-side source filtering in filteredGroups

In the `filteredGroups` useMemo, after temporal bucket filtering:
```typescript
// Apply source filter within temporal groups
if (selectedSources.length > 0) {
  result = result.map(group => {
    const filtered = group.activities.filter(a =>
      selectedSources.includes(a.source as ActivitySource)
    );
    if (filtered.length === 0) return null;
    return { ...group, activities: filtered, count: filtered.length };
  }).filter((g): g is ActivityGroup => g !== null);
}
```

### Step 6: Verify

Run: `npx tsc --noEmit`
Expected: Zero errors

Run: `npx vitest run --reporter=verbose 2>&1 | tail -30`
Expected: All pass

### Step 7: Commit

```bash
git add -A && git commit -m "feat(journal): add source filter dropdown using useDropdown hook"
```

---

## Task 4: Write Tests

**Files:**
- Create: `src/components/journal/activity-stream.test.tsx`

### Step 1: Write tests with fake timers

```tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ActivityStream } from './activity-stream';
import { ActivityGroup } from '../../types/activity';

// Pin time so bucket logic is deterministic
beforeEach(() => {
  vi.useFakeTimers();
  // Wednesday Feb 5 2026 10:00 UTC
  vi.setSystemTime(new Date('2026-02-05T10:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

// Factory: temporal group
const makeTemporalGroup = (key: string, label: string, count: number): ActivityGroup => ({
  key,
  label,
  count,
  activities: Array.from({ length: count }, (_, i) => ({
    id: `${key}-act-${i}`,
    source: i % 2 === 0 ? 'github' : 'jira',
    sourceId: `src-${i}`,
    sourceUrl: null,
    title: `Activity ${i} in ${label}`,
    description: null,
    timestamp: '2026-02-05T08:00:00Z',
    crossToolRefs: [],
    storyId: null,
    storyTitle: null,
  })),
});

// Factory: story group (draft)
const makeStoryGroup = (key: string, title: string): ActivityGroup => ({
  key,
  label: title,
  count: 3,
  activities: [
    { id: `${key}-a1`, source: 'github', sourceId: 'gh-1', sourceUrl: null, title: 'PR merged', description: null, timestamp: '2026-02-05T08:00:00Z', crossToolRefs: [], storyId: null, storyTitle: null },
  ],
  storyMetadata: {
    id: `story-${key}`,
    title,
    description: 'A draft story about work',
    timeRangeStart: '2026-02-03T00:00:00Z',
    timeRangeEnd: '2026-02-05T00:00:00Z',
    category: null,
    skills: [],
    createdAt: '2026-02-05T09:00:00Z',
    isPublished: false,
    type: 'journal_entry',
    dominantRole: 'Led',
  },
});

describe('ActivityStream — inline drafts', () => {
  it('renders draft card title when storyGroups provided', () => {
    render(
      <ActivityStream
        groups={[makeTemporalGroup('this_week', 'This Week', 2)]}
        storyGroups={[makeStoryGroup('auth', 'Authentication System Overhaul')]}
      />
    );
    expect(screen.getByText('Authentication System Overhaul')).toBeInTheDocument();
  });

  it('shows drafts banner with correct count', () => {
    render(
      <ActivityStream
        groups={[makeTemporalGroup('this_week', 'This Week', 2)]}
        storyGroups={[
          makeStoryGroup('auth', 'Auth Overhaul'),
          makeStoryGroup('perf', 'Perf Pipeline'),
        ]}
      />
    );
    expect(screen.getByText(/2 draft stories ready for review/)).toBeInTheDocument();
  });

  it('hides drafts banner when no storyGroups', () => {
    render(
      <ActivityStream
        groups={[makeTemporalGroup('this_week', 'This Week', 2)]}
        storyGroups={[]}
      />
    );
    expect(screen.queryByText(/draft stor/i)).not.toBeInTheDocument();
  });

  it('renders Create Career Story CTA on draft cards', () => {
    render(
      <ActivityStream
        groups={[makeTemporalGroup('this_week', 'This Week', 2)]}
        storyGroups={[makeStoryGroup('auth', 'Auth Overhaul')]}
      />
    );
    expect(screen.getByText(/Create Career Story/)).toBeInTheDocument();
  });

  it('calls onPromoteToCareerStory when CTA clicked', () => {
    const onPromote = vi.fn();
    render(
      <ActivityStream
        groups={[makeTemporalGroup('this_week', 'This Week', 2)]}
        storyGroups={[makeStoryGroup('auth', 'Auth Overhaul')]}
        onPromoteToCareerStory={onPromote}
      />
    );
    fireEvent.click(screen.getByText(/Create Career Story/));
    expect(onPromote).toHaveBeenCalledWith('story-auth');
  });

  it('toggles drafts-only mode via banner button', () => {
    render(
      <ActivityStream
        groups={[makeTemporalGroup('this_week', 'This Week', 3)]}
        storyGroups={[makeStoryGroup('auth', 'Auth Overhaul')]}
      />
    );

    // Activities visible by default
    expect(screen.getByText('Activity 0 in This Week')).toBeInTheDocument();

    // Click "Review drafts"
    fireEvent.click(screen.getByText('Review drafts'));

    // Activities hidden, draft still visible
    expect(screen.queryByText('Activity 0 in This Week')).not.toBeInTheDocument();
    expect(screen.getByText('Auth Overhaul')).toBeInTheDocument();

    // Click "Show all" to restore
    fireEvent.click(screen.getByText('Show all'));
    expect(screen.getByText('Activity 0 in This Week')).toBeInTheDocument();
  });
});

describe('ActivityStream — empty states', () => {
  it('shows empty message when no groups', () => {
    render(
      <ActivityStream
        groups={[]}
        emptyMessage="No activities yet."
      />
    );
    expect(screen.getByText('No activities yet.')).toBeInTheDocument();
  });

  it('shows loading spinner when isLoading', () => {
    render(
      <ActivityStream
        groups={[]}
        isLoading={true}
      />
    );
    // Loader2 icon has animate-spin class
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });
});
```

### Step 2: Run the tests

Run: `npx vitest run src/components/journal/activity-stream.test.tsx --reporter=verbose`
Expected: All tests pass

### Step 3: Commit

```bash
git add -A && git commit -m "test(journal): add tests for inline drafts, banner, and empty states"
```

---

## Task 5: Final Verification

### Step 1: Full TypeScript check + test suite

Run: `npx tsc --noEmit && npx vitest run --reporter=verbose`
Expected: Zero TS errors, all tests pass

### Step 2: Manual test checklist

- [ ] Page load: Timeline with inline draft cards visible in first expanded group
- [ ] Source dropdown: filters activities, uses Escape to close
- [ ] "Review drafts" banner: toggles to show only draft cards
- [ ] Temporal chip + source dropdown: compound filter works
- [ ] "Create Career Story" CTA: opens Story Wizard
- [ ] Career Stories link in header: navigates to /career-stories
- [ ] Collapse/expand: works with inline drafts
- [ ] First visit: no scroll-to-bottom, first group expanded
- [ ] Empty states: no activities, no drafts (banner hidden), filtered to zero

### Step 3: Commit if any touch-ups needed

```bash
git add -A && git commit -m "chore(journal): final polish for tab redesign"
```
