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
