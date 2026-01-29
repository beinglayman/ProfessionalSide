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
  framework: z.enum(['STAR', 'CAR', 'PAR', 'SOAR']).optional(),
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
