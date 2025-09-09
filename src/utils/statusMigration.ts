import { Goal } from '../hooks/useGoals';

// Status migration mapping for backward compatibility
export const STATUS_MIGRATION_MAP = {
  'not-started': 'yet-to-start',
  'completed': 'achieved',
  'in-progress': 'in-progress',
  'blocked': 'blocked',
  'cancelled': 'cancelled',
  'pending-review': 'pending-review',
} as const;

export type OldStatus = keyof typeof STATUS_MIGRATION_MAP;
export type NewStatus = (typeof STATUS_MIGRATION_MAP)[OldStatus];

// Valid new status values
export const VALID_STATUSES: Goal['status'][] = [
  'yet-to-start',
  'in-progress',
  'blocked',
  'cancelled',
  'pending-review', 
  'achieved'
];

/**
 * Migrates a status value from old format to new format
 * @param status The status to migrate
 * @returns The migrated status or fallback to 'yet-to-start'
 */
export const migrateStatus = (status: string): Goal['status'] => {
  // Check if it's already a valid new status
  if (VALID_STATUSES.includes(status as Goal['status'])) {
    return status as Goal['status'];
  }
  
  // Try migration mapping - only log if actually migrating old data
  const migratedStatus = STATUS_MIGRATION_MAP[status as OldStatus];
  if (migratedStatus) {
    // Only log migration for debugging if needed - remove in production
    // console.warn(`[StatusMigration] Migrating status from '${status}' to '${migratedStatus}'`);
    return migratedStatus;
  }
  
  // Fallback to default
  console.error(`[StatusMigration] Unknown status '${status}', falling back to 'yet-to-start'`);
  return 'yet-to-start';
};

/**
 * Validates if a status is a valid new status value
 * @param status The status to validate
 * @returns True if the status is valid, false otherwise
 */
export const isValidStatus = (status: string): status is Goal['status'] => {
  return VALID_STATUSES.includes(status as Goal['status']);
};

/**
 * Migrates a full goal object, ensuring status compatibility
 * @param goal The goal object to migrate
 * @returns The goal with migrated status
 */
export const migrateGoal = (goal: Goal): Goal => {
  const migratedStatus = migrateStatus(goal.status);
  
  if (migratedStatus !== goal.status) {
    return {
      ...goal,
      status: migratedStatus
    };
  }
  
  return goal;
};

/**
 * Migrates an array of goals, ensuring status compatibility
 * @param goals Array of goals to migrate
 * @returns Array of goals with migrated statuses
 */
export const migrateGoals = (goals: Goal[]): Goal[] => {
  return goals.map(migrateGoal);
};

/**
 * Gets the display text for a status (handles both old and new formats)
 * @param status The status to get display text for
 * @returns Human-readable status text
 */
export const getStatusDisplayText = (status: string): string => {
  const migratedStatus = migrateStatus(status);
  
  switch (migratedStatus) {
    case 'yet-to-start': return 'Yet to start';
    case 'in-progress': return 'In Progress';
    case 'achieved': return 'Achieved';
    case 'blocked': return 'Blocked';
    case 'pending-review': return 'Pending Review';
    case 'cancelled': return 'Cancelled';
    default: return status;
  }
};

/**
 * Checks if a goal is overdue (handles both old and new status formats)
 * @param goal The goal to check
 * @returns True if the goal is overdue
 */
export const isGoalOverdue = (goal: Goal): boolean => {
  if (!goal.targetDate) return false;
  
  const migratedStatus = migrateStatus(goal.status);
  const isCompleted = migratedStatus === 'achieved';
  const isPastDue = new Date(goal.targetDate) < new Date();
  
  return isPastDue && !isCompleted;
};