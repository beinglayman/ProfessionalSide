import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ArrowLeft, Copy, Check, MoreHorizontal, Trash2, RefreshCw, Info, ExternalLink, Type, Mic, FileText, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { cn, formatRelativeTime } from '../../lib/utils';
import { copyToClipboard } from '../../lib/clipboard';
import { getItemMeta, getTitle } from './derivation-helpers';
import { ToolIcon } from './ToolIcon';
import { ConfirmationDialog } from '../ui/confirmation-dialog';
import { getSourceIcon } from '../journal/source-icons';
import { SUPPORTED_SOURCES, type ActivitySource } from '../../types/activity';
import { DERIVATION_COLOR_CLASSES, capitalizeFirst, derivationSectionLabel } from './constants';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '../ui/dropdown-menu';
import type { StoryDerivation, CareerStory, DerivationType, StorySource, ToolType } from '../../types/career-stories';
import { FRAME_MAP } from './DerivationPreview';
import { useDerivationAnnotations, useDerivationSources } from '../../hooks/useCareerStories';
import { NarrativeShell } from './NarrativeShell';
import { NarrativeSectionHeader } from './NarrativeSectionHeader';
import { MarginColumn } from './MarginColumn';
import { AnnotatedText } from './AnnotatedText';
import { PracticeTimer } from './PracticeTimer';
import { useLibraryDetailData } from './useLibraryDetailData';

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

/**
 * Build clean text from sections for preview frames.
 * Unlike item.text (which has **Header**\n markers), preview frames
 * need flowing prose without structural markdown.
 */
function buildPreviewText(item: StoryDerivation, sectionKeys: string[]): string {
  if (!item.sections || sectionKeys.length === 0) return item.text;
  if (sectionKeys.length === 1 && sectionKeys[0] === 'content') {
    return item.sections.content?.summary ?? item.text;
  }
  return sectionKeys
    .map(key => item.sections?.[key]?.summary ?? '')
    .filter(Boolean)
    .join('\n\n');
}

// =============================================================================
// SHARED ATOMS
// =============================================================================

/** Renders a source with tool icon, label (optionally linked), and external link indicator. */
function SourceLink({ source, compact }: { source: StorySource; compact?: boolean }) {
  const iconSize = compact ? 'w-3 h-3' : 'w-3.5 h-3.5';
  const textClass = compact
    ? 'inline-flex items-center gap-1 text-[11px] text-gray-400 leading-relaxed'
    : 'group/source inline-flex items-center gap-1 text-[11px] text-gray-400 leading-snug';

  return (
    <span className={textClass}>
      <ToolIcon tool={(source.toolType || 'generic') as ToolType} className={cn(iconSize, 'flex-shrink-0', compact && 'opacity-60')} />
      {source.url ? (
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn('truncate hover:text-blue-600 transition-colors', compact && 'max-w-[200px]')}
        >
          {source.label}
        </a>
      ) : (
        <span className={cn('truncate', compact && 'max-w-[200px]')}>{source.label}</span>
      )}
      {!compact && source.url && (
        <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover/source:opacity-60 flex-shrink-0" />
      )}
    </span>
  );
}

// =============================================================================
// PREVIEW VIEW
// =============================================================================

function PreviewView({ item, sectionKeys }: { item: StoryDerivation; sectionKeys: string[] }) {
  const Frame = FRAME_MAP[item.type as DerivationType];
  const previewText = buildPreviewText(item, sectionKeys);

  return (
    <div className="px-6 pb-4 flex-1 overflow-y-auto">
      {Frame ? (
        <Frame text={previewText} charCount={item.charCount} wordCount={item.wordCount} />
      ) : (
        <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{previewText}</p>
      )}
    </div>
  );
}

// =============================================================================
// DOCUMENT VIEW
// =============================================================================

interface DocumentViewProps {
  item: StoryDerivation;
  sectionKeys: string[];
  activeSources: StorySource[];
  activitySources: StorySource[];
  sourcesBySection: Record<string, StorySource[]>;
  annotations: any[];
  shell: any;
}

