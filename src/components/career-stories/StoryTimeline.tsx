/**
 * StoryTimeline Component
 *
 * Displays career stories in a timeline format, similar to resume experience sections.
 * Stories are grouped by date range and shown with visual timeline connectors.
 */

import React, { useMemo } from 'react';
import { format, parseISO, differenceInDays } from 'date-fns';
import {
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Target,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { CareerStory } from '../../types/career-stories';
import { NARRATIVE_FRAMEWORKS } from './constants';

interface StoryTimelineProps {
  stories: CareerStory[];
  selectedStoryId: string | null;
  isLoading: boolean;
  onSelectStory: (story: CareerStory) => void;
}

// Group stories by year for the timeline
function groupStoriesByYear(stories: CareerStory[]): Map<string, CareerStory[]> {
  const groups = new Map<string, CareerStory[]>();

  // Sort stories by date descending
  const sorted = [...stories].sort((a, b) => {
    const dateA = a.generatedAt ? new Date(a.generatedAt).getTime() : 0;
    const dateB = b.generatedAt ? new Date(b.generatedAt).getTime() : 0;
    return dateB - dateA;
  });

  sorted.forEach((story) => {
    const date = story.generatedAt ? new Date(story.generatedAt) : new Date();
    const year = date.getFullYear().toString();
    const existing = groups.get(year) || [];
    groups.set(year, [...existing, story]);
  });

  return groups;
}

// Timeline dot component - minimal
const TimelineDot: React.FC<{ isPublished: boolean; isSelected: boolean }> = ({
  isPublished,
  isSelected,
}) => (
  <div
    className={cn(
      'w-2 h-2 rounded-full transition-all duration-150',
      isSelected
        ? 'bg-primary-500 scale-150'
        : isPublished
        ? 'bg-green-500'
        : 'bg-gray-300'
    )}
  />
);

// Single timeline item
interface TimelineItemProps {
  story: CareerStory;
  isSelected: boolean;
  isFirst: boolean;
  isLast: boolean;
  onClick: () => void;
}

const TimelineItem: React.FC<TimelineItemProps> = ({
  story,
  isSelected,
  isFirst,
  isLast,
  onClick,
}) => {
  const frameworkInfo = NARRATIVE_FRAMEWORKS[story.framework];
  const formattedDate = story.generatedAt
    ? format(new Date(story.generatedAt), 'MMM d')
    : 'Draft';

  // Extract a preview of the situation/context
  const preview = useMemo(() => {
    const sections = story.sections || {};
    const situationKeys = ['situation', 'context', 'challenge', 'problem'];
    for (const key of situationKeys) {
      if (sections[key]?.summary) {
        const text = sections[key].summary;
        return text.length > 80 ? text.slice(0, 77) + '...' : text;
      }
    }
    return null;
  }, [story.sections]);

  return (
    <div className="relative flex gap-2 group">
      {/* Timeline line */}
      <div className="flex flex-col items-center w-4 flex-shrink-0">
        {!isFirst && <div className="w-px h-2 bg-gray-200" />}
        <TimelineDot isPublished={story.isPublished} isSelected={isSelected} />
        {!isLast && <div className="w-px flex-1 bg-gray-200" />}
      </div>

      {/* Content card - compact */}
      <button
        onClick={onClick}
        className={cn(
          'flex-1 text-left mb-2 p-2.5 rounded-lg border transition-all duration-150',
          'hover:border-primary-200',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1',
          isSelected
            ? 'bg-primary-50 border-primary-300'
            : 'bg-white border-gray-100 hover:bg-gray-50/50'
        )}
        data-testid={`timeline-item-${story.id}`}
      >
        {/* Title row */}
        <div className="flex items-center gap-1.5 mb-1">
          <h3
            className={cn(
              'text-sm font-medium truncate flex-1',
              isSelected ? 'text-primary-900' : 'text-gray-900'
            )}
          >
            {story.title}
          </h3>
          <ChevronRight
            className={cn(
              'w-4 h-4 flex-shrink-0 transition-transform',
              isSelected ? 'text-primary-500' : 'text-gray-300',
              'group-hover:translate-x-0.5'
            )}
          />
        </div>

        {/* Metadata row - very compact */}
        <div className="flex items-center gap-2 text-[11px] text-gray-500">
          <span>{formattedDate}</span>
          <span
            className={cn(
              'px-1.5 py-0.5 rounded font-medium',
              isSelected ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'
            )}
          >
            {frameworkInfo?.label || story.framework}
          </span>
          <span>{story.activityIds.length} act.</span>
          {story.isPublished && (
            <CheckCircle2 className="w-3 h-3 text-green-500 ml-auto" />
          )}
        </div>

        {/* Preview text - optional, one line */}
        {preview && (
          <p className="text-[11px] text-gray-500 truncate mt-1.5 leading-snug">
            {preview}
          </p>
        )}
      </button>
    </div>
  );
};

// Year group header - compact
const YearHeader: React.FC<{ year: string; count: number }> = ({ year, count }) => (
  <div className="flex items-center gap-2 mb-2 mt-1 sticky top-0 bg-white/95 backdrop-blur-sm py-1.5 -mx-2 px-2 z-10">
    <span className="text-xs font-bold text-gray-600">{year}</span>
    <div className="flex-1 h-px bg-gray-100" />
    <span className="text-[10px] text-gray-400">{count}</span>
  </div>
);

// Empty state
const EmptyTimeline: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
    <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
      <Target className="w-8 h-8 text-gray-400" />
    </div>
    <h3 className="text-lg font-semibold text-gray-900 mb-2">Build Your Career Timeline</h3>
    <p className="text-sm text-gray-500 max-w-[300px] leading-relaxed mb-4">
      Promote journal entries to career stories from the Journal page. Your stories will appear here as a timeline of achievements.
    </p>
    <div className="flex items-center gap-2 text-xs text-gray-400">
      <Sparkles className="w-4 h-4" />
      <span>Perfect for interviews, promotions & 1:1s</span>
    </div>
  </div>
);

