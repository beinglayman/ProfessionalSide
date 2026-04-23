/**
 * Question intent seeds — Ship 4 of the Story Creation Simplification.
 *
 * Replaces the 48-variant static question bank (8 archetypes × 6 questions,
 * in cli/story-coach/questions.ts) with 6 universal intent seeds that map
 * 1:1 to Story Checklist rows. When a checklist row is classified 'ask'
 * by the draft-generation LLM, its matching intent produces the question
 * shown to the user.
 *
 * Each intent carries the two-line "why we're asking / how your answer
 * helps" explainer the wizard renders above the question — making the
 * product's need for the answer visible instead of treating the user as a
 * data-fill target.
 *
 * Design: docs/2026-04-22-story-creation-simplification-design.md, Ship 4.
 *
 * NOTE (Ship 4a): This module ships the intent seeds and their generic
 * phrasings. Per-draft LLM rephrasing and activity-derived chip generation
 * (Ship 4b) will layer on top without changing this file's exports.
 */

import type { ChecklistRowId } from '../../../types/journal.types';

/**
 * Phase classification preserved from the prior D-I-G question framework.
 * Used downstream to feed the story-generation prompt the right extracted
 * context field (see story-wizard.service.answersToContext).
 */
export type IntentPhase = 'dig' | 'impact' | 'growth';

export interface QuestionIntent {
  /** Maps 1:1 to the checklist row this intent covers. */
  id: ChecklistRowId;
  /** D-I-G phase classification (for downstream context mapping). */
  phase: IntentPhase;
  /** Generic question phrasing used when no per-draft rephrasing is available. */
  genericQuestion: string;
  /** Short hint rendered under the question. */
  hint: string;
  /** Explainer line 1: why this information is needed. */
  whyWeNeed: string;
  /** Explainer line 2: how the user's answer shapes the final story. */
  howItHelps: string;
  /**
   * Default chip options when we don't have activity-derived chips (Ship 4b).
   * User can select 0-N chips and still free-text. Keep these ≤4 and generic.
   */
  fallbackChips: Array<{ label: string; value: string }>;
}

/**
 * Canonical intent seeds. Ordered to match the checklist's natural narrative
 * order. Not every draft triggers every intent — only rows classified 'ask'
 * by the draft-generation pass spawn a question.
 */
export const QUESTION_INTENTS: Record<ChecklistRowId, QuestionIntent> = {
  situation: {
    id: 'situation',
    phase: 'dig',
    genericQuestion: 'What was the context — where was the work happening and what was at stake going in?',
    hint: 'A sentence or two. Keep it concrete.',
    whyWeNeed: 'Your Activities show timestamps and titles, but not the backdrop a reader needs to orient.',
    howItHelps: 'Becomes the opening sentence of your story — what a recruiter reads first.',
    fallbackChips: [
      { label: 'High-pressure / time-sensitive', value: 'high-pressure' },
      { label: 'Cross-team / shared codebase', value: 'cross-team' },
      { label: 'New territory / no playbook', value: 'new-territory' },
      { label: 'Legacy system / tech debt', value: 'legacy' },
    ],
  },

  role: {
    id: 'role',
    phase: 'dig',
    genericQuestion: 'What specifically was YOUR role in this — versus what the team did around you?',
    hint: 'Be precise about what you owned.',
    whyWeNeed: 'Your Activities show participation but not ownership. "Led vs contributed" reads the same in GitHub.',
    howItHelps: 'Turns a generic team story into a specific career moment — which is what recruiters scan for.',
    fallbackChips: [
      { label: 'I led / owned it', value: 'led' },
      { label: 'I was a key contributor', value: 'contributor' },
      { label: 'I reviewed / advised', value: 'reviewer' },
      { label: 'I executed someone else\'s design', value: 'executor' },
    ],
  },

  action: {
    // Rarely 'ask' — activities usually cover this. Kept for completeness.
    id: 'action',
    phase: 'dig',
    genericQuestion: 'Walk through the actions you took that the data doesn\'t capture — a conversation, a decision, a side quest.',
    hint: 'Anything meaningful that left no trail in the tools.',
    whyWeNeed: 'Some of the most important work happens in conversations, not commits.',
    howItHelps: 'Fills in the "how" beats the reader needs to follow the story.',
    fallbackChips: [],
  },

  result: {
    id: 'result',
    phase: 'impact',
    genericQuestion: 'What\'s the number or the verifiable outcome that proves this worked?',
    hint: 'A metric, a shipped state, a customer quote — anything concrete.',
    whyWeNeed: 'Your Activities don\'t carry the metric, or it lives somewhere else (a dashboard, a retro).',
    howItHelps: 'Anchors the story. Unmeasured work reads as speculation; measured work reads as impact.',
    fallbackChips: [
      { label: 'A specific metric (%, $, time)', value: 'metric' },
      { label: 'Shipped to production', value: 'shipped' },
      { label: 'Problem stayed fixed', value: 'fixed' },
      { label: 'Adopted by another team', value: 'adopted' },
    ],
  },

  stakes: {
    id: 'stakes',
    phase: 'impact',
    genericQuestion: 'What would have gone wrong if you hadn\'t done this — or hadn\'t done it well?',
    hint: 'The counterfactual. Not "what did the bug do", but "what nearly happened".',
    whyWeNeed: 'Activities don\'t encode consequence. Severity levels hint at it but don\'t name it.',
    howItHelps: 'Becomes the story\'s hook — the line that tells a recruiter why this mattered beyond the team.',
    fallbackChips: [
      { label: 'Revenue at risk', value: 'revenue' },
      { label: 'Customer trust / reputation', value: 'trust' },
      { label: 'SLA / contractual breach', value: 'sla' },
      { label: 'Data loss or integrity', value: 'data' },
    ],
  },

  hardest: {
    id: 'hardest',
    phase: 'dig',
    genericQuestion: 'What was the hardest or least obvious part — the thing that took longer than you expected?',
    hint: 'The part that\'ll feel meaningful to a fellow engineer reading this.',
    whyWeNeed: 'Activities don\'t show where you struggled. Review threads and long gaps hint at it, but rarely name it.',
    howItHelps: 'Adds depth. Stories without a "hard part" read as smooth execution — and smooth execution is forgettable.',
    fallbackChips: [
      { label: 'A tricky bug / race condition', value: 'bug' },
      { label: 'A hard conversation / alignment', value: 'alignment' },
      { label: 'Ambiguity in requirements', value: 'ambiguity' },
      { label: 'Legacy code fighting back', value: 'legacy' },
    ],
  },

  learning: {
    id: 'learning',
    phase: 'growth',
    genericQuestion: 'What did you take away from this that\'s shaping how you work now?',
    hint: 'One thing you do differently after this experience.',
    whyWeNeed: 'Nobody but you can tell us what this changed for you — and growth is the core of STARL stories.',
    howItHelps: 'Closes the story. A learning makes the work read as compounding rather than one-off.',
    fallbackChips: [
      { label: 'A new technical habit', value: 'technical' },
      { label: 'A collaboration / comms shift', value: 'collaboration' },
      { label: 'A design / architecture lens', value: 'architecture' },
      { label: 'A process or tooling change', value: 'process' },
    ],
  },
};
