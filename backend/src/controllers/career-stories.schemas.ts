/**
 * Career Stories API Schemas
 *
 * Zod schemas for request validation.
 * Exported for use in:
 * - Request validation in controller
 * - API documentation generation
 * - Client-side validation
 * - Test factories
 */

import { z } from 'zod';

// =============================================================================
// CLUSTER SCHEMAS
// =============================================================================

/**
 * Schema for POST /clusters/generate request body
 */
export const generateClustersSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  minClusterSize: z.number().int().min(2).max(100).optional(),
}).strict();

export type GenerateClustersInput = z.infer<typeof generateClustersSchema>;

/**
 * Schema for PATCH /clusters/:id request body
 */
export const updateClusterSchema = z.object({
  name: z.string().min(1).max(200),
}).strict();

export type UpdateClusterInput = z.infer<typeof updateClusterSchema>;

/**
 * Schema for POST /clusters/:id/activities request body
 */
export const addActivitySchema = z.object({
  activityId: z.string().min(1),
}).strict();

export type AddActivityInput = z.infer<typeof addActivitySchema>;

/**
 * Schema for POST /clusters/merge request body
 */
export const mergeClustersSchema = z.object({
  targetClusterId: z.string().min(1),
  sourceClusterIds: z.array(z.string().min(1)).min(1),
}).strict();

export type MergeClustersInput = z.infer<typeof mergeClustersSchema>;

// =============================================================================
// STAR GENERATION SCHEMAS
// =============================================================================

/**
 * Schema for STAR generation options
 */
export const starOptionsSchema = z.object({
  polish: z.boolean().optional(),
  framework: z.enum(['STAR', 'STARL', 'CAR', 'PAR', 'SAR', 'SOAR', 'SHARE', 'CARL']).optional(),
  debug: z.boolean().optional(),
}).strict();

export type StarOptionsInput = z.infer<typeof starOptionsSchema>;

/**
 * Schema for POST /clusters/:id/generate-star request body
 */
export const generateStarSchema = z.object({
  personaId: z.string().optional(),
  options: starOptionsSchema.optional(),
}).strict();

export type GenerateStarInput = z.infer<typeof generateStarSchema>;

// =============================================================================
// REGENERATE STORY SCHEMAS
// =============================================================================

import { frameworkNameSchema } from './story-wizard.schemas';

export const writingStyleSchema = z.enum([
  'professional',
  'casual',
  'technical',
  'storytelling',
]);

export type WritingStyle = z.infer<typeof writingStyleSchema>;

/** Max length for user prompt to prevent excessively long LLM inputs */
export const USER_PROMPT_MAX_LENGTH = 500;

/**
 * Schema for POST /stories/:id/regenerate request body
 */
export const regenerateStorySchema = z.object({
  framework: frameworkNameSchema.optional(),
  style: writingStyleSchema.optional(),
  archetype: z.enum([
    'firefighter', 'architect', 'diplomat', 'multiplier',
    'detective', 'pioneer', 'turnaround', 'preventer',
  ]).optional(),
  userPrompt: z
    .string()
    .max(USER_PROMPT_MAX_LENGTH)
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      const trimmed = val.trim();
      return trimmed.length === 0 ? undefined : trimmed;
    }),
}).strict();

export type RegenerateStoryInput = z.infer<typeof regenerateStorySchema>;

// =============================================================================
// HELPER
// =============================================================================

/**
 * Format Zod errors for API response
 */
export const formatZodErrors = (error: z.ZodError) => ({
  errors: error.errors.map(e => ({
    path: e.path.join('.'),
    message: e.message,
  })),
});

// =============================================================================
// DERIVATION SCHEMAS
// =============================================================================

export const derivationTypeSchema = z.enum([
  'interview',
  'linkedin',
  'resume',
  'one-on-one',
  'self-assessment',
  'team-share',
]);

export type DerivationType = z.infer<typeof derivationTypeSchema>;

/**
 * Schema for POST /stories/:id/derive request body
 */
export const deriveStorySchema = z.object({
  derivation: derivationTypeSchema,
  tone: writingStyleSchema.optional(),
  customPrompt: z
    .string()
    .max(USER_PROMPT_MAX_LENGTH)
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      const trimmed = val.trim();
      return trimmed.length === 0 ? undefined : trimmed;
    }),
}).strict();

export type DeriveStoryInput = z.infer<typeof deriveStorySchema>;

// =============================================================================
// STORY SOURCE SCHEMAS
// =============================================================================

/**
 * Schema for POST /stories/:storyId/sources (add user note)
 */
export const createSourceSchema = z.object({
  sectionKey: z.string().min(1).max(50),
  sourceType: z.literal('user_note'),
  content: z.string().min(1).max(2000),
}).strict();

export type CreateSourceInput = z.infer<typeof createSourceSchema>;

/**
 * Schema for PATCH /stories/:storyId/sources/:sourceId (exclude/restore)
 */
export const updateSourceSchema = z.object({
  excludedAt: z.string().datetime().nullable(),
}).strict();

export type UpdateSourceInput = z.infer<typeof updateSourceSchema>;