function DocumentView({ item, sectionKeys, activeSources, activitySources, sourcesBySection, annotations, shell }: DocumentViewProps) {
  return (
    <div className="px-6 pb-4 flex-1 overflow-y-auto">
      {sectionKeys.map((sectionKey, idx) => {
        const sectionText = item.sections?.[sectionKey]?.summary ?? item.text;
        // Show all activity sources on first section — snapshotSources assigns all to "content"
        // but derivation sections have granular keys (hook/body/hashtags), so per-section lookup finds nothing
        const sectionSources = idx === 0
          ? activeSources.filter(s => s.sourceType === 'activity')
          : (sourcesBySection[sectionKey] || []).filter(s => s.sourceType === 'activity');
        const isLast = idx === sectionKeys.length - 1;

        return (
          <NarrativeSectionHeader
            key={sectionKey}
            sectionKey={sectionKey}
            label={sectionKeys.length === 1 ? capitalizeFirst(item.type) : derivationSectionLabel(sectionKey)}
            confidence={0.8}
            isCollapsed={false}
            onToggle={() => {}}
            isLast={isLast}
            showMargin={true}
            marginContent={
              <MarginColumn
                {...shell.marginProps}
                sectionKey={sectionKey}
              />
            }
            rightMarginContent={
              sectionSources.length > 0 ? (
                <div className="hidden lg:block flex-shrink-0 w-[180px] pl-3 pt-1">
                  <div className="flex flex-col gap-1.5 border-l border-slate-200 pl-2">
                    {sectionSources.map((source) => (
                      <SourceLink key={source.id} source={source} />
                    ))}
                  </div>
                </div>
              ) : undefined
            }
          >
            <div data-section-key={sectionKey}>
              <div className="relative">
                <AnnotatedText
                  text={sectionText}
                  annotations={annotations}
                  sectionKey={sectionKey}
                  showEmphasis={shell.showEmphasis}
                  onAnnotationClick={shell.annotationHandlers.onAnnotationClick}
                  onDeleteAnnotation={shell.annotationHandlers.onDeleteAnnotation}
                  hoveredAnnotationId={shell.annotationHandlers.hoveredAnnotationId}
                  onHoverAnnotation={shell.annotationHandlers.onHoverAnnotation}
                  className="text-sm leading-relaxed text-gray-800 whitespace-pre-wrap"
                />
              </div>
            </div>
          </NarrativeSectionHeader>
        );
      })}

      {/* Source footnotes — mobile only */}
      {activitySources.length > 0 && (
        <div className="lg:hidden mt-3">
          <div className="border-t border-gray-100 pt-2">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {activitySources.slice(0, 5).map((source) => (
                <SourceLink key={source.id} source={source} compact />
              ))}
              {activitySources.length > 5 && (
                <span className="text-[10px] text-gray-400">+{activitySources.length - 5} more</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
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
  const [viewMode, setViewMode] = useState<'document' | 'preview'>('document');
  const backButtonRef = useRef<HTMLButtonElement>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Fetch annotations and sources for this derivation
  const { data: annotations = [] } = useDerivationAnnotations(item.id);
  const { data: derivationSources = [] } = useDerivationSources(item.id);

  // Derived data (memoized in hook)
  const {
    sectionKeys,
    sourcesBySection,
    activeSources,
    uniqueTools,
    activitySources,
    estimatedTime,
    sectionTimings,
  } = useLibraryDetailData(item, allStories, derivationSources);

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

  const handleCopy = useCallback(async () => {
    const ok = await copyToClipboard(item.text);
    if (ok) {
      setCopied(true);
      clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    }
  }, [item.text]);

  const handleDelete = useCallback(() => {
    onDelete(item.id);
  }, [item.id, onDelete]);

  const title = getTitle(item, label);

  return (
    <div className="flex flex-col h-full">
      {/* Document card — wrapped in NarrativeShell for annotation support */}
      <NarrativeShell
        owner={{ type: 'derivation', id: item.id, annotations }}
        className="relative bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden flex-1 flex flex-col"
      >
        {(shell) => (
          <>
            {/* Header */}
            <header className="px-6 pt-4 pb-3">
              {/* Row 1: Back arrow + title + type badge + actions */}
              <div className="flex items-start gap-2">
                <button
                  ref={backButtonRef}
                  onClick={onBack}
                  className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 mt-0.5 flex-shrink-0"
                  title="Back to library (Esc)"
                  aria-label="Back to library"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <h2 className="text-base font-semibold text-gray-900 truncate flex-1 min-w-0">{title}</h2>

                {/* Type badge + actions — right side */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium', colorClasses.bg, colorClasses.text)}>
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </span>
                  {/* Document / Preview toggle */}
                  <div className="flex items-center gap-0.5 bg-gray-100 rounded-md p-0.5 mr-1">
                    <button
                      onClick={() => setViewMode('document')}
                      className={cn('px-2 py-1 rounded transition-colors', viewMode === 'document' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600')}
                      title="Document view"
                      aria-label="Document view"
                    >
                      <FileText className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setViewMode('preview')}
                      className={cn('px-2 py-1 rounded transition-colors', viewMode === 'preview' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600')}
                      title="Preview"
                      aria-label="Preview"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>

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

            {/* Content area */}
            {viewMode === 'preview' ? (
              <PreviewView item={item} sectionKeys={sectionKeys} />
            ) : (
              <DocumentView
                item={item}
                sectionKeys={sectionKeys}
                activeSources={activeSources}
                activitySources={activitySources}
                sourcesBySection={sourcesBySection}
                annotations={annotations}
                shell={shell}
              />
            )}

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
