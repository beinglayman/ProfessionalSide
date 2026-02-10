/**
 * NarrativePreview Component
 *
 * Displays career story narratives with a clean, story-focused design.
 * Built for real-world use: job negotiations, promotions, and 1:1s.
 * Emphasizes readability, narrative flow, and interview preparation.
 *
 * Orchestrator — delegates rendering to:
 *   NarrativeSection, NarrativeSectionHeader, NarrativeStatusBadge,
 *   PracticeTimer, DeliveryHelpModal
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import {
  RefreshCw,
  Check,
  Copy,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  Sparkles,
  Trash2,
  Share2,
  TrendingUp,
  Mic,
  FileText,
  HelpCircle,
  X,
  Type,
  Info,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  STARComponent,
  ToolType,
  GenerateSTARResult,
  NarrativeFramework,
  ToolActivity,
  CareerStory,
  StoryVisibility,
  StorySource,
  SourceCoverage,
} from '../../types/career-stories';
import { SourceList } from './SourceList';
import { NotesPillBar } from './NotesPillBar';
import { DerivationHistory } from './DerivationHistory';
import { useAddStorySource, useUpdateStorySource } from '../../hooks/useCareerStories';
import { ToolIcon } from './ToolIcon';
import { FrameworkSelector } from './FrameworkSelector';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '../ui/dropdown-menu';
import {
  TIMING,
  CONFIDENCE_THRESHOLDS,
  NARRATIVE_FRAMEWORKS,
  getStoryStatus,
  capitalizeFirst,
  mapSectionToStarKey,
  extractMetrics,
  estimateSpeakingTime,
  formatTime,
  type SectionTiming,
} from './constants';
import { NarrativeSection } from './NarrativeSection';
import { NarrativeSectionHeader } from './NarrativeSectionHeader';
import { NarrativeStatusBadge } from './NarrativeStatusBadge';
import { PracticeTimer } from './PracticeTimer';
import { DeliveryHelpModal } from './DeliveryHelpModal';

// =============================================================================
// MAIN COMPONENT
// =============================================================================

interface NarrativePreviewProps {
  clusterName: string;
  activityCount: number;
  dateRange?: { earliest: string; latest: string };
  toolTypes: ToolType[];
  activities?: ToolActivity[];
  result: GenerateSTARResult | null;
  isLoading: boolean;
  polishEnabled: boolean;
  onPolishToggle: (enabled: boolean) => void;
  framework: NarrativeFramework;
  onFrameworkChange: (framework: NarrativeFramework) => void;
  onRegenerate: () => void;
  onSave?: (edits: Record<string, string>) => void;
  story?: CareerStory | null;
  onPublish?: (visibility: StoryVisibility, edits: Record<string, string>) => void;
  onUnpublish?: () => void;
  onVisibilityChange?: (visibility: StoryVisibility) => void;
  onOpenPublishModal?: () => void;
  isSaving?: boolean;
  isPublishing?: boolean;
  onDelete?: () => void;
  isDeleting?: boolean;
  sources?: StorySource[];
  sourceCoverage?: SourceCoverage;
  onShareAs?: () => void;
}

export function NarrativePreview({
  clusterName,
  activityCount,
  dateRange,
  toolTypes,
  activities = [],
  result,
  isLoading,
  polishEnabled,
  onPolishToggle,
  framework,
  onFrameworkChange,
  onRegenerate,
  onSave,
  story,
  onPublish,
  onUnpublish,
  onVisibilityChange,
  onOpenPublishModal,
  isSaving = false,
  isPublishing = false,
  onDelete,
  isDeleting = false,
  sources = [],
  sourceCoverage,
  onShareAs,
}: NarrativePreviewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [practiceMode, setPracticeMode] = useState(false);
  const [timerActive, setTimerActive] = useState(false);
  const [showCoaching, setShowCoaching] = useState(true);
  const [showEmphasis, setShowEmphasis] = useState(true);
  const [showDeliveryHelp, setShowDeliveryHelp] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [noteInputSections, setNoteInputSections] = useState<Set<string>>(new Set());
  const [showInfoPopover, setShowInfoPopover] = useState(false);
  const toggleSection = useCallback((key: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const addSourceMutation = useAddStorySource();
  const updateSourceMutation = useUpdateStorySource();

  // Group sources by sectionKey
  const sourcesBySection = useMemo(() => {
    const map: Record<string, StorySource[]> = {};
    for (const source of sources) {
      if (!map[source.sectionKey]) map[source.sectionKey] = [];
      map[source.sectionKey].push(source);
    }
    return map;
  }, [sources]);

  const handleAddNote = useCallback((sectionKey: string, content: string) => {
    if (story?.id) {
      addSourceMutation.mutate({ storyId: story.id, sectionKey, content });
    }
  }, [story?.id, addSourceMutation]);

  const handleExcludeSource = useCallback((sourceId: string) => {
    if (story?.id) {
      updateSourceMutation.mutate({
        storyId: story.id,
        sourceId,
        excludedAt: new Date().toISOString(),
      });
    }
  }, [story?.id, updateSourceMutation]);

  const handleUndoExclude = useCallback((sourceId: string) => {
    if (story?.id) {
      updateSourceMutation.mutate({
        storyId: story.id,
        sourceId,
        excludedAt: null,
      });
    }
  }, [story?.id, updateSourceMutation]);

  const star = result?.star;
  const frameworkMeta = NARRATIVE_FRAMEWORKS[framework];
  const sectionKeys = frameworkMeta?.sections || ['situation', 'task', 'action', 'result'];
  const useStorySections = story && story.sections && Object.keys(story.sections).length > 0;

  // Extract all text for metrics and timing
  const allText = useMemo(() => {
    const parts: string[] = [];
    for (const key of sectionKeys) {
      if (useStorySections && story?.sections?.[key]) {
        parts.push(story.sections[key].summary || '');
      } else if (star) {
        const starKey = mapSectionToStarKey(key);
        parts.push(star[starKey]?.text || '');
      }
    }
    return parts.join(' ');
  }, [sectionKeys, useStorySections, story, star]);

  const keyMetrics = useMemo(() => extractMetrics(allText), [allText]);
  const estimatedTime = useMemo(() => estimateSpeakingTime(allText), [allText]);

  // Compute section timings for practice mode
  const sectionTimings = useMemo((): SectionTiming[] => {
    const timings: SectionTiming[] = [];
    let totalWords = 0;

    const sectionWordCounts: { key: string; label: string; words: number }[] = [];
    for (const key of sectionKeys) {
      let text = '';
      if (useStorySections && story?.sections?.[key]) {
        text = story.sections[key].summary || '';
      } else if (star) {
        const starKey = mapSectionToStarKey(key);
        text = star[starKey]?.text || '';
      }
      const words = text.trim().split(/\s+/).filter(Boolean).length;
      sectionWordCounts.push({ key, label: capitalizeFirst(key), words });
      totalWords += words;
    }

    if (totalWords > 0) {
      for (const section of sectionWordCounts) {
        const seconds = Math.ceil((section.words / 150) * 60);
        const percentage = Math.round((section.words / totalWords) * 100);
        timings.push({
          key: section.key,
          label: section.label,
          seconds,
          percentage,
        });
      }
    }

    return timings;
  }, [sectionKeys, useStorySections, story, star]);

  // Initialize edits when data changes
  useEffect(() => {
    if (useStorySections && story?.sections) {
      const newEdits: Record<string, string> = {};
      for (const key of sectionKeys) {
        newEdits[key] = story.sections[key]?.summary || '';
      }
      setEdits(newEdits);
    } else if (star) {
      setEdits({
        situation: star.situation.text,
        task: star.task.text,
        action: star.action.text,
        result: star.result.text,
      });
    }
  }, [star, story, useStorySections, sectionKeys.join(',')]);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  const formatDateRange = () => {
    if (!dateRange) return '';
    try {
      const earliest = new Date(dateRange.earliest);
      const latest = new Date(dateRange.latest);
      if (isNaN(earliest.getTime()) || isNaN(latest.getTime())) return '';
      return `${format(earliest, 'MMM d')} - ${format(latest, 'MMM d, yyyy')}`;
    } catch {
      return '';
    }
  };

  const handleCopy = useCallback(async () => {
    if (!star && !story?.sections) return;

    const getSectionContent = (key: string): string => {
      if (useStorySections && story?.sections?.[key]) {
        return story.sections[key].summary || '';
      } else if (star) {
        const starKey = mapSectionToStarKey(key);
        return star[starKey]?.text || '';
      }
      return '';
    };

    const parts: string[] = [];
    for (const key of sectionKeys) {
      const content = getSectionContent(key);
      if (content) parts.push(`${capitalizeFirst(key)}:\n${content}`);
    }
    const textToCopy = parts.join('\n\n');

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setCopied(false), TIMING.COPY_FEEDBACK_MS);
    } catch (err) {
      console.warn('Failed to copy:', err);
    }
  }, [star, story, useStorySections, sectionKeys]);

  const handleSave = () => {
    onSave?.(edits);
    setIsEditing(false);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden" data-testid="star-preview-loading">
        <div className="p-6 border-b border-gray-100">
          <div className="h-5 w-48 bg-gray-100 rounded animate-pulse" />
          <div className="h-4 w-32 bg-gray-100 rounded animate-pulse mt-2" />
        </div>
        <div className="p-6 space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-6 space-y-3">
              <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
              <div className="space-y-2">
                <div className="h-4 w-full bg-gray-100 rounded animate-pulse" />
                <div className="h-4 w-full bg-gray-100 rounded animate-pulse" />
                <div className="h-4 w-3/4 bg-gray-100 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (result && !star) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden" data-testid="star-preview-error">
        <div className="p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-7 w-7 text-amber-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Can't generate story</h3>
          <p className="text-sm text-gray-500 mb-4 max-w-sm mx-auto">
            This entry needs more details to create a meaningful narrative.
          </p>
          {result.failedGates && result.failedGates.length > 0 && (
            <div className="text-sm text-gray-500 mb-4">
              {result.failedGates.map((gate, idx) => (
                <div key={idx}>• {gate}</div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Placeholder state
  if (!result || !star) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden" data-testid="star-preview-placeholder">
        <div className="p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a story</h3>
          <p className="text-sm text-gray-500 max-w-xs mx-auto">
            Choose a story from the list to preview and edit your career narrative.
          </p>
        </div>
      </div>
    );
  }

  const storyStatus = getStoryStatus(star.overallConfidence);

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden" data-testid="star-preview">
      {/* Header — single dense bar: title + badges + stats + toolbar */}
      <div className="px-5 py-3 border-b border-gray-200">
        {/* Row 1: Title + badges + toolbar */}
        <div className="flex items-center gap-2">
          {/* Title */}
          <h2 className="text-base font-semibold text-gray-900 leading-tight truncate">{clusterName}</h2>

          {/* Inline badges + stats — hidden on small screens */}
          <div className="hidden lg:flex items-center gap-1.5 flex-shrink-0">
            {story?.archetype && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-purple-50 text-purple-600 border border-purple-200/60 capitalize">
                {story.archetype}
              </span>
            )}
            <NarrativeStatusBadge
              status={storyStatus}
              confidence={star.overallConfidence}
              suggestedEdits={star.suggestedEdits}
              sourceCoverage={sourceCoverage}
              estimatedTime={estimatedTime}
            />
          </div>

          {/* Mobile: info icon with popover for badges + stats */}
          <div className="lg:hidden relative flex-shrink-0">
            <button
              onClick={() => setShowInfoPopover(!showInfoPopover)}
              className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              aria-label="Story info"
            >
              <Info className="h-3.5 w-3.5" />
            </button>
            {showInfoPopover && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setShowInfoPopover(false)} />
                <div className="absolute top-full left-0 mt-1 z-30 w-64 bg-white rounded-lg shadow-xl border border-gray-200 p-3 space-y-2.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {story?.archetype && (
                      <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-purple-50 text-purple-600 border border-purple-200/60 capitalize">
                        {story.archetype}
                      </span>
                    )}
                    <NarrativeStatusBadge
                      status={storyStatus}
                      confidence={star.overallConfidence}
                      suggestedEdits={star.suggestedEdits}
                    />
                  </div>
                  {keyMetrics.length > 0 && (
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <TrendingUp className="h-3 w-3 text-gray-400" />
                      <span className="font-medium text-gray-600">{keyMetrics.slice(0, 3).join(' · ')}</span>
                    </div>
                  )}
                  {formatDateRange() && (
                    <div className="text-[11px] text-gray-400">{formatDateRange()}</div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Toolbar — right-aligned */}
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {/* Primary: Use this story (Share As) — prominent */}
            {onShareAs && (
              <button
                onClick={onShareAs}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                data-testid="share-as"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Use this story
              </button>
            )}

            {/* Saved derivations dropdown — next to "Use this story" */}
            {story?.id && <DerivationHistory storyId={story.id} />}

            {/* Copy */}
            <button
              onClick={handleCopy}
              className={cn('p-1.5 rounded transition-colors inline-flex items-center', copied ? 'text-green-500' : 'text-gray-400 hover:bg-gray-100')}
              title="Copy plain text"
              aria-label="Copy plain text"
              data-testid="copy-star"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>

            {/* Edit/Save — only visible when actively editing */}
            {isEditing && (
              <>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="p-1.5 rounded bg-primary-100 text-primary-600 inline-flex items-center"
                  title="Save"
                  aria-label="Save"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => setIsEditing(false)} className="p-1.5 rounded text-gray-400 hover:bg-gray-100" title="Cancel" aria-label="Cancel editing">
                  <X className="h-3.5 w-3.5" />
                </button>
              </>
            )}

            <div className="w-px h-4 bg-gray-200 mx-0.5" />

            {/* Framework selector — standalone (has its own dropdown) */}
            <FrameworkSelector
              value={framework}
              onChange={onFrameworkChange}
              disabled={isLoading}
            />

            {/* Regenerate — direct button */}
            <button
              onClick={onRegenerate}
              disabled={isLoading}
              className="p-1.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-50"
              title="Regenerate"
              aria-label="Regenerate"
              data-testid="regenerate-star"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
            </button>

            {/* View toggles — coach, emphasis, practice, delivery guide */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    'p-1.5 rounded transition-colors inline-flex items-center',
                    (showCoaching || showEmphasis || practiceMode)
                      ? 'bg-amber-100 text-amber-600'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                  )}
                  title="View options"
                  aria-label="View options"
                >
                  <Lightbulb className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onSelect={() => setShowCoaching(!showCoaching)}
                  className="flex items-center gap-2"
                >
                  <Lightbulb className={cn('h-3.5 w-3.5', showCoaching && 'text-amber-500')} />
                  {showCoaching ? 'Hide coach review' : 'Coach review'}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => setShowEmphasis(!showEmphasis)}
                  className="flex items-center gap-2"
                >
                  <Type className={cn('h-3.5 w-3.5', showEmphasis && 'text-indigo-500')} />
                  {showEmphasis ? 'Hide emphasis' : 'Text emphasis'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => { setPracticeMode(!practiceMode); setTimerActive(false); }}
                  className="flex items-center gap-2"
                >
                  <Mic className={cn('h-3.5 w-3.5', practiceMode && 'text-primary-500')} />
                  {practiceMode ? 'Exit practice' : 'Practice timer'}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => setShowDeliveryHelp(true)}
                  className="flex items-center gap-2"
                >
                  <HelpCircle className="h-3.5 w-3.5" />
                  Delivery guide
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* More — publish, delete */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="p-1.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 inline-flex items-center"
                  title="More actions"
                  aria-label="More actions"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onSelect={() => setIsEditing(true)}
                  className="flex items-center gap-2"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Edit story
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {story?.isPublished ? (
                  <DropdownMenuItem
                    onSelect={() => onUnpublish?.()}
                    disabled={isPublishing}
                    className="flex items-center gap-2"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                    Unpublish
                  </DropdownMenuItem>
                ) : onOpenPublishModal ? (
                  <DropdownMenuItem
                    onSelect={onOpenPublishModal}
                    disabled={isPublishing}
                    className="flex items-center gap-2"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    Publish
                  </DropdownMenuItem>
                ) : onPublish ? (
                  <DropdownMenuItem
                    onSelect={() => onPublish('private', edits)}
                    disabled={isPublishing}
                    className="flex items-center gap-2"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    Publish
                  </DropdownMenuItem>
                ) : null}
                {onDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onSelect={onDelete}
                      disabled={isDeleting}
                      className="flex items-center gap-2 text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete story
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Practice Timer - compact single line */}
      {practiceMode && (
        <div className="px-4 py-1.5 border-b border-gray-100 bg-gray-50/30">
          <PracticeTimer
            totalSeconds={estimatedTime}
            sectionTimings={sectionTimings}
            isActive={timerActive}
            onToggle={() => setTimerActive(!timerActive)}
            onReset={() => setTimerActive(false)}
          />
        </div>
      )}

      {/* Delivery Help Modal */}
      <DeliveryHelpModal isOpen={showDeliveryHelp} onClose={() => setShowDeliveryHelp(false)} />

      {/* Narrative Content — timeline spine layout */}
      <div className="py-6 px-6">
        {sectionKeys.map((sectionKey, idx) => {
          let component: STARComponent;
          if (useStorySections && story?.sections?.[sectionKey]) {
            const section = story.sections[sectionKey];
            component = {
              text: section.summary || `Details pending...`,
              sources: section.evidence?.map((e) => e.activityId) || [],
              confidence: section.summary ? 0.8 : 0.3,
            };
          } else {
            const starKey = mapSectionToStarKey(sectionKey);
            component = star?.[starKey] || { text: 'Details pending...', sources: [], confidence: 0.3 };
          }

          const sectionSources = sourcesBySection[sectionKey] || [];
          const activeSources = sectionSources.filter(s => !s.excludedAt && s.sourceType !== 'wizard_answer');
          const isSectionCollapsed = collapsedSections.has(sectionKey);

          return (
            <NarrativeSectionHeader
              key={sectionKey}
              sectionKey={sectionKey}
              label={capitalizeFirst(sectionKey)}
              confidence={component.confidence}
              showCoaching={showCoaching}
              sourceCount={activeSources.length}
              isCollapsed={isSectionCollapsed}
              onToggle={() => toggleSection(sectionKey)}
              isLast={idx === sectionKeys.length - 1}
            >
              {/* Content card — two-column on desktop when not editing */}
              <div className={cn(
                'bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden',
                !isEditing && 'grid grid-cols-1 lg:grid-cols-[1fr,280px]',
              )}>
                {/* Left: narrative content + notes pills */}
                <div className="p-5">
                  <NarrativeSection
                    sectionKey={sectionKey}
                    label={capitalizeFirst(sectionKey)}
                    content={component.text}
                    confidence={component.confidence}
                    isEditing={isEditing}
                    editValue={edits[sectionKey] || ''}
                    onEditChange={(v) => setEdits({ ...edits, [sectionKey]: v })}
                    isFirst={idx === 0}
                    showCoaching={showCoaching}
                    showDeliveryCues={practiceMode}
                    showEmphasis={showEmphasis}
                    hideHeader
                  />
                  {!isEditing && (
                    <NotesPillBar
                      notes={sectionSources.filter((s) => s.sourceType === 'user_note')}
                      sectionKey={sectionKey}
                      onAddNote={handleAddNote}
                      onExclude={handleExcludeSource}
                      onUndoExclude={handleUndoExclude}
                      forceShowInput={noteInputSections.has(sectionKey)}
                      onInputClosed={() => setNoteInputSections(prev => {
                        const next = new Set(prev);
                        next.delete(sectionKey);
                        return next;
                      })}
                    />
                  )}
                </div>

                {/* Right: sources panel — always visible on desktop */}
                {!isEditing && (
                  <div className="border-t lg:border-t-0 lg:border-l border-gray-100 bg-gray-50/50">
                    <SourceList
                      sources={sectionSources}
                      sectionKey={sectionKey}
                      vagueMetrics={
                        sourceCoverage?.vagueMetrics.filter((vm) => vm.sectionKey === sectionKey) || []
                      }
                      onExclude={handleExcludeSource}
                      onUndoExclude={handleUndoExclude}
                      onAddNote={handleAddNote}
                      onRequestAddNote={() => setNoteInputSections(prev => new Set(prev).add(sectionKey))}
                    />
                  </div>
                )}
              </div>
            </NarrativeSectionHeader>
          );
        })}
      </div>


      {/* Footer */}
      {(star?.suggestedEdits?.length > 0 || result.polishStatus === 'success') && (
        <div className="px-6 py-3 border-t border-gray-100">
          <div className="flex items-center justify-between text-[11px] text-gray-400">
            {result.polishStatus === 'success' && (
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-primary-400" />
                AI-enhanced narrative
              </span>
            )}
            {star?.suggestedEdits?.length > 0 && (
              <span className="flex items-center gap-1.5 text-amber-500">
                <Lightbulb className="h-3 w-3" />
                {star.suggestedEdits.length} suggestion{star.suggestedEdits.length > 1 ? 's' : ''} to improve
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
