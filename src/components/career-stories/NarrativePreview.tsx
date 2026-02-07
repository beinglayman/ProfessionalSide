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
  HelpCircle,
  X,
  Type,
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

  // Section colors for visual distinction
  const sectionColors: Record<string, string> = {
    situation: 'bg-blue-500',
    context: 'bg-blue-500',
    challenge: 'bg-blue-500',
    problem: 'bg-blue-500',
    task: 'bg-amber-500',
    objective: 'bg-amber-500',
    obstacles: 'bg-amber-500',
    hindrances: 'bg-amber-500',
    action: 'bg-green-500',
    actions: 'bg-green-500',
    result: 'bg-purple-500',
    results: 'bg-purple-500',
    learning: 'bg-indigo-500',
    evaluation: 'bg-indigo-500',
  };

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
              sectionColors[section.key] || 'bg-gray-400',
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
  showDeliveryCues?: boolean; // Pause/transition cues (practice mode)
  showEmphasis?: boolean; // Text highlighting (action verbs, emphasis words)
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
  showDeliveryCues = false,
  showEmphasis = true, // On by default
}) => {
  const [showEvidence, setShowEvidence] = useState(false);
  const sourceActivities = activities.filter((a) => sourceIds.includes(a.id));
  const hasEvidence = sourceActivities.length > 0;
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
    const metricPattern = /(\d+(?:\.\d+)?[%xX]|\$\d+(?:,\d{3})*(?:\.\d+)?[KMB]?|\d+(?:,\d{3})*(?:\.\d+)?\s*(?:hours?|days?|weeks?|months?|minutes?|seconds?|ms|users?|customers?|engineers?|teams?|requests?|queries?))/gi;

    // Pattern 2: Action verbs (bold indigo) - when emphasis is on
    const actionPattern = showEmphasis
      ? new RegExp(`\\b(${actionVerbs.join('|')})\\b`, 'gi')
      : null;

    // Pattern 3: Emphasis words from delivery cues (underline) - when emphasis is on
    const emphasisWords = showEmphasis && deliveryCue?.emphasis
      ? deliveryCue.emphasis.filter(w => w.length > 1 && !actionVerbs.includes(w.toLowerCase()))
      : [];
    const emphasisPattern = emphasisWords.length > 0
      ? new RegExp(`\\b(${emphasisWords.join('|')})\\b`, 'gi')
      : null;

    // Pattern 4: Design patterns (green highlight - golden nuggets)
    const patternKeys = Object.keys(designPatterns).sort((a, b) => b.length - a.length);
    const patternRegex = showEmphasis && patternKeys.length > 0
      ? new RegExp(`(${patternKeys.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi')
      : null;

    // Pattern 5: Technical terms (dotted underline)
    const techTermKeys = Object.keys(technicalTerms).sort((a, b) => b.length - a.length);
    const techPattern = new RegExp(`\\b(${techTermKeys.join('|')})\\b`, 'gi');

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
              {/* Opening delivery cue - subtle */}
              {showDeliveryCues && deliveryCue && (
                <div className="mb-1.5 text-[10px] text-gray-400 italic flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-emerald-400" />
                  {deliveryCue.openingCue}
                </div>
              )}

              <p className="text-[14px] leading-[1.7] text-gray-700">
                {renderContent(content)}
              </p>

              {/* Closing delivery cue - subtle */}
              {showDeliveryCues && deliveryCue && (
                <div className="mt-1.5 text-[10px] text-gray-400 italic flex items-center gap-1 justify-end">
                  {deliveryCue.closingCue}
                  <span className="w-1 h-1 rounded-full bg-amber-400" />
                </div>
              )}

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
  onOpenPublishModal?: () => void;
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
  onOpenPublishModal,
  isSaving = false,
  isPublishing = false,
  onDelete,
  isDeleting = false,
}: NarrativePreviewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [showCopyMenu, setShowCopyMenu] = useState(false);
  const [practiceMode, setPracticeMode] = useState(false); // Timer off by default
  const [timerActive, setTimerActive] = useState(false);
  const [showCoaching, setShowCoaching] = useState(true); // Tips on by default
  const [showEmphasis, setShowEmphasis] = useState(true); // Text emphasis on by default
  const [showDeliveryHelp, setShowDeliveryHelp] = useState(false);
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
      {/* Header with integrated toolbar */}
      <div className="px-4 py-2.5 border-b border-gray-100">
        <div className="flex items-center justify-between gap-3">
          {/* Left: Title + Meta */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-gray-900 truncate">{clusterName}</h2>
              <StatusBadge status={storyStatus} />
              {story?.archetype && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border bg-purple-50 text-purple-700 border-purple-200 capitalize">
                  {story.archetype}
                </span>
              )}
              {story?.role && (
                <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 capitalize">
                  {story.role}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-500">
              <span>{activityCount} activities</span>
              {formatDateRange() && (
                <>
                  <span className="text-gray-300">•</span>
                  <span>{formatDateRange()}</span>
                </>
              )}
              <span className="text-gray-300">•</span>
              <span>~{formatTime(estimatedTime)}</span>
              {keyMetrics.length > 0 && (
                <>
                  <span className="text-gray-300">•</span>
                  <span className="font-medium text-primary-600">{keyMetrics.slice(0, 2).join(', ')}</span>
                </>
              )}
            </div>
          </div>

          {/* Right: All actions in one row */}
          <div className="flex items-center gap-1">
            <FrameworkSelector
              value={framework}
              onChange={onFrameworkChange}
              disabled={isLoading}
            />
            <div className="w-px h-5 bg-gray-200 mx-0.5" />
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
              <span className="text-xs ml-1 hidden xl:inline">{isEditing ? 'Save' : 'Edit'}</span>
            </button>
            {isEditing && (
              <button onClick={() => setIsEditing(false)} className="p-1.5 rounded text-gray-400 hover:bg-gray-100" title="Cancel" aria-label="Cancel editing">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <div className="w-px h-5 bg-gray-200 mx-0.5" />
            <button
              onClick={() => setShowCoaching(!showCoaching)}
              className={cn(
                'p-1.5 rounded transition-colors',
                showCoaching ? 'bg-amber-100 text-amber-600' : 'text-gray-400 hover:bg-gray-100'
              )}
              title="Interview tips"
              aria-label="Interview tips"
            >
              <Lightbulb className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setShowEmphasis(!showEmphasis)}
              className={cn(
                'p-1.5 rounded transition-colors',
                showEmphasis ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400 hover:bg-gray-100'
              )}
              title="Text emphasis (action verbs, key terms)"
              aria-label="Text emphasis (action verbs, key terms)"
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
            <div className="w-px h-5 bg-gray-200 mx-0.5" />
            <div className="relative" ref={copyMenuRef}>
              <button
                onClick={() => setShowCopyMenu(!showCopyMenu)}
                className={cn('p-1.5 rounded transition-colors inline-flex items-center', copied ? 'text-green-500' : 'text-gray-400 hover:bg-gray-100')}
                title="Copy"
                aria-label="Copy"
                data-testid="copy-star"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                <span className="text-xs ml-1 hidden xl:inline">Copy</span>
              </button>
              <CopyMenu isOpen={showCopyMenu} onClose={() => setShowCopyMenu(false)} onCopy={handleCopy} />
            </div>
            {story?.isPublished ? (
              <button onClick={() => onUnpublish?.()} disabled={isPublishing} className="p-1.5 rounded text-green-500 hover:bg-green-50 inline-flex items-center" title="Unpublish" aria-label="Unpublish">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span className="text-xs ml-1 hidden xl:inline">Published</span>
              </button>
            ) : onOpenPublishModal ? (
              <button onClick={onOpenPublishModal} disabled={isPublishing} className="p-1.5 rounded text-gray-400 hover:bg-gray-100 inline-flex items-center" title="Publish" aria-label="Publish">
                <Share2 className="h-3.5 w-3.5" />
                <span className="text-xs ml-1 hidden xl:inline">Publish</span>
              </button>
            ) : onPublish && (
              <button onClick={() => onPublish('private', edits)} disabled={isPublishing} className="p-1.5 rounded text-gray-400 hover:bg-gray-100 inline-flex items-center" title="Publish" aria-label="Publish">
                <Share2 className="h-3.5 w-3.5" />
                <span className="text-xs ml-1 hidden xl:inline">Publish</span>
              </button>
            )}
            {onDelete && (
              <button onClick={onDelete} disabled={isDeleting} className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50" title="Delete" aria-label="Delete story">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
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
              showDeliveryCues={practiceMode}
              showEmphasis={showEmphasis}
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
