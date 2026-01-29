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
