/**
 * NarrativePreview Component
 *
 * Displays career story narratives with dynamic framework support.
 * Supports STAR, SOAR, CAR, PAR, SHARE, CARL and other frameworks.
 *
 * States:
 * - Loading: Shows skeleton placeholders during generation
 * - Error: Shows validation failure message with failed gates
 * - Placeholder: Shows when no story is selected
 * - Success: Shows full narrative with edit capabilities
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { format } from 'date-fns';
import { RefreshCw, Check, Edit2, Copy, AlertTriangle, Lightbulb, CheckCircle2, Clock, ExternalLink, Link as LinkIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import { STARComponent, ToolType, GenerateSTARResult, NarrativeFramework, ToolActivity, CareerStory, StoryVisibility } from '../../types/career-stories';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ToolIcon } from './ToolIcon';
import { FrameworkSelector } from './FrameworkSelector';
import { TIMING, DISPLAY_LIMITS, CONFIDENCE_THRESHOLDS, NARRATIVE_FRAMEWORKS } from './constants';

// =============================================================================
// STORY STATUS
// =============================================================================

type StoryStatus = 'complete' | 'in-progress' | 'draft';

/**
 * Derive story status from overall confidence.
 * - Complete: >= 0.8
 * - In Progress: >= 0.5
 * - Draft: < 0.5
 */
function getStoryStatus(confidence: number): StoryStatus {
  if (confidence >= CONFIDENCE_THRESHOLDS.HIGH) return 'complete';
  if (confidence >= CONFIDENCE_THRESHOLDS.MEDIUM) return 'in-progress';
  return 'draft';
}

const StoryStatusBadge: React.FC<{ status: StoryStatus }> = ({ status }) => {
  const config = {
    complete: {
      label: 'Complete',
      icon: CheckCircle2,
      className: 'bg-green-100 text-green-700 border-green-200',
    },
    'in-progress': {
      label: 'In Progress',
      icon: Clock,
      className: 'bg-amber-100 text-amber-700 border-amber-200',
    },
    draft: {
      label: 'Draft',
      icon: Lightbulb,
      className: 'bg-gray-100 text-gray-600 border-gray-200',
    },
  };

  const { label, icon: Icon, className } = config[status];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border',
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
};

// =============================================================================
// STAR PROGRESS BAR
// =============================================================================

interface STARProgressBarProps {
  situation: number;
  task: number;
  action: number;
  result: number;
}

/**
 * Get component status based on confidence threshold.
 */
function getComponentStatus(confidence: number): 'complete' | 'partial' | 'pending' {
  if (confidence >= CONFIDENCE_THRESHOLDS.HIGH) return 'complete';
  if (confidence >= CONFIDENCE_THRESHOLDS.MEDIUM) return 'partial';
  return 'pending';
}

const STARProgressBar: React.FC<STARProgressBarProps> = ({
  situation,
  task,
  action,
  result,
}) => {
  // Calculate overall progress (average of all components, scaled to percentage)
  const overallProgress = Math.round(((situation + task + action + result) / 4) * 100);

  const components = [
    { letter: 'S', confidence: situation },
    { letter: 'T', confidence: task },
    { letter: 'A', confidence: action },
    { letter: 'R', confidence: result },
  ];

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          STAR Progress
        </span>
        <span className="text-sm font-semibold text-gray-700">{overallProgress}%</span>
      </div>
      {/* Progress bar */}
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-300"
          style={{ width: `${overallProgress}%` }}
        />
      </div>
      {/* S-T-A-R breakdown */}
      <div className="flex items-center justify-center gap-2">
        {components.map(({ letter, confidence }) => {
          const status = getComponentStatus(confidence);
          const statusStyles = {
            complete: 'bg-green-500 text-white border-green-500',
            partial: 'bg-amber-100 text-amber-700 border-amber-300',
            pending: 'bg-gray-100 text-gray-400 border-gray-200',
          };
          return (
            <span
              key={letter}
              className={cn(
                'w-7 h-7 flex items-center justify-center text-xs font-bold rounded border',
                statusStyles[status]
              )}
              title={`${letter}: ${Math.round(confidence * 100)}% confidence`}
            >
              {letter}
            </span>
          );
        })}
      </div>
    </div>
  );
};

