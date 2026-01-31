import { z } from 'zod';

// Day of week options
export const dayOfWeekEnum = z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);

// Time format validation (HH:mm)
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

// Create subscription schema
export const createSubscriptionSchema = z.object({
  // Schedule
  selectedDays: z.array(dayOfWeekEnum)
    .min(1, 'At least one day must be selected')
    .max(7, 'Maximum 7 days can be selected'),
  generationTime: z.string()
    .regex(timeRegex, 'Time must be in HH:mm format (e.g., 18:00)'),
  timezone: z.string()
    .min(1, 'Timezone is required')
    .max(100, 'Timezone must be less than 100 characters'),

  // Tool selection
  selectedTools: z.array(z.string().max(50))
    .min(1, 'At least one tool must be selected')
    .max(20, 'Maximum 20 tools allowed'),

  // Customization (optional)
  customPrompt: z.string()
    .max(1000, 'Custom prompt must be less than 1,000 characters')
    .optional()
    .nullable(),
  defaultCategory: z.string()
    .max(100, 'Category must be less than 100 characters')
    .optional()
    .nullable(),
  defaultTags: z.array(z.string().max(50))
    .max(20, 'Maximum 20 tags allowed')
    .default([])
});

// Update subscription schema (all fields optional)
export const updateSubscriptionSchema = z.object({
  isActive: z.boolean().optional(),

  // Schedule
  selectedDays: z.array(dayOfWeekEnum)
    .min(1, 'At least one day must be selected')
    .max(7, 'Maximum 7 days can be selected')
    .optional(),
  generationTime: z.string()
    .regex(timeRegex, 'Time must be in HH:mm format (e.g., 18:00)')
    .optional(),
  timezone: z.string()
    .min(1, 'Timezone is required')
    .max(100, 'Timezone must be less than 100 characters')
    .optional(),

  // Tool selection
  selectedTools: z.array(z.string().max(50))
    .min(1, 'At least one tool must be selected')
    .max(20, 'Maximum 20 tools allowed')
    .optional(),

  // Customization (optional)
  customPrompt: z.string()
    .max(1000, 'Custom prompt must be less than 1,000 characters')
    .optional()
    .nullable(),
  defaultCategory: z.string()
    .max(100, 'Category must be less than 100 characters')
    .optional()
    .nullable(),
  defaultTags: z.array(z.string().max(50))
    .max(20, 'Maximum 20 tags allowed')
    .optional()
});

// Toggle subscription schema
export const toggleSubscriptionSchema = z.object({
  isActive: z.boolean()
});

// Response types for API
export const subscriptionResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  workspaceId: z.string(),
  isActive: z.boolean(),
  selectedDays: z.array(dayOfWeekEnum),
  generationTime: z.string(),
  timezone: z.string(),
  selectedTools: z.array(z.string()),
  customPrompt: z.string().nullable(),
  defaultCategory: z.string().nullable(),
  defaultTags: z.array(z.string()),
  lastRunAt: z.string().datetime().nullable(),
  nextRunAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

// Connected tools response
export const connectedToolsResponseSchema = z.object({
  tools: z.array(z.object({
    toolType: z.string(),
    isConnected: z.boolean(),
    connectedAt: z.string().datetime().nullable(),
    lastUsedAt: z.string().datetime().nullable()
  }))
});

// Type exports
export type DayOfWeek = z.infer<typeof dayOfWeekEnum>;
export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;
export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>;
export type ToggleSubscriptionInput = z.infer<typeof toggleSubscriptionSchema>;
export type SubscriptionResponse = z.infer<typeof subscriptionResponseSchema>;
export type ConnectedToolsResponse = z.infer<typeof connectedToolsResponseSchema>;

// Cadence types for dual-path generation
export type Cadence = 'daily' | 'weekly' | 'sprint';
export type GroupingMethod = 'temporal' | 'cluster';

// Valid grouping methods for validation
const VALID_GROUPING_METHODS: GroupingMethod[] = ['temporal', 'cluster'];

// Default grouping method if not specified or invalid
export const DEFAULT_GROUPING_METHOD: GroupingMethod = 'temporal';

/**
 * Validates and returns a valid grouping method, defaulting to 'temporal' if invalid
 */
