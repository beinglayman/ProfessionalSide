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
import { SUPPORTED_SOURCES, ActivitySource } from '../../types/activity';
import { getSourceIcon } from '../journal/source-icons';
import { NARRATIVE_FRAMEWORKS, BRAG_DOC_CATEGORIES } from './constants';
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

  // Collect unique source tool types from story sources
  const uniqueSources = useMemo(() => {
    if (!story.sources || story.sources.length === 0) return [];
    const sourceMap = new Map<string, number>();
    for (const s of story.sources) {
      if (s.toolType && !s.excludedAt) {
        sourceMap.set(s.toolType, (sourceMap.get(s.toolType) || 0) + 1);
      }
    }
    return Array.from(sourceMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([tool]) => tool);
  }, [story.sources]);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      className={cn(
        'w-full text-left p-4 sm:p-5 transition-all duration-150 group cursor-pointer rounded-2xl border',
        'focus:outline-none focus:ring-2 focus:ring-purple-500',
        isSelected
          ? 'bg-purple-50/50 border-purple-300 shadow-md ring-1 ring-purple-100'
          : 'bg-white border-gray-200 hover:border-purple-200 hover:shadow-md'
      )}
      data-testid={`story-card-${story.id}`}
    >
      {/* Top row: source icon stack + date + status + chevron */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          {uniqueSources.length > 0 && (
            <div className="flex items-center -space-x-1.5">
              {uniqueSources.slice(0, 4).map((tool, i) => {
                const Icon = getSourceIcon(tool);
                const info = SUPPORTED_SOURCES[tool as ActivitySource];
                return (
                  <span
                    key={tool}
                    title={info?.displayName || tool}
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
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge isPublished={story.isPublished} needsRegeneration={story.needsRegeneration} hasContent={hasContent} visibility={story.visibility} />
          <ChevronRight className={cn(
            'w-4 h-4 flex-shrink-0 transition-transform text-gray-400 group-hover:text-gray-600',
            'group-hover:translate-x-0.5'
          )} />
        </div>
      </div>

      {/* Title */}
      <h3 className={cn(
        'text-base sm:text-lg font-bold leading-snug mb-1.5',
        isSelected ? 'text-purple-900' : 'text-gray-900'
      )}>
        {story.title}
      </h3>

      {/* Preview text */}
      {preview && (
        <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed mb-3">
          {preview}
        </p>
      )}

      {/* Bottom row: framework chip + meta + metrics */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs text-gray-500 flex-wrap min-w-0">
          {onFormatChange ? (
            <FormatChip
              currentFramework={story.framework}
              currentStyle="professional"
              onFormatChange={(framework, style) => onFormatChange(story.id, framework, style)}
            />
          ) : (
            <span className={cn(
              'px-1.5 py-0.5 rounded-md font-medium text-[11px]',
              isSelected ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
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
        {metrics.length > 0 && (
          <div className="flex gap-1.5 flex-shrink-0">
            {metrics.map((metric, idx) => (
              <span
                key={idx}
                className="px-1.5 py-0.5 text-[10px] font-semibold bg-purple-50 text-purple-700 rounded-md"
              >
                {metric}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
