/**
 * Career Stories UI Constants
 *
 * Centralized constants to avoid magic numbers and improve maintainability.
 */

/** Breakpoints in pixels */
export const BREAKPOINTS = {
  /** Mobile breakpoint (px) */
  MOBILE: 768,
  /** Tablet/Desktop breakpoint (px) - matches Tailwind lg: */
  DESKTOP: 1024,
} as const;

/** UI timing constants (milliseconds) */
export const TIMING = {
  /** Duration to show "copied" feedback */
  COPY_FEEDBACK_MS: 2000,
  /** Debounce delay for resize events */
  RESIZE_DEBOUNCE_MS: 100,
  /** Grace period before source exclusion is committed */
  EXCLUDE_UNDO_MS: 5000,
} as const;

/** Maximum items to show before truncating */
export const DISPLAY_LIMITS = {
  /** Max tool icons to show in cluster card */
  TOOL_ICONS_CLUSTER: 4,
  /** Max tool icons to show in STAR preview header */
  TOOL_ICONS_PREVIEW: 3,
  /** Number of skeleton cards to show during loading */
  SKELETON_CARDS: 3,
} as const;

/** Confidence thresholds for color coding */
export const CONFIDENCE_THRESHOLDS = {
  /** Minimum confidence for green (high) */
  HIGH: 0.8,
  /** Minimum confidence for yellow (medium) */
  MEDIUM: 0.5,
} as const;

/** Mobile sheet height as viewport percentage */
export const MOBILE_SHEET_MAX_HEIGHT_VH = 85;

// =============================================================================
// NARRATIVE PREVIEW — TYPES
// =============================================================================

export type StoryStatus = 'complete' | 'in-progress' | 'draft';

export interface SectionColor {
  bg: string;       // bg-{color}-500 — dot, progress bar, horizontal rule
  text: string;     // text-{color}-600 — label
  topBorder: string; // border-t-{color}-500 — card top accent
  headerBorder: string; // border-b-{color}-500 — header underline
  ratingBg: string;  // bg-{color}-50 — rating badge background
  ratingText: string; // text-{color}-700 — rating badge text
}

export interface SectionTiming {
  key: string;
  label: string;
  seconds: number;
  percentage: number;
}

// =============================================================================
// NARRATIVE PREVIEW — SECTION COLORS
// =============================================================================

