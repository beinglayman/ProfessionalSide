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

import type { WritingStyle, DerivationType } from '../../types/career-stories';
import { Mic, Share2, FileText, Users, Target, MessageSquare } from 'lucide-react';
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
};

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

export interface CareerQuote {
  text: string;
  attribution: string;
  theme: string;
}

export const CAREER_QUOTES: CareerQuote[] = [
  // Publishing Your Work
  { text: 'Make stuff you love and talk about stuff you love and you\'ll attract people who love that kind of stuff. It\'s that simple.', attribution: 'Austin Kleon, Show Your Work!', theme: 'Publishing Your Work' },
  { text: 'Once a day, after you\'ve done your day\'s work, go back to your documentation and find one little piece of your process that you can share.', attribution: 'Austin Kleon, Show Your Work!', theme: 'Publishing Your Work' },
  { text: 'The only way to find your voice is to use it. It\'s hardwired, built into you. Talk about the things you love. Your voice will follow.', attribution: 'Austin Kleon, Show Your Work!', theme: 'Publishing Your Work' },
  { text: 'Ideas in secret die. They need light and air or they starve to death.', attribution: 'Seth Godin', theme: 'Publishing Your Work' },
  { text: 'Are you a serial idea-starting person? The goal is to be an idea-shipping person.', attribution: 'Seth Godin', theme: 'Publishing Your Work' },
  { text: 'One of the best ways to build your reputation is by creating content that allows your ideas to travel beyond your immediate circle.', attribution: 'Dorie Clark, Stand Out', theme: 'Publishing Your Work' },
  { text: 'In a crowded marketplace, fitting in is failing. In a busy marketplace, not standing out is the same as being invisible.', attribution: 'Seth Godin', theme: 'Publishing Your Work' },

  // Thinking About Work
  { text: 'Spend 10% of your week thinking about the work, not just doing the work.', attribution: 'Unattributed', theme: 'Thinking About Work' },
  { text: 'Most people work in their career. Very few work on their career. That\'s the gap.', attribution: 'Unattributed', theme: 'Thinking About Work' },
  { text: 'I want to spend time on what\'s important, instead of what\'s immediate.', attribution: 'Cal Newport, So Good They Can\'t Ignore You', theme: 'Thinking About Work' },
  { text: 'Playing the long game — eschewing short-term gratification in order to work toward an uncertain but worthy future goal — isn\'t easy. But it\'s the surest path to meaningful and lasting success.', attribution: 'Dorie Clark, The Long Game', theme: 'Thinking About Work' },
  { text: 'In today\'s competitive economy, it\'s not enough to simply do your job well. Developing a reputation as an expert in your field attracts people who want to hire you, do business with you, and spread your ideas.', attribution: 'Dorie Clark, Stand Out', theme: 'Thinking About Work' },
  { text: 'Guard your time. Forget the money.', attribution: 'Naval Ravikant', theme: 'Thinking About Work' },

  // Narrating Your Story
  { text: 'Everybody loves a good story, but good storytelling doesn\'t come easy to everybody. It\'s a skill that takes a lifetime to master. So study the great stories and then go find some of your own.', attribution: 'Austin Kleon, Show Your Work!', theme: 'Narrating Your Story' },
  { text: 'Human beings want to know where things came from, how they were made, and who made them.', attribution: 'Austin Kleon, Show Your Work!', theme: 'Narrating Your Story' },
  { text: 'If you don\'t tell your story, someone else will — and they\'ll get it wrong.', attribution: 'Unattributed', theme: 'Narrating Your Story' },
  { text: 'Marketing is the generous act of helping others become who they seek to become. It involves creating honest stories — stories that resonate and spread.', attribution: 'Seth Godin, This Is Marketing', theme: 'Narrating Your Story' },
  { text: 'Your tactics can make a difference, but your strategy — your commitment to a way of being and a story to be told and a promise to be made — can change everything.', attribution: 'Seth Godin, This Is Marketing', theme: 'Narrating Your Story' },
  { text: 'If you don\'t design your own life plan, chances are you\'ll fall into someone else\'s plan. And guess what they have planned for you? Not much.', attribution: 'Jim Rohn', theme: 'Narrating Your Story' },
  { text: 'A career without a narrative is just a list of jobs. A career with a narrative is a trajectory.', attribution: 'Unattributed', theme: 'Narrating Your Story' },

  // Building Perception
  { text: 'The brand is a story. But it\'s a story about you, not about the brand.', attribution: 'Seth Godin', theme: 'Building Perception' },
  { text: 'You can\'t build a reputation on what you\'re going to do.', attribution: 'Confucius', theme: 'Building Perception' },
  { text: 'You can\'t be seen until you learn to see.', attribution: 'Seth Godin, This Is Marketing', theme: 'Building Perception' },
  { text: 'Expectations are the engines of our perceptions.', attribution: 'Seth Godin', theme: 'Building Perception' },
  { text: 'The people who have the ability to fail in public under their own name actually gain a lot of power.', attribution: 'Naval Ravikant', theme: 'Building Perception' },
  { text: 'Embrace accountability and take business risks under your own name. Society will reward you with responsibility, equity, and leverage.', attribution: 'Naval Ravikant', theme: 'Building Perception' },
  { text: 'Persistent, consistent, and frequent stories, delivered to an aligned audience, will earn attention, trust, and action.', attribution: 'Seth Godin, This Is Marketing', theme: 'Building Perception' },
  { text: 'Those who work hard and constantly seek to be visible to their superiors, those who showcase their hard work, are the ones who advance to positions of greater power and responsibility.', attribution: 'Abhishek Ratna, No Parking. No Halt. Success Non Stop!', theme: 'Building Perception' },

  // Career Capital
  { text: 'If your goal is to love what you do, you must first build up \'career capital\' by mastering rare and valuable skills, and then cash in this capital for the traits that define great work.', attribution: 'Cal Newport, So Good They Can\'t Ignore You', theme: 'Career Capital' },
  { text: 'Don\'t follow your passion; rather, let it follow you in your quest to become, in the words of my favorite Steve Martin quote, \'so good that they can\'t ignore you.\'', attribution: 'Cal Newport, So Good They Can\'t Ignore You', theme: 'Career Capital' },
  { text: 'If you want to love what you do, abandon the passion mindset (\'what can the world offer me?\') and instead adopt the craftsman mindset (\'what can I offer the world?\').', attribution: 'Cal Newport, So Good They Can\'t Ignore You', theme: 'Career Capital' },
  { text: 'All returns in life, whether in wealth, relationships, or knowledge, come from compound interest.', attribution: 'Naval Ravikant', theme: 'Career Capital' },
  { text: 'Become the best in the world at what you do. Keep redefining what you do until this is true.', attribution: 'Naval Ravikant', theme: 'Career Capital' },
  { text: 'We live in an age of infinite leverage, and the economic rewards for genuine intellectual curiosity have never been higher.', attribution: 'Naval Ravikant', theme: 'Career Capital' },
  { text: 'What I\'ve come to love about patience is that, ultimately, it\'s the truest test of merit: Are you willing to do the work, despite no guaranteed outcome?', attribution: 'Dorie Clark, The Long Game', theme: 'Career Capital' },

  // Evidence
  { text: 'If you don\'t remember everything important you did, your manager — no matter how great they are — probably doesn\'t either.', attribution: 'Julia Evans, Get your work recognized: write a brag document', theme: 'Evidence' },
  { text: 'Instead of trying to remember everything you did with your brain, maintain a \'brag document\' that lists everything so you can refer to it when you get to performance review season.', attribution: 'Julia Evans, Get your work recognized: write a brag document', theme: 'Evidence' },
  { text: 'It\'s really easy to lose track of what skills you\'re learning, and usually when I reflect on this I realize I learned a lot more than I thought.', attribution: 'Julia Evans, Get your work recognized: write a brag document', theme: 'Evidence' },
  { text: 'Don\'t do invisible work.', attribution: 'Chris Albon', theme: 'Evidence' },
  { text: 'The discipline of writing something down is the first step toward making it happen.', attribution: 'Lee Iacocca', theme: 'Evidence' },
  { text: 'An accomplishment without evidence is just a claim. An accomplishment with evidence is a case.', attribution: 'Unattributed', theme: 'Evidence' },

  // Building Skills
  { text: 'Specific knowledge is found by pursuing your innate talents, your genuine curiosity, and your passion. It\'s not by going to school for whatever is the hottest job.', attribution: 'Naval Ravikant', theme: 'Building Skills' },
  { text: 'Following your genuine intellectual curiosity is a better foundation for a career than following whatever is making money right now.', attribution: 'Naval Ravikant', theme: 'Building Skills' },
  { text: 'Learn to sell. Learn to build. If you can do both, you will be unstoppable.', attribution: 'Naval Ravikant', theme: 'Building Skills' },
  { text: 'If you just show up and work hard, you\'ll soon hit a performance plateau beyond which you fail to get any better.', attribution: 'Cal Newport, So Good They Can\'t Ignore You', theme: 'Building Skills' },
  { text: 'The most important skill for getting rich is becoming a perpetual learner. You have to know how to learn anything you want to learn.', attribution: 'Naval Ravikant', theme: 'Building Skills' },

  // Proving Progression
  { text: 'Compelling careers often have complex origins that reject the simple idea that all you have to do is follow your passion.', attribution: 'Cal Newport, So Good They Can\'t Ignore You', theme: 'Proving Progression' },
  { text: 'The people who get what they\'re after are very often the ones who just stick around long enough.', attribution: 'Austin Kleon, Show Your Work!', theme: 'Proving Progression' },
  { text: 'Careers are a jungle gym, not a ladder.', attribution: 'Sheryl Sandberg, Lean In', theme: 'Proving Progression' },
  { text: '20% of one\'s time is not going to bankrupt anybody… if it actually turns out that that 20% is allocated to something that is interesting, it could be a thing.', attribution: 'Dorie Clark, The Long Game', theme: 'Proving Progression' },
];

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
