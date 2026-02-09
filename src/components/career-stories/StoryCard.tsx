/**
 * StoryCard Component
 *
 * Compact TLDR card for career stories in the list view.
 * Shows key info at a glance: title, framework, status, preview.
 * Follows Activity card pattern for consistency.
 */

import React, { useMemo } from 'react';
import { format, startOfWeek, endOfWeek, isSameMonth } from 'date-fns';
import {
  CheckCircle2,
  Clock,
  ChevronRight,
  Sparkles,
  AlertCircle,
  Calendar,
  GitBranch,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { CareerStory, NarrativeFramework, WritingStyle } from '../../types/career-stories';
import { NARRATIVE_FRAMEWORKS } from './constants';
import { FormatChip } from './FormatChip';
import { useStoryDerivations } from '../../hooks/useCareerStories';

interface StoryCardProps {
  story: CareerStory;
  isSelected: boolean;
  onClick: () => void;
  onFormatChange?: (storyId: string, framework: NarrativeFramework, style: WritingStyle) => void;
}

// Status badge component
function StatusBadge({ isPublished, needsRegeneration, hasContent, visibility }: { isPublished: boolean; needsRegeneration?: boolean; hasContent?: boolean; visibility?: string }) {
  if (isPublished) {
    const isNetwork = visibility === 'network';
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-green-100 text-green-700 rounded-full">
        <CheckCircle2 className="w-3 h-3" />
        Published{isNetwork ? ' · Network' : ''}
      </span>
    );
  }
  if (needsRegeneration) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700 rounded-full">
        <AlertCircle className="w-3 h-3" />
        Needs Polish
      </span>
    );
  }
  // Stories with content that aren't published are "Saved" not "Draft"
  if (hasContent) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-blue-50 text-blue-600 rounded-full">
        <Clock className="w-3 h-3" />
        Saved
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-600 rounded-full">
      <Clock className="w-3 h-3" />
      Draft
    </span>
  );
}

// Extract preview text from story sections
function getPreviewText(story: CareerStory): string {
  const sections = story.sections || {};
  const situationKeys = ['situation', 'context', 'challenge', 'problem'];

  for (const key of situationKeys) {
    if (sections[key]?.summary) {
      const text = sections[key].summary;
      return text.length > 100 ? text.slice(0, 97) + '...' : text;
    }
  }
  return '';
}

// Extract key metrics from story
function extractKeyMetrics(story: CareerStory): string[] {
  const sections = story.sections || {};
  const allText = Object.values(sections).map(s => s?.summary || '').join(' ');

  const metricPattern = /(\d+(?:\.\d+)?[%xX]|\$\d+(?:,\d{3})*(?:\.\d+)?[KMB]?|\d+(?:,\d{3})*\s*(?:ms|seconds?|hours?|days?|users?))/gi;
  const matches = allText.match(metricPattern) || [];
  return [...new Set(matches)].slice(0, 3);
}

// Format generatedAt as a week label (e.g. "Week of Feb 3 - Feb 6")
function formatDateLabel(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
    if (isSameMonth(weekStart, weekEnd)) {
      return `Week of ${format(weekStart, 'MMM d')} - ${format(weekEnd, 'd')}`;
    }
    return `Week of ${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d')}`;
  } catch {
    return '';
  }
}

export function StoryCard({ story, isSelected, onClick, onFormatChange }: StoryCardProps) {
  const frameworkInfo = NARRATIVE_FRAMEWORKS[story.framework];
  const dateLabel = story.generatedAt ? formatDateLabel(story.generatedAt) : '';
  const { data: derivations } = useStoryDerivations(story.id);
  const derivationCount = derivations?.length || 0;

  const preview = useMemo(() => getPreviewText(story), [story]);
  const metrics = useMemo(() => extractKeyMetrics(story), [story]);

  // Check if story has actual content (not just metadata)
  const hasContent = useMemo(() => {
    const sections = story.sections || {};
    return Object.values(sections).some(s => s?.summary && s.summary.trim().length > 0);
  }, [story]);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      className={cn(
        'w-full text-left p-4 transition-all duration-150 group cursor-pointer',
        'hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500',
        'border-b border-gray-100 last:border-b-0',
        isSelected && 'bg-primary-50 border-l-2 border-l-primary-500'
      )}
      data-testid={`story-card-${story.id}`}
    >
      {/* Single-line header: Title + meta chips + status + arrow */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <h3 className={cn(
            'text-sm font-semibold truncate',
            isSelected ? 'text-primary-900' : 'text-gray-900'
          )}>
            {story.title}
          </h3>
          {dateLabel && (
            <span className="text-[10px] text-gray-400 whitespace-nowrap flex-shrink-0">{dateLabel}</span>
          )}
        </div>
        <ChevronRight className={cn(
          'w-4 h-4 flex-shrink-0 transition-transform',
          isSelected ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-600',
          'group-hover:translate-x-0.5'
        )} />
      </div>

      {/* Meta row: framework · archetype · status · source coverage — all one line */}
      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2 flex-wrap">
        {onFormatChange ? (
          <FormatChip
            currentFramework={story.framework}
            currentStyle="professional"
            onFormatChange={(framework, style) => onFormatChange(story.id, framework, style)}
          />
        ) : (
          <span className={cn(
            'px-1.5 py-0.5 rounded font-medium text-[11px]',
            isSelected ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'
          )}>
            {frameworkInfo?.label || story.framework}
          </span>
        )}
        {story.archetype && (
          <>
            <span className="text-gray-300">·</span>
            <span className="capitalize text-[11px]">{story.archetype}</span>
          </>
        )}
        {story.groupingMethod && (
          <>
            <span className="text-gray-300">·</span>
            <span className="inline-flex items-center gap-0.5 text-[11px] text-gray-500" title={story.groupingMethod === 'time' ? 'Temporal grouping (weekly)' : story.groupingMethod === 'cluster' ? 'Reference-based grouping' : story.groupingMethod}>
              {story.groupingMethod === 'time' ? (
                <><Calendar className="w-3 h-3" /> weekly</>
              ) : story.groupingMethod === 'cluster' ? (
                <><GitBranch className="w-3 h-3" /> topic</>
              ) : (
                <span className="capitalize">{story.groupingMethod}</span>
              )}
            </span>
          </>
        )}
        <span className="text-gray-300">·</span>
        <StatusBadge isPublished={story.isPublished} needsRegeneration={story.needsRegeneration} hasContent={hasContent} visibility={story.visibility} />
        {story.sourceCoverage && (
          <>
            <span className="text-gray-300">·</span>
            <span className={cn(
              'text-[11px] font-medium',
              story.sourceCoverage.sourced === story.sourceCoverage.total ? 'text-green-600' :
              story.sourceCoverage.sourced > 0 ? 'text-amber-600' : ''
            )}>
              {story.sourceCoverage.sourced}/{story.sourceCoverage.total} sourced
            </span>
          </>
        )}
        {derivationCount > 0 && (
          <>
            <span className="text-gray-300">·</span>
            <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-blue-600">
              <Sparkles className="w-3 h-3" />
              {derivationCount}
            </span>
          </>
        )}
      </div>

      {/* Preview text */}
      {preview && (
        <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed mb-2">
          {preview}
        </p>
      )}

      {/* Key metrics */}
      {metrics.length > 0 && (
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-primary-400" />
          <div className="flex gap-1.5">
            {metrics.map((metric, idx) => (
              <span
                key={idx}
                className="px-1.5 py-0.5 text-[10px] font-semibold bg-primary-50 text-primary-700 rounded"
              >
                {metric}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