// Loading state
const LoadingTimeline: React.FC = () => (
  <div className="p-6 space-y-6">
    {[1, 2, 3].map((i) => (
      <div key={i} className="flex gap-4 animate-pulse">
        <div className="flex flex-col items-center">
          <div className="w-4 h-4 rounded-full bg-gray-200" />
          <div className="w-0.5 flex-1 bg-gray-100" />
        </div>
        <div className="flex-1 p-4 bg-gray-100 rounded-xl">
          <div className="h-5 w-48 bg-gray-200 rounded mb-2" />
          <div className="h-4 w-32 bg-gray-200 rounded mb-3" />
          <div className="h-4 w-full bg-gray-200 rounded" />
        </div>
      </div>
    ))}
  </div>
);

export function StoryTimeline({
  stories,
  selectedStoryId,
  isLoading,
  onSelectStory,
}: StoryTimelineProps) {
  const groupedStories = useMemo(() => groupStoriesByYear(stories), [stories]);
  const years = useMemo(() => Array.from(groupedStories.keys()).sort((a, b) => parseInt(b) - parseInt(a)), [groupedStories]);

  if (isLoading) {
    return <LoadingTimeline />;
  }

  if (stories.length === 0) {
    return <EmptyTimeline />;
  }

  return (
    <div className="py-3 px-2" role="list" aria-label="Career Story Timeline">
      {years.map((year, yearIdx) => {
        const yearStories = groupedStories.get(year) || [];
        return (
          <div key={year} role="group" aria-label={`Stories from ${year}`}>
            <YearHeader year={year} count={yearStories.length} />
            {yearStories.map((story, idx) => (
              <TimelineItem
                key={story.id}
                story={story}
                isSelected={selectedStoryId === story.id}
                isFirst={yearIdx === 0 && idx === 0}
                isLast={idx === yearStories.length - 1}
                onClick={() => onSelectStory(story)}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}