export const SECTION_COLORS: Record<string, SectionColor> = {
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

export const DEFAULT_SECTION_COLOR: SectionColor = { bg: 'bg-gray-400', text: 'text-gray-600', topBorder: 'border-t-gray-400', headerBorder: 'border-b-gray-400', ratingBg: 'bg-gray-50', ratingText: 'text-gray-600' };

export function getSectionColor(key: string): SectionColor {
  return SECTION_COLORS[key.toLowerCase()] || DEFAULT_SECTION_COLOR;
}

// =============================================================================
// NARRATIVE PREVIEW — DELIVERY CUES
// =============================================================================

export const DELIVERY_CUES: Record<string, { openingCue: string; closingCue: string; emphasis: string[] }> = {
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

// =============================================================================
// NARRATIVE PREVIEW — SECTION COACHING
// =============================================================================

export const SECTION_COACHING: Record<string, { description: string; tip: string; interviewNote: string }> = {
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

// =============================================================================
// NARRATIVE PREVIEW — SECTION FIX GUIDANCE
// =============================================================================

export const SECTION_FIX: Record<string, string> = {
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

// =============================================================================
// NARRATIVE PREVIEW — STATUS DESCRIPTIONS
// =============================================================================

export const STATUS_DESCRIPTIONS: Record<StoryStatus, { summary: string; detail: string }> = {
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

// =============================================================================
// NARRATIVE PREVIEW — SECTION RATING INFO
// =============================================================================

export const SECTION_RATING_INFO: Record<string, { summary: string; detail: string }> = {
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

// =============================================================================
// NARRATIVE PREVIEW — PURE FUNCTIONS
// =============================================================================

export function getStoryStatus(confidence: number): StoryStatus {
  if (confidence >= CONFIDENCE_THRESHOLDS.HIGH) return 'complete';
  if (confidence >= CONFIDENCE_THRESHOLDS.MEDIUM) return 'in-progress';
  return 'draft';
}

export function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function mapSectionToStarKey(sectionKey: string): 'situation' | 'task' | 'action' | 'result' {
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

export function extractMetrics(text: string): string[] {
  const metricPattern = /(\d+(?:\.\d+)?[%xX]|\$\d+(?:,\d{3})*(?:\.\d+)?[KMB]?|\d+(?:,\d{3})*(?:\.\d+)?\s*(?:hours?|days?|weeks?|months?|minutes?|seconds?|ms|users?|customers?|engineers?|teams?|requests?|queries?|calls?|transactions?))/gi;
  const matches = text.match(metricPattern) || [];
  return [...new Set(matches)].slice(0, 6);
}

export function estimateSpeakingTime(text: string): number {
  const words = text.trim().split(/\s+/).length;
  return Math.ceil((words / 150) * 60);
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function getRatingLabel(confidence: number): string {
  return confidence >= 0.75 ? 'Strong' : confidence >= 0.5 ? 'Fair' : confidence >= 0.3 ? 'Weak' : 'Missing';
}

/** Narrative framework metadata for UI display */
export const NARRATIVE_FRAMEWORKS = {
  STAR: {
    label: 'STAR',
    description: 'Situation, Task, Action, Result',
    sections: ['situation', 'task', 'action', 'result'],
    group: 'popular',
  },
  STARL: {
    label: 'STARL',
    description: 'STAR + Learning',
    sections: ['situation', 'task', 'action', 'result', 'learning'],
    group: 'popular',
  },
  CAR: {
    label: 'CAR',
    description: 'Challenge, Action, Result (Concise)',
    sections: ['challenge', 'action', 'result'],
    group: 'concise',
  },
  PAR: {
    label: 'PAR',
    description: 'Problem, Action, Result',
    sections: ['problem', 'action', 'result'],
    group: 'concise',
  },
  SAR: {
    label: 'SAR',
    description: 'Situation, Action, Result (Simplified)',
    sections: ['situation', 'action', 'result'],
    group: 'concise',
  },
  SOAR: {
    label: 'SOAR',
    description: 'Situation, Obstacles, Actions, Results',
    sections: ['situation', 'obstacles', 'actions', 'results'],
    group: 'detailed',
  },
  SHARE: {
    label: 'SHARE',
    description: 'Situation, Hindrances, Actions, Results, Evaluation',
    sections: ['situation', 'hindrances', 'actions', 'results', 'evaluation'],
    group: 'detailed',
  },
  CARL: {
    label: 'CARL',
    description: 'Context, Action, Result, Learning',
    sections: ['context', 'action', 'result', 'learning'],
    group: 'detailed',
  },
} as const;

export type FrameworkGroup = 'popular' | 'concise' | 'detailed';

export const FRAMEWORK_GROUPS: Record<FrameworkGroup, { label: string; frameworks: (keyof typeof NARRATIVE_FRAMEWORKS)[] }> = {
  popular: { label: 'Popular', frameworks: ['STAR', 'STARL'] },
  concise: { label: 'Concise', frameworks: ['CAR', 'PAR', 'SAR'] },
  detailed: { label: 'Detailed', frameworks: ['SOAR', 'SHARE', 'CARL'] },
};

// =============================================================================
// ARCHETYPE METADATA
// =============================================================================

/** Archetype metadata for UI display */
export type ArchetypeGroup = 'proactive' | 'reactive' | 'people';

export const ARCHETYPE_METADATA: Record<string, { description: string; group: ArchetypeGroup }> = {
  architect: { description: 'Designs lasting solutions', group: 'proactive' },
  pioneer: { description: 'Explores new territory', group: 'proactive' },
  preventer: { description: 'Stops problems early', group: 'proactive' },
  firefighter: { description: 'Crisis response', group: 'reactive' },
  detective: { description: 'Root cause analysis', group: 'reactive' },
  turnaround: { description: 'Reverses decline', group: 'reactive' },
  diplomat: { description: 'Cross-team alignment', group: 'people' },
  multiplier: { description: 'Force multiplier', group: 'people' },
};

export const ARCHETYPE_GROUPS: Record<ArchetypeGroup, { label: string; description: string; archetypes: string[] }> = {
  proactive: { label: 'Proactive', description: 'Building & preventing', archetypes: ['architect', 'pioneer', 'preventer'] },
  reactive: { label: 'Reactive', description: 'Responding & fixing', archetypes: ['firefighter', 'detective', 'turnaround'] },
  people: { label: 'People', description: 'Enabling & aligning', archetypes: ['diplomat', 'multiplier'] },
};

// =============================================================================
// WRITING STYLES
// =============================================================================

import type { WritingStyle, DerivationType, PacketType } from '../../types/career-stories';
import { Mic, Share2, FileText, Users, Target, MessageSquare, TrendingUp, Clock, ArrowUpRight, Bug, Sparkles, Zap, BookOpen, GraduationCap, Users2, Lightbulb, Award, HelpCircle } from 'lucide-react';
import type React from 'react';

export const WRITING_STYLES: { value: WritingStyle; label: string; description: string }[] = [
  { value: 'professional', label: 'Professional', description: 'Formal, achievement-focused' },
  { value: 'casual', label: 'Casual', description: 'Conversational, natural' },
  { value: 'technical', label: 'Technical', description: 'Engineering-focused, detailed' },
  { value: 'storytelling', label: 'Storytelling', description: 'Narrative-driven, engaging' },
];

/** Max length for user prompt to prevent excessively long LLM inputs */
export const USER_PROMPT_MAX_LENGTH = 500;

// =============================================================================
// DERIVATION TYPE METADATA
// =============================================================================

export const DERIVATION_TYPE_META: Record<DerivationType, {
  label: string;
  description: string;
  maxLength?: string;
  Icon: React.FC<{ className?: string }>;
  color: string; // tailwind color prefix, e.g. 'indigo' → bg-indigo-50 text-indigo-700
}> = {
  interview: { label: 'Interview Answer', description: 'Ready to rehearse, ~90 seconds', maxLength: '~200 words', Icon: Mic, color: 'indigo' },
  linkedin: { label: 'Professional Post', description: 'Paste, post, done', maxLength: '1300 chars', Icon: Share2, color: 'sky' },
  resume: { label: 'Resume Bullet', description: 'Metric-driven, drop into any resume', maxLength: '1-2 lines', Icon: FileText, color: 'emerald' },
  'one-on-one': { label: '1:1 Talking Points', description: 'Walk in with receipts, 3-5 bullets', maxLength: '3-5 bullets', Icon: Users, color: 'amber' },
  'self-assessment': { label: 'Self Assessment', description: 'Perf review paragraph, evidence-backed', maxLength: '1 paragraph', Icon: Target, color: 'rose' },
  'team-share': { label: 'Team Share', description: 'Ship to Slack, celebrate the win', maxLength: '2-3 sentences', Icon: MessageSquare, color: 'violet' },
};

/** Pre-built Tailwind classes for derivation type colors (avoids dynamic class purging issues) */
export const DERIVATION_COLOR_CLASSES: Record<string, { bg: string; text: string; iconText: string }> = {
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', iconText: 'text-indigo-500' },
  sky: { bg: 'bg-sky-50', text: 'text-sky-700', iconText: 'text-sky-500' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', iconText: 'text-emerald-500' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-700', iconText: 'text-amber-500' },
  rose: { bg: 'bg-rose-50', text: 'text-rose-700', iconText: 'text-rose-500' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-700', iconText: 'text-violet-500' },
  blue: { bg: 'bg-blue-50', text: 'text-blue-700', iconText: 'text-blue-500' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-700', iconText: 'text-purple-500' },
  gray: { bg: 'bg-gray-50', text: 'text-gray-700', iconText: 'text-gray-500' },
};

// =============================================================================
// PACKET TYPE METADATA
// =============================================================================

export const PACKET_TYPE_META: Record<PacketType, {
  label: string;
  description: string;
  loadingText: string;
  Icon: React.FC<{ className?: string }>;
  color: string;
}> = {
  promotion: { label: 'Promotion', description: 'Combine stories into a promotion-ready document', loadingText: 'Building your promotion packet...', Icon: TrendingUp, color: 'emerald' },
  'annual-review': { label: 'Annual Review', description: 'Impact summary for your review period', loadingText: 'Building your annual review summary...', Icon: Clock, color: 'blue' },
  'skip-level': { label: 'Skip-Level', description: 'Strategic themes for director/VP meetings', loadingText: 'Building your skip-level prep...', Icon: ArrowUpRight, color: 'purple' },
  'portfolio-brief': { label: 'Portfolio Brief', description: 'External-facing 1-pager for recruiters', loadingText: 'Building your portfolio brief...', Icon: FileText, color: 'indigo' },
  'self-assessment': { label: 'Self Assessment', description: 'Evidence-backed performance review write-up', loadingText: 'Building your self-assessment...', Icon: Target, color: 'rose' },
  'one-on-one': { label: '1:1 Prep', description: 'Talking points with receipts for your manager', loadingText: 'Building your 1:1 talking points...', Icon: Users, color: 'amber' },
};

// =============================================================================
// DERIVATION SECTION METADATA
// =============================================================================

export const DERIVATION_SECTION_META: Record<string, { label: string }> = {
  // Legacy single-section fallback
  'content': { label: 'Content' },

  // --- Interview ---
  'hook': { label: 'Hook' },
  'narrative': { label: 'Narrative' },
  'takeaway': { label: 'Takeaway' },

  // --- LinkedIn ---
  // 'hook' already defined above
  'body': { label: 'Body' },
  'hashtags': { label: 'Hashtags' },

  // --- Resume ---
  'primary-bullet': { label: 'Primary Bullet' },
  'technical-bullet': { label: 'Technical Bullet' },
  'impact-bullet': { label: 'Impact Bullet' },

  // --- One-on-One (single) ---
  'headline': { label: 'Headline' },
  'what-happened': { label: 'What Happened' },
  'why-it-matters': { label: 'Why It Matters' },
  'ask': { label: 'Ask' },

  // --- Self Assessment (single) ---
  'contribution': { label: 'Contribution' },
  'competency': { label: 'Competency' },
  'growth': { label: 'Growth' },

  // --- Team Share ---
  'win': { label: 'Win' },
  'how': { label: 'How' },

  // --- Promotion Packet ---
  'impact-summary': { label: 'Summary of Impact' },
  'key-achievements': { label: 'Key Achievements' },
  'metrics-dashboard': { label: 'Metrics Dashboard' },
  'growth-narrative': { label: 'Growth Narrative' },

  // --- Annual Review ---
  'review-period-impact': { label: 'Review Period Impact' },
  'growth-trajectory': { label: 'Growth Trajectory' },
  'expanded-scope': { label: 'Areas of Expanded Scope' },
  'looking-ahead': { label: 'Looking Ahead' },

  // --- Skip-Level ---
  'strategic-themes': { label: 'Strategic Themes' },
  'cross-cutting-metrics': { label: 'Cross-Cutting Metrics' },
  'patterns': { label: 'Patterns Worth Noting' },
  'leadership-ask': { label: 'What I Need From Leadership' },

  // --- Portfolio Brief ---
  // 'headline' already defined above
  'proof-points': { label: 'Proof Points' },
  'technical-breadth': { label: 'Technical Breadth' },
  'working-style': { label: 'Working Style' },

  // --- Packet Self-Assessment ---
  // 'impact-summary' already defined above
  'key-contributions': { label: 'Key Contributions' },
  'growth-development': { label: 'Growth & Development' },
  // 'looking-ahead' already defined above

  // --- Packet One-on-One ---
  'headlines': { label: 'Headlines' },
  'detail-bullets': { label: 'Detail Bullets' },
  'patterns-themes': { label: 'Patterns & Themes' },
  'ask-next-step': { label: 'Ask or Next Step' },
};

/**
 * Resolve a human-readable section label for a derivation section key.
 * Falls back to capitalizing the slug.
 */
export function derivationSectionLabel(sectionKey: string): string {
  return DERIVATION_SECTION_META[sectionKey]?.label ?? capitalizeFirst(sectionKey.replace(/-/g, ' '));
}

// =============================================================================
// CAREER QUOTES
// =============================================================================

// =============================================================================
// BRAG DOCUMENT CATEGORIES
// =============================================================================

import type { BragDocCategory } from '../../types/career-stories';

export const BRAG_DOC_CATEGORIES: { value: BragDocCategory; label: string; description: string }[] = [
  { value: 'projects-impact', label: 'Projects & Impact', description: 'Shipped features, solved problems, built systems' },
  { value: 'leadership', label: 'Leadership & Collaboration', description: 'Mentoring, cross-team alignment, hiring' },
  { value: 'growth', label: 'Growth & Learning', description: 'New skills, domain expertise, certifications' },
  { value: 'external', label: 'External', description: 'Talks, blog posts, open source, community' },
];

// =============================================================================
// DRAFT STORY CATEGORIES (DraftStoryCategory values from journal.types.ts)
// =============================================================================

export const DRAFT_STORY_CATEGORIES: {
  value: string;
  label: string;
  Icon: React.FC<{ className?: string }>;
  color: string; // matches DERIVATION_COLOR_CLASSES keys
}[] = [
  { value: 'feature',         label: 'Features',        Icon: Sparkles,      color: 'purple' },
  { value: 'bug-fix',         label: 'Bug Fixes',       Icon: Bug,           color: 'rose' },
  { value: 'optimization',    label: 'Optimizations',   Icon: Zap,           color: 'amber' },
  { value: 'documentation',   label: 'Documentation',   Icon: BookOpen,      color: 'blue' },
  { value: 'learning',        label: 'Learning',        Icon: GraduationCap, color: 'indigo' },
  { value: 'collaboration',   label: 'Collaboration',   Icon: Users2,        color: 'emerald' },
  { value: 'problem-solving', label: 'Problem Solving', Icon: Lightbulb,     color: 'violet' },
  { value: 'achievement',     label: 'Achievements',    Icon: Award,         color: 'amber' },
];

/** Icon + color for drafts that have no recognized category */
export const DRAFT_UNCATEGORIZED_META = {
  label: 'Uncategorized',
  Icon: HelpCircle,
  color: 'gray',
} as const;

// =============================================================================
// WIZARD LOADING FACTS
// =============================================================================

export const WIZARD_LOADING_FACTS = {
  analyze: [
    'Stories with specific metrics score 40% higher in interviews',
    'The best career stories show impact, not just effort',
    'Great stories follow a narrative arc: challenge \u2192 action \u2192 result',
    'Interviewers remember stories 22x more than facts alone',
    'Your story archetype shapes how others perceive your contribution',
  ],
  generate: [
    'Crafting your opening hook...',
    'Structuring the narrative arc...',
    'Connecting evidence to impact...',
    'Scoring story strength...',
    'Weaving in your unique perspective...',
  ],
};
