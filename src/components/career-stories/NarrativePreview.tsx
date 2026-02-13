/**
 * NarrativePreview Component
 *
 * Displays career story narratives as a continuous document.
 * Book-like reading experience: text flows, sources are footnotes,
 * no cards within cards.
 *
 * Orchestrator — delegates rendering to:
 *   NarrativeShell (annotation chrome), NarrativeSection,
 *   NarrativeSectionHeader, NarrativeStatusBadge,
 *   SourceFootnotes, PracticeTimer, DeliveryHelpModal
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import {
  ArrowLeft,
  RefreshCw,
  Check,
  Copy,
  Lightbulb,
  CheckCircle2,
  Sparkles,
  Trash2,
  Share2,
  Mic,
  FileText,
  HelpCircle,
  X,
  Type,
  MoreHorizontal,
  AlertTriangle,
  Eye,
  EyeOff,
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
import { SUPPORTED_SOURCES, type ActivitySource } from '../../types/activity';
import { getSourceIcon } from '../journal/source-icons';
import { SourceFootnotes } from './SourceFootnotes';
import { UseAsDropdown, type UseAsTypeKey } from './UseAsDropdown';
import { useStoryDerivations, usePackets } from '../../hooks/useCareerStories';
import { FrameworkSelector } from './FrameworkSelector';
import { useUpdateStorySource } from '../../hooks/useCareerStories';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '../ui/dropdown-menu';
import {
  TIMING,
  NARRATIVE_FRAMEWORKS,
  getStoryStatus,
  capitalizeFirst,
  mapSectionToStarKey,
  extractMetrics,
  estimateSpeakingTime,
  type SectionTiming,
} from './constants';
import { NarrativeSection } from './NarrativeSection';
import { NarrativeSectionHeader } from './NarrativeSectionHeader';
import { NarrativeStatusBadge } from './NarrativeStatusBadge';
import { PracticeTimer } from './PracticeTimer';
import { DeliveryHelpModal } from './DeliveryHelpModal';
import { MarginColumn } from './MarginColumn';
import { SourceMargin } from './SourceMargin';
import { NarrativeShell } from './NarrativeShell';
import { groupSourcesBySection } from './derivation-helpers';

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
  onShareAs?: (initialType?: string) => void;
  onGeneratePacket?: () => void;
  onNavigateToLibraryItem?: (itemId: string) => void;
  onBack?: () => void;
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
  onGeneratePacket,
  onNavigateToLibraryItem,
  onBack,
}: NarrativePreviewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [showCoaching, setShowCoaching] = useState(true);
  const [showDeliveryHelp, setShowDeliveryHelp] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const uniqueSources = useMemo(() => [...new Set(toolTypes)], [toolTypes]);
  const toggleSection = useCallback((key: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updateSourceMutation = useUpdateStorySource();

  const star = result?.star;
  const frameworkMeta = NARRATIVE_FRAMEWORKS[framework];
  const sectionKeys = frameworkMeta?.sections || ['situation', 'task', 'action', 'result'];

  // Group sources by sectionKey (with smart distribution for unmatched keys like 'unassigned')
  const sourcesBySection = useMemo(
    () => groupSourcesBySection(sources, sectionKeys),
    [sources, sectionKeys],
  );

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

  const showMargin = true;
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

  // Helper: get section text for collapsed preview
  const getSectionText = (key: string): string => {
    if (useStorySections && story?.sections?.[key]) {
      return story.sections[key].summary || '';
    } else if (star) {
      const starKey = mapSectionToStarKey(key);
      return star[starKey]?.text || '';
    }
    return '';
  };

  // Loading state
  if (isLoading) {
    return (
      <article className="bg-white" data-testid="star-preview-loading">
        <div className="px-6 pt-6 lg:px-8 lg:pt-8">
          <div className="h-6 w-64 bg-gray-100 rounded animate-pulse" />
          <div className="h-4 w-40 bg-gray-100 rounded animate-pulse mt-3" />
        </div>
        <div className="px-6 lg:px-8 mt-6 space-y-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-4">
              <div className="w-3 h-3 rounded-full bg-gray-200 animate-pulse mt-1.5 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
                <div className="h-4 w-full bg-gray-100 rounded animate-pulse" />
                <div className="h-4 w-full bg-gray-100 rounded animate-pulse" />
                <div className="h-4 w-3/4 bg-gray-100 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </article>
    );
  }

  // Error state
  if (result && !star) {
    return (
      <article className="bg-white" data-testid="star-preview-error">
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
      </article>
    );
  }

  // Placeholder state
  if (!result || !star) {
    return (
      <article className="bg-white" data-testid="star-preview-placeholder">
        <div className="p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a story</h3>
          <p className="text-sm text-gray-500 max-w-xs mx-auto">
            Choose a story from the list to preview and edit your career narrative.
          </p>
        </div>
      </article>
    );
  }

  const storyStatus = getStoryStatus(star.overallConfidence);
  const coverageText = sourceCoverage ? `${sourceCoverage.sourced} of ${sourceCoverage.total} sections sourced` : null;
  const coverageColor = sourceCoverage
    ? sourceCoverage.sourced === sourceCoverage.total ? 'text-emerald-600' : 'text-amber-600'
    : '';

  return (
    <NarrativeShell
      owner={{ type: 'story', id: story?.id ?? '', annotations: story?.annotations ?? [] }}
      className="relative bg-white"
    >
      {(shell) => (
        <>
          {/* Document header */}
          <header className="px-6 pt-3 pb-3 lg:px-8 lg:pt-4">
            {/* Row 1: Back + title */}
            <div className="flex items-start gap-2 min-w-0">
              {onBack && (
                <button
                  onClick={onBack}
                  className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 mt-0.5 flex-shrink-0"
                  title="Back to stories (Esc)"
                  aria-label="Back to stories"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
              <h2 className="text-xl font-semibold text-gray-900 leading-snug tracking-tight flex-1 min-w-0 truncate">{clusterName}</h2>
            </div>

            {/* Row 2: Framework selector + status + meta + actions — wraps on mobile */}
            <div className="flex items-center gap-1 flex-wrap mt-2 text-xs text-gray-400">
              <FrameworkSelector
                value={framework}
                onChange={onFrameworkChange}
                align="left"
              />
              <NarrativeStatusBadge
                status={storyStatus}
                confidence={star.overallConfidence}
                suggestedEdits={star.suggestedEdits}
                sourceCoverage={sourceCoverage}
              />

              {/* Source icon stack */}
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

              {formatDateRange() && (
                <span className="hidden sm:inline">{formatDateRange()}</span>
              )}
              {coverageText && (
                <>
                  <span className="text-gray-300">&middot;</span>
                  <span className={cn(coverageColor)}>{coverageText}</span>
                  <button
                    onClick={() => shell.setShowSourceMargin(!shell.showSourceMargin)}
                    className={cn(
                      'hidden lg:inline-flex items-center p-0.5 rounded transition-colors',
                      shell.showSourceMargin
                        ? 'text-slate-500 hover:bg-slate-50'
                        : 'text-gray-300 hover:text-slate-500 hover:bg-gray-100'
                    )}
                    title={shell.showSourceMargin ? 'Hide sources' : 'Show sources in margin'}
                    aria-label={shell.showSourceMargin ? 'Hide sources' : 'Show sources in margin'}
                  >
                    {shell.showSourceMargin
                      ? <EyeOff className="w-3.5 h-3.5" />
                      : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </>
              )}

              <div className="flex items-center gap-1 ml-auto">
                {story?.id && (
                  <StoryUseAs
                    storyId={story.id}
                    onShareAs={onShareAs}
                    onGeneratePacket={onGeneratePacket}
                    onNavigateToLibraryItem={onNavigateToLibraryItem}
                  />
                )}
                <button
                  onClick={handleCopy}
                  className={cn('p-1.5 rounded transition-colors inline-flex items-center', copied ? 'text-green-500' : 'text-gray-400 hover:bg-gray-100')}
                  title="Copy plain text"
                  aria-label="Copy plain text"
                  data-testid="copy-star"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
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
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuItem onSelect={() => setIsEditing(true)} className="flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5" />
                      Edit story
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={onRegenerate} disabled={isLoading} className="flex items-center gap-2">
                      <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
                      Regenerate
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => setShowCoaching(!showCoaching)} className="flex items-center gap-2">
                      <Lightbulb className={cn('h-3.5 w-3.5', showCoaching && 'text-amber-500')} />
                      {showCoaching ? 'Hide coach review' : 'Coach review'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => shell.setShowEmphasis(!shell.showEmphasis)} className="flex items-center gap-2">
                      <Type className={cn('h-3.5 w-3.5', shell.showEmphasis && 'text-indigo-500')} />
                      {shell.showEmphasis ? 'Hide emphasis' : 'Text emphasis'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => { shell.setPracticeMode(!shell.practiceMode); shell.setTimerActive(false); }} className="flex items-center gap-2">
                      <Mic className={cn('h-3.5 w-3.5', shell.practiceMode && 'text-primary-500')} />
                      {shell.practiceMode ? 'Exit practice' : 'Practice timer'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setShowDeliveryHelp(true)} className="flex items-center gap-2">
                      <HelpCircle className="h-3.5 w-3.5" />
                      Delivery guide
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {story?.isPublished ? (
                      <DropdownMenuItem onSelect={() => onUnpublish?.()} disabled={isPublishing} className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                        Unpublish
                      </DropdownMenuItem>
                    ) : onOpenPublishModal ? (
                      <DropdownMenuItem onSelect={onOpenPublishModal} disabled={isPublishing} className="flex items-center gap-2">
                        <Share2 className="h-3.5 w-3.5" />
                        Publish
                      </DropdownMenuItem>
                    ) : onPublish ? (
                      <DropdownMenuItem onSelect={() => onPublish('private', edits)} disabled={isPublishing} className="flex items-center gap-2">
                        <Share2 className="h-3.5 w-3.5" />
                        Publish
                      </DropdownMenuItem>
                    ) : null}
                    {onDelete && (
                      <DropdownMenuItem onSelect={onDelete} disabled={isDeleting} className="flex items-center gap-2 text-red-600 focus:text-red-600">
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete story
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          {/* Practice Timer */}
          {shell.practiceMode && (
            <div className="px-6 lg:px-8 py-1.5 bg-gray-50/30">
              <PracticeTimer
                totalSeconds={estimatedTime}
                sectionTimings={sectionTimings}
                isActive={shell.timerActive}
                onToggle={() => shell.setTimerActive(!shell.timerActive)}
                onReset={() => shell.setTimerActive(false)}
              />
            </div>
          )}

          <DeliveryHelpModal isOpen={showDeliveryHelp} onClose={() => setShowDeliveryHelp(false)} />

          {/* Narrative Content — continuous flow, timeline spine */}
          <div className="px-6 lg:px-8">
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
                  showMargin={showMargin}
                  marginContent={
                    <MarginColumn
                      {...shell.marginProps}
                      sectionKey={sectionKey}
                    />
                  }
                  showSourceMargin={shell.showSourceMargin}
                  rightMarginContent={
                    <div className={cn(
                      'hidden lg:block flex-shrink-0 pt-1 transition-all duration-200 overflow-hidden',
                      shell.showSourceMargin ? 'w-[180px] pl-3 opacity-100' : 'w-0 opacity-0'
                    )}>
                      {shell.showSourceMargin && (
                        <SourceMargin
                          sources={sectionSources}
                          onExclude={handleExcludeSource}
                          onUndoExclude={handleUndoExclude}
                        />
                      )}
                    </div>
                  }
                  collapsedPreview={getSectionText(sectionKey).slice(0, 120)}
                >
                  {/* Narrative text — flows directly, no card wrapper */}
                  <div data-section-key={sectionKey}>
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
                      showDeliveryCues={shell.practiceMode}
                      showEmphasis={shell.showEmphasis}
                      hideHeader
                      annotations={story?.annotations}
                      onAnnotationClick={shell.annotationHandlers.onAnnotationClick}
                      onDeleteAnnotation={shell.annotationHandlers.onDeleteAnnotation}
                      hoveredAnnotationId={shell.annotationHandlers.hoveredAnnotationId}
                      onHoverAnnotation={shell.annotationHandlers.onHoverAnnotation}
                    />
                  </div>

                  {/* Source footnotes — mobile only */}
                  <div className="lg:hidden">
                    <SourceFootnotes
                      sources={sectionSources}
                      sectionKey={sectionKey}
                      vagueMetrics={
                        sourceCoverage?.vagueMetrics.filter((vm) => vm.sectionKey === sectionKey) || []
                      }
                      onExclude={handleExcludeSource}
                      onUndoExclude={handleUndoExclude}
                      isEditing={isEditing}
                    />
                  </div>
                </NarrativeSectionHeader>
              );
            })}
          </div>

          {/* Footer — conditional, no border */}
          {(result.polishStatus === 'success' || story?.generatedAt || (star?.suggestedEdits?.length ?? 0) > 0 || story?.isPublished) && (
            <footer className="px-6 lg:px-8 py-4 mt-2">
              <div className="flex items-center gap-2 text-[11px] text-gray-400">
                {result.polishStatus === 'success' && (
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    AI-enhanced
                  </span>
                )}
                {story?.generatedAt && (
                  <>
                    {result.polishStatus === 'success' && <span>&middot;</span>}
                    <span>Generated {format(new Date(story.generatedAt), 'MMM d')}</span>
                  </>
                )}
                {(star?.suggestedEdits?.length ?? 0) > 0 && (
                  <>
                    <span>&middot;</span>
                    <span>{star!.suggestedEdits.length} suggestion{star!.suggestedEdits.length > 1 ? 's' : ''} to improve</span>
                  </>
                )}
                {story?.isPublished && (
                  <>
                    <span>&middot;</span>
                    <span className="flex items-center gap-1 text-emerald-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Published
                    </span>
                  </>
                )}
              </div>
            </footer>
          )}
        </>
      )}
    </NarrativeShell>
  );
}

