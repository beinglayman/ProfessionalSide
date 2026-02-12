import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { ArrowLeft, Copy, Check, MoreHorizontal, Trash2, RefreshCw, Info, ExternalLink, Type, Mic } from 'lucide-react';
import { format } from 'date-fns';
import { cn, formatRelativeTime } from '../../lib/utils';
import { getItemMeta } from './LibraryCard';
import { DerivationPreview } from './DerivationPreview';
import { SimpleMarkdown } from '../ui/simple-markdown';
import { ToolIcon } from './ToolIcon';
import { ConfirmationDialog } from '../ui/confirmation-dialog';
import { getSourceIcon } from '../journal/source-icons';
import { SUPPORTED_SOURCES, type ActivitySource } from '../../types/activity';
import { DERIVATION_COLOR_CLASSES, capitalizeFirst } from './constants';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '../ui/dropdown-menu';
import type { StoryDerivation, CareerStory, DerivationType, StorySource, ToolType } from '../../types/career-stories';
import { useDerivationAnnotations } from '../../hooks/useCareerStories';
import { NarrativeShell } from './NarrativeShell';
import { NarrativeSectionHeader } from './NarrativeSectionHeader';
import { MarginColumn } from './MarginColumn';
import { AnnotatedText } from './AnnotatedText';
import { PracticeTimer } from './PracticeTimer';

// =============================================================================
// HELPERS
// =============================================================================

function resolveSourceStories(item: StoryDerivation, allStories: CareerStory[]): { id: string; title: string }[] {
  if (item.storySnapshots && item.storySnapshots.length > 0) {
    return item.storySnapshots.map(s => ({ id: s.storyId, title: s.title }));
  }
  return item.storyIds
    .map(id => {
      const story = allStories.find(s => s.id === id);
      return story ? { id: story.id, title: story.title } : null;
    })
    .filter((s): s is { id: string; title: string } => s !== null);
}

// =============================================================================
// COMPONENT
// =============================================================================

interface LibraryDetailProps {
  item: StoryDerivation;
  allStories: CareerStory[];
  onBack: () => void;
  onDelete: (id: string) => void;
  onRegenerate: (item: StoryDerivation) => void;
  onNavigateToStory: (storyId: string) => void;
}

