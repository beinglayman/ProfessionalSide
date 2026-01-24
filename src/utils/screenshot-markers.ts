/**
 * Screenshot Markers Utility
 *
 * Provides programmatic way to mark sections for screenshot capture.
 * Used with Playwright's screenshot-helper for CD6 Design-UX Screenshot Verification.
 *
 * Usage:
 *   import { screenshotSection, screenshotId } from '@/utils/screenshot-markers';
 *
 *   // Mark a section
 *   <div {...screenshotSection('workspace-header')}>...</div>
 *
 *   // Mark with additional test ID
 *   <div {...screenshotId('workspace-list', 'empty-state')}>...</div>
 */

/**
 * Creates data attributes for screenshot section targeting
 *
 * @param section - Unique section identifier (kebab-case recommended)
 * @returns Object with data-screenshot-section attribute
 *
 * @example
 * <div {...screenshotSection('workspace-header')}>
 *   <h1>Workspaces</h1>
 * </div>
 */
export function screenshotSection(section: string): {
  'data-screenshot-section': string;
} {
  return { 'data-screenshot-section': section };
}

/**
 * Creates data attributes for screenshot targeting with test ID
 *
 * @param section - Section identifier
 * @param testId - Additional test ID for targeting
 * @returns Object with data-screenshot-section and data-testid attributes
 *
 * @example
 * <div {...screenshotId('workspace-list', 'empty-state')}>
 *   <p>No workspaces found</p>
 * </div>
 */
export function screenshotId(
  section: string,
  testId: string
): {
  'data-screenshot-section': string;
  'data-testid': string;
} {
  return {
    'data-screenshot-section': section,
    'data-testid': testId,
  };
}

/**
 * Creates a unique screenshot state marker
 * Useful for capturing different states of the same component
 *
 * @param section - Base section name
 * @param state - State identifier (e.g., 'loading', 'empty', 'error', 'success')
 * @returns Object with data-screenshot-section attribute combining section and state
 *
 * @example
 * {isLoading && <div {...screenshotState('workspace-list', 'loading')}>Loading...</div>}
 * {isEmpty && <div {...screenshotState('workspace-list', 'empty')}>No items</div>}
 * {hasData && <div {...screenshotState('workspace-list', 'populated')}>...</div>}
 */
export function screenshotState(
  section: string,
  state: string
): {
  'data-screenshot-section': string;
  'data-screenshot-state': string;
} {
  return {
    'data-screenshot-section': `${section}--${state}`,
    'data-screenshot-state': state,
  };
}

/**
 * All screenshot section names used in the app
 * Centralized registry for documentation and consistency
 */
export const SCREENSHOT_SECTIONS = {
  // Dashboard
  DASHBOARD_HEADER: 'dashboard-header',
  DASHBOARD_STATS: 'dashboard-stats',
  DASHBOARD_RECENT: 'dashboard-recent',

  // Workspace
  WORKSPACE_HEADER: 'workspace-header',
  WORKSPACE_LIST: 'workspace-list',
  WORKSPACE_EMPTY: 'workspace-list--empty',
  WORKSPACE_FILTERS: 'workspace-filters',
  WORKSPACE_CARD: 'workspace-card',

  // Journal
  JOURNAL_LIST: 'journal-list',
  JOURNAL_ENTRY: 'journal-entry',
  JOURNAL_EDITOR: 'journal-editor',

  // Notifications
  NOTIFICATIONS_DROPDOWN: 'notifications-dropdown',
  NOTIFICATIONS_LIST: 'notifications-list',

  // Settings
  SETTINGS_PROFILE: 'settings-profile',
  SETTINGS_PREFERENCES: 'settings-preferences',

  // Auth
  AUTH_LOGIN: 'auth-login',
  AUTH_REGISTER: 'auth-register',
} as const;

export type ScreenshotSectionName =
  (typeof SCREENSHOT_SECTIONS)[keyof typeof SCREENSHOT_SECTIONS];