export function validateGroupingMethod(value: string | null | undefined): GroupingMethod {
  if (value && VALID_GROUPING_METHODS.includes(value as GroupingMethod)) {
    return value as GroupingMethod;
  }
  return DEFAULT_GROUPING_METHOD;
}

// Time constants for date calculations
export const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Lookback period based on cadence
export const LOOKBACK_DAYS: Record<Cadence, number> = {
  daily: 1,
  weekly: 7,
  sprint: 14,
};

// Default cadence if not specified or invalid
export const DEFAULT_CADENCE: Cadence = 'daily';

/**
 * Validates and returns a valid cadence, defaulting to 'daily' if invalid
 */
export function validateCadence(value: string | null | undefined): Cadence {
  if (value && value in LOOKBACK_DAYS) {
    return value as Cadence;
  }
  return DEFAULT_CADENCE;
}

/**
 * Calculates lookback start date based on cadence
 */
export function calculateLookbackStart(cadence: Cadence, fromDate: Date = new Date()): Date {
  const lookbackDays = LOOKBACK_DAYS[cadence];
  return new Date(fromDate.getTime() - lookbackDays * MS_PER_DAY);
}

// Journal-specific frameworks (extends career-story frameworks)
export const JOURNAL_FRAMEWORKS = [
  // Career-story frameworks (from narrative-frameworks.ts)
  'STAR',
  'STARL',
  'CAR',
  'PAR',
  'SAR',
  'SOAR',
  'SHARE',
  'CARL',
  // Journal-specific frameworks
  'ONE_ON_ONE',
  'SKILL_GAP',
  'PROJECT_IMPACT',
] as const;

export type JournalFramework = (typeof JOURNAL_FRAMEWORKS)[number];

// Framework component definitions for journal-specific frameworks
export interface FrameworkComponent {
  name: string;
  label: string;
  description: string;
  prompt: string;
}

export const JOURNAL_FRAMEWORK_COMPONENTS: Record<string, FrameworkComponent[]> = {
  ONE_ON_ONE: [
    { name: 'wins', label: 'Wins', description: 'Recent accomplishments', prompt: 'What did you accomplish this period?' },
    { name: 'challenges', label: 'Challenges', description: 'Obstacles faced', prompt: 'What challenges did you encounter?' },
    { name: 'focus', label: 'Focus', description: 'Current priorities', prompt: 'What are you focusing on next?' },
    { name: 'asks', label: 'Asks', description: 'Support needed', prompt: 'What support or help do you need?' },
    { name: 'feedback', label: 'Feedback', description: 'Feedback to share', prompt: 'Any feedback to give or receive?' },
  ],
  SKILL_GAP: [
    { name: 'demonstrated', label: 'Demonstrated', description: 'Skills used', prompt: 'What skills did you demonstrate?' },
    { name: 'learned', label: 'Learned', description: 'New learnings', prompt: 'What new things did you learn?' },
    { name: 'gaps', label: 'Gaps', description: 'Areas to improve', prompt: 'What skill gaps did you identify?' },
    { name: 'plan', label: 'Plan', description: 'Development plan', prompt: 'How will you address these gaps?' },
  ],
  PROJECT_IMPACT: [
    { name: 'project', label: 'Project', description: 'Project context', prompt: 'What project were you working on?' },
    { name: 'contribution', label: 'Contribution', description: 'Your contribution', prompt: 'What was your specific contribution?' },
    { name: 'impact', label: 'Impact', description: 'Business impact', prompt: 'What impact did your work have?' },
    { name: 'collaboration', label: 'Collaboration', description: 'Team collaboration', prompt: 'Who did you work with?' },
  ],
};

// Supported tools list - synced with integrations page
export const SUPPORTED_TOOLS = [
  'github',
  'jira',
  'figma',
  'confluence',
  'slack',
  'teams',
  'outlook',
  'zoom',
  'onedrive',
  'onenote',
  'sharepoint',
  'google_workspace'
] as const;

export type SupportedTool = typeof SUPPORTED_TOOLS[number];

// =============================================================================
// CONSTANTS (Uncle Bob: No magic strings)
// =============================================================================

/** Default visibility for auto-generated entries */
export const DEFAULT_VISIBILITY = 'private' as const;

/** Default importance level for activities */
export const DEFAULT_IMPORTANCE = 'medium' as const;

/** Default category for auto-generated entries */
export const DEFAULT_CATEGORY = 'Daily Summary';

