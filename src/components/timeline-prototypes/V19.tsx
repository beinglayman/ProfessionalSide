'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import {
  mockTemporalGroups, mockDraftStories, mockActivities, SOURCE_META,
  getActivitiesForDraft, draftActivityMap, activityDraftMap,
  type ActivitySource, type MockDraftStory, type MockActivity, type TemporalGroup,
} from './mock-data';
import {
  GitBranch, KanbanSquare, Hash, FileText, Figma, Video,
  Cloud, X, Eye, Tag, ArrowUpRight, Sparkles, Clock,
} from 'lucide-react';

// Utilities

const timeAgo = (ts: string) => {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const formatDateRange = (start: string, end: string): string => {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${new Date(start).toLocaleDateString('en-US', opts)} \u2013 ${new Date(end).toLocaleDateString('en-US', opts)}`;
};

function SourceIcon({ source, className }: { source: ActivitySource; className?: string }) {
  const icons: Record<ActivitySource, React.ReactNode> = {
    github: <GitBranch className={className} />,
    jira: <KanbanSquare className={className} />,
    slack: <Hash className={className} />,
    confluence: <FileText className={className} />,
    figma: <Figma className={className} />,
    'google-meet': <Video className={className} />,
  };
  return <>{icons[source]}</>;
}

const ALL_SOURCES: ActivitySource[] = ['github', 'jira', 'slack', 'confluence', 'figma', 'google-meet'];

type TagKind = 'source' | 'topic' | 'temporal';

interface CloudTag {
  id: string;
  label: string;
  kind: TagKind;
  count: number;
  color: string;        // hex for source, tailwind-friendly string for others
  sourceKey?: ActivitySource;
  temporalKey?: string;
}

function buildTags(): CloudTag[] {
  const tags: CloudTag[] = [];
  // Source tags
  const sourceCounts: Record<string, number> = {};
  for (const a of mockActivities) sourceCounts[a.source] = (sourceCounts[a.source] || 0) + 1;
  for (const src of ALL_SOURCES) {
    if (sourceCounts[src]) {
      tags.push({ id: `src-${src}`, label: SOURCE_META[src].name, kind: 'source',
        count: sourceCounts[src], color: SOURCE_META[src].color, sourceKey: src });
    }
  }
  // Topic tags (from mockDraftStories.topics, deduplicated)
  const topicCounts: Record<string, number> = {};
  for (const draft of mockDraftStories) {
    for (const topic of draft.topics) topicCounts[topic] = (topicCounts[topic] || 0) + 1;
  }
  for (const [topic, count] of Object.entries(topicCounts)) {
    tags.push({ id: `topic-${topic}`, label: topic, kind: 'topic', count, color: '#7C3AED' });
  }
  // Temporal tags
  for (const tg of mockTemporalGroups) {
    tags.push({ id: `time-${tg.key}`, label: tg.label, kind: 'temporal',
      count: tg.activities.length, color: '#6B7280', temporalKey: tg.key });
  }
  // Interleave for a "cloud" feel: deterministic shuffle by mixing kinds
  const sources = tags.filter(t => t.kind === 'source');
  const topics = tags.filter(t => t.kind === 'topic');
  const temporals = tags.filter(t => t.kind === 'temporal');
  const mixed: CloudTag[] = [];
  const maxLen = Math.max(sources.length, topics.length, temporals.length);
  for (let i = 0; i < maxLen; i++) {
    if (i < topics.length) mixed.push(topics[i]);
    if (i < sources.length) mixed.push(sources[i]);
    if (i < temporals.length) mixed.push(temporals[i]);
  }

  return mixed;
}

const tagSizeClass = (count: number) =>
  count >= 7 ? 'text-xl' : count >= 5 ? 'text-lg' : count >= 3 ? 'text-base' : 'text-sm';

const tagPadding = (count: number) =>
  count >= 7 ? 'px-4 py-2' : count >= 5 ? 'px-3.5 py-1.5' : count >= 3 ? 'px-3 py-1.5' : 'px-2.5 py-1';

// Sub-components

function TagChip({
  tag,
  isSelected,
  isHovered,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: {
  tag: CloudTag;
  isSelected: boolean;
  isHovered: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const sizeClass = tagSizeClass(tag.count);
  const padding = tagPadding(tag.count);

  let bgStyle: React.CSSProperties = {};
  let textColor = '';

  const c = tag.kind === 'source' ? tag.color : tag.kind === 'topic' ? '#7C3AED' : '#6B7280';
  bgStyle = {
    backgroundColor: isSelected ? `${c}20` : isHovered ? `${c}14` : `${c}0A`,
    borderColor: isSelected ? c : isHovered ? `${c}60` : 'transparent',
  };
  if (tag.kind === 'source') textColor = isSelected ? 'text-gray-900' : 'text-gray-700';
  else if (tag.kind === 'topic') textColor = isSelected ? 'text-purple-800' : 'text-purple-700';
  else textColor = isSelected ? 'text-gray-800' : 'text-gray-600';

  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn(
        'relative inline-flex items-center gap-1.5 rounded-full border-2 font-medium cursor-pointer',
        'transition-all duration-200 hover:scale-105 active:scale-95',
        sizeClass,
        padding,
        textColor,
        isSelected && 'shadow-md ring-1 ring-black/5',
      )}
      style={bgStyle}
    >
      {/* Kind indicator */}
      {tag.kind === 'source' && tag.sourceKey && (
        <SourceIcon source={tag.sourceKey} className="w-3.5 h-3.5 shrink-0 opacity-70" />
      )}
      {tag.kind === 'temporal' && (
        <Clock className="w-3 h-3 shrink-0 opacity-50" />
      )}

      <span>{tag.label}</span>

      {/* Hover count preview */}
      {isHovered && !isSelected && (
        <span className="ml-1 text-[10px] opacity-60 font-normal">
          ({tag.count})
        </span>
      )}

      {/* Selected indicator dot */}
      {isSelected && (
        <span
          className="w-1.5 h-1.5 rounded-full ml-0.5 shrink-0"
          style={{ backgroundColor: tag.color }}
        />
      )}
    </button>
  );
}

function ActivityRow({
  activity,
  isHighlighted,
}: {
  activity: MockActivity;
  isHighlighted?: boolean;
}) {
  const meta = SOURCE_META[activity.source];
  return (
    <div
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
        isHighlighted
          ? 'bg-purple-50/60 ring-1 ring-purple-200'
          : 'hover:bg-gray-50',
      )}
    >
      <div
        className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${meta.color}15` }}
      >
        <SourceIcon source={activity.source} className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-800 font-medium truncate leading-snug">
          {activity.title}
        </p>
      </div>
      <span className="text-[11px] text-gray-400 whitespace-nowrap shrink-0">
        {timeAgo(activity.timestamp)}
      </span>
    </div>
  );
}

