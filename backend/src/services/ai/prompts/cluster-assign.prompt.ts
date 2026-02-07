/**
 * Cluster Assignment Prompt Builder
 *
 * Builds chat messages for LLM-based cluster assignment.
 * Follows the same pattern as derivation.prompt.ts:
 * Handlebars templates loaded from /templates/ directory.
 *
 * @module cluster-assign.prompt
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import Handlebars from 'handlebars';
import { ChatCompletionMessageParam } from 'openai/resources/index';

// =============================================================================
// TYPES
// =============================================================================

export interface ClusterSummary {
  id: string;
  name: string;
  activityCount: number;
  dateRange: string;
  toolSummary: string;
  topActivities: string;
  isReferenced: boolean;
}

export interface CandidateActivity {
  id: string;
  source: string;
  title: string;
  date: string;
  currentClusterId: string | null;
  confidence: string | null;
  description: string | null;
}

export interface ClusterAssignParams {
  existingClusters: ClusterSummary[];
  candidates: CandidateActivity[];
}

// =============================================================================
// TEMPLATE LOADING
// =============================================================================

const TEMPLATES_DIR = join(__dirname, 'templates');

// Register truncate helper for description length control
Handlebars.registerHelper('truncate', (str: string, len: number) => {
  if (!str) return '';
  if (str.length <= len) return str;
  return str.substring(0, len) + '...';
});

let systemTemplate: string;
let userTemplate: Handlebars.TemplateDelegate;

try {
  systemTemplate = readFileSync(join(TEMPLATES_DIR, 'cluster-assign-system.prompt.md'), 'utf-8');
  const userRaw = readFileSync(join(TEMPLATES_DIR, 'cluster-assign-user.prompt.md'), 'utf-8');
  userTemplate = Handlebars.compile(userRaw);
} catch (error) {
  console.warn('Failed to load cluster-assign prompt templates:', (error as Error).message);
  systemTemplate = 'You are a work activity clustering engine. Assign each candidate to KEEP, MOVE, or NEW. Return only JSON.';
  userTemplate = Handlebars.compile(
    '{{#each candidates}}{{this.id}}. [{{this.source}}] "{{this.title}}"\n{{/each}}\nRespond as JSON.'
  );
}

// =============================================================================
// PROMPT BUILDER
// =============================================================================

/**
 * Build chat messages for cluster assignment.
 */
export function buildClusterAssignMessages(
  params: ClusterAssignParams,
): ChatCompletionMessageParam[] {
  const userContent = userTemplate({
    existingClusters: params.existingClusters,
    candidates: params.candidates,
  });

  return [
    { role: 'system', content: systemTemplate },
    { role: 'user', content: userContent },
  ];
}