// =============================================================================
// FRAMEWORK PROGRESS BAR (Dynamic)
// =============================================================================

interface FrameworkProgressBarProps {
  sections: string[];
  getSectionConfidence: (section: string) => number;
}

/**
 * Dynamic progress bar that shows letters for any framework's sections.
 */
const FrameworkProgressBar: React.FC<FrameworkProgressBarProps> = ({
  sections,
  getSectionConfidence,
}) => {
  const confidences = sections.map((s) => getSectionConfidence(s));
  const overallProgress = Math.round(
    (confidences.reduce((sum, c) => sum + c, 0) / confidences.length) * 100
  );

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          {sections.map((s) => s[0].toUpperCase()).join('')} Progress
        </span>
        <span className="text-sm font-semibold text-gray-700">{overallProgress}%</span>
      </div>
      {/* Progress bar */}
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-300"
          style={{ width: `${overallProgress}%` }}
        />
      </div>
      {/* Section letters breakdown */}
      <div className="flex items-center justify-center gap-2">
        {sections.map((section, idx) => {
          const confidence = confidences[idx];
          const status = getComponentStatus(confidence);
          const statusStyles = {
            complete: 'bg-green-500 text-white border-green-500',
            partial: 'bg-amber-100 text-amber-700 border-amber-300',
            pending: 'bg-gray-100 text-gray-400 border-gray-200',
          };
          return (
            <span
              key={section}
              className={cn(
                'w-7 h-7 flex items-center justify-center text-xs font-bold rounded border',
                statusStyles[status]
              )}
              title={`${capitalizeFirst(section)}: ${Math.round(confidence * 100)}% confidence`}
            >
              {section[0].toUpperCase()}
            </span>
          );
        })}
      </div>
    </div>
  );
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/** Capitalize first letter of a string */
function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Map framework section key to STAR component key for fallback.
 * Used when story.sections doesn't have framework-specific data.
 * Note: This is a best-effort approximation - SHARE/SOAR sections
 * like hindrances, obstacles, evaluation have different semantics than STAR.
 */
function mapSectionToStarKey(sectionKey: string): 'situation' | 'task' | 'action' | 'result' {
  const mapping: Record<string, 'situation' | 'task' | 'action' | 'result'> = {
    // STAR sections
    situation: 'situation',
    task: 'task',
    action: 'action',
    result: 'result',
    // Context/challenge variants → situation
    context: 'situation',
    challenge: 'situation',
    problem: 'situation',
    // SOAR obstacles → task (represents the difficulty to overcome)
    obstacles: 'task',
    // SHARE hindrances → task (represents challenges that impacted progress)
    hindrances: 'task',
    // Action variants
    actions: 'action',
    objective: 'task',
    // Result variants
    results: 'result',
    outcome: 'result',
    // Learning/evaluation → result (reflection on outcomes)
    learning: 'result',
    evaluation: 'result',
  };
  return mapping[sectionKey.toLowerCase()] || 'result';
}

// =============================================================================
// SUGGESTED EDITS (What's Missing)
// =============================================================================

interface SuggestedEditsProps {
  edits: string[];
}

const SuggestedEdits: React.FC<SuggestedEditsProps> = ({ edits }) => {
  if (!edits || edits.length === 0) return null;

  return (
    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
      <h4 className="flex items-center gap-1.5 text-sm font-medium text-amber-800 mb-2">
        <Lightbulb className="h-4 w-4" />
        What's Missing
      </h4>
      <ul className="space-y-1">
        {edits.map((edit, idx) => (
          <li key={idx} className="text-sm text-amber-700 pl-5 relative">
            <span className="absolute left-0">•</span>
            {edit}
          </li>
        ))}
      </ul>
    </div>
  );
};