function DraftCard({
  draft,
  isSelected,
  onClick,
}: {
  draft: MockDraftStory;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <Card
      className={cn(
        'cursor-pointer transition-all duration-200 shrink-0 w-72',
        isSelected
          ? 'shadow-lg ring-2 ring-purple-400 border-purple-300'
          : 'shadow-sm hover:shadow-md hover:border-gray-300',
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Badge
            className={cn(
              'text-[10px] px-2 py-0 h-4 border-none font-bold',
              draft.dominantRole === 'Led' && 'bg-purple-100 text-purple-700',
              draft.dominantRole === 'Contributed' && 'bg-blue-100 text-blue-700',
              draft.dominantRole === 'Participated' && 'bg-green-100 text-green-700',
            )}
          >
            {draft.dominantRole}
          </Badge>
          <span className="text-[11px] text-gray-400">
            {formatDateRange(draft.dateRange.start, draft.dateRange.end)}
          </span>
        </div>
        <h4 className="text-sm font-bold text-gray-900 leading-snug mb-2 line-clamp-2">
          {draft.title}
        </h4>
        <div className="flex flex-wrap gap-1 mb-2">
          {draft.topics.slice(0, 3).map(topic => (
            <span
              key={topic}
              className="px-2 py-0.5 bg-purple-50 text-purple-600 text-[10px] rounded-full font-medium"
            >
              {topic}
            </span>
          ))}
          {draft.topics.length > 3 && (
            <span className="text-[10px] text-gray-400 py-0.5">
              +{draft.topics.length - 3}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {draft.tools.map(tool => (
            <div
              key={tool}
              className="w-5 h-5 rounded flex items-center justify-center"
              style={{ backgroundColor: `${SOURCE_META[tool].color}12` }}
            >
              <SourceIcon source={tool} className="w-2.5 h-2.5" />
            </div>
          ))}
          <span className="text-[10px] text-gray-400 ml-auto">
            {draft.activityCount} activities
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// Main component

export function TimelineV19() {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [hoveredTag, setHoveredTag] = useState<string | null>(null);

  // Build all tags
  const allTags = useMemo(() => buildTags(), []);

  // Pre-compute draft activities
  const draftActivitiesMap = useMemo(() => {
    const map: Record<string, MockActivity[]> = {};
    for (const draft of mockDraftStories) {
      map[draft.id] = getActivitiesForDraft(draft);
    }
    return map;
  }, []);

  // Current selected tag object
  const activeTag = useMemo(
    () => allTags.find(t => t.id === selectedTag) ?? null,
    [allTags, selectedTag],
  );

  // Filtered activities for right panel
  const filteredActivities = useMemo(() => {
    // If a draft is selected, show its contributing activities
    if (selectedDraftId) {
      const draft = mockDraftStories.find(d => d.id === selectedDraftId);
      if (draft) return getActivitiesForDraft(draft);
    }

    // If a tag is selected, filter based on tag kind
    if (activeTag) {
      if (activeTag.kind === 'source' && activeTag.sourceKey) {
        return mockActivities.filter(a => a.source === activeTag.sourceKey);
      }
      if (activeTag.kind === 'topic') {
        // Get drafts with this topic, then get all their activities
        const draftsWithTopic = mockDraftStories.filter(d =>
          d.topics.includes(activeTag.label)
        );
        const activityIds = new Set<string>();
        for (const draft of draftsWithTopic) {
          for (const a of getActivitiesForDraft(draft)) {
            activityIds.add(a.id);
          }
        }
        return mockActivities.filter(a => activityIds.has(a.id));
      }
      if (activeTag.kind === 'temporal' && activeTag.temporalKey) {
        const group = mockTemporalGroups.find(g => g.key === activeTag.temporalKey);
        return group ? group.activities : [];
      }
    }

    // No filter: all activities sorted by time (most recent first)
    return [...mockActivities].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [activeTag, selectedDraftId]);

  // Drafts filtered by topic tag
  const filteredDrafts = useMemo(() => {
    if (activeTag?.kind === 'topic') {
      return mockDraftStories.filter(d => d.topics.includes(activeTag.label));
    }
    return null;
  }, [activeTag]);

  // Selected draft object
  const selectedDraft = useMemo(
    () => mockDraftStories.find(d => d.id === selectedDraftId) ?? null,
    [selectedDraftId],
  );

  // Handle tag click
  const handleTagClick = (tagId: string) => {
    setSelectedDraftId(null);
    setSelectedTag(prev => (prev === tagId ? null : tagId));
  };

  // Handle draft click
  const handleDraftClick = (draftId: string) => {
    setSelectedTag(null);
    setSelectedDraftId(prev => (prev === draftId ? null : draftId));
  };

  // Clear all filters
  const clearFilter = () => {
    setSelectedTag(null);
    setSelectedDraftId(null);
  };

  const hasFilter = selectedTag !== null || selectedDraftId !== null;

  // Right panel title
  const panelTitle = useMemo(() => {
    if (selectedDraft) return selectedDraft.title;
    if (activeTag) return `${activeTag.label} (${filteredActivities.length})`;
    return `All Activities (${filteredActivities.length})`;
  }, [selectedDraft, activeTag, filteredActivities.length]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center">
              <Cloud className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Tag Cloud</h1>
              <p className="text-sm text-gray-500">
                Interactive word cloud from {allTags.length} tags across sources, topics, and timeframes
              </p>
            </div>
          </div>
        </div>

        {/* Two-panel layout: left 60% cloud, right 40% activity list */}
        <div className="flex gap-5 items-start">
          {/* Left panel: Tag Cloud */}
          <div className="w-[60%] shrink-0">
            <Card className="shadow-sm">
              <CardContent className="p-6">
                {/* Legend */}
                <div className="flex items-center gap-4 mb-5 pb-4 border-b border-gray-100">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tags</span>
                  <div className="flex items-center gap-3 ml-auto">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-gray-800" />
                      <span className="text-[11px] text-gray-500">Source</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
                      <span className="text-[11px] text-gray-500">Topic</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-gray-400" />
                      <span className="text-[11px] text-gray-500">Time</span>
                    </div>
                  </div>
                </div>

                {/* Tag Cloud */}
                <div className="flex flex-wrap gap-2.5 items-center justify-center min-h-[280px] py-4">
                  {allTags.map(tag => (
                    <TagChip
                      key={tag.id}
                      tag={tag}
                      isSelected={selectedTag === tag.id}
                      isHovered={hoveredTag === tag.id}
                      onClick={() => handleTagClick(tag.id)}
                      onMouseEnter={() => setHoveredTag(tag.id)}
                      onMouseLeave={() => setHoveredTag(null)}
                    />
                  ))}
                </div>

                {/* Hover preview tooltip */}
                {hoveredTag && !selectedTag && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    {(() => {
                      const tag = allTags.find(t => t.id === hoveredTag);
                      if (!tag) return null;
                      return (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Eye className="w-3.5 h-3.5 text-gray-400" />
                          <span>
                            <span className="font-medium text-gray-700">{tag.label}</span>
                            {' '}&mdash;{' '}
                            {tag.kind === 'source' && `${tag.count} activities from this source`}
                            {tag.kind === 'topic' && `${tag.count} draft${tag.count > 1 ? 's' : ''} with this topic`}
                            {tag.kind === 'temporal' && `${tag.count} activities in this period`}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Active filter indicator */}
                {hasFilter && (
                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <Tag className="w-3.5 h-3.5 text-purple-500" />
                      <span>
                        Filtering by{' '}
                        <span className="font-semibold">
                          {activeTag?.label ?? selectedDraft?.title ?? ''}
                        </span>
                      </span>
                    </div>
                    <button
                      onClick={clearFilter}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium',
                        'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800',
                        'transition-colors',
                      )}
                    >
                      <X className="w-3 h-3" />
                      Clear filter
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right panel: Filtered activity list */}
          <div className="w-[40%] shrink-0">
            <Card className="shadow-sm">
              <CardContent className="p-0">
                {/* Panel header */}
                <div className="px-5 py-4 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-gray-800 truncate pr-2">
                      {panelTitle}
                    </h2>
                    <Badge variant="secondary" className="text-[11px] font-medium shrink-0">
                      {filteredActivities.length}
                    </Badge>
                  </div>
                  {/* Draft detail description */}
                  {selectedDraft && (
                    <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                      {selectedDraft.description}
                    </p>
                  )}
                  {/* Topic tags when topic is selected */}
                  {filteredDrafts && filteredDrafts.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {filteredDrafts.map(d => (
                        <button
                          key={d.id}
                          onClick={() => handleDraftClick(d.id)}
                          className={cn(
                            'text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors',
                            selectedDraftId === d.id
                              ? 'bg-purple-200 text-purple-800'
                              : 'bg-purple-50 text-purple-600 hover:bg-purple-100',
                          )}
                        >
                          {d.title.length > 30 ? `${d.title.slice(0, 30)}...` : d.title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Activity list */}
                <div className="max-h-[500px] overflow-y-auto px-2 py-2 space-y-0.5">
                  {filteredActivities.length === 0 ? (
                    <div className="py-12 text-center text-sm text-gray-400">
                      No activities match this filter.
                    </div>
                  ) : (
                    filteredActivities.map(activity => (
                      <ActivityRow
                        key={activity.id}
                        activity={activity}
                        isHighlighted={
                          selectedDraftId
                            ? (activityDraftMap[activity.id] || []).includes(selectedDraftId)
                            : false
                        }
                      />
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Draft summary strip below panels */}
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-purple-500" />
            <h3 className="text-sm font-bold text-gray-700">Draft Stories</h3>
            <span className="text-xs text-gray-400">
              Click to view contributing activities
            </span>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {mockDraftStories.map(draft => (
              <DraftCard
                key={draft.id}
                draft={draft}
                isSelected={selectedDraftId === draft.id}
                onClick={() => handleDraftClick(draft.id)}
              />
            ))}
          </div>
        </div>

        {/* Footer stats */}
        <div className="mt-8 flex items-center justify-center gap-6 text-xs text-gray-400">
          <span>{mockActivities.length} total activities</span>
          <span className="w-px h-3 bg-gray-200" />
          <span>{allTags.length} tags</span>
          <span className="w-px h-3 bg-gray-200" />
          <span>{mockDraftStories.length} draft stories</span>
          <span className="w-px h-3 bg-gray-200" />
          <span>{Object.keys(SOURCE_META).length} sources</span>
        </div>
      </div>
    </div>
  );
}
