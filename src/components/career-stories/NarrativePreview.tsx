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
  ChevronDown,
  ChevronRight,
  Sparkles,
  Trash2,
  Share2,
  TrendingUp,
  Play,
  Pause,
  RotateCcw,
  Mic,
  FileText,
  HelpCircle,
  X,
  Type,
  Info,
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
import { SourceCoverageHeader } from './SourceCoverageHeader';
import { DerivationHistory } from './DerivationHistory';
import { useAddStorySource, useUpdateStorySource } from '../../hooks/useCareerStories';
import { ToolIcon } from './ToolIcon';
import { FrameworkSelector } from './FrameworkSelector';
import { TIMING, CONFIDENCE_THRESHOLDS, NARRATIVE_FRAMEWORKS } from './constants';

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

// Delivery cues for narrative sections - storytelling techniques
const DELIVERY_CUES: Record<string, { openingCue: string; closingCue: string; emphasis: string[] }> = {
  situation: {
    openingCue: '[PAUSE] Set the scene...',
    closingCue: '[BRIEF PAUSE] before transitioning',
    emphasis: ['team size', 'timeline', 'stakes', 'scope', 'company', 'revenue', 'users'],
  },
  context: {
    openingCue: '[PAUSE] Paint the picture...',
    closingCue: '[BRIEF PAUSE]',
    emphasis: ['team size', 'timeline', 'stakes', 'scope', 'company', 'revenue', 'users'],
  },
  challenge: {
    openingCue: '[LEAN IN] Here was the problem...',
    closingCue: '[PAUSE for effect]',
    emphasis: ['broken', 'failing', 'blocked', 'urgent', 'critical', 'impossible'],
  },
  problem: {
    openingCue: '[LEAN IN] Here was the problem...',
    closingCue: '[PAUSE for effect]',
    emphasis: ['broken', 'failing', 'blocked', 'urgent', 'critical', 'impossible'],
  },
  task: {
    openingCue: '[CONFIDENT TONE] My responsibility was...',
    closingCue: '[BRIEF PAUSE]',
    emphasis: ['I', 'my', 'led', 'owned', 'responsible', 'accountable'],
  },
  objective: {
    openingCue: '[CONFIDENT TONE] My goal was...',
    closingCue: '[BRIEF PAUSE]',
    emphasis: ['I', 'my', 'led', 'owned', 'responsible', 'accountable'],
  },
  obstacles: {
    openingCue: '[SLOWER PACE] The challenges were...',
    closingCue: '[PAUSE] But here\'s what I did...',
    emphasis: ['blocked', 'failed', 'struggled', 'difficult', 'complex'],
  },
  hindrances: {
    openingCue: '[SLOWER PACE] The blockers were...',
    closingCue: '[PAUSE] Here\'s how I overcame them...',
    emphasis: ['blocked', 'failed', 'struggled', 'difficult', 'complex'],
  },
  action: {
    openingCue: '[ENERGETIC] Here\'s what I did...',
    closingCue: '[BRIEF PAUSE before results]',
    emphasis: ['built', 'designed', 'implemented', 'created', 'refactored', 'optimized', 'led'],
  },
  actions: {
    openingCue: '[ENERGETIC] Here\'s what I did...',
    closingCue: '[BRIEF PAUSE before results]',
    emphasis: ['built', 'designed', 'implemented', 'created', 'refactored', 'optimized', 'led'],
  },
  result: {
    openingCue: '[PROUD TONE] The impact was...',
    closingCue: '[PAUSE] [SMILE]',
    emphasis: ['%', 'x', 'reduced', 'increased', 'saved', 'improved', 'revenue', 'users'],
  },
  results: {
    openingCue: '[PROUD TONE] The impact was...',
    closingCue: '[PAUSE] [SMILE]',
    emphasis: ['%', 'x', 'reduced', 'increased', 'saved', 'improved', 'revenue', 'users'],
  },
  learning: {
    openingCue: '[REFLECTIVE] What I learned...',
    closingCue: '[THOUGHTFUL PAUSE]',
    emphasis: ['learned', 'realized', 'discovered', 'now I', 'differently'],
  },
  evaluation: {
    openingCue: '[REFLECTIVE] Looking back...',
    closingCue: '[THOUGHTFUL PAUSE]',
    emphasis: ['worked', 'didn\'t', 'better', 'next time', 'improved'],
  },
};

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

