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

// Lookback period is always 1 day (since last run)
export const LOOKBACK_DAYS = 1;

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
