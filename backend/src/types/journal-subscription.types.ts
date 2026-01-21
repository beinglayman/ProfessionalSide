import { z } from 'zod';

// Frequency options
export const frequencyEnum = z.enum([
  'daily',
  'alternate',
  'weekdays',
  'weekly',
  'fortnightly',
  'monthly',
  'custom'
]);

// Day of week options
export const dayOfWeekEnum = z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);

// Time format validation (HH:mm)
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

// Create subscription schema
export const createSubscriptionSchema = z.object({
  // Schedule
  frequency: frequencyEnum,
  selectedDays: z.array(dayOfWeekEnum)
    .default([])
    .refine(
      (days) => days.length <= 7,
      'Maximum 7 days can be selected'
    ),
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
}).refine(
  (data) => {
    // Custom frequency requires at least one selected day
    if (data.frequency === 'custom' && data.selectedDays.length === 0) {
      return false;
    }
    return true;
  },
  {
    message: 'Custom frequency requires at least one selected day',
    path: ['selectedDays']
  }
).refine(
  (data) => {
    // Weekly/Fortnightly/Monthly require exactly one selected day
    if (['weekly', 'fortnightly', 'monthly'].includes(data.frequency)) {
      if (data.selectedDays.length !== 1) {
        return false;
      }
    }
    return true;
  },
  {
    message: 'Weekly, fortnightly, and monthly frequencies require exactly one selected day',
    path: ['selectedDays']
  }
);

// Update subscription schema (all fields optional except for refinements)
export const updateSubscriptionSchema = z.object({
  isActive: z.boolean().optional(),

  // Schedule
  frequency: frequencyEnum.optional(),
  selectedDays: z.array(dayOfWeekEnum)
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
  frequency: frequencyEnum,
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
export type Frequency = z.infer<typeof frequencyEnum>;
export type DayOfWeek = z.infer<typeof dayOfWeekEnum>;
export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;
export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>;
export type ToggleSubscriptionInput = z.infer<typeof toggleSubscriptionSchema>;
export type SubscriptionResponse = z.infer<typeof subscriptionResponseSchema>;
export type ConnectedToolsResponse = z.infer<typeof connectedToolsResponseSchema>;

// Lookback period mapping (in days)
export const LOOKBACK_PERIODS: Record<Frequency, number> = {
  daily: 1,
  alternate: 2,
  weekdays: 1,
  weekly: 7,
  fortnightly: 14,
  monthly: 30,
  custom: 1 // Per selected day
};

// Supported tools list
export const SUPPORTED_TOOLS = [
  'github',
  'jira',
  'figma',
  'confluence',
  'slack',
  'teams',
  'outlook',
  'zoom',
  'linear',
  'notion',
  'asana',
  'trello'
] as const;

export type SupportedTool = typeof SUPPORTED_TOOLS[number];