// Section-specific fix guidance for the coach review panel
const SECTION_FIX: Record<string, string> = {
  situation: 'Add concrete stakes — dollars, users, or strategic risk of inaction. Make the reader feel the urgency.',
  context: 'Add concrete stakes — dollars, users, or strategic risk of inaction. Make the reader feel the urgency.',
  challenge: 'Frame the business problem, not the technical one. What happens if this doesn\'t get solved?',
  problem: 'Frame the business problem, not the technical one. What happens if this doesn\'t get solved?',
  task: 'Be explicit about YOUR role. Use "I", not "we". Name what you were accountable for delivering.',
  objective: 'Be explicit about YOUR goal. Use "I", not "we". Name the measurable target you owned.',
  obstacles: 'Make the obstacle specific and real. What exactly was blocking progress, and why was it hard?',
  hindrances: 'Name the specific blockers. Generic "challenges" don\'t demonstrate problem-solving ability.',
  action: 'Name the methodology, sample size, tools, and your specific influence on the team\'s direction.',
  actions: 'Name the methodology, sample size, tools, and your specific influence on the team\'s direction.',
  result: 'Lead with the quantified outcome: metric + baseline + timeframe. Past tense only. No "will" or "expected to".',
  results: 'Lead with the quantified outcome: metric + baseline + timeframe. Past tense only. No "will" or "expected to".',
  learning: 'Show growth mindset — name what you\'d do differently and why. Self-awareness is a senior trait.',
  evaluation: 'Be honest about what worked and what didn\'t. Overselling is a red flag at senior levels.',
  outcome: 'Contextualize the impact: metric + baseline + timeframe. "241% of benchmarks" needs a denominator.',
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
// SHARED SECTION COLOR MAP
// Single source of truth for section identity colors.
// Used by PracticeTimer, NarrativeSection (accent), NarrativeSectionHeader.
// =============================================================================

interface SectionColor {
  bg: string;       // bg-{color}-500 — dot, progress bar, horizontal rule
  text: string;     // text-{color}-600 — label
  topBorder: string; // border-t-{color}-500 — card top accent
  headerBorder: string; // border-b-{color}-500 — header underline
  ratingBg: string;  // bg-{color}-50 — rating badge background
  ratingText: string; // text-{color}-700 — rating badge text
}

const SECTION_COLORS: Record<string, SectionColor> = {
  situation:  { bg: 'bg-blue-500',   text: 'text-blue-600',   topBorder: 'border-t-blue-500',   headerBorder: 'border-b-blue-500',   ratingBg: 'bg-blue-50',   ratingText: 'text-blue-700' },
  context:    { bg: 'bg-blue-500',   text: 'text-blue-600',   topBorder: 'border-t-blue-500',   headerBorder: 'border-b-blue-500',   ratingBg: 'bg-blue-50',   ratingText: 'text-blue-700' },
  challenge:  { bg: 'bg-blue-500',   text: 'text-blue-600',   topBorder: 'border-t-blue-500',   headerBorder: 'border-b-blue-500',   ratingBg: 'bg-blue-50',   ratingText: 'text-blue-700' },
  problem:    { bg: 'bg-blue-500',   text: 'text-blue-600',   topBorder: 'border-t-blue-500',   headerBorder: 'border-b-blue-500',   ratingBg: 'bg-blue-50',   ratingText: 'text-blue-700' },
  task:       { bg: 'bg-amber-500',  text: 'text-amber-600',  topBorder: 'border-t-amber-500',  headerBorder: 'border-b-amber-500',  ratingBg: 'bg-amber-50',  ratingText: 'text-amber-700' },
  objective:  { bg: 'bg-amber-500',  text: 'text-amber-600',  topBorder: 'border-t-amber-500',  headerBorder: 'border-b-amber-500',  ratingBg: 'bg-amber-50',  ratingText: 'text-amber-700' },
  obstacles:  { bg: 'bg-rose-500',   text: 'text-rose-600',   topBorder: 'border-t-rose-500',   headerBorder: 'border-b-rose-500',   ratingBg: 'bg-rose-50',   ratingText: 'text-rose-700' },
  hindrances: { bg: 'bg-rose-500',   text: 'text-rose-600',   topBorder: 'border-t-rose-500',   headerBorder: 'border-b-rose-500',   ratingBg: 'bg-rose-50',   ratingText: 'text-rose-700' },
  action:     { bg: 'bg-purple-500', text: 'text-purple-600', topBorder: 'border-t-purple-500', headerBorder: 'border-b-purple-500', ratingBg: 'bg-purple-50', ratingText: 'text-purple-700' },
  actions:    { bg: 'bg-purple-500', text: 'text-purple-600', topBorder: 'border-t-purple-500', headerBorder: 'border-b-purple-500', ratingBg: 'bg-purple-50', ratingText: 'text-purple-700' },
  result:     { bg: 'bg-red-500',    text: 'text-red-600',    topBorder: 'border-t-red-500',    headerBorder: 'border-b-red-500',    ratingBg: 'bg-red-50',    ratingText: 'text-red-700' },
  results:    { bg: 'bg-red-500',    text: 'text-red-600',    topBorder: 'border-t-red-500',    headerBorder: 'border-b-red-500',    ratingBg: 'bg-red-50',    ratingText: 'text-red-700' },
  learning:   { bg: 'bg-indigo-500', text: 'text-indigo-600', topBorder: 'border-t-indigo-500', headerBorder: 'border-b-indigo-500', ratingBg: 'bg-indigo-50', ratingText: 'text-indigo-700' },
  evaluation: { bg: 'bg-indigo-500', text: 'text-indigo-600', topBorder: 'border-t-indigo-500', headerBorder: 'border-b-indigo-500', ratingBg: 'bg-indigo-50', ratingText: 'text-indigo-700' },
  outcome:    { bg: 'bg-violet-500', text: 'text-violet-600', topBorder: 'border-t-violet-500', headerBorder: 'border-b-violet-500', ratingBg: 'bg-violet-50', ratingText: 'text-violet-700' },
};

const DEFAULT_SECTION_COLOR: SectionColor = { bg: 'bg-gray-400', text: 'text-gray-600', topBorder: 'border-t-gray-400', headerBorder: 'border-b-gray-400', ratingBg: 'bg-gray-50', ratingText: 'text-gray-600' };

function getSectionColor(key: string): SectionColor {
  return SECTION_COLORS[key.toLowerCase()] || DEFAULT_SECTION_COLOR;
}

// =============================================================================
// STATUS BADGE
// =============================================================================

interface StatusBadgeProps {
  status: StoryStatus;
  confidence?: number;
  suggestedEdits?: string[];
}

const STATUS_DESCRIPTIONS: Record<StoryStatus, { summary: string; detail: string }> = {
  complete: {
    summary: 'This story is interview-ready.',
    detail: 'Strong narrative with quantified impact, clear ownership, and specific details. Ready to use in interviews, performance reviews, or promotion packets.',
  },
  'in-progress': {
    summary: 'This story needs more polish before it\'s interview-ready.',
    detail: 'The narrative structure is there, but some sections lack specifics. Add concrete numbers, clarify your individual role, or strengthen the impact statement.',
  },
  draft: {
    summary: 'This story is still a rough draft.',
    detail: 'Most sections need more detail. Focus on adding specific metrics, naming the tools and approaches you used, and quantifying your impact.',
  },
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, confidence, suggestedEdits = [] }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const config = {
    complete: {
      label: 'Interview Ready',
      dotColor: 'bg-emerald-500',
      pillClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      barColor: 'bg-emerald-500',
    },
    'in-progress': {
      label: 'Needs Polish',
      dotColor: 'bg-amber-500',
      pillClass: 'bg-amber-50/80 text-amber-700 border-amber-200/80',
      barColor: 'bg-amber-500',
    },
    draft: {
      label: 'Draft',
      dotColor: 'bg-gray-400',
      pillClass: 'bg-gray-50 text-gray-500 border-gray-200',
      barColor: 'bg-gray-400',
    },
  };

  const { label, dotColor, pillClass, barColor } = config[status];
  const pct = confidence !== undefined ? Math.round(confidence * 100) : 0;
  const statusInfo = STATUS_DESCRIPTIONS[status];

  return (
    <span
      className="relative inline-flex items-center gap-2.5"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Status pill */}
      <span className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.5px] rounded border cursor-help',
        pillClass,
      )}>
        <span className={cn('w-[6px] h-[6px] rounded-full', dotColor)} />
        {label}
      </span>

      {/* Score bar — compact inline */}
      {confidence !== undefined && (
        <span className="inline-flex items-center gap-1.5">
          <span className="w-16 h-[5px] rounded-full bg-gray-200 overflow-hidden">
            <span className={cn('h-full rounded-full transition-all duration-700', barColor)} style={{ width: `${pct}%` }} />
          </span>
          <span className={cn('text-[11px] font-semibold tabular-nums', {
            'text-emerald-600': pct >= 75,
            'text-amber-600': pct >= 40 && pct < 75,
            'text-gray-400': pct < 40,
          })}>{pct}%</span>
        </span>
      )}

      {/* Tooltip — always shows context-rich information */}
      {showTooltip && (
        <div className="absolute top-full left-0 mt-1.5 z-30 w-80 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className={cn(
            'px-4 py-2.5 border-b',
            status === 'complete' ? 'bg-emerald-50 border-emerald-100' :
            status === 'in-progress' ? 'bg-amber-50 border-amber-100' :
            'bg-gray-50 border-gray-100'
          )}>
            <div className="flex items-center gap-2">
              <span className={cn('w-2 h-2 rounded-full', dotColor)} />
              <span className="text-sm font-semibold text-gray-900">{label}</span>
              {confidence !== undefined && (
                <span className="text-xs text-gray-500 ml-auto">{pct}% confidence</span>
              )}
            </div>
            <p className="text-xs text-gray-600 mt-1 leading-relaxed">{statusInfo.summary}</p>
          </div>

          {/* Detail */}
          <div className="px-4 py-3">
            <p className="text-xs text-gray-500 leading-relaxed">{statusInfo.detail}</p>

            {/* Suggested improvements */}
            {suggestedEdits.length > 0 && (
              <div className="mt-3 pt-2 border-t border-gray-100">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 block mb-1.5">
                  How to improve
                </span>
                <ul className="space-y-1">
                  {suggestedEdits.map((edit, i) => (
                    <li key={i} className="flex gap-2 text-xs text-gray-600 leading-relaxed">
                      <span className="text-amber-500 flex-shrink-0">&rarr;</span>
                      <span>{edit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Arrow */}
          <div className="absolute -top-1.5 left-6 w-3 h-3 bg-white border-l border-t border-gray-200 rotate-45" />
        </div>
      )}
    </span>
  );
};

// =============================================================================
// PRACTICE MODE TIMER WITH SECTION BREAKDOWN
// =============================================================================

interface SectionTiming {
  key: string;
  label: string;
  seconds: number;
  percentage: number;
}

interface PracticeTimerProps {
  totalSeconds: number;
  sectionTimings: SectionTiming[];
  isActive: boolean;
  onToggle: () => void;
  onReset: () => void;
}

const PracticeTimer: React.FC<PracticeTimerProps> = ({
  totalSeconds,
  sectionTimings,
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

  // Calculate which section we should be in based on elapsed time
  const getCurrentSection = (): string | null => {
    let cumulative = 0;
    for (const section of sectionTimings) {
      cumulative += section.seconds;
      if (elapsed < cumulative) {
        return section.key;
      }
    }
    return null;
  };

  const currentSection = getCurrentSection();

  return (
    <div className="flex items-center gap-3">
      {/* Timer + Controls - all inline */}
      <Mic className={cn('h-3.5 w-3.5 flex-shrink-0', isActive ? 'text-red-500 animate-pulse' : 'text-gray-400')} />
      <span className={cn(
        'font-mono text-sm font-semibold tabular-nums',
        isOverTime ? 'text-red-500' : idealRange ? 'text-green-600' : 'text-gray-900'
      )}>
        {formatTime(elapsed)}
      </span>
      <span className="text-xs text-gray-400">/ {formatTime(totalSeconds)}</span>

      {/* Section progress bar - inline, compact */}
      <div className="flex-1 h-1.5 rounded-full bg-gray-200 flex overflow-hidden" title="Section timing">
        {sectionTimings.map((section) => (
          <div
            key={section.key}
            className={cn(
              'h-full transition-opacity',
              getSectionColor(section.key).bg,
              currentSection === section.key && isActive ? 'opacity-100' : 'opacity-50'
            )}
            style={{ width: `${section.percentage}%` }}
            title={`${section.label}: ${formatTime(section.seconds)}`}
          />
        ))}
      </div>

      {/* Play/Pause + Reset */}
      <button
        onClick={onToggle}
        className={cn(
          'p-1.5 rounded transition-colors',
          isActive ? 'bg-red-100 text-red-600' : 'bg-primary-100 text-primary-600'
        )}
        title={isActive ? 'Pause' : 'Start practice'}
      >
        {isActive ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
      </button>
      <button onClick={handleReset} className="p-1.5 rounded text-gray-400 hover:bg-gray-100" title="Reset">
        <RotateCcw className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

// =============================================================================
// DELIVERY HELP MODAL
// =============================================================================

interface DeliveryHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DeliveryHelpModal: React.FC<DeliveryHelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">Practice Mode Guide</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-5 max-h-[60vh] overflow-y-auto">
          {/* Delivery Markers */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Delivery Markers</h4>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Opening Cue</p>
                  <p className="text-xs text-gray-500">How to start each section — set your tone, energy, and pace.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Transition Cue</p>
                  <p className="text-xs text-gray-500">When to pause before moving to the next section. Let key points land.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Typography Pattern */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Text Styling</h4>
            <div className="space-y-2.5">
              <div className="flex items-center gap-3">
                <mark className="font-bold bg-amber-100 text-amber-900 px-1 rounded-sm text-sm">40%</mark>
                <div className="flex-1">
                  <span className="text-sm text-gray-900">Metrics</span>
                  <span className="text-xs text-gray-500 ml-2">— memorize these</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <mark className="bg-emerald-100 text-emerald-800 font-medium px-1 rounded-sm text-sm">pattern</mark>
                <div className="flex-1">
                  <span className="text-sm text-gray-900">Patterns</span>
                  <span className="text-xs text-gray-500 ml-2">— golden nuggets</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <strong className="font-semibold text-indigo-700 text-sm">built</strong>
                <div className="flex-1">
                  <span className="text-sm text-gray-900">Actions</span>
                  <span className="text-xs text-gray-500 ml-2">— ownership</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="border-b border-dotted border-gray-500 text-sm">API</span>
                <div className="flex-1">
                  <span className="text-sm text-gray-900">Tech</span>
                  <span className="text-xs text-gray-500 ml-2">— hover for info</span>
                </div>
              </div>
            </div>
          </div>

          {/* Pro Tips */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">💡 Pro Tips</h4>
            <ul className="space-y-1.5 text-xs text-gray-600">
              <li>• <strong>2-minute rule:</strong> Keep each story under 2 minutes initially</li>
              <li>• <strong>Pause power:</strong> Strategic pauses show confidence, not hesitation</li>
              <li>• <strong>Numbers first:</strong> Lead with impact metrics when asked "tell me about..."</li>
              <li>• <strong>Practice out loud:</strong> Reading silently is not the same as speaking</li>
            </ul>
          </div>
        </div>

        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            Got it
          </button>
        </div>
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

// CopyMenu removed — replaced by "Share As..." DerivationModal (LLM-powered)

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
  isFirst?: boolean;
  showCoaching?: boolean;
  showDeliveryCues?: boolean; // Pause/transition cues (practice mode)
  showEmphasis?: boolean; // Text highlighting (action verbs, emphasis words)
  hideHeader?: boolean; // Hide section header (when rendered externally)
}

const NarrativeSection: React.FC<NarrativeSectionProps> = ({
  sectionKey,
  label,
  content,
  confidence,
  isEditing,
  editValue,
  onEditChange,
  isFirst = false,
  showCoaching = false,
  showDeliveryCues = false,
  showEmphasis = true, // On by default
  hideHeader = false,
}) => {
  const [showTip, setShowTip] = useState(false);
  const coaching = SECTION_COACHING[sectionKey.toLowerCase()];
  const deliveryCue = DELIVERY_CUES[sectionKey.toLowerCase()];

  /*
   * Typography Pattern for Narrative Content:
   * ==========================================
   * 1. BOLD + HIGHLIGHT (bg-amber)  → Metrics/Numbers (memorize these)
   * 2. BOLD + GREEN BG              → Design patterns & techniques (golden nuggets)
   * 3. BOLD INDIGO                  → Action verbs (shows what YOU did)
   * 4. UNDERLINE                    → Emphasis words (stress when speaking)
   * 5. DOTTED UNDERLINE             → Technical terms (hover for definition)
   */

  // Design patterns, methodologies, and techniques (green highlight - golden nuggets)
  const designPatterns: Record<string, string> = {
    // Database patterns
    'shadow table': 'Safe migration pattern - write to both tables during transition',
    'blue-green deployment': 'Zero-downtime deployment with instant rollback',
    'canary release': 'Gradual rollout to subset of users first',
    'feature flag': 'Toggle features without deployment',
    'circuit breaker': 'Prevent cascade failures in distributed systems',
    'bulkhead pattern': 'Isolate failures to prevent system-wide impact',
    'saga pattern': 'Manage distributed transactions across services',
    'cqrs': 'Separate read and write models for scalability',
    'event sourcing': 'Store state changes as sequence of events',
    'strangler fig': 'Gradually replace legacy system',
    // Architecture patterns
    'domain-driven design': 'Model software around business domains',
    'hexagonal architecture': 'Ports and adapters for testability',
    'clean architecture': 'Dependency rule - inner layers don\'t know outer',
    'event-driven': 'Async communication via events',
    'pub-sub': 'Publisher-subscriber messaging pattern',
    'api gateway': 'Single entry point for microservices',
    'service mesh': 'Infrastructure layer for service-to-service communication',
    'sidecar pattern': 'Deploy helper container alongside main container',
    // Data patterns
    'write-ahead log': 'Durability pattern for databases',
    'read replica': 'Scale reads by replicating data',
    'sharding': 'Horizontal partitioning for scale',
    'denormalization': 'Trade storage for query performance',
    'materialized view': 'Pre-computed query results',
    'change data capture': 'Track and propagate data changes',
    'eventual consistency': 'Data converges over time, not instantly',
    // Testing & quality
    'test-driven development': 'Write tests before code',
    'behavior-driven development': 'Tests in business language',
    'contract testing': 'Verify API contracts between services',
    'chaos engineering': 'Deliberately inject failures to test resilience',
    'load shedding': 'Gracefully degrade under heavy load',
    // Process patterns
    'trunk-based development': 'Short-lived branches, frequent integration',
    'gitflow': 'Branch model with develop/release/hotfix',
    'pair programming': 'Two developers, one workstation',
    'mob programming': 'Whole team works together on one task',
    'blameless postmortem': 'Learn from failures without blame',
  };

  // Technical terms with definitions (dotted underline + tooltip)
  const technicalTerms: Record<string, string> = {
    'api': 'Application Programming Interface',
    'aws': 'Amazon Web Services',
    'gcp': 'Google Cloud Platform',
    'azure': 'Microsoft Azure',
    'ci/cd': 'Continuous Integration/Deployment',
    'docker': 'Container platform',
    'kubernetes': 'Container orchestration',
    'k8s': 'Kubernetes',
    'react': 'Frontend framework',
    'node': 'JavaScript runtime',
    'python': 'Programming language',
    'golang': 'Go programming language',
    'rust': 'Systems programming language',
    'sql': 'Database query language',
    'nosql': 'Non-relational databases',
    'postgresql': 'Relational database',
    'mysql': 'Relational database',
    'mongodb': 'Document database',
    'redis': 'In-memory cache',
    'kafka': 'Distributed streaming platform',
    'rabbitmq': 'Message broker',
    'elasticsearch': 'Search and analytics engine',
    'graphql': 'API query language',
    'grpc': 'High-performance RPC framework',
    'rest': 'API architecture style',
    'microservices': 'Distributed architecture',
    'monolith': 'Single-deployment architecture',
    'terraform': 'Infrastructure as code',
    'ansible': 'Configuration management',
    'jenkins': 'CI/CD automation',
    'github actions': 'CI/CD platform',
    'agile': 'Iterative development',
    'scrum': 'Agile framework',
    'kanban': 'Visual workflow management',
    'sprint': 'Time-boxed iteration',
    'mvp': 'Minimum Viable Product',
    'kpi': 'Key Performance Indicator',
    'okr': 'Objectives and Key Results',
    'saas': 'Software as a Service',
    'paas': 'Platform as a Service',
    'iaas': 'Infrastructure as a Service',
    'latency': 'Response time delay',
    'throughput': 'Processing capacity',
    'scalability': 'Growth handling ability',
    'availability': 'Uptime reliability',
    'sla': 'Service Level Agreement',
    'slo': 'Service Level Objective',
    'sli': 'Service Level Indicator',
    'p99': '99th percentile latency',
    'rps': 'Requests per second',
    'qps': 'Queries per second',
  };

  // Action verbs that show ownership (italic)
  const actionVerbs = [
    'led', 'built', 'designed', 'implemented', 'created', 'developed',
    'architected', 'optimized', 'refactored', 'deployed', 'launched',
    'managed', 'owned', 'drove', 'spearheaded', 'established',
    'reduced', 'increased', 'improved', 'eliminated', 'automated',
    'migrated', 'scaled', 'integrated', 'streamlined', 'transformed',
  ];

  // Render content with typography pattern
  const renderContent = (text: string) => {
    // Pattern 1: Metrics (bold + highlight)
    // NOTE: Using 'i' flag only (not 'gi') for split/test patterns to avoid lastIndex state bug.
    // When a regex has the global flag, .test() advances lastIndex, causing alternating match/miss
    // on the same string when called repeatedly (e.g., after .split()).
    const metricPattern = /(\d+(?:\.\d+)?[%xX]|\$\d+(?:,\d{3})*(?:\.\d+)?[KMB]?|\d+(?:,\d{3})*(?:\.\d+)?\s*(?:hours?|days?|weeks?|months?|minutes?|seconds?|ms|users?|customers?|engineers?|teams?|requests?|queries?))/i;

    // Pattern 2: Action verbs (bold indigo) - when emphasis is on
    const actionPattern = showEmphasis
      ? new RegExp(`\\b(${actionVerbs.join('|')})\\b`, 'i')
      : null;

    // Pattern 3: Emphasis words from delivery cues (underline) - when emphasis is on
    const emphasisWords = showEmphasis && deliveryCue?.emphasis
      ? deliveryCue.emphasis.filter(w => w.length > 1 && !actionVerbs.includes(w.toLowerCase()))
      : [];
    const emphasisPattern = emphasisWords.length > 0
      ? new RegExp(`\\b(${emphasisWords.join('|')})\\b`, 'i')
      : null;

    // Pattern 4: Design patterns (green highlight - golden nuggets)
    const patternKeys = Object.keys(designPatterns).sort((a, b) => b.length - a.length);
    const patternRegex = showEmphasis && patternKeys.length > 0
      ? new RegExp(`(${patternKeys.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'i')
      : null;

    // Pattern 5: Technical terms (dotted underline)
    const techTermKeys = Object.keys(technicalTerms).sort((a, b) => b.length - a.length);
    const techPattern = new RegExp(`\\b(${techTermKeys.join('|')})\\b`, 'i');

    // Split by metrics first (highest priority)
    const parts = text.split(metricPattern);

    return parts.map((part, idx) => {
      // Metrics: bold + amber highlight
      if (metricPattern.test(part)) {
        return (
          <mark key={idx} className="font-bold bg-amber-100 text-amber-900 px-0.5 rounded-sm" title="Key metric">
            {part}
          </mark>
        );
      }

      // Process remaining text through other patterns
      let processedParts: React.ReactNode[] = [part];

      // Design patterns: green highlight with tooltip (golden nuggets)
      const applyDesignPatterns = (parts: React.ReactNode[]): React.ReactNode[] => {
        if (!patternRegex) return parts;
        const newParts: React.ReactNode[] = [];
        parts.forEach((p, pIdx) => {
          if (typeof p !== 'string') {
            newParts.push(p);
            return;
          }
          const subParts = p.split(patternRegex);
          subParts.forEach((subPart, subIdx) => {
            const lowerPart = subPart.toLowerCase();
            if (designPatterns[lowerPart]) {
              newParts.push(
                <span key={`${idx}-pat-${pIdx}-${subIdx}`} className="relative group/pattern cursor-help">
                  <mark className="bg-emerald-100 text-emerald-800 font-medium px-0.5 rounded-sm">{subPart}</mark>
                  <span className="absolute bottom-full left-0 mb-1 hidden group-hover/pattern:block z-20 px-2 py-1 text-[10px] bg-emerald-900 text-white rounded max-w-[200px] shadow-lg">
                    <span className="font-semibold">Pattern:</span> {designPatterns[lowerPart]}
                  </span>
                </span>
              );
            } else {
              newParts.push(subPart);
            }
          });
        });
        return newParts;
      };

      // Technical terms: dotted underline + tooltip
      const applyTechTerms = (parts: React.ReactNode[]): React.ReactNode[] => {
        const newParts: React.ReactNode[] = [];
        parts.forEach((p, pIdx) => {
          if (typeof p !== 'string') {
            newParts.push(p);
            return;
          }
          const subParts = p.split(techPattern);
          subParts.forEach((subPart, subIdx) => {
            const lowerPart = subPart.toLowerCase();
            if (technicalTerms[lowerPart]) {
              newParts.push(
                <span key={`${idx}-tech-${pIdx}-${subIdx}`} className="relative group/term cursor-help">
                  <span className="border-b border-dotted border-gray-500">{subPart}</span>
                  <span className="absolute bottom-full left-0 mb-1 hidden group-hover/term:block z-20 px-2 py-1 text-[10px] bg-gray-900 text-white rounded whitespace-nowrap shadow-lg">
                    {technicalTerms[lowerPart]}
                  </span>
                </span>
              );
            } else {
              newParts.push(subPart);
            }
          });
        });
        return newParts;
      };

      // Action verbs: bold + colored (shows ownership)
      const applyActionVerbs = (parts: React.ReactNode[]): React.ReactNode[] => {
        if (!actionPattern) return parts;
        const newParts: React.ReactNode[] = [];
        parts.forEach((p, pIdx) => {
          if (typeof p !== 'string') {
            newParts.push(p);
            return;
          }
          const subParts = p.split(actionPattern);
          subParts.forEach((subPart, subIdx) => {
            if (actionPattern.test(subPart)) {
              newParts.push(
                <strong key={`${idx}-act-${pIdx}-${subIdx}`} className="font-semibold text-indigo-700" title="Action verb - shows ownership">
                  {subPart}
                </strong>
              );
            } else {
              newParts.push(subPart);
            }
          });
        });
        return newParts;
      };

      // Emphasis words: solid underline (stress when speaking)
      const applyEmphasis = (parts: React.ReactNode[]): React.ReactNode[] => {
        if (!emphasisPattern) return parts;
        const newParts: React.ReactNode[] = [];
        parts.forEach((p, pIdx) => {
          if (typeof p !== 'string') {
            newParts.push(p);
            return;
          }
          const subParts = p.split(emphasisPattern);
          subParts.forEach((subPart, subIdx) => {
            if (emphasisPattern.test(subPart)) {
              newParts.push(
                <span key={`${idx}-em-${pIdx}-${subIdx}`} className="underline decoration-primary-400 decoration-2 underline-offset-2" title="Emphasize">
                  {subPart}
                </span>
              );
            } else {
              newParts.push(subPart);
            }
          });
        });
        return newParts;
      };

      // Apply patterns in order: design patterns → tech terms → action verbs → emphasis
      processedParts = applyDesignPatterns(processedParts);
      processedParts = applyTechTerms(processedParts);
      processedParts = applyActionVerbs(processedParts);
      processedParts = applyEmphasis(processedParts);

      return <React.Fragment key={idx}>{processedParts}</React.Fragment>;
    });
  };

  const accent = getSectionColor(sectionKey);

  // Confidence rating label + tooltip text
  const ratingLabel = confidence >= 0.75 ? 'Strong' : confidence >= 0.5 ? 'Fair' : confidence >= 0.3 ? 'Weak' : 'Missing';
  const ratingClass = confidence >= 0.75 ? 'bg-emerald-50 text-emerald-700' : confidence >= 0.5 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-600';
  const ratingTooltip = confidence >= 0.75
    ? `Strong section — specific details, clear ownership, quantified impact.`
    : confidence >= 0.5
    ? `Fair section — has structure but needs more specifics. ${coaching?.tip || 'Add concrete numbers and details.'}`
    : confidence >= 0.3
    ? `Weak section — too vague for interviews. ${coaching?.tip || 'Be specific about what YOU did and the measurable result.'}`
    : `Missing content — this section needs to be filled in. ${coaching?.tip || 'Add details to strengthen your story.'}`;

  return (
    <div className="relative">
      {/* Section header row — Datawrapper style: label + rating badge */}
      {!hideHeader && (
        <div className={cn('flex items-center justify-between pb-3 mb-4 border-b-2', accent.headerBorder)}>
          <div className="flex items-center gap-2.5">
            <span className={cn('text-[12px] font-bold uppercase tracking-[1px]', accent.text)}>{label}</span>
            {showCoaching && coaching && (
              <button
                onClick={() => setShowTip(!showTip)}
                className={cn(
                  'inline-flex items-center gap-1 text-[11px] rounded px-1.5 py-0.5 transition-colors',
                  showTip
                    ? 'bg-amber-100 text-amber-700'
                    : 'text-gray-400 hover:text-amber-600 hover:bg-amber-50'
                )}
                aria-expanded={showTip}
              >
                <Lightbulb className="w-3 h-3" />
                <span className="hidden sm:inline">Review</span>
              </button>
            )}
          </div>
          <span
            className={cn('text-[11px] font-semibold px-2.5 py-0.5 rounded cursor-help', ratingClass)}
            title={ratingTooltip}
          >
            {ratingLabel}
          </span>
        </div>
      )}

      {/* Coach review panel — callout box style (matches journal Achievement/Reasoning boxes) */}
      {showTip && coaching && (
        <div className="mb-4 bg-amber-50 border border-amber-100 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span className="text-sm font-medium text-amber-800">Interview Coach</span>
          </div>
          <ul className="space-y-1.5 ml-6">
            <li className="text-xs text-amber-700 leading-relaxed">
              {coaching.tip}
            </li>
            <li className="text-xs text-amber-700 leading-relaxed">
              {coaching.interviewNote}
            </li>
          </ul>
          <div className="mt-3 ml-6 pt-2 border-t border-amber-200/60">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600">How to fix</span>
            <p className="text-xs text-gray-700 leading-relaxed mt-0.5">
              {SECTION_FIX[sectionKey.toLowerCase()] || 'Be specific and quantify wherever possible.'}
            </p>
          </div>
        </div>
      )}

      {/* Content */}
      {isEditing ? (
        <div>
          <textarea
            value={editValue}
            onChange={(e) => onEditChange(e.target.value)}
            className={cn(
              'w-full p-3.5 border border-gray-200 rounded text-[14px] resize-none',
              'focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
              'bg-white transition-shadow'
            )}
            rows={4}
            placeholder={`Describe the ${label.toLowerCase()}...`}
          />
          {coaching && (
            <p className="mt-2 text-[11px] text-gray-500 italic">
              {coaching.tip}
            </p>
          )}
        </div>
      ) : (
        <div className="relative">
          {/* Opening delivery cue */}
          {showDeliveryCues && deliveryCue && (
            <div className="mb-2.5 text-[10px] text-gray-400 italic flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {deliveryCue.openingCue}
            </div>
          )}

          <p className="text-[14.5px] leading-[1.65] text-gray-700">
            {renderContent(content)}
          </p>

          {/* Closing delivery cue */}
          {showDeliveryCues && deliveryCue && (
            <div className="mt-2.5 text-[10px] text-gray-400 italic flex items-center gap-1.5 justify-end">
              {deliveryCue.closingCue}
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// NARRATIVE SECTION HEADER (Standalone, rendered outside the content card)
// =============================================================================

interface NarrativeSectionHeaderProps {
  sectionKey: string;
  label: string;
  confidence: number;
  showCoaching?: boolean;
  sourceCount?: number;
  isCollapsed: boolean;
  onToggle: () => void;
  isLast?: boolean;
  /** Content (children) rendered below the header when expanded */
  children?: React.ReactNode;
}

/** Section-level rating descriptions keyed by confidence tier */
const SECTION_RATING_INFO: Record<string, { summary: string; detail: string }> = {
  Strong: {
    summary: 'This section is interview-ready.',
    detail: 'Specific details, clear ownership language, and quantified impact. No changes needed.',
  },
  Fair: {
    summary: 'This section needs more specifics.',
    detail: 'The structure is there, but interviewers want concrete numbers, named tools, and "I" statements. Polish before using in an interview.',
  },
  Weak: {
    summary: 'This section is too vague for interviews.',
    detail: 'Generic descriptions won\'t survive follow-up questions. Add real metrics, specific approaches, and what YOU did — not the team.',
  },
  Missing: {
    summary: 'This section needs content.',
    detail: 'An empty section weakens the entire story. Even a single sentence with a concrete number is better than nothing.',
  },
};

/**
 * NarrativeSectionHeader
 *
 * Collapsible timeline-spine layout matching the journal ActivityGroupSection pattern:
 *   dot + vertical line  |  chevron + colored label + line + rating badge
 *                         |  [content card when expanded]
 *
 * Section identity preserved via colored dot + label (blue=situation, amber=task, etc.)
 */
const NarrativeSectionHeader: React.FC<NarrativeSectionHeaderProps> = ({
  sectionKey,
  label,
  confidence,
  sourceCount,
  isCollapsed,
  onToggle,
  isLast = false,
  children,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const color = getSectionColor(sectionKey);
  const dotColor = color.bg;
  const labelColor = color.text;
  const lineColor = color.bg;
  const ratingLabel = confidence >= 0.75 ? 'Strong' : confidence >= 0.5 ? 'Fair' : confidence >= 0.3 ? 'Weak' : 'Missing';
  const ratingClass = confidence >= 0.75 ? 'bg-emerald-50 text-emerald-700' : confidence >= 0.5 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-600';
  const ratingInfo = SECTION_RATING_INFO[ratingLabel];
  const coaching = SECTION_COACHING[sectionKey.toLowerCase()];
  const fix = SECTION_FIX[sectionKey.toLowerCase()];
  const pct = Math.round(confidence * 100);

  return (
    <section className="relative flex gap-4">
      {/* Timeline spine — dot + vertical line */}
      <div className="flex flex-col items-center flex-shrink-0 w-5">
        <div
          className={cn(
            'w-3 h-3 rounded-full mt-2 flex-shrink-0 ring-4 ring-gray-50 z-10',
            isCollapsed ? 'bg-gray-300' : dotColor,
          )}
        />
        {!(isLast && isCollapsed) && (
          <div className="w-px flex-1 bg-gray-200" />
        )}
      </div>

      {/* Content column */}
      <div className="flex-1 min-w-0 pb-4">
        {/* Group header row */}
        <div className={cn(
          'flex items-center gap-2 w-full transition-all rounded-lg',
          isCollapsed ? 'py-1 mb-1' : 'mb-2',
        )}>
          {/* Clickable area: chevron + label (toggle collapse) */}
          <button
            onClick={onToggle}
            className="flex items-center gap-2 hover:bg-gray-50 rounded-lg px-1 py-0.5 -ml-1 transition-colors"
          >
            <div className="flex-shrink-0">
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </div>
            <span className={cn('text-sm font-semibold uppercase tracking-[0.5px]', labelColor)}>
              {label}
            </span>
          </button>

          {/* Collapsed summary: rating + source count */}
          {isCollapsed && (
            <span className="flex items-center gap-1.5 text-[11px] text-gray-500 truncate">
              <span className="text-gray-300">&middot;</span>
              <span className={cn('font-medium px-1.5 py-0.5 rounded', ratingClass)}>{ratingLabel}</span>
              {sourceCount !== undefined && sourceCount > 0 && (
                <>
                  <span className="text-gray-300">&middot;</span>
                  <span>{sourceCount} source{sourceCount !== 1 ? 's' : ''}</span>
                </>
              )}
            </span>
          )}

          {/* Expanded: colored line + rating badge with tooltip */}
          {!isCollapsed && (
            <>
              <div className={cn('flex-1 h-px', lineColor)} />
              <span
                className="relative flex-shrink-0"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
              >
                <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded cursor-help', ratingClass)}>
                  {ratingLabel}
                </span>

                {/* Rich tooltip */}
                {showTooltip && (
                  <div className="absolute top-full right-0 mt-1.5 z-30 w-72 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
                    <div className={cn(
                      'px-3 py-2 border-b',
                      ratingLabel === 'Strong' ? 'bg-emerald-50 border-emerald-100' :
                      ratingLabel === 'Fair' ? 'bg-amber-50 border-amber-100' :
                      'bg-red-50 border-red-100'
                    )}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-900">{ratingLabel}</span>
                        <span className="text-[10px] text-gray-500">{pct}%</span>
                      </div>
                      <p className="text-[11px] text-gray-600 mt-0.5 leading-relaxed">{ratingInfo.summary}</p>
                    </div>
                    <div className="px-3 py-2.5">
                      <p className="text-[11px] text-gray-500 leading-relaxed">{ratingInfo.detail}</p>
                      {coaching && confidence < 0.75 && (
                        <div className="mt-2 pt-2 border-t border-gray-100">
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 block mb-1">Interview tip</span>
                          <p className="text-[11px] text-gray-600 leading-relaxed">{coaching.interviewNote}</p>
                        </div>
                      )}
                      {fix && confidence < 0.75 && (
                        <div className="mt-2 pt-2 border-t border-gray-100">
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600 block mb-1">How to fix</span>
                          <p className="text-[11px] text-gray-600 leading-relaxed">{fix}</p>
                        </div>
                      )}
                    </div>
                    <div className="absolute -top-1.5 right-4 w-3 h-3 bg-white border-l border-t border-gray-200 rotate-45" />
                  </div>
                )}
              </span>
            </>
          )}
        </div>

        {/* Content when expanded */}
        {!isCollapsed && children}
      </div>
    </section>
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
  const [practiceMode, setPracticeMode] = useState(false); // Timer off by default
  const [timerActive, setTimerActive] = useState(false);
  const [showCoaching, setShowCoaching] = useState(true); // Tips on by default
  const [showEmphasis, setShowEmphasis] = useState(true); // Text emphasis on by default
  const [showDeliveryHelp, setShowDeliveryHelp] = useState(false);
  // Section collapse state — all expanded by default (empty set = nothing collapsed)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  // Track which sections have note input open (triggered from SourceList "+ Note" button)
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

    // First pass: count words per section
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

    // Second pass: calculate seconds and percentages
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
            <StatusBadge
              status={storyStatus}
              confidence={star.overallConfidence}
              suggestedEdits={star.suggestedEdits}
            />
            <div className="flex items-center gap-1.5 text-[11px] text-gray-400 ml-1">
              {sourceCoverage ? (
                <SourceCoverageHeader total={sourceCoverage.total} sourced={sourceCoverage.sourced} />
              ) : (
                <span>{activityCount} activities</span>
              )}
              <span>&middot;</span>
              <span>~{formatTime(estimatedTime)}</span>
              {keyMetrics.length > 0 && (
                <>
                  <span>&middot;</span>
                  <span className="font-medium text-gray-500">{keyMetrics.slice(0, 2).join(', ')}</span>
                </>
              )}
            </div>
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
                    <StatusBadge
                      status={storyStatus}
                      confidence={star.overallConfidence}
                      suggestedEdits={star.suggestedEdits}
                    />
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-500 flex-wrap">
                    {sourceCoverage ? (
                      <SourceCoverageHeader total={sourceCoverage.total} sourced={sourceCoverage.sourced} />
                    ) : (
                      <span>{activityCount} activities</span>
                    )}
                    <span>&middot;</span>
                    <span>~{formatTime(estimatedTime)}</span>
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
            <FrameworkSelector
              value={framework}
              onChange={onFrameworkChange}
              disabled={isLoading}
            />
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
            <button
              onClick={() => isEditing ? handleSave() : setIsEditing(true)}
              disabled={isSaving}
              className={cn(
                'p-1.5 rounded transition-colors inline-flex items-center',
                isEditing ? 'bg-primary-100 text-primary-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              )}
              title={isEditing ? 'Save' : 'Edit'}
              aria-label={isEditing ? 'Save' : 'Edit'}
            >
              {isEditing ? <Check className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
            </button>
            {isEditing && (
              <button onClick={() => setIsEditing(false)} className="p-1.5 rounded text-gray-400 hover:bg-gray-100" title="Cancel" aria-label="Cancel editing">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <div className="w-px h-4 bg-gray-200 mx-0.5" />
            <button
              onClick={() => setShowCoaching(!showCoaching)}
              className={cn(
                'p-1.5 rounded transition-colors',
                showCoaching ? 'bg-amber-100 text-amber-600' : 'text-gray-400 hover:bg-gray-100'
              )}
              title="Coach review"
              aria-label="Coach review"
            >
              <Lightbulb className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setShowEmphasis(!showEmphasis)}
              className={cn(
                'p-1.5 rounded transition-colors',
                showEmphasis ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400 hover:bg-gray-100'
              )}
              title="Text emphasis"
              aria-label="Text emphasis"
            >
              <Type className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => { setPracticeMode(!practiceMode); setTimerActive(false); }}
              className={cn(
                'p-1.5 rounded transition-colors',
                practiceMode ? 'bg-primary-100 text-primary-600' : 'text-gray-400 hover:bg-gray-100'
              )}
              title="Practice timer"
              aria-label="Practice timer"
            >
              <Mic className="h-3.5 w-3.5" />
            </button>
            {practiceMode && (
              <button
                onClick={() => setShowDeliveryHelp(true)}
                className="p-1.5 rounded text-gray-400 hover:bg-gray-100"
                title="Practice guide"
                aria-label="Practice guide"
              >
                <HelpCircle className="h-3.5 w-3.5" />
              </button>
            )}
            <div className="w-px h-4 bg-gray-200 mx-0.5" />
            <button
              onClick={handleCopy}
              className={cn('p-1.5 rounded transition-colors inline-flex items-center', copied ? 'text-green-500' : 'text-gray-400 hover:bg-gray-100')}
              title="Copy plain text"
              aria-label="Copy plain text"
              data-testid="copy-star"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            {onShareAs && (
              <button
                onClick={onShareAs}
                className="p-1.5 rounded text-gray-400 hover:bg-blue-50 hover:text-blue-600 inline-flex items-center"
                title="Use this story"
                aria-label="Use this story"
                data-testid="share-as"
              >
                <Sparkles className="h-3.5 w-3.5" />
              </button>
            )}
            {story?.isPublished ? (
              <button onClick={() => onUnpublish?.()} disabled={isPublishing} className="p-1.5 rounded text-green-500 hover:bg-green-50 inline-flex items-center" title="Unpublish" aria-label="Unpublish">
                <CheckCircle2 className="h-3.5 w-3.5" />
              </button>
            ) : onOpenPublishModal ? (
              <button onClick={onOpenPublishModal} disabled={isPublishing} className="p-1.5 rounded text-gray-400 hover:bg-gray-100 inline-flex items-center" title="Publish" aria-label="Publish">
                <Share2 className="h-3.5 w-3.5" />
              </button>
            ) : onPublish && (
              <button onClick={() => onPublish('private', edits)} disabled={isPublishing} className="p-1.5 rounded text-gray-400 hover:bg-gray-100 inline-flex items-center" title="Publish" aria-label="Publish">
                <Share2 className="h-3.5 w-3.5" />
              </button>
            )}
            {onDelete && (
              <button onClick={onDelete} disabled={isDeleting} className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50" title="Delete" aria-label="Delete story">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
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

      {/* Derivation History */}
      {story?.id && <DerivationHistory storyId={story.id} />}

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