/** Tags applied to all auto-generated entries */
export const AUTO_GENERATED_TAGS = ['auto-generated', 'draft'] as const;

// =============================================================================
// FRAMEWORK METADATA REGISTRY (Sandi: Open/Closed Principle)
// =============================================================================

export interface FrameworkMetadata {
  titlePrefix: string;
  descriptionTemplate: string;
}

/**
 * Framework metadata for title and description generation.
 * Add new frameworks here instead of modifying generateTitle/generateDescription.
 */
export const FRAMEWORK_METADATA: Record<string, FrameworkMetadata> = {
  ONE_ON_ONE: {
    titlePrefix: '1:1 Prep',
    descriptionTemplate: '1:1 meeting prep based on activities from {tools}',
  },
  SKILL_GAP: {
    titlePrefix: 'Skill Development',
    descriptionTemplate: 'Skill development summary from {tools}',
  },
  PROJECT_IMPACT: {
    titlePrefix: 'Project Impact',
    descriptionTemplate: 'Project impact assessment from {tools}',
  },
  STAR: {
    titlePrefix: 'Achievement Story',
    descriptionTemplate: 'Achievement story structured from {tools}',
  },
  STARL: {
    titlePrefix: 'Learning Story',
    descriptionTemplate: 'Learning story from {tools}',
  },
  CAR: {
    titlePrefix: 'Challenge Summary',
    descriptionTemplate: 'Challenge-Action-Result summary from {tools}',
  },
  PAR: {
    titlePrefix: 'Problem Solving',
    descriptionTemplate: 'Problem-Action-Result summary from {tools}',
  },
  SAR: {
    titlePrefix: 'Quick Summary',
    descriptionTemplate: 'Situation-Action-Result summary from {tools}',
  },
  SOAR: {
    titlePrefix: 'Strategic Summary',
    descriptionTemplate: 'Strategic summary from {tools}',
  },
  SHARE: {
    titlePrefix: 'Team Story',
    descriptionTemplate: 'Team collaboration story from {tools}',
  },
  CARL: {
    titlePrefix: 'Reflection',
    descriptionTemplate: 'Reflection summary from {tools}',
  },
};

/** Default title prefix when no framework is specified */
export const DEFAULT_TITLE_PREFIX = 'Work Summary';

/** Default description template when no framework is specified */
export const DEFAULT_DESCRIPTION_TEMPLATE = 'Auto-generated summary of activities from {tools}';

// =============================================================================
// GENERATION CONTEXT (KB: Parameter Object Pattern)
// =============================================================================

/** Activity record from ToolActivity table */
export interface ToolActivity {
  id: string;
  userId: string;
  source: string;
  sourceId: string;
  sourceUrl?: string | null;
  title: string;
  description?: string | null;
  timestamp: Date;
  crossToolRefs: string[];
  rawData?: Record<string, unknown> | null;
}

/** Represents activity data fetched from a specific tool */
export interface ToolActivityData {
  toolType: string;
  activities: ToolActivity[];
  hasData: boolean;
}

/** Activity prepared for grouping operations */
export interface ActivityForGrouping {
  id: string;
  timestamp: Date;
  crossToolRefs: string[];
  source?: string;
}

/** Result of activity grouping */
export interface GroupedActivities {
  method: GroupingMethod;
  groups: Array<{
    key: string;
    activityIds: string[];
  }>;
}

/**
 * Context object for journal entry generation (KB: Parameter Object Pattern)
 * Replaces 7 individual parameters with a single context object
 */
export interface GenerationContext {
  /** Activity data from connected tools */
  activityData: ToolActivityData[];
  /** Optional custom focus prompt */
  customPrompt: string | null;
  /** Optional default category */
  defaultCategory: string | null;
  /** Default tags to apply */
  defaultTags: string[];
  /** Workspace ID */
  workspaceId: string;
  /** Optional framework to structure content (e.g., 'ONE_ON_ONE', 'STAR') */
  preferredFramework?: JournalFramework | null;
  /** Optional grouping method ('temporal' or 'cluster') */
  groupingMethod?: GroupingMethod | null;
}

/** Result of journal entry generation */
export interface GeneratedEntry {
  title: string;
  description: string;
  fullContent: string;
  category: string;
  format7Data: Format7Data;
  networkContent: string;
  format7DataNetwork: Format7DataNetwork;
}