// =============================================================================
// EVIDENCE CHIPS
// =============================================================================

interface EvidenceChipsProps {
  sourceIds: string[];
  activities: ToolActivity[];
  maxDisplay?: number;
}

/**
 * Display clickable chips for source activities.
 * Shows tool icon + truncated title for each activity.
 */
const EvidenceChips: React.FC<EvidenceChipsProps> = ({
  sourceIds,
  activities,
  maxDisplay = 3,
}) => {
  if (!sourceIds || sourceIds.length === 0 || !activities || activities.length === 0) {
    return null;
  }

  // Create lookup map for activities
  const activityMap = useMemo(() => {
    const map = new Map<string, ToolActivity>();
    activities.forEach((a) => map.set(a.id, a));
    return map;
  }, [activities]);

  // Get activities for source IDs
  const sourceActivities = sourceIds
    .map((id) => activityMap.get(id))
    .filter((a): a is ToolActivity => a !== undefined);

  if (sourceActivities.length === 0) return null;

  const displayActivities = sourceActivities.slice(0, maxDisplay);
  const remainingCount = sourceActivities.length - maxDisplay;

  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {displayActivities.map((activity) => (
        <a
          key={activity.id}
          href={activity.sourceUrl || '#'}
          target={activity.sourceUrl ? '_blank' : undefined}
          rel={activity.sourceUrl ? 'noopener noreferrer' : undefined}
          className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full',
            'bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors',
            'max-w-[200px] truncate',
            !activity.sourceUrl && 'cursor-default'
          )}
          title={activity.title}
          onClick={(e) => !activity.sourceUrl && e.preventDefault()}
        >
          <ToolIcon tool={activity.source} className="w-3 h-3 text-[6px] flex-shrink-0" />
          <span className="truncate">{activity.title}</span>
          {activity.sourceUrl && (
            <ExternalLink className="h-2.5 w-2.5 flex-shrink-0 text-gray-400" />
          )}
        </a>
      ))}
      {remainingCount > 0 && (
        <span className="inline-flex items-center px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-500">
          +{remainingCount} more
        </span>
      )}
    </div>
  );
};

// Confidence dot component
const ConfidenceDot: React.FC<{ confidence: number }> = ({ confidence }) => {
  const getColor = () => {
    if (confidence >= CONFIDENCE_THRESHOLDS.HIGH) return 'bg-green-500';
    if (confidence >= CONFIDENCE_THRESHOLDS.MEDIUM) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <span
      className={cn('inline-block w-2 h-2 rounded-full', getColor())}
      title={`Confidence: ${Math.round(confidence * 100)}%`}
      aria-label={`Confidence: ${Math.round(confidence * 100)}%`}
    />
  );
};

/**
 * Parse text content and render with rich formatting.
 * Supports: bullet points, metrics highlighting, paragraphs.
 */
const RichTextContent: React.FC<{ text: string }> = ({ text }) => {
  // Check if content has bullet points
  const lines = text.split('\n').filter((line) => line.trim());
  const hasBullets = lines.some((line) => /^[-•*]\s/.test(line.trim()));

  if (hasBullets) {
    const bullets: string[] = [];
    let currentParagraph = '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (/^[-•*]\s/.test(trimmed)) {
        if (currentParagraph) {
          bullets.push(currentParagraph);
          currentParagraph = '';
        }
        bullets.push(trimmed.replace(/^[-•*]\s+/, ''));
      } else {
        currentParagraph += (currentParagraph ? ' ' : '') + trimmed;
      }
    }
    if (currentParagraph) bullets.push(currentParagraph);

    return (
      <ul className="space-y-2">
        {bullets.map((bullet, idx) => (
          <li key={idx} className="flex items-start gap-2">
            <span className="text-blue-500 mt-1.5">•</span>
            <span className="text-sm text-gray-700">{highlightMetrics(bullet)}</span>
          </li>
        ))}
      </ul>
    );
  }

  // Regular paragraphs
  return (
    <div className="space-y-2">
      {lines.map((line, idx) => (
        <p key={idx} className="text-sm text-gray-700">
          {highlightMetrics(line)}
        </p>
      ))}
    </div>
  );
};

