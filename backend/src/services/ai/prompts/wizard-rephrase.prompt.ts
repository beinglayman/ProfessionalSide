/**
 * Ship 4b - per-draft LLM rephraser + activity-derived chips for the
 * Story Wizard's question step.
 *
 * Input: the generic intent-seed questions for a specific draft, plus the
 * draft's title, description, dominantRole, topics, skills, archetype.
 * Output: one rephrased question per intent with 2-4 chip options grounded
 * in the same context.
 *
 * This module is a pure prompt builder + response parser. It does not call
 * the LLM itself - the caller (story-wizard.service.analyzeEntry) uses
 * ModelSelectorService.executeTask to do that so all LLM plumbing,
 * rate-limit handling, and cost tracking stays in one place.
 *
 * Fallback policy: if the parser returns fewer questions than asked, or
 * any individual question fails a sanity check (too short, too long, missing
 * chips), the caller keeps the generic intent-seed version for that one
 * question. Never blow up the whole wizard on one bad line.
 */

import type { ChatCompletionMessageParam } from 'openai/resources/index';
import type { ChecklistRowId } from '../../../types/journal.types';

export interface RephraseContext {
  /** Draft title - shown verbatim in the prompt so the LLM can reference it. */
  entryTitle: string;
  /** One-paragraph draft description (the LLM's summary, not the full content). */
  entryDescription: string;
  /** User's primary role on the work ("Led", "Contributed", etc.). */
  dominantRole?: string | null;
  /** Topics + skills surfaced on the draft. Used to ground chip language. */
  topics?: string[];
  skills?: string[];
  /** Short archetype label ("firefighter", "architect", ...). Optional. */
  archetype?: string | null;
  /** The generic intents we want rephrased. Order is preserved in the output. */
  intents: Array<{
    id: ChecklistRowId;
    genericQuestion: string;
  }>;
}

export interface RephrasedQuestion {
  intentId: ChecklistRowId;
  /** Rephrased question text, grounded in the draft context. */
  question: string;
  /** 2-4 chip options. Empty array = LLM couldn't find good ones; caller falls back to seed. */
  chips: Array<{ label: string; value: string }>;
}

const SYSTEM_PROMPT = `You are a Story Coach who writes interview questions grounded in the specific facts of a user's draft story. You never ask generic questions when the draft context gives you something concrete to point at.

Rules:
- Use specifics from the draft (names, numbers, systems, incidents). If nothing specific exists for a question, keep it direct but don't invent details.
- Each rephrased question must be under 200 characters. Concise beats clever.
- Chips are short, glanceable answer starters. Each label is 2-6 words. Each value is a short slug (lowercase, hyphenated).
- Return ONLY valid JSON matching the schema. No prose, no markdown, no fences.`;

/**
 * Build the messages array for the rephrase call. Single-pass: all intents
 * are rephrased in one call so we don't make N LLM calls for N questions.
 */
export function buildRephraseMessages(ctx: RephraseContext): ChatCompletionMessageParam[] {
  const topicsLine =
    ctx.topics && ctx.topics.length > 0
      ? `Topics: ${ctx.topics.slice(0, 8).join(', ')}`
      : 'Topics: (none surfaced)';
  const skillsLine =
    ctx.skills && ctx.skills.length > 0
      ? `Skills: ${ctx.skills.slice(0, 8).join(', ')}`
      : 'Skills: (none surfaced)';
  const roleLine = ctx.dominantRole ? `Role: ${ctx.dominantRole}` : 'Role: (not classified)';
  const archetypeLine = ctx.archetype ? `Archetype: ${ctx.archetype}` : '';

  const intentsBlock = ctx.intents
    .map((i, idx) => `${idx + 1}. [${i.id}] ${i.genericQuestion}`)
    .join('\n');

  const user = `Draft under review:
Title: ${ctx.entryTitle}
Description: ${ctx.entryDescription}
${roleLine}
${topicsLine}
${skillsLine}
${archetypeLine}

Rephrase each of the following generic questions using specifics from the draft above. For each question, also propose 2-4 answer-starter chips grounded in the same context (user can pick 0, 1, or many and still free-text).

${intentsBlock}

Return JSON matching this exact schema:
{
  "questions": [
    {
      "intentId": "<one of: ${ctx.intents.map((i) => i.id).join(' | ')}>",
      "question": "<rephrased question, under 200 chars>",
      "chips": [
        { "label": "<2-6 words>", "value": "<short-slug>" }
      ]
    }
  ]
}

Order MUST match the numbered list above. Every intentId must be present exactly once.`;

  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: user },
  ];
}

/**
 * Parse the LLM's JSON response into a map from intentId to rephrased
 * question. Silently drops malformed entries; the caller uses the generic
 * seed for any intentId that doesn't come back.
 */
export function parseRephraseResponse(raw: string): Map<ChecklistRowId, RephrasedQuestion> {
  const out = new Map<ChecklistRowId, RephrasedQuestion>();
  let content = raw.trim();
  if (content.startsWith('```')) {
    content = content.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return out;
  }

  if (!parsed || typeof parsed !== 'object') return out;
  const questions = (parsed as { questions?: unknown }).questions;
  if (!Array.isArray(questions)) return out;

  const VALID_IDS: Set<ChecklistRowId> = new Set([
    'situation', 'role', 'action', 'result', 'stakes', 'hardest', 'learning',
  ]);

  for (const q of questions) {
    if (!q || typeof q !== 'object') continue;
    const qObj = q as Record<string, unknown>;
    const intentId = qObj.intentId;
    const questionText = qObj.question;
    const chipsRaw = qObj.chips;

    if (typeof intentId !== 'string' || !VALID_IDS.has(intentId as ChecklistRowId)) continue;
    if (typeof questionText !== 'string') continue;
    const trimmed = questionText.trim();
    if (trimmed.length < 20 || trimmed.length > 240) continue;

    const chips: Array<{ label: string; value: string }> = [];
    if (Array.isArray(chipsRaw)) {
      for (const c of chipsRaw) {
        if (!c || typeof c !== 'object') continue;
        const cObj = c as Record<string, unknown>;
        if (typeof cObj.label !== 'string' || typeof cObj.value !== 'string') continue;
        const label = cObj.label.trim();
        const value = cObj.value.trim();
        if (!label || !value || label.length > 80) continue;
        chips.push({ label, value });
        if (chips.length >= 4) break;
      }
    }

    out.set(intentId as ChecklistRowId, {
      intentId: intentId as ChecklistRowId,
      question: trimmed,
      chips,
    });
  }

  return out;
}