/** Format7 data structure for rich journal entries */
export interface Format7Data {
  entry_metadata: {
    title: string;
    date: string;
    type: 'reflection';
    workspace: string;
    privacy: typeof DEFAULT_VISIBILITY;
    isAutomated: boolean;
    created_at: string;
  };
  context: {
    date_range: { start: string; end: string };
    sources_included: string[];
    total_activities: number;
    primary_focus: string;
  };
  activities: Format7Activity[];
  summary: {
    total_time_range_hours: number;
    activities_by_type: Record<string, number>;
    activities_by_source: Record<string, number>;
    unique_collaborators: string[];
    unique_reviewers: string[];
    technologies_used: string[];
    skills_demonstrated: string[];
  };
  correlations: unknown[];
  artifacts: unknown[];
  // Legacy fields for backward compatibility
  generatedAt: string;
  isAutoGenerated: boolean;
  customPrompt: string | null;
  // Optional framework info
  framework?: string;
  frameworkComponents?: Array<{
    name: string;
    label: string;
    content: string;
    prompt: string;
  }>;
  // Optional grouping info
  grouping?: {
    method: GroupingMethod;
    groups: Array<{ key: string; activityIds: string[] }>;
  };
}

/** Activity entry in Format7 data */
export interface Format7Activity {
  id: string;
  source: string;
  type: string;
  action: string;
  description: string;
  timestamp: string;
  evidence: {
    type: string;
    url: string;
    title: string;
    links: unknown[];
    metadata: Record<string, unknown>;
  };
  related_activities: unknown[];
  technologies: unknown[];
  collaborators: unknown[];
  reviewers: unknown[];
  importance: typeof DEFAULT_IMPORTANCE;
  metadata: unknown;
}

/** Simplified Format7 data for network view */
export interface Format7DataNetwork {
  entry_metadata: {
    title: string;
    date: string;
    type: string;
    isAutomated: boolean;
  };
  summary: string;
  toolsUsed: string[];
  isAutoGenerated: boolean;
}

// =============================================================================
// NOTIFICATION TYPES (DHH: Consolidated notification handling)
// =============================================================================

export type NotificationType =
  | 'entry_ready'
  | 'no_activity'
  | 'missing_tools'
  | 'generation_failed';

export interface NotificationContext {
  userId: string;
  workspaceId: string;
  workspaceName: string;
}

export interface NotificationData {
  entryId?: string;
  missingTools?: string[];
}

/** Notification configuration for each type */
export interface NotificationConfig {
  titleTemplate: string;
  message: string;
  relatedEntityType: 'JOURNAL_ENTRY' | 'WORKSPACE';
  subtype: string;
}

export const NOTIFICATION_CONFIGS: Record<NotificationType, NotificationConfig> = {
  entry_ready: {
    titleTemplate: 'Journal entry ready for {workspaceName}',
    message: 'Your auto-generated journal entry is ready for review',
    relatedEntityType: 'JOURNAL_ENTRY',
    subtype: 'journal_auto_entry_ready',
  },
  no_activity: {
    titleTemplate: 'No activity found for {workspaceName}',
    message: 'No activity was found from your connected tools. Want to add an entry manually?',
    relatedEntityType: 'WORKSPACE',
    subtype: 'journal_auto_no_activity',
  },
  missing_tools: {
    titleTemplate: 'Missing tools for {workspaceName}',
    message: 'Your journal entry was generated without {missingTools}. Connect them for complete entries.',
    relatedEntityType: 'WORKSPACE',
    subtype: 'journal_auto_tools_missing',
  },
  generation_failed: {
    titleTemplate: 'Journal generation failed for {workspaceName}',
    message: 'There was an issue generating your journal entry. Please try again later or create one manually.',
    relatedEntityType: 'WORKSPACE',
    subtype: 'journal_auto_generation_failed',
  },
};

// =============================================================================
// SUBSCRIPTION TYPE (KB/Uncle Bob: Proper typing)
// =============================================================================

/** Subscription with workspace relation for processing */
export interface SubscriptionForProcessing {
  id: string;
  userId: string;
  workspaceId: string;
  selectedTools: string[];
  customPrompt: string | null;
  defaultCategory: string | null;
  defaultTags: string[];
  cadence: string | null;
  groupingMethod: string | null;
  preferredFramework: string | null;
  workspace?: {
    name?: string;
    isActive?: boolean;
  } | null;
}
