/**
 * FormatSwitchModal Component
 *
 * Two-phase side-by-side modal for switching career story format.
 * Phase 1: Compare current narrative vs new framework structure.
 * Phase 2: Generating state with career quotes during regeneration.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Loader2, ChevronLeft, ChevronRight, Heart, AlertCircle, RefreshCw, ArrowRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { CareerStory, NarrativeFramework, WritingStyle, StoryArchetype } from '../../types/career-stories';
import { NARRATIVE_FRAMEWORKS, FRAMEWORK_GROUPS, FrameworkGroup, CAREER_QUOTES, WRITING_STYLES, USER_PROMPT_MAX_LENGTH, ARCHETYPE_METADATA, ARCHETYPE_GROUPS, ArchetypeGroup } from './constants';
import { FrameworkSelector } from './FrameworkSelector';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';

// =============================================================================
// TYPES
// =============================================================================

interface FormatSwitchModalProps {
  isOpen: boolean;
  onClose: () => void;
  story: CareerStory;
  initialFramework?: NarrativeFramework;
  initialStyle?: WritingStyle;
  onRegenerate: (framework: NarrativeFramework, style: WritingStyle, userPrompt?: string, archetype?: string) => Promise<void>;
  isRegenerating: boolean;
}

const SECTION_GUIDELINES: Record<string, string> = {
  situation: 'Business context, team, and the challenge or opportunity',
  task: 'Specific responsibilities and objectives assigned',
  action: 'Concrete steps taken, emphasizing individual contribution',
  result: 'Measurable outcomes, metrics, and business impact',
  learning: 'Key insights, skills gained, how this changed your approach',
  challenge: 'The problem or difficulty that needed solving',
  problem: 'The specific issue or gap identified',
  obstacles: 'Barriers, constraints, or difficulties faced',
  hindrances: 'Challenges that impacted progress',
  actions: 'Steps taken to address the situation and overcome obstacles',
  results: 'Outcomes achieved, including quantified impact',
  context: 'Background information and the problem space',
  evaluation: 'Assessment of what worked, what could improve',
};

/** Fact rotation cycle (ms) */
const FACT_ROTATION_MS = 2000;
const FACT_FADE_MS = 300;

/** Build generating facts that mix generic progress messages with story-specific data */
function buildGeneratingFacts(story: CareerStory, targetFramework: NarrativeFramework): string[] {
  const targetMeta = NARRATIVE_FRAMEWORKS[targetFramework];
  const sectionCount = targetMeta?.sections.length || 4;
  const activityCount = story.activityIds.length;
  const currentSections = Object.keys(story.sections || {});

  const facts: string[] = [];

  // Story-specific facts first
  if (activityCount > 0) {
    facts.push(`Analyzing ${activityCount} ${activityCount === 1 ? 'activity' : 'activities'} from your journal...`);
  }
  if (story.title) {
    facts.push(`Rewriting "${story.title.length > 40 ? story.title.slice(0, 37) + '...' : story.title}"...`);
  }
  if (currentSections.length > 0) {
    facts.push(`Remapping ${currentSections.length} existing sections to ${targetFramework}...`);
  }
  facts.push(`Building ${sectionCount} ${targetFramework} sections...`);

  // Generic progress messages
  facts.push(
    'Crafting your opening hook...',
    'Connecting evidence to impact...',
    'Scoring story strength...',
  );

  return facts;
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function CurrentNarrativePanel({ story }: { story: CareerStory }) {
  const frameworkMeta = NARRATIVE_FRAMEWORKS[story.framework];
  const sections = story.sections || {};

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="px-2 py-0.5 text-xs font-semibold bg-gray-100 text-gray-700 rounded">
          {story.framework}
        </span>
        <span className="text-xs text-gray-400">Current</span>
      </div>

      {frameworkMeta?.sections.map((sectionKey) => {
        const section = sections[sectionKey];
        return (
          <div key={sectionKey} className="space-y-1">
            <h4 className="text-xs font-semibold text-gray-700 capitalize">{sectionKey}</h4>
            <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">
              {section?.summary || <span className="italic text-gray-400">No content yet</span>}
            </p>
          </div>
        );
      })}

      {story.activityIds.length > 0 && (
        <div className="pt-2 border-t border-gray-100">
          <span className="text-[10px] text-gray-400">
            Based on {story.activityIds.length} {story.activityIds.length === 1 ? 'activity' : 'activities'}
          </span>
        </div>
      )}
    </div>
  );
}