// ---------------------------------------------------------------------------
// StoryUseAs — small wrapper that fetches derivation data and renders UseAsDropdown
// ---------------------------------------------------------------------------

function StoryUseAs({
  storyId,
  onShareAs,
  onGeneratePacket,
  onNavigateToLibraryItem,
}: {
  storyId: string;
  onShareAs?: (initialType?: string) => void;
  onGeneratePacket?: () => void;
  onNavigateToLibraryItem?: (itemId: string) => void;
}) {
  const { data: singleDerivations } = useStoryDerivations(storyId);
  const { data: packets } = usePackets();

  const handleSelect = React.useCallback((typeKey: UseAsTypeKey, kind: 'single' | 'packet', existingId?: string) => {
    if (existingId && onNavigateToLibraryItem) {
      onNavigateToLibraryItem(existingId);
      return;
    }
    if (kind === 'single' && onShareAs) {
      onShareAs(typeKey);
    } else if (kind === 'packet' && onGeneratePacket) {
      onGeneratePacket();
    }
  }, [onShareAs, onGeneratePacket, onNavigateToLibraryItem]);

  return (
    <UseAsDropdown
      scope="story"
      singleDerivations={singleDerivations || []}
      packets={packets || []}
      onSelect={handleSelect}
    />
  );
}
