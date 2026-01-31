import { prisma } from './prisma';

/**
 * Demo Table Selectors
 *
 * Provides a unified interface for querying demo vs production tables.
 * When isDemoMode is true, queries go to demo tables; otherwise, production tables.
 *
 * This pattern ensures:
 * - Same query logic for both modes
 * - Same response shape for both modes
 * - No contract drift between demo and production
 */

/**
 * Get the appropriate journal entry table based on demo mode.
 * Returns a Prisma delegate that can be used for queries.
 */
export function getJournalEntryTable(isDemoMode: boolean) {
  return isDemoMode ? prisma.demoJournalEntry : prisma.journalEntry;
}

/**
 * Get the appropriate tool activity table based on demo mode.
 * Returns a Prisma delegate that can be used for queries.
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