/**
 * Highlight metrics/numbers in text (e.g., "85%", "3x", "$10K").
 */
function highlightMetrics(text: string): React.ReactNode {
  const metricPattern = /(\d+(?:\.\d+)?[%xX]|\$\d+(?:\.\d+)?[KMB]?|\d+(?:\.\d+)?\s*(?:hours?|days?|weeks?|months?|minutes?|seconds?))/g;
  const parts = text.split(metricPattern);

  return parts.map((part, idx) => {
    if (metricPattern.test(part)) {
      return (
        <span key={idx} className="font-semibold text-green-700 bg-green-50 px-1 rounded">
          {part}
        </span>
      );
    }
    return part;
  });
}

// STAR section component with enhanced rendering
interface STARSectionProps {
  label: string;
  component: STARComponent;
  isEditing: boolean;
  editValue: string;
  onEditChange: (value: string) => void;
  activities?: ToolActivity[];
  /** Optional evidence descriptions from story sections */
  evidenceDescriptions?: Array<{ activityId: string; description?: string }>;
}

const STARSection: React.FC<STARSectionProps> = ({
  label,
  component,
  isEditing,
  editValue,
  onEditChange,
  activities = [],
  evidenceDescriptions = [],
}) => {
  // Match source IDs to activities for display
  const sourceActivities = activities.filter((a) => component.sources.includes(a.id));
  const hasEvidence = sourceActivities.length > 0 || evidenceDescriptions.length > 0;

  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          {label}
        </h4>
        {/* Show confidence dot only - no numeric score to avoid confusing users */}
        <ConfidenceDot confidence={component.confidence} />
      </div>
      {isEditing ? (
        <textarea
          value={editValue}
          onChange={(e) => onEditChange(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={4}
        />
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          {/* Main content */}
          <div className="p-4">
            <RichTextContent text={component.text} />
          </div>

          {/* Evidence/Provenance section */}
          {hasEvidence && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
              <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
                <LinkIcon className="w-3 h-3" />
                <span className="font-medium">Evidence</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {sourceActivities.slice(0, 5).map((activity) => {
                  const desc = evidenceDescriptions.find((e) => e.activityId === activity.id);
                  return (
                    <a
                      key={activity.id}
                      href={activity.sourceUrl || '#'}
                      target={activity.sourceUrl ? '_blank' : undefined}
                      rel={activity.sourceUrl ? 'noopener noreferrer' : undefined}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-md',
                        'bg-white border border-gray-200 text-gray-700',
                        'hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors',
                        'max-w-[250px]',
                        !activity.sourceUrl && 'cursor-default hover:bg-white hover:border-gray-200 hover:text-gray-700'
                      )}
                      title={desc?.description || activity.title}
                      onClick={(e) => !activity.sourceUrl && e.preventDefault()}
                    >
                      <ToolIcon tool={activity.source} className="w-3.5 h-3.5 text-[7px] flex-shrink-0" />
                      <span className="truncate">{activity.title}</span>
                      {activity.sourceUrl && (
                        <ExternalLink className="h-3 w-3 flex-shrink-0 text-gray-400" />
                      )}
                    </a>
                  );
                })}
                {sourceActivities.length > 5 && (
                  <span className="inline-flex items-center px-2 py-1 text-xs rounded-md bg-gray-100 text-gray-500">
                    +{sourceActivities.length - 5} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Import shared use-case frameworks from FrameworkPickerModal
import { USE_CASE_FRAMEWORKS } from './FrameworkPickerModal';

/**
 * Regenerate button with framework selection dropdown.
 * Shows use-case focused options and all frameworks.
 */
interface RegenerateButtonProps {
  currentFramework: NarrativeFramework;
  onRegenerate: () => void;
  onFrameworkChange: (framework: NarrativeFramework) => void;
  isLoading: boolean;
}

const RegenerateButton: React.FC<RegenerateButtonProps> = ({
  currentFramework,
  onRegenerate,
  onFrameworkChange,
  isLoading,
}) => {
  const [showOptions, setShowOptions] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'useCases' | 'allFormats'>('useCases');
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    if (!showOptions) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowOptions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showOptions]);

  const handleRegenerateWithFramework = (framework: NarrativeFramework) => {
    setShowOptions(false);
    if (framework !== currentFramework) {
      onFrameworkChange(framework);
    }
    // Trigger regeneration after framework change
    setTimeout(() => onRegenerate(), 100);
  };

  const handleQuickRegenerate = () => {
    if (window.confirm(`Regenerate with ${currentFramework} format? This will replace the current content.`)) {
      onRegenerate();
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex items-center">
        <Button
          variant="outline"
          size="sm"
          onClick={handleQuickRegenerate}
          disabled={isLoading}
          className="rounded-r-none border-r-0"
          data-testid="regenerate-star"
        >
          <RefreshCw className={cn("h-4 w-4 mr-1", isLoading && "animate-spin")} />
          Regenerate
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowOptions(!showOptions)}
          disabled={isLoading}
          className="rounded-l-none px-2"
          aria-label="More regenerate options"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </Button>
      </div>

      {/* Dropdown with use-case and framework options */}
      {showOptions && (
        <div className="absolute right-0 mt-1 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setSelectedTab('useCases')}
              className={cn(
                'flex-1 px-4 py-2 text-sm font-medium transition-colors',
                selectedTab === 'useCases'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              For Use Case
            </button>
            <button
              onClick={() => setSelectedTab('allFormats')}
              className={cn(
                'flex-1 px-4 py-2 text-sm font-medium transition-colors',
                selectedTab === 'allFormats'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              All Formats
            </button>
          </div>

          <div className="max-h-72 overflow-y-auto">
            {selectedTab === 'useCases' ? (
              /* Use-case focused view */
              <div className="p-2 space-y-1">
                {Object.entries(USE_CASE_FRAMEWORKS).map(([key, useCase]) => (
                  <div key={key} className="rounded-lg border border-gray-100 overflow-hidden">
                    <div className="px-3 py-2 bg-gray-50 flex items-center gap-2">
                      <span className="text-lg">{useCase.icon}</span>
                      <div>
                        <div className="font-medium text-gray-900 text-sm">{useCase.label}</div>
                        <div className="text-xs text-gray-500">{useCase.description}</div>
                      </div>
                    </div>
                    <div className="px-3 py-2 flex flex-wrap gap-1.5">
                      {useCase.frameworks.map((fw, idx) => {
                        const meta = NARRATIVE_FRAMEWORKS[fw];
                        const isCurrent = fw === currentFramework;
                        return (
                          <button
                            key={fw}
                            onClick={() => handleRegenerateWithFramework(fw)}
                            className={cn(
                              'px-2.5 py-1 text-xs rounded-md transition-colors',
                              isCurrent
                                ? 'bg-blue-100 text-blue-700 font-medium'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
                              idx === 0 && !isCurrent && 'ring-1 ring-amber-300 bg-amber-50'
                            )}
                            title={meta.description}
                          >
                            {meta.label}
                            {idx === 0 && !isCurrent && ' ⭐'}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* All formats view */
              <div className="py-1">
                {(Object.keys(NARRATIVE_FRAMEWORKS) as NarrativeFramework[]).map((fw) => {
                  const meta = NARRATIVE_FRAMEWORKS[fw];
                  const isCurrent = fw === currentFramework;
                  return (
                    <button
                      key={fw}
                      onClick={() => handleRegenerateWithFramework(fw)}
                      className={cn(
                        'w-full px-3 py-2 text-left hover:bg-gray-50 flex items-start gap-3',
                        isCurrent && 'bg-blue-50'
                      )}
                    >
                      <div className={cn(
                        'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5',
                        isCurrent ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                      )}>
                        {isCurrent && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{meta.label}</span>
                          {isCurrent && (
                            <span className="text-xs text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
                              Current
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">{meta.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface STARPreviewProps {
  /** Display name for the cluster */
  clusterName: string;
  /** Number of activities in the cluster */
  activityCount: number;
  /** Date range of activities (ISO strings) */
  dateRange?: { earliest: string; latest: string };
  /** Tool types for displaying icons */
  toolTypes: ToolType[];
  /** Activities in the cluster for evidence linking */
  activities?: ToolActivity[];
  /** Generation result - null when not yet generated */
  result: GenerateSTARResult | null;
  /** Whether STAR is currently being generated */
  isLoading: boolean;
  /** Whether AI polish is enabled for regeneration */
  polishEnabled: boolean;
  /** Callback when polish toggle changes */
  onPolishToggle: (enabled: boolean) => void;
  /** Currently selected narrative framework */
  framework: NarrativeFramework;
  /** Callback when framework changes - triggers regeneration */
  onFrameworkChange: (framework: NarrativeFramework) => void;
  /** Callback to regenerate the STAR */
  onRegenerate: () => void;
  /** Callback to save user edits */
  onSave?: (edits: { situation?: string; task?: string; action?: string; result?: string }) => void;
  /** Saved career story metadata (if persisted) */
  story?: CareerStory | null;
  /** Publish a story with visibility */
  onPublish?: (visibility: StoryVisibility, edits: { situation?: string; task?: string; action?: string; result?: string }) => void;
  /** Unpublish a story */
  onUnpublish?: () => void;
  /** Update visibility on published story */
  onVisibilityChange?: (visibility: StoryVisibility) => void;
  /** Loading state for save */
  isSaving?: boolean;
  /** Loading state for publish actions */
  isPublishing?: boolean;
  /** Callback to delete the story */
  onDelete?: () => void;
  /** Loading state for delete */
  isDeleting?: boolean;
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
  isSaving = false,
  isPublishing = false,
  onDelete,
  isDeleting = false,
}: STARPreviewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [selectedVisibility, setSelectedVisibility] = useState<StoryVisibility>(story?.visibility || 'private');
  const [edits, setEdits] = useState<Record<string, string>>({});

  // Ref to track timeout for cleanup
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const star = result?.star;

  // Get framework sections from constants
  const frameworkMeta = NARRATIVE_FRAMEWORKS[framework];
  const sectionKeys = frameworkMeta?.sections || ['situation', 'task', 'action', 'result'];

  // Determine if we should render from story.sections (dynamic) or star (hardcoded STAR)
  const useStorySections = story && story.sections && Object.keys(story.sections).length > 0;

  // Initialize edits when star or story is loaded
  useEffect(() => {
    if (useStorySections && story?.sections) {
      // Initialize from story sections (dynamic framework)
      const newEdits: Record<string, string> = {};
      for (const key of sectionKeys) {
        newEdits[key] = story.sections[key]?.summary || '';
      }
      setEdits(newEdits);
    } else if (star) {
      // Fallback to STAR structure
      setEdits({
        situation: star.situation.text,
        task: star.task.text,
        action: star.action.text,
        result: star.result.text,
      });
    }
  }, [star, story, useStorySections, sectionKeys.join(',')]);

  useEffect(() => {
    if (story?.visibility) {
      setSelectedVisibility(story.visibility);
    }
  }, [story?.visibility]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const formatDateRange = () => {
    if (!dateRange) return '';
    try {
      const earliest = new Date(dateRange.earliest);
      const latest = new Date(dateRange.latest);
      // Validate dates are valid
      if (isNaN(earliest.getTime()) || isNaN(latest.getTime())) {
        return '';
      }
      return `${format(earliest, 'MMM d')} - ${format(latest, 'MMM d')}`;
    } catch {
      return '';
    }
  };

  /**
   * Copy narrative to clipboard using the current framework's sections.
   * Handles clipboard API failures gracefully.
   */
  const handleCopy = async () => {
    if (!star && !story?.sections) return;

    // Build copy text using framework-aware sections
    const textParts: string[] = [];

    for (const sectionKey of sectionKeys) {
      const label = sectionKey.toUpperCase();
      let content = '';

      // Try story.sections first (framework-specific)
      if (useStorySections && story?.sections?.[sectionKey]) {
        content = story.sections[sectionKey].summary || '';
      } else if (star) {
        // Fallback to STAR structure with mapping
        const starKey = mapSectionToStarKey(sectionKey);
        content = star[starKey]?.text || '';
      }

      if (content) {
        textParts.push(`${label}:\n${content}`);
      }
    }

    const text = textParts.join('\n\n');

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setCopyError(false);

      // Clear any existing timeout
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }

      // Reset copied state after delay
      copyTimeoutRef.current = setTimeout(() => {
        setCopied(false);
      }, TIMING.COPY_FEEDBACK_MS);
    } catch (err) {
      // Clipboard API can fail due to permissions or browser support
      console.warn('Failed to copy to clipboard:', err);
      setCopyError(true);

      // Reset error state after delay
      copyTimeoutRef.current = setTimeout(() => {
        setCopyError(false);
      }, TIMING.COPY_FEEDBACK_MS);
    }
  };

  const handleSave = () => {
    if (onSave) {
      onSave(edits);
    }
    setIsEditing(false);
  };

  const handlePublish = () => {
    if (onPublish) {
      onPublish(selectedVisibility, edits);
    }
  };

  const handleVisibilityChange = (value: StoryVisibility) => {
    setSelectedVisibility(value);
    if (story?.isPublished && onVisibilityChange) {
      onVisibilityChange(value);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <Card data-testid="star-preview-loading">
        <CardHeader>
          <CardTitle className="text-lg">{clusterName}</CardTitle>
          <p className="text-sm text-gray-500">Generating STAR...</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {['SITUATION', 'TASK', 'ACTION', 'RESULT'].map((section) => (
              <div key={section}>
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-2" />
                <div className="space-y-2">
                  <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Validation failed state
  if (result && !star) {
    return (
      <Card data-testid="star-preview-error">
        <CardHeader>
          <CardTitle className="text-lg">{clusterName}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Can't generate STAR
            </h3>
            <p className="text-sm text-gray-600 mb-4 max-w-sm">
              This cluster needs more data to create a meaningful story.
            </p>
            {result.failedGates && result.failedGates.length > 0 && (
              <ul className="text-sm text-gray-600 list-disc list-inside mb-4">
                {result.failedGates.map((gate, idx) => (
                  <li key={idx}>{gate}</li>
                ))}
              </ul>
            )}
            <p className="text-sm text-gray-500">
              Try adding more related work or merging with another cluster.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No result yet (placeholder)
  if (!result || !star) {
    return (
      <Card data-testid="star-preview-placeholder">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <span className="text-3xl">📁</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Select a cluster to preview
          </h3>
          <p className="text-sm text-gray-500 max-w-xs">
            Choose a cluster from the list and generate a STAR narrative for your interview preparation.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Compute story status from confidence
  const storyStatus = getStoryStatus(star.overallConfidence);

  // Full STAR display
  return (
    <Card data-testid="star-preview" aria-live="polite">
      {/* Compact Header with all actions */}
      <CardHeader className="pb-2">
        {/* Row 1: Title + Status + Actions */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <CardTitle className="text-lg truncate">{clusterName}</CardTitle>
            <StoryStatusBadge status={storyStatus} />
          </div>
          {/* All actions in header - subtle */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <RegenerateButton
              currentFramework={framework}
              onRegenerate={onRegenerate}
              onFrameworkChange={onFrameworkChange}
              isLoading={isLoading}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
              data-testid="edit-star"
              title="Edit"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              data-testid="copy-star"
              title={copied ? 'Copied!' : 'Copy to clipboard'}
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : copyError ? (
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
            {onPublish && (
              <>
                {story?.isPublished ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onUnpublish?.()}
                    disabled={isPublishing}
                    title="Unpublish"
                    className="text-green-600"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePublish}
                    disabled={isPublishing}
                    title="Publish"
                  >
                    {isPublishing ? <RefreshCw className="h-4 w-4 animate-spin" /> : '📤'}
                  </Button>
                )}
              </>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                disabled={isDeleting}
                title="Delete"
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                🗑️
              </Button>
            )}
          </div>
        </div>

        {/* Row 2: Meta info + Framework selector */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>{activityCount} activities</span>
            {formatDateRange() && (
              <>
                <span>•</span>
                <span>{formatDateRange()}</span>
              </>
            )}
            {toolTypes.length > 0 && (
              <>
                <span>•</span>
                <div className="flex items-center gap-1">
                  {toolTypes.slice(0, DISPLAY_LIMITS.TOOL_ICONS_PREVIEW).map((tool, idx) => (
                    <ToolIcon key={`${tool}-${idx}`} tool={tool} className="w-4 h-4 text-[8px]" />
                  ))}
                </div>
              </>
            )}
          </div>
          <FrameworkSelector
            value={framework}
            onChange={onFrameworkChange}
            disabled={isLoading}
          />
        </div>

        {/* Progress Bar - compact */}
        <div className="mt-3">
          <FrameworkProgressBar
            sections={sectionKeys}
            getSectionConfidence={(key) => {
              if (useStorySections && story?.sections?.[key]) {
                return story.sections[key].summary ? 0.8 : 0.3;
              }
              const starKey = key as keyof Pick<typeof star, 'situation' | 'task' | 'action' | 'result'>;
              return star?.[starKey]?.confidence ?? 0.3;
            }}
          />
        </div>
      </CardHeader>

      <CardContent className="pt-2">

        {/* Render sections dynamically based on framework */}
        {sectionKeys.map((sectionKey) => {
          // Get section data from story or star
          let component: STARComponent;
          if (useStorySections && story?.sections?.[sectionKey]) {
            const section = story.sections[sectionKey];
            component = {
              text: section.summary || `${sectionKey}: details pending`,
              sources: section.evidence?.map((e) => e.activityId) || [],
              confidence: section.summary ? 0.8 : 0.3,
            };
          } else {
            // Fallback to STAR structure with mapping
            const starKey = mapSectionToStarKey(sectionKey);
            component = star?.[starKey] || { text: `${sectionKey}: details pending`, sources: [], confidence: 0.3 };
          }

          // Get evidence descriptions from story sections if available
          const evidenceDescriptions = useStorySections && story?.sections?.[sectionKey]?.evidence
            ? story.sections[sectionKey].evidence
            : [];

          return (
            <STARSection
              key={sectionKey}
              label={capitalizeFirst(sectionKey)}
              component={component}
              isEditing={isEditing}
              editValue={edits[sectionKey] || ''}
              onEditChange={(v) => setEdits({ ...edits, [sectionKey]: v })}
              activities={activities}
              evidenceDescriptions={evidenceDescriptions}
            />
          );
        })}

        {/* Suggested Edits (What's Missing) - only show if there are suggestions */}
        {star?.suggestedEdits && star.suggestedEdits.length > 0 && (
          <SuggestedEdits edits={star.suggestedEdits} />
        )}

        {/* Minimal footer - edit save button + polish indicator */}
        <div className="flex items-center justify-between pt-3 mt-2 border-t border-gray-100">
          <div className="flex items-center gap-3">
            {isEditing && (
              <Button
                size="sm"
                onClick={handleSave}
                data-testid="save-star"
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            )}
            {isEditing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            {result.polishStatus === 'success' && (
              <span className="flex items-center gap-1">
                <Check className="h-3 w-3 text-green-500" />
                AI polished
              </span>
            )}
            {story?.isPublished && (
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle2 className="h-3 w-3" />
                Published
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
