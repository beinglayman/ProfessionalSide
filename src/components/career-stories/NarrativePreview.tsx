/**
 * NarrativePreview Component
 *
 * Displays career story narratives with a clean, story-focused design.
 * Built for real-world use: job negotiations, promotions, and 1:1s.
 * Emphasizes readability, narrative flow, and interview preparation.
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
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Trash2,
  Share2,
  TrendingUp,
  MessageSquare,
  Play,
  Pause,
  RotateCcw,
  Mic,
  FileText,
  Linkedin,
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
} from '../../types/career-stories';
import { Button } from '../ui/button';
import { ToolIcon } from './ToolIcon';
import { FrameworkSelector } from './FrameworkSelector';
import { TIMING, DISPLAY_LIMITS, CONFIDENCE_THRESHOLDS, NARRATIVE_FRAMEWORKS } from './constants';

// =============================================================================
// TYPES & HELPERS
// =============================================================================

type StoryStatus = 'complete' | 'in-progress' | 'draft';

function getStoryStatus(confidence: number): StoryStatus {
  if (confidence >= CONFIDENCE_THRESHOLDS.HIGH) return 'complete';
  if (confidence >= CONFIDENCE_THRESHOLDS.MEDIUM) return 'in-progress';
  return 'draft';
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function mapSectionToStarKey(sectionKey: string): 'situation' | 'task' | 'action' | 'result' {
  const mapping: Record<string, 'situation' | 'task' | 'action' | 'result'> = {
    situation: 'situation',
    task: 'task',
    action: 'action',
    result: 'result',
    context: 'situation',
    challenge: 'situation',
    problem: 'situation',
    obstacles: 'task',
    hindrances: 'task',
    actions: 'action',
    objective: 'task',
    results: 'result',
    outcome: 'result',
    learning: 'result',
    evaluation: 'result',
  };
  return mapping[sectionKey.toLowerCase()] || 'result';
}

// Section descriptions and coaching tips for interviews
const SECTION_COACHING: Record<string, { description: string; tip: string; interviewNote: string }> = {
  situation: {
    description: 'Set the scene and context',
    tip: 'Keep it brief — 2-3 sentences max. Focus on business impact.',
    interviewNote: 'Interviewers want to understand scope. Mention team size, timeline, stakes.',
  },
  context: {
    description: 'Set the scene and context',
    tip: 'Keep it brief — 2-3 sentences max. Focus on business impact.',
    interviewNote: 'Interviewers want to understand scope. Mention team size, timeline, stakes.',
  },
  task: {
    description: 'Your specific responsibility',
    tip: 'Be clear about YOUR role, not the team\'s. Use "I", not "we".',
    interviewNote: 'This shows ownership. What were YOU accountable for?',
  },
  objective: {
    description: 'Your specific responsibility',
    tip: 'Be clear about YOUR role, not the team\'s. Use "I", not "we".',
    interviewNote: 'This shows ownership. What were YOU accountable for?',
  },
  action: {
    description: 'Steps you took',
    tip: 'This is the meat. Be specific. What tools, frameworks, approaches?',
    interviewNote: 'Hiring managers want to see HOW you think. Technical depth matters here.',
  },
  actions: {
    description: 'Steps you took',
    tip: 'This is the meat. Be specific. What tools, frameworks, approaches?',
    interviewNote: 'Hiring managers want to see HOW you think. Technical depth matters here.',
  },
  result: {
    description: 'Outcomes and impact',
    tip: 'Quantify everything. Revenue, time saved, users impacted, % improvements.',
    interviewNote: 'Numbers are memorable. "Reduced load time 40%" sticks; "made it faster" doesn\'t.',
  },
  results: {
    description: 'Outcomes and impact',
    tip: 'Quantify everything. Revenue, time saved, users impacted, % improvements.',
    interviewNote: 'Numbers are memorable. "Reduced load time 40%" sticks; "made it faster" doesn\'t.',
  },
  obstacles: {
    description: 'Challenges you faced',
    tip: 'Show problem-solving ability. What was blocking progress?',
    interviewNote: 'This demonstrates resilience. Every good story has conflict.',
  },
  hindrances: {
    description: 'Challenges you faced',
    tip: 'Show problem-solving ability. What was blocking progress?',
    interviewNote: 'This demonstrates resilience. Every good story has conflict.',
  },
  learning: {
    description: 'What you learned',
    tip: 'Show growth mindset. What would you do differently?',
    interviewNote: 'Senior roles require reflection. This shows maturity.',
  },
  evaluation: {
    description: 'Reflection on the outcome',
    tip: 'Be honest. What worked, what didn\'t?',
    interviewNote: 'Self-awareness is a senior trait. Don\'t oversell.',
  },
  challenge: {
    description: 'The problem to solve',
    tip: 'Frame it as a business problem, not a technical one.',
    interviewNote: 'Show you understand why this mattered to the business.',
  },
  problem: {
    description: 'The problem to solve',
    tip: 'Frame it as a business problem, not a technical one.',
    interviewNote: 'Show you understand why this mattered to the business.',
  },
};

// Extract metrics from text
function extractMetrics(text: string): string[] {
  const metricPattern = /(\d+(?:\.\d+)?[%xX]|\$\d+(?:,\d{3})*(?:\.\d+)?[KMB]?|\d+(?:,\d{3})*(?:\.\d+)?\s*(?:hours?|days?|weeks?|months?|minutes?|seconds?|ms|users?|customers?|engineers?|teams?|requests?|queries?|calls?|transactions?))/gi;
  const matches = text.match(metricPattern) || [];
  return [...new Set(matches)].slice(0, 6); // Dedupe and limit
}

// Estimate speaking time (avg 150 words per minute)
function estimateSpeakingTime(text: string): number {
  const words = text.trim().split(/\s+/).length;
  return Math.ceil((words / 150) * 60); // seconds
}

// Format time as mm:ss
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// =============================================================================
// STATUS BADGE
// =============================================================================

const StatusBadge: React.FC<{ status: StoryStatus }> = ({ status }) => {
  const config = {
    complete: {
      label: 'Interview Ready',
      icon: CheckCircle2,
      className: 'bg-green-50 text-green-700 border-green-200',
    },
    'in-progress': {
      label: 'Needs Polish',
      icon: Clock,
      className: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    draft: {
      label: 'Draft',
      icon: Lightbulb,
      className: 'bg-gray-50 text-gray-600 border-gray-200',
    },
  };

  const { label, icon: Icon, className } = config[status];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border',
        className
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
};

// =============================================================================
// PRACTICE MODE TIMER
// =============================================================================

interface PracticeTimerProps {
  totalSeconds: number;
  isActive: boolean;
  onToggle: () => void;
  onReset: () => void;
}

const PracticeTimer: React.FC<PracticeTimerProps> = ({
  totalSeconds,
  isActive,
  onToggle,
  onReset,
}) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive) {
      interval = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  const handleReset = () => {
    setElapsed(0);
    onReset();
  };

  const isOverTime = elapsed > totalSeconds;
  const idealRange = elapsed >= totalSeconds * 0.8 && elapsed <= totalSeconds * 1.2;

  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
      <Mic className={cn('h-3.5 w-3.5', isActive ? 'text-red-500 animate-pulse' : 'text-gray-400')} />
      <div className="flex items-center gap-2">
        <span className={cn(
          'font-mono text-sm font-semibold',
          isOverTime ? 'text-red-500' : idealRange ? 'text-green-600' : 'text-gray-900'
        )}>
          {formatTime(elapsed)}
        </span>
        <span className="text-xs text-gray-400">/ {formatTime(totalSeconds)}</span>
      </div>
      <div className="flex items-center gap-1 ml-auto">
        <button
          onClick={onToggle}
          className={cn(
            'p-1.5 rounded transition-colors',
            isActive ? 'bg-red-100 text-red-600' : 'bg-primary-100 text-primary-600'
          )}
        >
          {isActive ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </button>
        <button onClick={handleReset} className="p-1.5 rounded bg-gray-100 text-gray-600 hover:bg-gray-200">
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

// =============================================================================
// KEY METRICS (Compact inline)
// =============================================================================

interface KeyMetricsProps {
  metrics: string[];
}

const KeyMetrics: React.FC<KeyMetricsProps> = ({ metrics }) => {
  if (metrics.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
        <TrendingUp className="h-3 w-3" />
        Key numbers:
      </span>
      {metrics.slice(0, 4).map((metric, idx) => (
        <span
          key={idx}
          className="inline-flex items-center px-2 py-0.5 bg-primary-50 rounded text-xs font-semibold text-primary-700"
        >
          {metric}
        </span>
      ))}
    </div>
  );
};

// =============================================================================
// COPY FORMAT SELECTOR
// =============================================================================

type CopyFormat = 'interview' | 'linkedin' | 'resume' | 'raw';

interface CopyMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onCopy: (format: CopyFormat) => void;
}

const CopyMenu: React.FC<CopyMenuProps> = ({ isOpen, onClose, onCopy }) => {
  if (!isOpen) return null;

  const formats: { id: CopyFormat; label: string; icon: React.ElementType; description: string }[] = [
    { id: 'interview', label: 'Interview Format', icon: MessageSquare, description: 'Full STAR with context' },
    { id: 'linkedin', label: 'LinkedIn Post', icon: Linkedin, description: 'Engaging story format' },
    { id: 'resume', label: 'Resume Bullet', icon: FileText, description: 'Concise achievement' },
    { id: 'raw', label: 'Plain Text', icon: Copy, description: 'Just the content' },
  ];

  return (
    <div className="absolute right-0 top-full mt-1 z-50 w-64 bg-white rounded-xl shadow-lg border border-gray-200 py-2">
      {formats.map((fmt) => (
        <button
          key={fmt.id}
          onClick={() => { onCopy(fmt.id); onClose(); }}
          className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
        >
          <fmt.icon className="h-4 w-4 text-gray-400" />
          <div>
            <div className="text-sm font-medium text-gray-900">{fmt.label}</div>
            <div className="text-xs text-gray-500">{fmt.description}</div>
          </div>
        </button>
      ))}
    </div>
  );
};

// =============================================================================
// NARRATIVE SECTION (Main content block)
// =============================================================================

interface NarrativeSectionProps {
  sectionKey: string;
  label: string;
  content: string;
  confidence: number;
  isEditing: boolean;
  editValue: string;
  onEditChange: (value: string) => void;
  activities?: ToolActivity[];
  sourceIds?: string[];
  isFirst?: boolean;
  showCoaching?: boolean;
}

const NarrativeSection: React.FC<NarrativeSectionProps> = ({
  sectionKey,
  label,
  content,
  confidence,
  isEditing,
  editValue,
  onEditChange,
  activities = [],
  sourceIds = [],
  isFirst = false,
  showCoaching = false,
}) => {
  const [showEvidence, setShowEvidence] = useState(false);
  const sourceActivities = activities.filter((a) => sourceIds.includes(a.id));
  const hasEvidence = sourceActivities.length > 0;
  const coaching = SECTION_COACHING[sectionKey.toLowerCase()];

  // Highlight metrics in text
  const renderContent = (text: string) => {
    const metricPattern = /(\d+(?:\.\d+)?[%xX]|\$\d+(?:,\d{3})*(?:\.\d+)?[KMB]?|\d+(?:,\d{3})*(?:\.\d+)?\s*(?:hours?|days?|weeks?|months?|minutes?|seconds?|ms|users?|customers?|engineers?|teams?|requests?|queries?))/gi;
    const parts = text.split(metricPattern);

    return parts.map((part, idx) => {
      if (metricPattern.test(part)) {
        return (
          <span key={idx} className="font-semibold text-primary-700 bg-primary-50/70 px-0.5 rounded">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className={cn('relative', !isFirst && 'pt-4')}>
      {/* Editorial layout: margin notes + main content */}
      <div className={cn('flex gap-4', showCoaching ? 'flex-row' : 'flex-col')}>
        {/* Margin notes (coaching tips) - only shown when coaching enabled */}
        {showCoaching && coaching && (
          <div className="hidden lg:block w-40 flex-shrink-0 -ml-2">
            <div className="sticky top-20 text-[11px] leading-relaxed text-gray-500 italic">
              <p className="mb-2">{coaching.tip}</p>
              <p className="text-amber-700/80 not-italic font-medium">
                {coaching.interviewNote}
              </p>
            </div>
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Section header */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-semibold text-gray-900">{label}</span>
            {coaching?.description && !showCoaching && (
              <span className="text-xs text-gray-400 hidden sm:inline">
                — {coaching.description}
              </span>
            )}
          </div>

          {/* Content */}
          {isEditing ? (
            <div>
              <textarea
                value={editValue}
                onChange={(e) => onEditChange(e.target.value)}
                className={cn(
                  'w-full p-3 border border-gray-200 rounded-lg text-sm resize-none',
                  'focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
                  'bg-white transition-shadow'
                )}
                rows={3}
                placeholder={`Describe the ${label.toLowerCase()}...`}
              />
              {coaching && (
                <p className="mt-1.5 text-[11px] text-gray-500 italic">
                  {coaching.tip}
                </p>
              )}
            </div>
          ) : (
            <div className="relative">
              <p className="text-[14px] leading-[1.7] text-gray-700">
                {renderContent(content)}
              </p>

              {/* Evidence toggle */}
              {hasEvidence && (
                <button
                  onClick={() => setShowEvidence(!showEvidence)}
                  className={cn(
                    'mt-2 inline-flex items-center gap-1 text-[11px] font-medium',
                    'text-gray-400 hover:text-primary-600 transition-colors'
                  )}
                >
                  {showEvidence ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                  {sourceActivities.length} source{sourceActivities.length > 1 ? 's' : ''}
                </button>
              )}

              {/* Evidence list - compact */}
              {showEvidence && hasEvidence && (
                <div className="mt-2 pl-3 border-l border-gray-200">
                  <div className="space-y-1">
                    {sourceActivities.slice(0, 4).map((activity) => (
                      <a
                        key={activity.id}
                        href={activity.sourceUrl || '#'}
                        target={activity.sourceUrl ? '_blank' : undefined}
                        rel={activity.sourceUrl ? 'noopener noreferrer' : undefined}
                        className={cn(
                          'flex items-center gap-1.5 py-1 text-[11px] text-gray-500',
                          'hover:text-gray-900 transition-colors group',
                          !activity.sourceUrl && 'cursor-default hover:text-gray-500'
                        )}
                        onClick={(e) => !activity.sourceUrl && e.preventDefault()}
                      >
                        <ToolIcon tool={activity.source} className="w-3 h-3 text-[6px]" />
                        <span className="truncate">{activity.title}</span>
                        {activity.sourceUrl && (
                          <ExternalLink className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100" />
                        )}
                      </a>
                    ))}
                    {sourceActivities.length > 4 && (
                      <span className="text-[10px] text-gray-400">
                        +{sourceActivities.length - 4} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Mobile coaching tip - shown inline on smaller screens */}
              {showCoaching && coaching && (
                <div className="lg:hidden mt-3 p-2 bg-amber-50/50 rounded border-l-2 border-amber-200">
                  <p className="text-[11px] text-amber-800 italic">{coaching.interviewNote}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

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
  isSaving?: boolean;
  isPublishing?: boolean;
  onDelete?: () => void;
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
}: NarrativePreviewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [showCopyMenu, setShowCopyMenu] = useState(false);
  const [practiceMode, setPracticeMode] = useState(true); // On by default
  const [timerActive, setTimerActive] = useState(false);
  const [showCoaching, setShowCoaching] = useState(true); // On by default
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const copyMenuRef = useRef<HTMLDivElement>(null);

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

  // Close copy menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (copyMenuRef.current && !copyMenuRef.current.contains(e.target as Node)) {
        setShowCopyMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const handleCopy = useCallback(async (format: CopyFormat = 'raw') => {
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

    let textToCopy = '';

    switch (format) {
      case 'interview': {
        // Full structured format for interview prep
        const parts: string[] = [`# ${clusterName}`, ''];
        for (const key of sectionKeys) {
          const content = getSectionContent(key);
          if (content) {
            parts.push(`## ${capitalizeFirst(key)}`);
            parts.push(content);
            parts.push('');
          }
        }
        if (keyMetrics.length > 0) {
          parts.push('## Key Numbers to Remember');
          parts.push(keyMetrics.join(' | '));
        }
        textToCopy = parts.join('\n');
        break;
      }
      case 'linkedin': {
        // Engaging story format for LinkedIn
        const situation = getSectionContent('situation') || getSectionContent('context') || getSectionContent('challenge');
        const action = getSectionContent('action') || getSectionContent('actions');
        const result = getSectionContent('result') || getSectionContent('results');

        const parts = [
          `🎯 ${clusterName}`,
          '',
          situation ? `The challenge: ${situation}` : '',
          '',
          action ? `What I did: ${action}` : '',
          '',
          result ? `The result: ${result}` : '',
          '',
          keyMetrics.length > 0 ? `📊 ${keyMetrics.slice(0, 3).join(' • ')}` : '',
          '',
          '#careerjourney #techleadership #growthmindset',
        ].filter(Boolean);
        textToCopy = parts.join('\n');
        break;
      }
      case 'resume': {
        // Single powerful bullet point
        const action = getSectionContent('action') || getSectionContent('actions');
        const result = getSectionContent('result') || getSectionContent('results');
        const metrics = keyMetrics.slice(0, 2).join(', ');

        const actionVerb = action.split(' ')[0] || 'Led';
        const resultSummary = result.split('.')[0] || result;

        textToCopy = `• ${actionVerb} ${clusterName.toLowerCase()}, resulting in ${resultSummary}${metrics ? ` (${metrics})` : ''}`;
        break;
      }
      default: {
        // Raw format
        const parts: string[] = [];
        for (const key of sectionKeys) {
          const content = getSectionContent(key);
          if (content) parts.push(`${capitalizeFirst(key)}:\n${content}`);
        }
        textToCopy = parts.join('\n\n');
      }
    }

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setCopied(false), TIMING.COPY_FEEDBACK_MS);
    } catch (err) {
      console.warn('Failed to copy:', err);
    }
  }, [star, story, useStorySections, sectionKeys, clusterName, keyMetrics]);

  const handleSave = () => {
    onSave?.(edits);
    setIsEditing(false);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden" data-testid="star-preview-loading">
        <div className="p-6 border-b border-gray-100">
          <div className="h-6 w-48 bg-gray-100 rounded animate-pulse" />
          <div className="h-4 w-32 bg-gray-100 rounded animate-pulse mt-2" />
        </div>
        <div className="p-6 space-y-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-3">
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
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden" data-testid="star-preview-error">
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
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden" data-testid="star-preview-placeholder">
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
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden" data-testid="star-preview">
      {/* Compact Header */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-gray-900 truncate">{clusterName}</h2>
              <StatusBadge status={storyStatus} />
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
              <span>{activityCount} activities</span>
              {formatDateRange() && (
                <>
                  <span className="text-gray-300">•</span>
                  <span>{formatDateRange()}</span>
                </>
              )}
              <span className="text-gray-300">•</span>
              <span>~{formatTime(estimatedTime)}</span>
            </div>
          </div>
          <FrameworkSelector
            value={framework}
            onChange={onFrameworkChange}
            disabled={isLoading}
          />
        </div>

        {/* Key Metrics inline */}
        {keyMetrics.length > 0 && !isEditing && (
          <div className="mt-2 pt-2 border-t border-gray-50">
            <KeyMetrics metrics={keyMetrics} />
          </div>
        )}
      </div>

      {/* Compact Toolbar */}
      <div className="px-4 py-2 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={onRegenerate}
            disabled={isLoading}
            className="h-7 text-xs text-gray-600"
          >
            <RefreshCw className={cn('h-3.5 w-3.5 mr-1', isLoading && 'animate-spin')} />
            Regenerate
          </Button>
          <Button
            variant={isEditing ? 'default' : 'outline'}
            size="sm"
            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
            disabled={isSaving}
            className={cn('h-7 text-xs', !isEditing && 'text-gray-600')}
          >
            {isEditing ? (isSaving ? 'Saving...' : 'Save') : 'Edit'}
          </Button>
          {isEditing && (
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} className="h-7 text-xs text-gray-500">
              Cancel
            </Button>
          )}
          <div className="w-px h-5 bg-gray-200 mx-1" />
          <button
            onClick={() => setShowCoaching(!showCoaching)}
            className={cn(
              'h-7 px-2 rounded text-xs font-medium transition-colors',
              showCoaching ? 'bg-amber-100 text-amber-700' : 'text-gray-500 hover:bg-gray-100'
            )}
            title="Show interview coaching tips"
          >
            <Lightbulb className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => { setPracticeMode(!practiceMode); setTimerActive(false); }}
            className={cn(
              'h-7 px-2 rounded text-xs font-medium transition-colors',
              practiceMode ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:bg-gray-100'
            )}
            title="Practice mode with timer"
          >
            <Mic className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-0.5">
          <div className="relative" ref={copyMenuRef}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCopyMenu(!showCopyMenu)}
              className={cn('h-7 px-2', copied ? 'text-green-500' : 'text-gray-500')}
              title="Copy to clipboard"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
            <CopyMenu isOpen={showCopyMenu} onClose={() => setShowCopyMenu(false)} onCopy={handleCopy} />
          </div>
          {story?.isPublished ? (
            <Button variant="ghost" size="sm" onClick={() => onUnpublish?.()} disabled={isPublishing} className="h-7 px-2 text-green-600" title="Unpublish">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </Button>
          ) : onPublish && (
            <Button variant="ghost" size="sm" onClick={() => onPublish('private', edits)} disabled={isPublishing} className="h-7 px-2 text-gray-500" title="Publish">
              <Share2 className="h-3.5 w-3.5" />
            </Button>
          )}
          {onDelete && (
            <Button variant="ghost" size="sm" onClick={onDelete} disabled={isDeleting} className="h-7 px-2 text-gray-400 hover:text-red-500" title="Delete">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Practice Timer (only when active) */}
      {practiceMode && (
        <div className="px-4 py-2 border-b border-gray-100">
          <PracticeTimer
            totalSeconds={estimatedTime}
            isActive={timerActive}
            onToggle={() => setTimerActive(!timerActive)}
            onReset={() => setTimerActive(false)}
          />
        </div>
      )}

      {/* Narrative Content - with editorial margin layout when coaching is on */}
      <div className={cn(
        'py-4 divide-y divide-gray-100',
        showCoaching ? 'px-4 lg:pl-6 lg:pr-4' : 'px-4'
      )}>
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

          return (
            <NarrativeSection
              key={sectionKey}
              sectionKey={sectionKey}
              label={capitalizeFirst(sectionKey)}
              content={component.text}
              confidence={component.confidence}
              isEditing={isEditing}
              editValue={edits[sectionKey] || ''}
              onEditChange={(v) => setEdits({ ...edits, [sectionKey]: v })}
              activities={activities}
              sourceIds={component.sources}
              isFirst={idx === 0}
              showCoaching={showCoaching}
            />
          );
        })}
      </div>

      {/* Footer */}
      {(star?.suggestedEdits?.length > 0 || result.polishStatus === 'success') && (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs text-gray-500">
            {result.polishStatus === 'success' && (
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary-500" />
                AI-enhanced narrative
              </span>
            )}
            {star?.suggestedEdits?.length > 0 && (
              <span className="flex items-center gap-1.5 text-amber-600">
                <Lightbulb className="h-3.5 w-3.5" />
                {star.suggestedEdits.length} suggestion{star.suggestedEdits.length > 1 ? 's' : ''} to improve
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
