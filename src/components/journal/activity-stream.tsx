import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Clock, AlertCircle, Loader2, ChevronDown, ChevronRight, Plus, ArrowUpRight, Star, TrendingUp, Sparkles, RefreshCw } from 'lucide-react';
import { annotate, type Annotation as RNAnnotation } from 'rough-notation';
import { format } from 'date-fns';
import { ActivityCard } from './activity-card';
import { getSourceIcon } from './source-icons';
import { ActivityGroup, Activity, SUPPORTED_SOURCES, ActivitySource, ActivityStoryEdgeType, ACTIVITY_EDGE_LABELS } from '../../types/activity';
import { cn } from '../../lib/utils';
import { highlightMetrics, ACTIVITIES_PER_EDGE_LIMIT } from './story-group-header';
import { useListFilters } from '../../hooks/useListFilters';
import { makeActivitiesFilterConfig, makeDraftsFilterConfig } from '../../utils/list-filter-configs';
import { CollapsibleGroup } from '../ui/collapsible-group';
import { ChipFilter } from '../ui/chip-filter';
import { ViewToggle } from '../ui/view-toggle';
import { FilterBar, FilterSeparator, ExpandCollapseButton } from '../ui/filter-bar';
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
  /** Number of draft stories hidden because they were promoted to career stories */
  promotedCount?: number;
}

/**
 * Display grouped activities in a clean, modern stream layout.
 * Temporal grouping only — source/story views removed (header nav handles page switching).
 */
