# Journal Tab Redesign (3 → 0 In-Page Tabs) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove the 3-tab in-page switcher (Timeline/Source/Drafts), unify into a single timeline view with inline draft cards, source filtering via dropdown, and a "Drafts (N)" content-level banner.

**Architecture:** The header already provides Activity ↔ Career Stories navigation, so the in-page tab bar is redundant (Tufte review: zero data-ink). We remove `ActivityViewTabs`, always fetch `groupBy: 'temporal'`, add a second `useActivities({ groupBy: 'story' })` call to get draft story groups, and render draft cards inline within their time period. Source filtering becomes a single dropdown button (not a chip row). A content-level "N drafts ready" banner replaces the filter chip.

**Tech Stack:** React, TypeScript, TanStack Query, Tailwind CSS, Vitest + React Testing Library

---

## Task 1: Remove In-Page Tab Bar and Simplify View State

**Files:**
- Modify: `src/pages/journal/list.tsx` (lines 74, 98-99, 231-235, 626, 670-678, 736-754)
- Modify: `src/components/journal/activity-view-tabs.tsx` (entire file — will be deleted)
- Modify: `src/components/journal/activity-view-tabs.test.tsx` (entire file — will be deleted)

**Step 1: Remove activityView state and tab imports from list.tsx**

In `src/pages/journal/list.tsx`:

Remove import (line 74):
```typescript
// DELETE this line:
import { ActivityViewTabs, ActivityViewType } from '../../components/journal/activity-view-tabs';
```

Remove state (lines 98-99):
```typescript
// DELETE these lines:
const [activityView, setActivityView] = useState<ActivityViewType>('timeline');
```

Replace the activityGroupBy mapping (lines 231-235) with a constant:
```typescript
// REPLACE:
// const activityGroupBy = activityView === 'timeline' ? 'temporal' : activityView;
// const activityParams = useMemo(() => ({
//   groupBy: activityGroupBy,
//   limit: 100
// }), [activityGroupBy]);

// WITH:
const activityParams = useMemo(() => ({
  groupBy: 'temporal' as const,
  limit: 100
}), []);
```

**Step 2: Remove the tab bar from the header JSX**

In the header section (lines 667-679), replace:
```tsx
{/* Left: Tabs with integrated count */}
<div className="flex items-center gap-4">
  <ActivityViewTabs
    activeView={activityView}
    onViewChange={setActivityView}
  />
  {activityCount > 0 && (
    <span className="text-sm text-gray-400">
      {activityCount} activities
    </span>
  )}
</div>
```

With:
```tsx
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

**Step 3: Simplify the groupBy prop passed to ActivityStream**

In the ActivityStream usage (line 738), change:
```tsx
// REPLACE:
groupBy={activityGroupBy}
// WITH:
groupBy="temporal"
```

**Step 4: Update emptyMessage (lines 741-748)**

Replace the ternary chain:
```tsx
emptyMessage={
  activityView === 'timeline'
    ? 'No activities yet. Sync your tools to see your work history.'
    : activityView === 'source'
    ? 'No activities from connected sources. Try syncing your tools.'
    : 'No stories created yet. Activities will be grouped once you create draft stories.'
}
```

With:
```tsx
emptyMessage="No activities yet. Sync your tools to see your work history."
```

**Step 5: Update handleSyncComplete**

In `handleSyncComplete` (line 626), remove the line that navigates to story tab:
```typescript
// DELETE this line:
setActivityView('story');
```

**Step 6: Delete the tab component and its test**

Delete these files entirely:
- `src/components/journal/activity-view-tabs.tsx`
- `src/components/journal/activity-view-tabs.test.tsx`

**Step 7: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: Zero errors (or only pre-existing errors unrelated to this change)

**Step 8: Run tests**

Run: `npx vitest run --reporter=verbose 2>&1 | tail -30`
Expected: All tests pass. The deleted test file will simply not run.

**Step 9: Commit**

```bash
git add -A && git commit -m "refactor(journal): remove in-page tab bar — header nav is sufficient"
```

---

## Task 2: Fetch Story Groups Alongside Temporal Groups

**Files:**
- Modify: `src/pages/journal/list.tsx` (add second useActivities call, pass storyGroups prop)
- Modify: `src/components/journal/activity-stream.tsx` (add storyGroups prop to interface)

**Step 1: Add second useActivities call in list.tsx**

After the existing `useActivities` call (~line 236), add:
```typescript
// Fetch story groups for inline draft cards
const storyParams = useMemo(() => ({
  groupBy: 'story' as const,
  limit: 100
}), []);
const {
  data: storyData,
  isLoading: storyLoading,
} = useActivities(storyParams);

