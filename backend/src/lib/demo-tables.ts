import { prisma } from './prisma';

/**
 * Demo Table Selectors
 *
 * Provides a unified interface for querying demo vs production tables
 * for SOURCE-LEVEL data (activities).
 *
 * NOTE: JournalEntry and CareerStory now use unified models with `sourceMode`
 * field instead of separate demo tables. Use the respective services with
 * isDemoMode flag instead of these helpers:
 * - JournalService(isDemoMode) for journal entries
 * - CareerStoryService(isDemoMode) for career stories
 *
 * This file only handles source-level tables:
 * - DemoToolActivity vs ToolActivity
 */

/**
 * Get the appropriate tool activity table based on demo mode.
 * Returns a Prisma delegate that can be used for queries.
 *
 * NOTE: This is for SOURCE-LEVEL data only. For domain models
 * (JournalEntry, CareerStory), use the unified models with sourceMode.
 */
export function getToolActivityTable(isDemoMode: boolean) {
  return isDemoMode ? prisma.demoToolActivity : prisma.toolActivity;
}

/**
 * Type guard to check if we're dealing with demo or production data.
 * Useful for conditional logic that differs between modes.
 */
export function isDemoTable<T>(isDemoMode: boolean, _data: T): boolean {
  return isDemoMode;
}