export function ActivityStream({
  groups,
  storyGroups = [],
  isLoading,
  error,
  emptyMessage = 'No activities found',
  onRegenerateNarrative,
  regeneratingEntryId,
  onDeleteEntry,
  onPromoteToCareerStory,
  isEnhancingNarratives,
  pendingEnhancementIds,
  promotedCount = 0
}: ActivityStreamProps) {
  const [showDraftsOnly, setShowDraftsOnly] = useState(false);

  // Activities: useListFilters with flat Activity[] for filtering + grouping
  const { config: activitiesFilterConfig, allActivities } = useMemo(
    () => makeActivitiesFilterConfig(groups),
    [groups],
  );
  const activities = useListFilters(activitiesFilterConfig, allActivities);

  // Drafts: useListFilters with ActivityGroup[] items
  const draftsFilterConfig = useMemo(
    () => makeDraftsFilterConfig(storyGroups),
    [storyGroups],
  );
  const drafts = useListFilters(draftsFilterConfig, storyGroups);

  // Draft card expand/collapse — item-level, separate from group-level collapse
  const [expandedDrafts, setExpandedDrafts] = useState<Set<string>>(new Set());
  const toggleDraft = (key: string) => {
    setExpandedDrafts(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-center">
        <AlertCircle className="w-5 h-5 text-red-400 mx-auto mb-2" />
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    );
  }

  // Empty state
  if (groups.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-3">
          <Clock className="w-5 h-5 text-gray-400" />
        </div>
        <p className="text-sm text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  // Shared pill toggle for Activities / Draft Stories
  const pillToggle = storyGroups.length > 0 ? (
    <div className="flex items-center rounded-md bg-gray-100 p-0.5 flex-shrink-0">
      <button
        onClick={() => setShowDraftsOnly(false)}
        className={cn(
          'px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap rounded transition-all',
          !showDraftsOnly
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
        )}
      >
        Activities
      </button>
      <button
        onClick={() => setShowDraftsOnly(true)}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap rounded transition-all',
          showDraftsOnly
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
        )}
      >
        Drafts
        <span className={cn(
          'text-[10px] tabular-nums rounded-full px-1.5 min-w-[16px] text-center font-bold',
          showDraftsOnly ? 'bg-gray-200 text-gray-700' : 'bg-gray-200/60 text-gray-500'
        )}>
          {storyGroups.length}
        </span>
      </button>
    </div>
  ) : undefined;

  // Active filter state for the current mode
  const currentFilter = showDraftsOnly ? drafts : activities;
  const currentConfig = showDraftsOnly ? draftsFilterConfig : activitiesFilterConfig;

  return (
    <div className="space-y-2">
      {/* Controls: FilterBar with mode-specific filters */}
      <FilterBar
        pillToggle={pillToggle}
        viewToggle={
          <ViewToggle
            mode={currentFilter.viewMode}
            onModeChange={currentFilter.setViewMode}
            labels={currentConfig.viewLabels}
          />
        }
        expandCollapseButton={
          <ExpandCollapseButton anyExpanded={currentFilter.anyExpanded} onToggle={currentFilter.toggleAll} />
        }
        activeFilterCount={currentFilter.activeFilterCount}
      >
        {currentConfig.temporalChips.length > 0 && (
          <ChipFilter
            chips={currentConfig.temporalChips}
            selectedKeys={currentFilter.selectedTemporalKeys}
            onToggle={currentFilter.toggleTemporalKey}
          />
        )}
        {currentConfig.typedChips.length > 0 && (
          <>
            <FilterSeparator />
            <ChipFilter
              chips={currentConfig.typedChips}
              selectedKeys={currentFilter.selectedTypedKeys}
              onToggle={currentFilter.toggleTypedKey}
              maxVisible={4}
            />
          </>
        )}
      </FilterBar>

      {/* Groups - min-height ensures bottom items can scroll to top */}
      <div className="min-h-[calc(100vh-12rem)]">
        {showDraftsOnly ? (
          <>
            {/* Drafts view */}
            {storyGroups.length === 0 && promotedCount > 0 && (
              <div className="px-4 py-3 rounded-lg bg-primary-50 border border-primary-200">
                <p className="text-sm text-primary-700">
                  {promotedCount} {promotedCount === 1 ? 'story' : 'stories'} promoted to Career Stories.
                </p>
                <a href="/stories" className="inline-flex items-center gap-1 mt-1.5 text-xs font-medium text-primary-600 hover:text-primary-700">
                  View in Career Stories
                </a>
              </div>
            )}
            {storyGroups.length === 0 && promotedCount === 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500">No draft stories yet</p>
                <p className="text-xs text-gray-400 mt-1">Drafts are created automatically as your activities sync.</p>
              </div>
            )}
            {storyGroups.length > 0 && (
              <div className="pt-2">
                {drafts.groups.map((group, idx) => (
                  <CollapsibleGroup<ActivityGroup>
                    key={group.key}
                    section={group}
                    isCollapsed={drafts.collapsedGroups.has(group.key)}
                    onToggle={() => drafts.toggleGroup(group.key)}
                    isLast={idx === drafts.groups.length - 1}
                    showSpine={true}
                    previewLimit={3}
                    showAll={drafts.showAllGroups.has(group.key)}
                    onToggleShowAll={() => drafts.toggleShowAll(group.key)}
                    dotColor={drafts.collapsedGroups.has(group.key) ? undefined : '#7c3aed'}
                    renderItem={(draft) => (
                      <InlineDraftCard
                        key={draft.key}
                        group={draft}
                        isExpanded={expandedDrafts.has(draft.key)}
                        onToggleExpand={() => toggleDraft(draft.key)}
                        onPromoteToCareerStory={onPromoteToCareerStory}
                        onRegenerateNarrative={onRegenerateNarrative}
                        isRegenerateLoading={regeneratingEntryId === draft.storyMetadata?.id}
                      />
                    )}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {/* Activities view */}
            {activities.groups.map((group, idx) => (
              <CollapsibleGroup<Activity>
                key={group.key}
                section={group}
                isCollapsed={activities.collapsedGroups.has(group.key)}
                onToggle={() => activities.toggleGroup(group.key)}
                isLast={idx === activities.groups.length - 1}
                showSpine={true}
                previewLimit={15}
                showAll={activities.showAllGroups.has(group.key)}
                onToggleShowAll={() => activities.toggleShowAll(group.key)}
                renderItem={(activity) => (
                  <ActivityCard
                    key={activity.id}
                    activity={activity}
                    showStoryBadge={true}
                    showSourceIcon={true}
                  />
                )}
              />
            ))}
          </>
        )}

        {/* Spacer to allow bottom items to scroll to top position */}
        <div className="h-[50vh]" aria-hidden="true" />
      </div>
    </div>
  );
}

/**
 * Inline draft story card — self-contained hero card with source icon stack,
 * title, description, topic chips, and "Create Story" CTA.
 *
 * Supports both controlled (parent manages expand state via isExpanded/onToggleExpand)
 * and uncontrolled (internal useState) modes. The Draft Stories tab uses controlled
 * mode so the toolbar Expand/Collapse button can toggle all cards at once.
 *
 * Split into Outer (null check) + Inner (guaranteed non-null meta) to avoid
 * calling hooks before the early return that guards against missing storyMetadata.
 */
interface InlineDraftCardProps {
  group: ActivityGroup;
  /** Controlled expanded state. Falls back to internal state if not provided. */
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onPromoteToCareerStory?: (entryId: string) => void;
  onRegenerateNarrative?: (entryId: string) => void;
  isRegenerateLoading?: boolean;
}

/** purple-600 — shared with border/badge colors across draft cards */
const DRAFT_ACCENT = '#7c3aed';

/** Tilted "Draft" badge with rough-notation circle effect */
function DraftBadge() {
  const ref = useRef<HTMLSpanElement>(null);
  const rnRef = useRef<RNAnnotation | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (rnRef.current) rnRef.current.remove();

    try {
      const inst = annotate(ref.current, {
        type: 'circle',
        color: DRAFT_ACCENT,
        strokeWidth: 1.5,
        padding: [2, 6],
        animate: true,
        animationDuration: 600,
      });
      rnRef.current = inst;
      inst.show();
    } catch {
      // rough-notation requires SVG DOM APIs (getTotalLength) unavailable in JSDOM
    }

    return () => { rnRef.current?.remove(); };
  }, []);

  return (
    <span
      ref={ref}
      className="text-[11px] font-bold italic text-purple-700 -rotate-6 inline-block font-serif tracking-wide"
    >
      Draft
    </span>
  );
}

// TODO: Also duplicated in story-group-header.tsx — move to types/activity.ts alongside ACTIVITY_EDGE_LABELS
const EDGE_TYPE_ORDER: ActivityStoryEdgeType[] = ['primary', 'outcome', 'supporting', 'contextual'];

function InlineDraftCard({ group, ...rest }: InlineDraftCardProps) {
  if (!group.storyMetadata) return null;
  return <InlineDraftCardInner group={group} meta={group.storyMetadata} {...rest} />;
}

/** Inner component — `meta` is guaranteed non-null. All hooks are safe to call. */
function InlineDraftCardInner({
  group,
  meta,
  isExpanded: controlledExpanded,
  onToggleExpand: controlledToggle,
  onPromoteToCareerStory,
  onRegenerateNarrative,
  isRegenerateLoading,
}: InlineDraftCardProps & { meta: NonNullable<ActivityGroup['storyMetadata']> }) {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const isExpanded = controlledExpanded ?? internalExpanded;
  const onToggleExpand = controlledToggle ?? (() => setInternalExpanded(prev => !prev));

  // Collect unique source icons from this draft's activities, sorted by frequency
  const uniqueSources = useMemo(() => {
    const sourceMap = new Map<string, number>();
    for (const a of group.activities) {
      sourceMap.set(a.source, (sourceMap.get(a.source) || 0) + 1);
    }
    return Array.from(sourceMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([source]) => source);
  }, [group.activities]);

  // Format date range
  const dateLabel = useMemo(() => {
    if (!meta.timeRangeStart && !meta.timeRangeEnd) return null;
    const start = meta.timeRangeStart ? format(new Date(meta.timeRangeStart), 'MMM d') : '';
    const end = meta.timeRangeEnd ? format(new Date(meta.timeRangeEnd), 'MMM d') : '';
    if (start && end && start !== end) return `${start} – ${end}`;
    return end || start;
  }, [meta.timeRangeStart, meta.timeRangeEnd]);

  // Group activities by edge type for expanded view
  const { groupedActivities, edgeMap } = useMemo(() => {
    const edges = meta.activityEdges ?? [];
    const edgeMap = new Map(edges.map(e => [e.activityId, e]));
    const buckets: Record<ActivityStoryEdgeType, Activity[]> = {
      primary: [], outcome: [], supporting: [], contextual: []
    };
    for (const activity of group.activities) {
      const edge = edgeMap.get(activity.id);
      const type = edge?.type ?? 'primary';
      buckets[type].push(activity);
    }
    return { groupedActivities: buckets, edgeMap };
  }, [group.activities, meta.activityEdges]);

  const useCompactCards = group.activities.length >= 4;

  return (
    <div
      className={cn(
        'relative rounded-2xl border-2 border-dashed transition-all',
        'bg-gradient-to-br from-purple-50/60 via-white to-white',
        isExpanded
          ? 'border-purple-400 shadow-md ring-1 ring-purple-100'
          : 'border-purple-300/70 shadow-sm hover:shadow-md hover:border-purple-400 cursor-pointer'
      )}
    >

      {/* Clickable header area */}
      <div
        className="p-4 sm:p-5"
        onClick={onToggleExpand}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleExpand(); } }}
      >
        {/* Top row: source icons + date + activity count | Draft badge + chevron */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            {uniqueSources.length > 0 && (
              <div className="flex items-center -space-x-1.5">
                {uniqueSources.slice(0, 4).map((source, i) => {
                  const Icon = getSourceIcon(source);
                  const info = SUPPORTED_SOURCES[source as ActivitySource];
                  return (
                    <span
                      key={source}
                      title={info?.displayName || source}
                      className="flex items-center justify-center w-7 h-7 rounded-full bg-white border-2 border-white shadow-sm ring-1 ring-gray-200/80"
                      style={{ zIndex: uniqueSources.length - i }}
                    >
                      <Icon className="w-3.5 h-3.5" style={{ color: info?.color }} />
                    </span>
                  );
                })}
                {uniqueSources.length > 4 && (
                  <span
                    className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 border-2 border-white shadow-sm ring-1 ring-gray-200/80 text-[10px] font-bold text-gray-500"
                    style={{ zIndex: 0 }}
                  >
                    +{uniqueSources.length - 4}
                  </span>
                )}
              </div>
            )}
            {dateLabel && (
              <span className="text-[11px] text-gray-400 whitespace-nowrap">{dateLabel}</span>
            )}
            {group.count > 0 && (
              <span className="text-[11px] tabular-nums text-gray-400 whitespace-nowrap">
                {group.count} {group.count === 1 ? 'activity' : 'activities'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <DraftBadge />
            <ChevronRight className={cn(
              'w-4 h-4 flex-shrink-0 transition-transform text-gray-400',
              isExpanded && 'rotate-90'
            )} />
          </div>
        </div>

        {/* Title */}
        <h3 className="text-base sm:text-lg font-bold text-gray-900 leading-snug mb-1.5">
          {meta.title}
        </h3>

        {/* Description preview — only when collapsed (expanded body shows full text) */}
        {!isExpanded && meta.description && (
          <p className="text-sm text-gray-600 leading-relaxed line-clamp-2 mb-3">
            {meta.description}
          </p>
        )}

        {/* Bottom row: topic chips + CTA (mirrors StoryCard bottom row) */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 flex-wrap min-w-0">
            {meta.topics?.slice(0, isExpanded ? 5 : 2).map((topic, i) => (
              <span key={i} className="px-1.5 py-0.5 rounded-md font-medium text-[11px] bg-purple-50 text-purple-700">
                {topic}
              </span>
            ))}
            {!isExpanded && (meta.topics?.length ?? 0) > 2 && (
              <span className="text-[10px] text-gray-400">+{(meta.topics?.length ?? 0) - 2}</span>
            )}
            {meta.dominantRole === 'Led' && (
              <>
                <span className="text-gray-300">·</span>
                <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-600">
                  <Star className="w-3 h-3" />
                  Led
                </span>
              </>
            )}
          </div>
          {onPromoteToCareerStory && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPromoteToCareerStory(meta.id);
              }}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm hover:shadow-md transition-all"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              Create Story
            </button>
          )}
        </div>
      </div>

      {/* Expanded content — full description + impact highlights + activities */}
      {isExpanded && (
        <div className="px-4 pb-4 sm:px-5 sm:pb-5" onClick={(e) => e.stopPropagation()}>
          <div className="border-t border-dashed border-purple-200 pt-4" />

          <div className={cn(
            'grid gap-4',
            group.activities.length > 0 ? 'lg:grid-cols-[3fr,2fr]' : 'grid-cols-1'
          )}>
            {/* Left: full description + impact highlights */}
            <div className={cn(
              'space-y-3',
              group.activities.length > 0 && 'lg:border-r lg:border-dashed lg:border-purple-200 lg:pr-4'
            )}>
              {/* Full description */}
              {meta.description && (
                <p className="text-[15px] text-gray-800 leading-[1.7]">
                  {highlightMetrics(meta.description)}
                </p>
              )}

              {/* Re-enhance nudge for drafts with content */}
              {meta.description && !meta.isPublished && onRegenerateNarrative && (
                <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2">
                  <Sparkles className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />
                  <span className="text-xs text-amber-800 flex-1">Polish this draft with AI before promoting</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRegenerateNarrative(meta.id);
                    }}
                    disabled={isRegenerateLoading}
                    className="inline-flex items-center gap-1 rounded-md bg-amber-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-amber-700 transition-colors disabled:opacity-50"
                  >
                    {isRegenerateLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3 w-3" />
                    )}
                    Re-enhance
                  </button>
                </div>
              )}

              {/* Impact highlights */}
              {meta.impactHighlights && meta.impactHighlights.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    <TrendingUp className="w-3.5 h-3.5 text-green-500" />
                    Key Impact
                  </div>
                  <ul className="space-y-1.5">
                    {meta.impactHighlights.map((highlight, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="text-emerald-500 mt-0.5 flex-shrink-0">•</span>
                        <span>{highlightMetrics(highlight)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Empty left column fallback */}
              {!meta.description && (!meta.impactHighlights || meta.impactHighlights.length === 0) && (
                <p className="text-xs text-gray-400 italic">No summary generated yet.</p>
              )}
            </div>

            {/* Right: activities by edge type */}
            {group.activities.length > 0 && (
              <div className="space-y-1">
                {EDGE_TYPE_ORDER.map(type => {
                  const items = groupedActivities[type];
                  if (items.length === 0) return null;
                  const edgeMeta = ACTIVITY_EDGE_LABELS[type];
                  return (
                    <DraftEdgeSection
                      key={type}
                      label={edgeMeta.label}
                      color={edgeMeta.color}
                      bgColor={edgeMeta.bgColor}
                      activities={items}
                      edgeMap={edgeMap}
                      defaultOpen={type === 'primary'}
                      compact={useCompactCards}
                    />
                  );
                })}
              </div>
            )}

            {/* Empty right column fallback */}
            {group.activities.length === 0 && (
              <p className="text-xs text-gray-400 italic py-2">No activities linked to this draft yet.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// TODO: DraftEdgeSection is near-identical to EdgeTypeAccordion in story-group-header.tsx.
// Consolidate into one shared component once edgeMap type alignment is resolved
// (ActivityStoryEdge vs { activityId, type } subset).

/** Edge-type accordion section for expanded draft card */
function DraftEdgeSection({
  label, color, bgColor, activities, edgeMap, defaultOpen, compact
}: {
  label: string;
  color: string;
  bgColor: string;
  activities: Activity[];
  edgeMap: Map<string, { activityId: string; type: ActivityStoryEdgeType }>;
  defaultOpen: boolean;
  compact: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [showAll, setShowAll] = useState(false);

  const visibleActivities = showAll ? activities : activities.slice(0, ACTIVITIES_PER_EDGE_LIMIT);
  const hiddenCount = activities.length - ACTIVITIES_PER_EDGE_LIMIT;

  return (
    <div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="w-full flex items-center gap-2 py-1 text-[11px] hover:bg-gray-50 rounded transition-colors"
      >
        <ChevronRight className={cn('w-3.5 h-3.5 text-gray-400 transition-transform duration-200', isOpen && 'rotate-90')} />
        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium" style={{ color, backgroundColor: bgColor }}>
          {label}
        </span>
        <span className="text-gray-400">{activities.length}</span>
      </button>
      {isOpen && (
        <div className="space-y-1.5 pl-5 mt-1">
          {visibleActivities.map((activity) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              showStoryBadge={false}
              compact={compact}
              edge={edgeMap.get(activity.id)}
              className="bg-white border border-gray-100 rounded-lg hover:border-gray-300 transition-colors"
            />
          ))}
          {hiddenCount > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowAll(!showAll);
              }}
              className="text-[11px] text-gray-400 hover:text-gray-600 pl-1 py-0.5 transition-colors"
            >
              {showAll ? 'Show less' : `+${hiddenCount} more`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