// Extract story groups (drafts) from response
const storyGroups = useMemo(() => {
  if (!storyData || !isGroupedResponse(storyData)) return [];
  // Filter out 'unassigned' group — those are raw activities, not drafts
  return storyData.groups.filter(g => g.key !== 'unassigned');
}, [storyData]);
```

**Step 2: Update wizardEntryMeta to search storyGroups**

The existing `wizardEntryMeta` useMemo (~line 243) searches `activitiesData` for story metadata. Update it to also search `storyGroups`:
```typescript
const wizardEntryMeta = useMemo<JournalEntryMeta | undefined>(() => {
  if (!storyWizardEntryId) return undefined;
  // Search in storyGroups (primary source for draft metadata)
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

**Step 3: Pass storyGroups to ActivityStream**

In the ActivityStream JSX, add the new prop:
```tsx
<ActivityStream
  groups={activitiesData && isGroupedResponse(activitiesData) ? activitiesData.groups : []}
  groupBy="temporal"
  storyGroups={storyGroups}
  isLoading={activitiesLoading}
  // ... rest of props unchanged
/>
```

**Step 4: Add storyGroups to ActivityStreamProps interface**

In `src/components/journal/activity-stream.tsx`, update the interface (~line 11):
```typescript
interface ActivityStreamProps {
  groups: ActivityGroup[];
  groupBy: 'temporal' | 'source' | 'story';
  storyGroups?: ActivityGroup[];  // <-- ADD THIS
  isLoading?: boolean;
  // ... rest unchanged
}
```

And destructure it in the component (~line 31):
```typescript
export function ActivityStream({
  groups,
  groupBy,
  storyGroups = [],  // <-- ADD THIS with default
  isLoading,
  // ... rest unchanged
```

**Step 5: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: Zero errors

**Step 6: Run tests**

Run: `npx vitest run --reporter=verbose 2>&1 | tail -30`
Expected: All pass

**Step 7: Commit**

```bash
git add -A && git commit -m "feat(journal): fetch story groups alongside temporal for inline drafts"
```

---

## Task 3: Render Inline Draft Cards in Timeline

**Files:**
- Modify: `src/components/journal/activity-stream.tsx` (add InlineDraftCard component, integrate into ActivityGroupSection)

**Step 1: Create the InlineDraftCard component**

Add this component inside `activity-stream.tsx`, before the `ActivityGroupSection` component (~line 508):

```tsx
/**
 * Inline draft story card — appears within temporal groups.
 * Purple left border, light background, sparkle icon, "Create Career Story" CTA.
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
          {/* Title row */}
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

          {/* Description */}
          {meta.description && (
            <p className="text-xs text-gray-600 line-clamp-2 mb-2">
              {meta.description}
            </p>
          )}

          {/* Meta row */}
          <div className="flex items-center gap-2 text-[11px] text-gray-500">
            <span>{group.count} activities</span>
            <span className="text-gray-300">·</span>
            <span>{sourceNames.join(', ')}</span>
          </div>
        </div>

        {/* CTA */}
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

**Step 2: Map story groups to temporal buckets**

Inside the `ActivityStream` component, add a useMemo that maps each storyGroup to a temporal bucket key based on `timeRangeStart`. Add after the existing filter memos (~line 157):

```typescript
// Map story groups into temporal buckets for inline rendering
const draftsByTemporalKey = useMemo(() => {
  const map = new Map<string, ActivityGroup[]>();
  if (!storyGroups.length) return map;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const weekStart = new Date(today); weekStart.setDate(today.getDate() - today.getDay());
  const lastWeekStart = new Date(weekStart); lastWeekStart.setDate(weekStart.getDate() - 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  for (const sg of storyGroups) {
    const dateStr = sg.storyMetadata?.timeRangeEnd || sg.storyMetadata?.timeRangeStart;
    if (!dateStr) continue;
    const date = new Date(dateStr);

    let bucket: string;
    if (date >= today) bucket = 'today';
    else if (date >= yesterday) bucket = 'yesterday';
    else if (date >= weekStart) bucket = 'this_week';
    else if (date >= lastWeekStart) bucket = 'last_week';
    else if (date >= monthStart) bucket = 'this_month';
    else bucket = 'older';

    const existing = map.get(bucket) || [];
    existing.push(sg);
    map.set(bucket, existing);
  }
  return map;
}, [storyGroups]);
```

**Step 3: Pass drafts and callback into ActivityGroupSection**

Update the `ActivityGroupSectionProps` interface (~line 508):
```typescript
interface ActivityGroupSectionProps {
  group: ActivityGroup;
  groupBy: 'temporal' | 'source';
  isCollapsed: boolean;
  onToggle: () => void;
  inlineDrafts?: ActivityGroup[];
  onPromoteToCareerStory?: (entryId: string) => void;
}
```

Update the `ActivityGroupSection` function signature:
```typescript
function ActivityGroupSection({ group, groupBy, isCollapsed, onToggle, inlineDrafts, onPromoteToCareerStory }: ActivityGroupSectionProps) {
```

**Step 4: Render inline draft cards above activity rows**

Inside `ActivityGroupSection`, in the expanded section (after `{!isCollapsed && (`), render drafts before the activity list:

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

    {/* Activity rows */}
    <div className="bg-white rounded-lg border border-gray-100">
      {visibleActivities.map((activity) => (
        <ActivityCard ... />
      ))}
      {/* Show more button */}
      ...
    </div>
  </>
)}
```

**Step 5: Wire up the props in the render loop**

In the `filteredGroups.map` for temporal groups (~line 490), pass the new props:
```tsx
filteredGroups.map((group) => (
  <ActivityGroupSection
    key={group.key}
    group={group}
    groupBy={groupBy}
    isCollapsed={isGroupCollapsed(group.key)}
    onToggle={() => toggleGroup(group.key)}
    inlineDrafts={draftsByTemporalKey.get(group.key)}
    onPromoteToCareerStory={onPromoteToCareerStory}
  />
))
```

**Step 6: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: Zero errors

**Step 7: Run tests**

Run: `npx vitest run --reporter=verbose 2>&1 | tail -30`
Expected: All pass

**Step 8: Commit**

```bash
git add -A && git commit -m "feat(journal): render inline draft cards within temporal groups"
```

---

## Task 4: Add Source Filter Dropdown

**Files:**
- Modify: `src/components/journal/activity-stream.tsx` (add source dropdown, client-side filtering)

**Step 1: Compute available sources from temporal groups' activities**

Inside the `ActivityStream` component, replace the existing `availableSources` memo (~line 89) with one that works for temporal view:

```typescript
// Compute available sources from ALL activities across temporal groups
const availableSources = useMemo(() => {
  const sourceCounts = new Map<string, number>();
  for (const g of groups) {
    for (const a of g.activities) {
      sourceCounts.set(a.source, (sourceCounts.get(a.source) || 0) + 1);
    }
  }
  // Sort by count descending
  return Array.from(sourceCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([source, count]) => ({ source: source as ActivitySource, count }));
}, [groups]);
```

**Step 2: Add source filter dropdown in the controls bar**

After the temporal filters and before the spacer, add a source dropdown button:

```tsx
{/* Source filter dropdown */}
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

**Step 3: Create the SourceFilterDropdown component**

Add inside `activity-stream.tsx`:

```tsx
interface SourceFilterDropdownProps {
  availableSources: { source: ActivitySource; count: number }[];
  selectedSources: ActivitySource[];
  onToggle: (source: ActivitySource) => void;
}

function SourceFilterDropdown({ availableSources, selectedSources, onToggle }: SourceFilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const hasFilter = selectedSources.length > 0;

  // Close on outside click
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-md whitespace-nowrap transition-all',
          hasFilter
            ? 'bg-primary-500 text-white shadow-sm'
            : 'text-gray-600 hover:text-primary-600 hover:bg-primary-50'
        )}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <Layers className="w-3 h-3" />
        {hasFilter ? `Sources (${selectedSources.length})` : 'Sources'}
        <ChevronDown className={cn('w-3 h-3 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 z-20 bg-white rounded-lg border border-gray-200 shadow-lg py-1 min-w-[160px]">
          {/* Clear all */}
          {hasFilter && (
            <button
              onClick={() => { selectedSources.forEach(s => onToggle(s)); }}
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

**Step 4: Apply client-side source filtering in filteredGroups**

Update the `filteredGroups` useMemo to filter activities within temporal groups by selected source:

```typescript
// After temporal bucket filtering, apply source filter within groups
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

**Step 5: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: Zero errors

**Step 6: Run tests**

Run: `npx vitest run --reporter=verbose 2>&1 | tail -30`
Expected: All pass

**Step 7: Commit**

```bash
git add -A && git commit -m "feat(journal): add source filter dropdown for timeline view"
```

---

## Task 5: Add Drafts Banner (Content-Level, Not a Filter Chip)

**Files:**
- Modify: `src/components/journal/activity-stream.tsx` (add DraftsBanner at top of stream)

Following the Tufte review: drafts are content, not a filter. Show a banner when drafts exist.

**Step 1: Add showDraftsOnly toggle state**

In the `ActivityStream` component, add state:
```typescript
const [showDraftsOnly, setShowDraftsOnly] = useState(false);
```

**Step 2: Create DraftsBanner component**

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

**Step 3: Render DraftsBanner above the groups**

In the ActivityStream render, after the controls bar and before the groups div:

```tsx
{/* Drafts banner — content-level affordance, not a filter chip */}
<DraftsBanner
  draftCount={storyGroups.length}
  showDraftsOnly={showDraftsOnly}
  onToggle={() => setShowDraftsOnly(prev => !prev)}
/>
```

**Step 4: Apply showDraftsOnly to rendering**

When `showDraftsOnly` is true, hide activity rows and only show inline draft cards. Modify the groups rendering:

```tsx
{filteredGroups.map((group) => {
  const drafts = draftsByTemporalKey.get(group.key);
  // In drafts-only mode, skip groups with no drafts
  if (showDraftsOnly && (!drafts || drafts.length === 0)) return null;

  return (
    <ActivityGroupSection
      key={group.key}
      group={group}
      groupBy={groupBy}
      isCollapsed={isGroupCollapsed(group.key)}
      onToggle={() => toggleGroup(group.key)}
      inlineDrafts={drafts}
      onPromoteToCareerStory={onPromoteToCareerStory}
      showDraftsOnly={showDraftsOnly}
    />
  );
})}
```

**Step 5: Update ActivityGroupSection to support showDraftsOnly**

Add `showDraftsOnly?: boolean` to `ActivityGroupSectionProps`. When true, hide the activity row list and show only the draft cards:

```tsx
{!isCollapsed && (
  <>
    {/* Inline draft cards */}
    {inlineDrafts && inlineDrafts.length > 0 && (
      <div className="space-y-2 mb-2">
        {inlineDrafts.map(draft => (
          <InlineDraftCard key={draft.key} group={draft} onPromoteToCareerStory={onPromoteToCareerStory} />
        ))}
      </div>
    )}

    {/* Activity rows — hidden in drafts-only mode */}
    {!showDraftsOnly && (
      <div className="bg-white rounded-lg border border-gray-100">
        {visibleActivities.map((activity) => (
          <ActivityCard ... />
        ))}
        {hasMore && ( ... )}
      </div>
    )}
  </>
)}
```

**Step 6: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: Zero errors

**Step 7: Run tests**

Run: `npx vitest run --reporter=verbose 2>&1 | tail -30`
Expected: All pass

**Step 8: Commit**

```bash
git add -A && git commit -m "feat(journal): add drafts banner with toggle for drafts-only view"
```

---

## Task 6: Clean Up Dead Code

**Files:**
- Modify: `src/components/journal/activity-stream.tsx` (remove source/story tab code paths)
- Modify: `src/components/journal/activity-filters.tsx` (remove unused StoryFilters, RoleFilters)
- Modify: `src/types/activity.ts` (no changes needed — keep types for API compatibility)

**Step 1: Remove source/story groupBy branches from ActivityStream**

In `activity-stream.tsx`:

1. Remove the `StoryGroupSection` component entirely (~lines 752-880)
2. Remove the `groupBy === 'story'` rendering branch (~lines 474-499)
3. Remove the story drafts explanation banner (`groupBy === 'story'` conditional, ~lines 436-466)
4. Remove `availableStoryMethods`, `storyMethodCounts`, `availableRoles`, `roleCounts` memos
5. Remove `selectedStoryMethods`, `selectedRoles` state
6. Remove `handleStoryMethodToggle`, `handleRoleToggle` handlers
7. Remove `showStoryFilters`, `showRoleFilters` from showFilters computation
8. Remove the story/role filter JSX in the controls bar
9. Remove the `groupBy === 'source'` branch from `availableSources` and `sourceCounts` memos (now computed differently in Task 4)
10. Remove the `showSourceFilters` variable (replaced by dropdown)
11. Simplify `ActivityGroupSectionProps` — `groupBy` prop can be removed since it's always temporal now

**Step 2: Remove unused filter components from activity-filters.tsx**

Remove the `StoryFilters` component (~lines 252-310) and the `RoleFilters` component (~lines 312-380).

Keep `TemporalFilters`, `SourceFilters` (may be useful for future sub-filters), and `FilterSeparator`.

**Step 3: Clean up unused imports**

In `activity-stream.tsx`, remove:
- `BookOpen`, `Layers` from lucide imports (no longer used for empty state icon)
- `StoryFilters`, `RoleFilters` from activity-filters imports
- `StoryGroupingMethod`, `StoryDominantRole` from types import (if no longer used)

In `activity-stream.tsx` empty state, simplify to only show the temporal icon:
```tsx
<div className="mx-auto w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-3">
  <Clock className="w-5 h-5 text-gray-400" />
</div>
```

**Step 4: Update the collapsed state initialization**

Remove the `groupBy === 'source'` branch from the effect (~line 70):
```typescript
// REPLACE:
// const initialCollapsed = groupBy === 'source'
//   ? new Set(groups.map(g => g.key))
//   : new Set(groups.slice(1).map(g => g.key));

// WITH:
const initialCollapsed = new Set(groups.slice(1).map(g => g.key));
```

**Step 5: Remove groupBy from ActivityGroupSection**

Since `groupBy` is always `'temporal'` now, remove it from the props and simplify the component:
- Remove `sourceInfo`, `SourceIcon`, `labelColor` conditional logic — always use temporal style
- Remove the source icon rendering in the group header
- Always show temporal summary in collapsed state
- Always pass `showSourceIcon={true}` to ActivityCard (since we're not in source-grouped mode)

**Step 6: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: Zero errors

**Step 7: Run tests**

Run: `npx vitest run --reporter=verbose 2>&1 | tail -30`
Expected: All pass

**Step 8: Commit**

```bash
git add -A && git commit -m "refactor(journal): remove source/story tab code paths and dead filters"
```

---

## Task 7: Update ActivityStream Props Interface (Simplify)

**Files:**
- Modify: `src/components/journal/activity-stream.tsx` (simplify props)
- Modify: `src/pages/journal/list.tsx` (update prop passing)

**Step 1: Simplify ActivityStreamProps**

Remove `groupBy` from the interface since it's always temporal:
```typescript
interface ActivityStreamProps {
  groups: ActivityGroup[];
  storyGroups?: ActivityGroup[];
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

**Step 2: Remove groupBy prop from list.tsx**

```tsx
<ActivityStream
  groups={activitiesData && isGroupedResponse(activitiesData) ? activitiesData.groups : []}
  storyGroups={storyGroups}
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

**Step 3: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: Zero errors

**Step 4: Run tests**

Run: `npx vitest run --reporter=verbose 2>&1 | tail -30`
Expected: All pass

**Step 5: Commit**

```bash
git add -A && git commit -m "refactor(journal): simplify ActivityStream props — remove groupBy"
```

---

## Task 8: Write Tests for Inline Drafts and Source Filter

**Files:**
- Create: `src/components/journal/activity-stream.test.tsx`

**Step 1: Write test for inline draft card rendering**

```tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ActivityStream } from './activity-stream';
import { ActivityGroup } from '../../types/activity';

// Minimal temporal group
const makeTemporalGroup = (key: string, label: string, count: number): ActivityGroup => ({
  key,
  label,
  count,
  activities: Array.from({ length: count }, (_, i) => ({
    id: `${key}-act-${i}`,
    source: 'github',
    sourceId: `gh-${i}`,
    sourceUrl: null,
    title: `Activity ${i}`,
    description: null,
    timestamp: new Date().toISOString(),
    crossToolRefs: [],
    storyId: null,
    storyTitle: null,
  })),
});

// Minimal story group (draft)
const makeStoryGroup = (key: string, title: string): ActivityGroup => ({
  key,
  label: title,
  count: 3,
  activities: [],
  storyMetadata: {
    id: `story-${key}`,
    title,
    description: 'A draft story about work',
    timeRangeStart: new Date().toISOString(),
    timeRangeEnd: new Date().toISOString(),
    category: null,
    skills: [],
    createdAt: new Date().toISOString(),
    isPublished: false,
    type: 'journal_entry',
    dominantRole: 'Led',
  },
});

describe('ActivityStream — inline drafts', () => {
  it('renders draft card titles within temporal groups', () => {
    render(
      <ActivityStream
        groups={[makeTemporalGroup('this_week', 'This Week', 2)]}
        storyGroups={[makeStoryGroup('auth', 'Authentication System Overhaul')]}
      />
    );

    expect(screen.getByText('Authentication System Overhaul')).toBeInTheDocument();
  });

  it('shows drafts banner when storyGroups are present', () => {
    render(
      <ActivityStream
        groups={[makeTemporalGroup('this_week', 'This Week', 2)]}
        storyGroups={[makeStoryGroup('auth', 'Auth Overhaul')]}
      />
    );

    expect(screen.getByText(/1 draft story ready for review/)).toBeInTheDocument();
  });

  it('hides drafts banner when no storyGroups', () => {
    render(
      <ActivityStream
        groups={[makeTemporalGroup('this_week', 'This Week', 2)]}
        storyGroups={[]}
      />
    );

    expect(screen.queryByText(/draft/i)).not.toBeInTheDocument();
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
});
```

**Step 2: Run the new test**

Run: `npx vitest run src/components/journal/activity-stream.test.tsx --reporter=verbose`
Expected: All 4 tests pass

**Step 3: Commit**

```bash
git add -A && git commit -m "test(journal): add tests for inline draft cards and drafts banner"
```

---

## Task 9: Accessibility Pass

**Files:**
- Modify: `src/components/journal/activity-stream.tsx` (ARIA attributes)

**Step 1: Add proper ARIA to draft cards**

Already done in Task 3 — `InlineDraftCard` has:
- `<article>` with `aria-label`
- `aria-hidden="true"` on sparkle icon

**Step 2: Add ARIA to drafts banner toggle**

Already done in Task 5 — `DraftsBanner` has `aria-pressed` on toggle.

**Step 3: Add ARIA to source filter dropdown**

Already done in Task 4 — `SourceFilterDropdown` has:
- `aria-expanded` on trigger
- `aria-haspopup="listbox"` on trigger
- `role="option"` and `aria-selected` on items

**Step 4: Verify temporal filter chips have proper toggle state**

In `src/components/journal/activity-filters.tsx`, add `aria-pressed` to temporal filter buttons:

```tsx
<button
  key={bucket}
  onClick={() => onToggle(bucket)}
  aria-pressed={isSelected}
  className={cn(...)}
>
```

**Step 5: Run tests**

Run: `npx vitest run --reporter=verbose 2>&1 | tail -30`
Expected: All pass

**Step 6: Commit**

```bash
git add -A && git commit -m "a11y(journal): add aria-pressed to filter chips, verify draft card ARIA"
```

---

## Task 10: Final Verification

**Step 1: Full TypeScript check**

Run: `npx tsc --noEmit`
Expected: Zero errors

**Step 2: Full test suite**

Run: `npx vitest run --reporter=verbose`
Expected: All tests pass

**Step 3: Manual test checklist**

- [ ] Page load: Timeline with inline draft cards visible in correct temporal groups
- [ ] Source dropdown: filters activities, draft cards with matching sources stay visible
- [ ] "Review drafts" banner button: toggles to show only draft cards
- [ ] Temporal chip + source dropdown: compound filter works
- [ ] "Create Career Story" CTA: opens Story Wizard
- [ ] Career Stories link in header: navigates to /career-stories
- [ ] Collapse/expand: works with inline drafts
- [ ] First visit: no scroll-to-bottom, first group expanded
- [ ] Keyboard: tab navigation through filters and cards
- [ ] Empty states: no activities, no drafts (banner hidden), filtered to zero

**Step 4: Final commit (if any touch-ups needed)**

```bash
git add -A && git commit -m "chore(journal): final polish for tab redesign"
```
