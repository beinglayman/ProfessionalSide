/**
 * Story Wizard API Schemas
 *
 * Zod schemas for request validation of the two-step wizard flow.
 * Step 1: analyzeEntry - detect archetype, return questions
 * Step 2: generateStory - generate story with user answers
 */

import { z } from 'zod';

// =============================================================================
// SHARED ENUMS
// =============================================================================

export const storyArchetypeSchema = z.enum([
  'firefighter',
  'architect',
  'diplomat',
  'multiplier',
  'detective',
  'pioneer',
  'turnaround',
  'preventer',
]);

export const frameworkNameSchema = z.enum([
  'STAR',
  'STARL',
  'CAR',
  'PAR',
  'SAR',
  'SOAR',
  'SHARE',
  'CARL',
]);

// =============================================================================
// ANALYZE ENDPOINT SCHEMAS
// =============================================================================

/**
 * Schema for POST /wizard/analyze request body
 */
export const analyzeRequestSchema = z.object({
  journalEntryId: z.string().uuid('Invalid journal entry ID'),
}).strict();

export type AnalyzeRequestInput = z.infer<typeof analyzeRequestSchema>;

// =============================================================================
// GENERATE ENDPOINT SCHEMAS
// =============================================================================

/**
 * Schema for a single wizard answer (checkbox selections + optional free text)
 */
export const wizardAnswerSchema = z.object({
  selected: z.array(z.string()).default([]),
  freeText: z.string().optional(),
});

export type WizardAnswerInput = z.infer<typeof wizardAnswerSchema>;

/**
 * Schema for POST /wizard/generate request body
 */
export const generateRequestSchema = z.object({
  journalEntryId: z.string().uuid('Invalid journal entry ID'),
  answers: z.record(z.string(), wizardAnswerSchema),
  archetype: storyArchetypeSchema,
  framework: frameworkNameSchema,
}).strict();

export type GenerateRequestInput = z.infer<typeof generateRequestSchema>;

// =============================================================================
// HELPER
// =============================================================================

/**
 * Format Zod errors for API response
 */
export const formatZodErrors = (error: z.ZodError) => ({
  errors: error.errors.map((e) => ({
    path: e.path.join('.'),
    message: e.message,
  })),
});
