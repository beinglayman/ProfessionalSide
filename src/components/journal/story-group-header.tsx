import React, { useState, useRef, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { ChevronDown, ChevronRight, ChevronUp, BookOpen, Calendar, FileText, CheckCircle, Users, Star, RefreshCw, Loader2, Trash2, ArrowUpRight, MoreHorizontal, Zap, TrendingUp } from 'lucide-react';
import { StoryMetadata, StoryDominantRole, Activity, ActivityStoryEdge } from '../../types/activity';
import { cn } from '../../lib/utils';
import { ActivityCard } from './activity-card';
import { EnhancingIndicator } from '../ui/enhancing-indicator';

interface StoryGroupHeaderProps {
  storyMetadata: StoryMetadata;
  activityCount: number;
  isExpanded: boolean;
  onToggle: () => void;
  onRegenerateNarrative?: (entryId: string) => void;
  isRegenerateLoading?: boolean;
  onDeleteEntry?: (entryId: string) => void;
  onPromoteToCareerStory?: (entryId: string) => void;
  /** Activities to display when expanded - integrated into the card */
  activities?: Activity[];
  /** @deprecated Use isPendingEnhancement instead */
  isEnhancingNarratives?: boolean;
  /** True if THIS specific story is pending enhancement (per-entry tracking) */
  isPendingEnhancement?: boolean;
}

/**
 * Compact role indicator - just the icon with tooltip
 */
function RoleIndicator({ role }: { role: StoryDominantRole }) {
  const config = {
    Led: { color: 'text-amber-500', label: 'You led this initiative' },
    Contributed: { color: 'text-blue-500', label: 'Key contributor' },
    Participated: { color: 'text-gray-400', label: 'Participant' },
  };

  const { color, label } = config[role];

  return (
    <span className={cn('flex-shrink-0', color)} title={label}>
      {role === 'Led' ? <Star className="w-3.5 h-3.5" /> : <Users className="w-3.5 h-3.5" />}
    </span>
  );
}

/**
 * Actions dropdown menu
 */
function ActionsMenu({
  onRegenerate,
  onPromote,
  onDelete,
  isRegenerateLoading,
  isPublished
}: {
  onRegenerate?: () => void;
  onPromote?: () => void;
  onDelete?: () => void;
  isRegenerateLoading?: boolean;
  isPublished?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  if (!onRegenerate && !onPromote && !onDelete) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          {onPromote && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPromote();
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"
            >
              <ArrowUpRight className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>Publish as Career Story</span>
            </button>
          )}
          {onRegenerate && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRegenerate();
                setIsOpen(false);
              }}
              disabled={isRegenerateLoading}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 text-left"
            >
              {isRegenerateLoading ? (
                <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
              ) : (
                <RefreshCw className="w-4 h-4 text-purple-500 flex-shrink-0" />
              )}
              <span>Rewrite summary</span>
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 text-left"
            >
              <Trash2 className="w-4 h-4 flex-shrink-0" />
              <span>Delete</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Story card - polished, user-focused design for career personas
 * Shows the story value, impact, evidence, and meaningful context as ONE cohesive unit
 */
export function StoryGroupHeader({
  storyMetadata,
  activityCount,
  isExpanded,
  onToggle,
  onRegenerateNarrative,
  isRegenerateLoading,
  onDeleteEntry,
  onPromoteToCareerStory,
  activities = [],
  isEnhancingNarratives,
  isPendingEnhancement: isPendingEnhancementProp
}: StoryGroupHeaderProps) {
  const {
    id,
    title,
    description,
    timeRangeStart,
    timeRangeEnd,
    category,
    skills,
    isPublished,
    topics,
    impactHighlights,
    dominantRole,
    activityEdges
  } = storyMetadata;

  // Ref for scroll-into-view behavior
  const cardRef = useRef<HTMLDivElement>(null);
  // Track whether initial expand has been handled (skip scrollIntoView on first render)
  const hasInitialized = useRef(false);

  // State for supporting activities collapse
  const [showSupporting, setShowSupporting] = useState(false);

  // Track content changes to trigger update animation
  const [justUpdated, setJustUpdated] = useState(false);
  const prevDescriptionRef = useRef(description);
  const prevImpactRef = useRef(impactHighlights);

  // Determine if this story is pending enhancement:
  // A story shows the enhancing indicator if:
  // 1. It's in the pending set (per-entry tracking) AND doesn't have LLM content yet
  // 2. OR (fallback) global generation is active AND no LLM content
  // Once LLM content arrives (description + impactHighlights), animation stops.
  const hasLLMContent = description && impactHighlights && impactHighlights.length > 0;
  const isPendingEnhancement = hasLLMContent
    ? false  // Already has content, not pending
    : (isPendingEnhancementProp ?? (isEnhancingNarratives ?? false));

  // Detect when story content is enhanced (description or impacts change)
  useEffect(() => {
    const descriptionChanged = prevDescriptionRef.current !== description && description;
    const impactsAdded = (!prevImpactRef.current || prevImpactRef.current.length === 0) &&
                         impactHighlights && impactHighlights.length > 0;

    if (descriptionChanged || impactsAdded) {
      setJustUpdated(true);
      // Clear the animation state after animation completes
      const timer = setTimeout(() => setJustUpdated(false), 2000);
      return () => clearTimeout(timer);
    }

    prevDescriptionRef.current = description;
    prevImpactRef.current = impactHighlights;
  }, [description, impactHighlights]);

  // Scroll card into view when user manually expands (not on initial auto-expand)
  useEffect(() => {
    if (isExpanded && cardRef.current) {
      if (!hasInitialized.current) {
        // Skip scroll on initial render / tab switch auto-expand
        hasInitialized.current = true;
        return;
      }
      // Brief delay so the expansion animation starts before scrolling
      const SCROLL_DELAY_MS = 50;
      const timer = setTimeout(() => {
        cardRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      }, SCROLL_DELAY_MS);
      return () => clearTimeout(timer);
    }
    // Mark as initialized even if collapsed on first render
    if (!hasInitialized.current) {
      hasInitialized.current = true;
    }
  }, [isExpanded]);

  // Group activities by evidence type
  const { primary, supporting, edgeMap } = useMemo(() => {
    const edgeMap = new Map(activityEdges?.map(e => [e.activityId, e]) ?? []);
    const primary: Activity[] = [];
    const supporting: Activity[] = [];

    for (const activity of activities) {
      const edge = edgeMap.get(activity.id);
      if (!edge || edge.type === 'primary') {
        primary.push(activity);
      } else {
        supporting.push(activity);
      }
    }

    return { primary, supporting, edgeMap };
  }, [activities, activityEdges]);

  // Format date range nicely
  const getDateRange = () => {
    if (!timeRangeStart && !timeRangeEnd) return null;
    const start = timeRangeStart ? format(new Date(timeRangeStart), 'MMM d') : '';
    const end = timeRangeEnd ? format(new Date(timeRangeEnd), 'MMM d, yyyy') : '';
    if (start && end && start !== end) return `${start} – ${end}`;
    return end || start;
  };

  const dateRange = getDateRange();

  // Get primary topic/skill for display
  const primaryTopic = topics?.[0] || skills?.[0];
  const additionalCount = (topics?.length || 0) + (skills?.length || 0) - 1;

  // Determine layout - always use two columns when there are activities
  const totalActivities = activities.length;
  const hasActivities = totalActivities > 0;
  // Use compact cards when there are many activities
  const useCompactCards = totalActivities >= 4;

  return (
    <div className="group scroll-mt-44 sm:scroll-mt-48" ref={cardRef}>
      {/* Story card */}
      <div
        className={cn(
          'relative rounded-xl transition-all duration-300 overflow-hidden',
          'bg-white border',
          isExpanded
            ? 'border-purple-200 shadow-lg'
            : 'border-gray-100 hover:border-purple-200 hover:shadow-sm cursor-pointer',
          // Flash animation when content is enhanced
          justUpdated && 'animate-highlight-flash animate-border-glow'
        )}
      >
        {/* Collapsed header - clickable */}
        <div onClick={onToggle} className={cn('p-4', isExpanded && 'cursor-pointer')}>
          <div className="flex items-start gap-3">
            {/* Expand indicator */}
            <div className={cn(
              'mt-0.5 text-gray-400 transition-transform duration-200',
              isExpanded && 'rotate-0'
            )}>
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Title row with CTA */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-gray-900 text-sm sm:text-base leading-tight">
                    {title}
                  </h3>
                  {dominantRole && <RoleIndicator role={dominantRole} />}
                  {isPublished && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                      <CheckCircle className="w-3 h-3" />
                      <span className="hidden sm:inline">Published</span>
                    </span>
                  )}
                </div>

                {/* CTA at top-right when expanded - always show for draft entries */}
                {isExpanded && onPromoteToCareerStory && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPromoteToCareerStory(storyMetadata.id);
                    }}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium',
                      'bg-purple-600 text-white hover:bg-purple-700',
                      'transition-all duration-200 transform hover:scale-105',
                      'shadow-sm hover:shadow-md',
                      'animate-in fade-in slide-in-from-right-2 duration-300'
                    )}
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Create Career Story</span>
                    <span className="sm:hidden">Publish</span>
                  </button>
                )}

                {/* Actions menu when expanded */}
                {isExpanded && (
                  <ActionsMenu
                    onRegenerate={onRegenerateNarrative ? () => onRegenerateNarrative(storyMetadata.id) : undefined}
                    onPromote={undefined} // CTA is now a button
                    onDelete={onDeleteEntry ? () => onDeleteEntry(storyMetadata.id) : undefined}
                    isRegenerateLoading={isRegenerateLoading}
                    isPublished={isPublished}
                  />
                )}
              </div>

              {/* Meta row */}
              <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-500 flex-wrap">
                {dateRange && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {dateRange}
                  </span>
                )}
                {primaryTopic && (
                  <>
                    {dateRange && <span className="text-gray-300 hidden sm:inline">·</span>}
                    <span className="text-purple-600 font-medium">{primaryTopic}</span>
                    {additionalCount > 0 && (
                      <span className="text-gray-400">+{additionalCount}</span>
                    )}
                  </>
                )}
                {activityCount > 0 && (
                  <>
                    <span className="text-gray-300 hidden sm:inline">·</span>
                    <span className="flex items-center gap-1 text-gray-400">
                      <Zap className="w-3 h-3" />
                      {activityCount} {activityCount === 1 ? 'activity' : 'activities'}
                    </span>
                  </>
                )}
              </div>

              {/* Description preview when collapsed */}
              {!isExpanded && description && (
                <p className="text-xs text-gray-500 mt-2 line-clamp-1 sm:line-clamp-2">
                  {description}
                </p>
              )}
              {/* Enhancing indicator when story is pending LLM enhancement */}
              {!isExpanded && isPendingEnhancement && (
                <EnhancingIndicator variant="inline" className="mt-2" />
              )}
            </div>

            {/* Actions menu when collapsed */}
            {!isExpanded && (
              <ActionsMenu
                onRegenerate={onRegenerateNarrative ? () => onRegenerateNarrative(storyMetadata.id) : undefined}
                onPromote={onPromoteToCareerStory ? () => onPromoteToCareerStory(storyMetadata.id) : undefined}
                onDelete={onDeleteEntry ? () => onDeleteEntry(storyMetadata.id) : undefined}
                isRegenerateLoading={isRegenerateLoading}
                isPublished={isPublished}
              />
            )}
          </div>
        </div>

        {/* Expanded content with animation */}
        <div className={cn(
          'transition-all duration-300 ease-out',
          isExpanded ? 'opacity-100 max-h-[2000px]' : 'opacity-0 max-h-0 overflow-hidden'
        )}>
          {/* Two-column layout: Story details | Activities */}
          <div className="px-4 pb-4" onClick={(e) => e.stopPropagation()}>
            <div className="border-t border-gray-100 pt-4" />

            <div className={cn(
              'grid gap-4',
              hasActivities ? 'lg:grid-cols-2' : 'grid-cols-1'
            )}>
              {/* Left column: Story narrative */}
              <div className={cn(
                'space-y-4',
                hasActivities && 'lg:border-r lg:border-gray-100 lg:pr-4'
              )}>
                {/* Description */}
                {description && (
                  <p className="text-sm text-gray-600 leading-relaxed animate-in fade-in slide-in-from-left-2 duration-300">
                    {description}
                  </p>
                )}
                {/* Enhancing indicator when story is pending LLM enhancement */}
                {isPendingEnhancement && (
                  <EnhancingIndicator variant="banner" className="animate-in fade-in slide-in-from-left-2 duration-300" />
                )}

                {/* Impact highlights */}
                {impactHighlights && impactHighlights.length > 0 && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-left-2 duration-300 delay-75">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                      <TrendingUp className="w-3.5 h-3.5 text-green-500" />
                      Key Impact
                    </div>
                    <ul className="space-y-1.5">
                      {impactHighlights.map((highlight, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 text-xs text-gray-600"
                          style={{ animationDelay: `${100 + idx * 50}ms` }}
                        >
                          <span className="text-green-500 mt-0.5 flex-shrink-0">•</span>
                          <span>{highlight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Skills/topics */}
                {(skills.length > 0 || (topics && topics.length > 0)) && (
                  <div className="flex flex-wrap gap-1.5 animate-in fade-in slide-in-from-left-2 duration-300 delay-150">
                    {(topics || skills).map((item, idx) => (
                      <span
                        key={idx}
                        className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-600"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Right column: Activities */}
              {activities.length > 0 && (
                <div className="space-y-2 animate-in fade-in slide-in-from-right-2 duration-300 delay-100">
                  <div className="text-xs font-medium text-gray-500 mb-2">
                    Supporting Work
                  </div>

                  {/* Grid layout for many activities, stack for few */}
                  <div className={cn(
                    useCompactCards && totalActivities > 6
                      ? 'grid grid-cols-1 gap-1.5 max-h-[400px] overflow-y-auto pr-1'
                      : 'space-y-1.5'
                  )}>
                    {/* Primary activities */}
                    {primary.map((activity, idx) => (
                      <div
                        key={activity.id}
                        className="animate-in fade-in slide-in-from-bottom-1 duration-200"
                        style={{ animationDelay: `${150 + idx * 50}ms` }}
                      >
                        <ActivityCard
                          activity={activity}
                          showStoryBadge={false}
                          compact={useCompactCards}
                          edge={edgeMap.get(activity.id)}
                          className="bg-white border border-gray-100 rounded-lg hover:border-purple-200 transition-colors"
                        />
                      </div>
                    ))}

                    {/* Supporting activities */}
                    {supporting.length > 0 && (
                      <>
                        {!showSupporting && supporting.length > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowSupporting(true);
                            }}
                            className={cn(
                              'w-full flex items-center justify-center gap-2 py-2 text-xs text-gray-500',
                              'hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors'
                            )}
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                            Show {supporting.length} more
                          </button>
                        )}

                        {showSupporting && supporting.map((activity, idx) => (
                          <div
                            key={activity.id}
                            className="animate-in fade-in slide-in-from-bottom-1 duration-200"
                            style={{ animationDelay: `${idx * 30}ms` }}
                          >
                            <ActivityCard
                              activity={activity}
                              showStoryBadge={false}
                              compact={true}
                              edge={edgeMap.get(activity.id)}
                              className="bg-gray-50/50 border border-gray-100 rounded-lg"
                            />
                          </div>
                        ))}

                        {showSupporting && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowSupporting(false);
                            }}
                            className="w-full flex items-center justify-center gap-2 py-1.5 text-xs text-gray-400 hover:text-gray-600"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                            Show less
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {activities.length === 0 && (
                <div className="py-4 text-center text-xs text-gray-400 animate-in fade-in duration-300">
                  No activities linked to this story yet
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Header for unassigned activities - clean card style matching story cards
 */
export function UnassignedGroupHeader({
  activityCount,
  isExpanded,
  onToggle
}: {
  activityCount: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      onClick={onToggle}
      className={cn(
        'rounded-xl transition-all duration-200 cursor-pointer',
        'bg-gray-50 border border-dashed',
        isExpanded
          ? 'border-gray-300'
          : 'border-gray-200 hover:border-gray-300'
      )}
    >
      <div className="p-4 flex items-center gap-3">
        <div className="text-gray-400">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </div>
        <BookOpen className="w-4 h-4 text-gray-400" />
        <div className="flex-1">
          <span className="text-sm font-medium text-gray-600">Unassigned Activities</span>
          <p className="text-xs text-gray-400 mt-0.5">
            {activityCount} {activityCount === 1 ? 'activity' : 'activities'} not yet grouped into a story
          </p>
        </div>
      </div>
    </div>
  );
}