function NewFormatPreviewPanel({
  framework,
  style,
  currentFramework,
}: {
  framework: NarrativeFramework;
  style: WritingStyle;
  currentFramework: NarrativeFramework;
}) {
  const frameworkMeta = NARRATIVE_FRAMEWORKS[framework];
  const currentMeta = NARRATIVE_FRAMEWORKS[currentFramework];

  const addedSections = frameworkMeta?.sections.filter(
    (s) => !currentMeta?.sections.includes(s)
  ) || [];
  const removedSections = currentMeta?.sections.filter(
    (s) => !frameworkMeta?.sections.includes(s)
  ) || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="px-2 py-0.5 text-xs font-semibold bg-primary-100 text-primary-700 rounded">
          {framework}
        </span>
        <span className="px-2 py-0.5 text-[10px] font-medium bg-blue-50 text-blue-600 rounded-full">
          {style}
        </span>
        <span className="text-xs text-gray-400">Preview</span>
      </div>

      {frameworkMeta?.sections.map((sectionKey) => {
        const isNew = addedSections.includes(sectionKey);
        return (
          <div key={sectionKey} className="space-y-1">
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs font-semibold text-gray-700 capitalize">{sectionKey}</h4>
              {isNew && (
                <span className="px-1 py-0.5 text-[9px] font-medium bg-green-100 text-green-700 rounded">
                  New
                </span>
              )}
            </div>
            <p className="text-[10px] text-gray-500 leading-relaxed">
              {SECTION_GUIDELINES[sectionKey] || `Content for ${sectionKey}`}
            </p>
          </div>
        );
      })}

      {/* What changes callout */}
      {(addedSections.length > 0 || removedSections.length > 0) && (
        <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
          <p className="text-[10px] font-semibold text-amber-700 mb-1">What changes:</p>
          {addedSections.length > 0 && (
            <p className="text-[10px] text-amber-600">
              + Adds: {addedSections.map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(', ')}
            </p>
          )}
          {removedSections.length > 0 && (
            <p className="text-[10px] text-amber-600">
              - Removes: {removedSections.map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(', ')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function WritingStylePicker({
  value,
  onChange,
}: {
  value: WritingStyle;
  onChange: (style: WritingStyle) => void;
}) {
  return (
    <div className="flex gap-1.5">
      {WRITING_STYLES.map(({ value: styleVal, label }) => (
        <button
          key={styleVal}
          type="button"
          onClick={() => onChange(styleVal)}
          className={cn(
            'px-2.5 py-1 text-[10px] font-medium rounded-full transition-colors',
            value === styleVal
              ? 'bg-primary-100 text-primary-700 ring-1 ring-primary-300'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function ArchetypePicker({
  value,
  onChange,
}: {
  value: StoryArchetype | null;
  onChange: (archetype: StoryArchetype | null) => void;
}) {
  const groups = Object.entries(ARCHETYPE_GROUPS) as [ArchetypeGroup, typeof ARCHETYPE_GROUPS[ArchetypeGroup]][];

  return (
    <div className="space-y-2">
      {groups.map(([groupKey, group]) => (
        <div key={groupKey}>
          <span className="text-[9px] uppercase tracking-wider text-gray-400 font-medium">{group.label}</span>
          <div className="flex flex-wrap gap-1 mt-0.5">
            {group.archetypes.map((arch) => {
              const meta = ARCHETYPE_METADATA[arch];
              return (
                <button
                  key={arch}
                  type="button"
                  onClick={() => onChange(value === arch ? null : arch as StoryArchetype)}
                  title={meta?.description}
                  className={cn(
                    'px-2 py-0.5 text-[10px] font-medium rounded-full transition-colors capitalize',
                    value === arch
                      ? 'bg-purple-100 text-purple-700 ring-1 ring-purple-300'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  {arch}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function GeneratingState({ story, targetFramework }: { story: CareerStory; targetFramework: NarrativeFramework }) {
  const facts = useMemo(() => buildGeneratingFacts(story, targetFramework), [story, targetFramework]);
  const [factIndex, setFactIndex] = useState(0);
  const [factVisible, setFactVisible] = useState(true);
  const [quoteIndex, setQuoteIndex] = useState(() =>
    Math.floor(Math.random() * CAREER_QUOTES.length)
  );
  const [hearted, setHearted] = useState<Set<number>>(() => new Set());

  useEffect(() => {
    let fadeTimeout: ReturnType<typeof setTimeout>;
    const interval = setInterval(() => {
      setFactVisible(false);
      fadeTimeout = setTimeout(() => {
        setFactIndex((i) => (i + 1) % facts.length);
        setFactVisible(true);
      }, FACT_FADE_MS);
    }, FACT_ROTATION_MS);
    return () => {
      clearInterval(interval);
      clearTimeout(fadeTimeout);
    };
  }, [facts.length]);

  const prevQuote = useCallback(() => {
    setQuoteIndex((i) => (i - 1 + CAREER_QUOTES.length) % CAREER_QUOTES.length);
  }, []);
  const nextQuote = useCallback(() => {
    setQuoteIndex((i) => (i + 1) % CAREER_QUOTES.length);
  }, []);
  const toggleHeart = useCallback(() => {
    setHearted((prev) => {
      const next = new Set(prev);
      if (next.has(quoteIndex)) next.delete(quoteIndex);
      else next.add(quoteIndex);
      return next;
    });
  }, [quoteIndex]);

  const quote = CAREER_QUOTES[quoteIndex];
  const isHearted = hearted.has(quoteIndex);

  return (
    <div className="flex flex-col items-center justify-center py-8 space-y-8 min-h-[300px]">
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="h-10 w-10 text-primary-500 animate-spin" />
        <div
          role="status"
          aria-live="polite"
          className={cn(
            'text-sm text-gray-500 text-center max-w-md transition-opacity duration-300',
            factVisible ? 'opacity-100' : 'opacity-0'
          )}
        >
          {facts[factIndex]}
        </div>
      </div>

      <div className="w-full px-2">
        <div className="bg-gray-50 rounded-xl px-6 py-5 border border-gray-100">
          <p className="text-[10px] font-semibold text-primary-400 uppercase tracking-widest mb-3">
            {quote.theme}
          </p>
          <p className="text-base text-gray-800 font-medium leading-relaxed">
            &ldquo;{quote.text}&rdquo;
          </p>
          <p className="text-sm text-gray-400 mt-2 font-light">&mdash; {quote.attribution}</p>

          <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-3">
              <button
                onClick={prevQuote}
                aria-label="Previous quote"
                className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-[10px] text-gray-300 tabular-nums">
                {quoteIndex + 1} / {CAREER_QUOTES.length}
              </span>
              <button
                onClick={nextQuote}
                aria-label="Next quote"
                className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <button
              onClick={toggleHeart}
              aria-label={isHearted ? 'Unlike quote' : 'Like quote'}
              className={cn(
                'p-1.5 rounded-full transition-all duration-200',
                isHearted
                  ? 'text-red-500 hover:text-red-600 scale-110'
                  : 'text-gray-300 hover:text-red-400 hover:bg-gray-100'
              )}
            >
              <Heart className={cn('h-4 w-4', isHearted && 'fill-current')} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function FormatSwitchModal({
  isOpen,
  onClose,
  story,
  initialFramework,
  initialStyle,
  onRegenerate,
  isRegenerating,
}: FormatSwitchModalProps) {
  // Internal form state — owned by the modal, reset on open
  const [selectedFramework, setSelectedFramework] = useState<NarrativeFramework>(
    initialFramework || story.framework
  );
  const [selectedStyle, setSelectedStyle] = useState<WritingStyle>(
    initialStyle || 'professional'
  );
  const [selectedArchetype, setSelectedArchetype] = useState<StoryArchetype | null>(
    story.archetype || null
  );
  const [userPrompt, setUserPrompt] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Reset form state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedFramework(initialFramework || story.framework);
      setSelectedStyle(initialStyle || 'professional');
      setSelectedArchetype(story.archetype || null);
      setUserPrompt('');
      setError(null);
    }
  }, [isOpen, initialFramework, initialStyle, story.framework, story.archetype]);

  const handleRegenerate = useCallback(async () => {
    setError(null);
    try {
      await onRegenerate(
        selectedFramework,
        selectedStyle,
        userPrompt.trim() || undefined,
        selectedArchetype || undefined,
      );
    } catch (err) {
      setError((err as Error).message || 'Regeneration failed. Please try again.');
    }
  }, [onRegenerate, selectedFramework, selectedStyle, userPrompt, selectedArchetype]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isRegenerating && onClose()}>
      <DialogContent className="max-w-4xl flex flex-col max-h-[85vh]">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>
            {isRegenerating ? 'Regenerating Story...' : 'Switch Format'}
          </DialogTitle>
          <DialogDescription>
            {isRegenerating
              ? 'Your story is being restructured with the new format.'
              : 'Compare your current narrative with the new format before regenerating.'}
          </DialogDescription>
        </DialogHeader>

        {isRegenerating ? (
          <GeneratingState story={story} targetFramework={selectedFramework} />
        ) : (
          <>
            {/* Side-by-side comparison — scrollable area */}
            <div className="grid lg:grid-cols-2 gap-4 mt-2 min-h-0 overflow-y-auto flex-1">
              {/* Left: Current */}
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 overflow-y-auto max-h-[45vh]">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Current Narrative</h3>
                <CurrentNarrativePanel story={story} />
              </div>

              {/* Right: New format preview */}
              <div className="p-4 bg-primary-50/30 rounded-lg border border-primary-100 overflow-y-auto max-h-[45vh]">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">New Format</h3>
                  <ArrowRight className="h-3.5 w-3.5 text-primary-400" />
                </div>
                <NewFormatPreviewPanel
                  framework={selectedFramework}
                  style={selectedStyle}
                  currentFramework={story.framework}
                />
              </div>
            </div>

            {/* Controls — sticky at bottom */}
            <div className="flex-shrink-0 flex flex-col sm:flex-row items-start sm:items-center gap-4 mt-3 pt-3 border-t border-gray-100">
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500">Framework:</span>
                <FrameworkSelector
                  value={selectedFramework}
                  onChange={setSelectedFramework}
                />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500">Style:</span>
                <WritingStylePicker value={selectedStyle} onChange={setSelectedStyle} />
              </div>
            </div>

            {/* Archetype picker */}
            <div className="flex-shrink-0 mt-2">
              <div className="flex items-start gap-3">
                <span className="text-xs text-gray-500 mt-1">Archetype:</span>
                <ArchetypePicker value={selectedArchetype} onChange={setSelectedArchetype} />
              </div>
            </div>

            {/* Custom instructions */}
            <div className="flex-shrink-0 mt-2">
              <label htmlFor="regen-prompt" className="text-xs text-gray-500 mb-1 block">
                Additional instructions (optional)
              </label>
              <textarea
                id="regen-prompt"
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                placeholder="e.g. Emphasize the leadership aspect, add more metrics, make it more concise..."
                rows={2}
                maxLength={USER_PROMPT_MAX_LENGTH}
                className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-gray-400"
              />
              {userPrompt.length > 0 && (
                <span className="text-[10px] text-gray-400 mt-0.5 block text-right">
                  {userPrompt.length}/{USER_PROMPT_MAX_LENGTH}
                </span>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="flex-shrink-0 flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg mt-2">
                <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}

            {/* Footer */}
            <DialogFooter className="flex-shrink-0 mt-3">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleRegenerate}>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Regenerate
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