export function LibraryDetail({ item, allStories, onBack, onDelete, onRegenerate, onNavigateToStory }: LibraryDetailProps) {
  const [copied, setCopied] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const backButtonRef = useRef<HTMLButtonElement>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Fetch annotations for this derivation
  const { data: annotations = [] } = useDerivationAnnotations(item.id);

  useEffect(() => {
    backButtonRef.current?.focus();
  }, [item.id]);

  useEffect(() => {
    return () => { clearTimeout(copyTimeoutRef.current); };
  }, []);

  const meta = getItemMeta(item);
  const { label, Icon, color } = meta;
  const colorClasses = DERIVATION_COLOR_CLASSES[color] || DERIVATION_COLOR_CLASSES.gray;
  const sourceStories = resolveSourceStories(item, allStories);

  // Resolve parent story sources
  const parentSources = useMemo(() => {
    const sources: StorySource[] = [];
    const seen = new Set<string>();
    for (const sid of item.storyIds) {
      const story = allStories.find(s => s.id === sid);
      if (!story?.sources) continue;
      for (const src of story.sources) {
        if (src.excludedAt || seen.has(src.id)) continue;
        seen.add(src.id);
        sources.push(src);
      }
    }
    return sources;
  }, [item.storyIds, allStories]);

  // Unique tool types for provenance icon stack
  const uniqueTools = useMemo(() => {
    const tools = new Set<string>();
    for (const src of parentSources) {
      if (src.toolType) tools.add(src.toolType);
    }
    return [...tools].slice(0, 4);
  }, [parentSources]);

  // Activity sources only (for margin / footnotes)
  const activitySources = useMemo(
    () => parentSources.filter(s => s.sourceType === 'activity'),
    [parentSources]
  );

  // Practice timer: single section timing
  const estimatedTime = useMemo(() => Math.ceil((item.wordCount / 150) * 60), [item.wordCount]);
  const sectionTimings = useMemo(() => [{
    key: 'content',
    label: capitalizeFirst(item.type),
    seconds: estimatedTime,
    percentage: 100,
  }], [item.type, estimatedTime]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(item.text);
      setCopied(true);
      clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = item.text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setCopied(true);
        clearTimeout(copyTimeoutRef.current);
        copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
      } catch {
        console.warn('Failed to copy to clipboard');
      }
    }
  }, [item.text]);

  const handleDelete = useCallback(() => {
    onDelete(item.id);
  }, [item.id, onDelete]);

  return (
    <div className="flex flex-col h-full">
      {/* Back link — above the document card */}
      <button
        ref={backButtonRef}
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-800 mb-3 focus:outline-none focus:underline"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to library
      </button>

      {/* Document card — wrapped in NarrativeShell for annotation support */}
      <NarrativeShell
        owner={{ type: 'derivation', id: item.id, annotations }}
        className="relative bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden flex-1 flex flex-col"
      >
        {(shell) => (
          <>
            {/* Header */}
            <header className="px-6 pt-4 pb-3">
              {/* Row 1: Title + type badge + actions */}
              <div className="flex items-start gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium', colorClasses.bg, colorClasses.text)}>
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </span>
                </div>

                {/* Actions — right side */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={handleCopy}
                    className={cn('p-1.5 rounded transition-colors inline-flex items-center', copied ? 'text-green-500' : 'text-gray-400 hover:bg-gray-100')}
                    title={copied ? 'Copied' : 'Copy plain text'}
                    aria-label={copied ? 'Copied to clipboard' : 'Copy to clipboard'}
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>

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
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => onRegenerate(item)}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Regenerate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onSelect={() => shell.setShowEmphasis(!shell.showEmphasis)}
                        className="flex items-center gap-2"
                      >
                        <Type className={cn('h-3.5 w-3.5', shell.showEmphasis && 'text-indigo-500')} />
                        {shell.showEmphasis ? 'Hide emphasis' : 'Text emphasis'}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => { shell.setPracticeMode(!shell.practiceMode); shell.setTimerActive(false); }}
                        className="flex items-center gap-2"
                      >
                        <Mic className={cn('h-3.5 w-3.5', shell.practiceMode && 'text-primary-500')} />
                        {shell.practiceMode ? 'Exit practice' : 'Practice timer'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-600 focus:text-red-600 focus:bg-red-50"
                        onSelect={() => setShowDeleteConfirm(true)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Row 2: Provenance line */}
              <div className="mt-1.5 flex items-center gap-2 text-xs text-gray-400 flex-wrap">
                {/* Source icon stack */}
                {uniqueTools.length > 0 && (
                  <div className="flex items-center -space-x-1.5">
                    {uniqueTools.map((tool, i) => {
                      const ToolIconComponent = getSourceIcon(tool);
                      const info = SUPPORTED_SOURCES[tool as ActivitySource];
                      return (
                        <span
                          key={tool}
                          title={info?.displayName || tool}
                          className="flex items-center justify-center w-7 h-7 rounded-full bg-white border-2 border-white shadow-sm ring-1 ring-gray-200/80"
                          style={{ zIndex: uniqueTools.length - i }}
                        >
                          <ToolIconComponent className="w-3.5 h-3.5" style={{ color: info?.color }} />
                        </span>
                      );
                    })}
                  </div>
                )}

                <span>{item.wordCount} words</span>
                <span className="text-gray-300">&middot;</span>
                <span>{formatRelativeTime(item.createdAt)}</span>

                {/* Source stories */}
                {sourceStories.length > 0 && (
                  <>
                    <span className="text-gray-300">&middot;</span>
                    <span className="flex items-center gap-1 flex-wrap">
                      <span>from</span>
                      {sourceStories.map((story, i) => (
                        <React.Fragment key={story.id}>
                          {i > 0 && <span>,</span>}
                          <button
                            onClick={() => onNavigateToStory(story.id)}
                            className="text-purple-500 hover:text-purple-700 hover:underline focus:outline-none focus:underline"
                          >
                            {story.title}
                          </button>
                        </React.Fragment>
                      ))}
                    </span>
                  </>
                )}

                {/* Tone badge */}
                {item.tone && (
                  <>
                    <span className="text-gray-300">&middot;</span>
                    <span className="px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-medium">{item.tone}</span>
                  </>
                )}

                {/* Custom prompt indicator */}
                {item.customPrompt && (
                  <span title={`Custom prompt: ${item.customPrompt}`} className="text-gray-300 cursor-help">
                    <Info className="w-3 h-3 inline" />
                  </span>
                )}
              </div>
            </header>

            {/* Practice Timer */}
            {shell.practiceMode && (
              <div className="px-6 py-1.5 bg-gray-50/30">
                <PracticeTimer
                  totalSeconds={estimatedTime}
                  sectionTimings={sectionTimings}
                  isActive={shell.timerActive}
                  onToggle={() => shell.setTimerActive(!shell.timerActive)}
                  onReset={() => shell.setTimerActive(false)}
                />
              </div>
            )}

            {/* Content area — single section with timeline spine, margin, and source margin */}
            <div className="px-6 pb-4 flex-1 overflow-y-auto">
              <NarrativeSectionHeader
                sectionKey="content"
                label={capitalizeFirst(item.type)}
                confidence={0.8}
                isCollapsed={false}
                onToggle={() => {}}
                isLast={true}
                showMargin={true}
                marginContent={
                  <MarginColumn
                    {...shell.marginProps}
                    sectionKey="content"
                  />
                }
                rightMarginContent={
                  activitySources.length > 0 ? (
                    <div className="hidden lg:block flex-shrink-0 w-[180px] pl-3 pt-1">
                      <div className="flex flex-col gap-1.5 border-l border-slate-200 pl-2">
                        {activitySources.map((source) => (
                          <span
                            key={source.id}
                            className="group/source inline-flex items-center gap-1 text-[11px] text-gray-400 leading-snug"
                          >
                            <ToolIcon tool={(source.toolType || 'generic') as ToolType} className="w-3.5 h-3.5 flex-shrink-0" />
                            {source.url ? (
                              <a
                                href={source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="truncate hover:text-blue-600 transition-colors"
                              >
                                {source.label}
                              </a>
                            ) : (
                              <span className="truncate">{source.label}</span>
                            )}
                            {source.url && (
                              <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover/source:opacity-60 flex-shrink-0" />
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : undefined
                }
              >
                {/* Derivation content with annotation support */}
                <div data-section-key="content">
                  {item.kind === 'single' ? (
                    <div className="relative">
                      <AnnotatedText
                        text={item.text}
                        annotations={annotations}
                        sectionKey="content"
                        showEmphasis={shell.showEmphasis}
                        onAnnotationClick={shell.annotationHandlers.onAnnotationClick}
                        onDeleteAnnotation={shell.annotationHandlers.onDeleteAnnotation}
                        hoveredAnnotationId={shell.annotationHandlers.hoveredAnnotationId}
                        onHoverAnnotation={shell.annotationHandlers.onHoverAnnotation}
                        className="text-sm leading-relaxed text-gray-800 whitespace-pre-wrap"
                      />
                    </div>
                  ) : (
                    <div className="bg-white rounded-lg border border-gray-200 px-5 py-4">
                      <SimpleMarkdown content={item.text} />
                    </div>
                  )}
                </div>
              </NarrativeSectionHeader>

              {/* Source footnotes — mobile only */}
              {activitySources.length > 0 && (
                <div className="lg:hidden mt-3">
                  <div className="border-t border-gray-100 pt-2">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      {activitySources.slice(0, 5).map((source) => (
                        <span
                          key={source.id}
                          className="inline-flex items-center gap-1 text-[11px] text-gray-400 leading-relaxed"
                        >
                          <ToolIcon tool={(source.toolType || 'generic') as ToolType} className="w-3 h-3 flex-shrink-0 opacity-60" />
                          {source.url ? (
                            <a
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="truncate max-w-[200px] hover:text-blue-600 transition-colors"
                            >
                              {source.label}
                            </a>
                          ) : (
                            <span className="truncate max-w-[200px]">{source.label}</span>
                          )}
                        </span>
                      ))}
                      {activitySources.length > 5 && (
                        <span className="text-[10px] text-gray-400">+{activitySources.length - 5} more</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer — matches NarrativePreview footer pattern */}
            <footer className="px-6 py-3 border-t border-gray-100">
              <div className="flex items-center gap-2 text-[11px] text-gray-400">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  AI-generated
                </span>
                <span>&middot;</span>
                <span>Generated {format(new Date(item.createdAt), 'MMM d')}</span>
                <span>&middot;</span>
                <span>{item.wordCount} words</span>
                <span>&middot;</span>
                <span>{item.charCount} chars</span>
                {item.kind === 'packet' && item.storyIds.length > 1 && (
                  <>
                    <span>&middot;</span>
                    <span>from {item.storyIds.length} stories</span>
                  </>
                )}
              </div>
            </footer>
          </>
        )}
      </NarrativeShell>

      {/* Delete confirmation */}
      <ConfirmationDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete from Library"
        description={`Delete this ${label.toLowerCase()}? This can't be undone.`}
        variant="destructive"
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />
    </div>
  );
}
