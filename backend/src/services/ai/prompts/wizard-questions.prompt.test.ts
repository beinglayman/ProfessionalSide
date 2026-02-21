/**
 * Wizard Questions Prompt Builder Tests
 *
 * Tests for:
 * - buildWizardQuestionMessages: System + user message construction
 * - parseWizardQuestionsResponse: JSON parse + validation (valid, invalid, edge cases)
 */

import { describe, it, expect } from 'vitest';
import {
  buildWizardQuestionMessages,
  parseWizardQuestionsResponse,
  WizardQuestionPromptParams,
  ARCHETYPE_PREFIXES,
} from './wizard-questions.prompt';
import type { ArchetypeSignals } from '../../../cli/story-coach/types';

// =============================================================================
// FIXTURES
// =============================================================================

const DEFAULT_SIGNALS: ArchetypeSignals = {
  hasCrisis: true,
  hasArchitecture: false,
  hasStakeholders: false,
  hasMultiplication: false,
  hasMystery: false,
  hasPioneering: false,
  hasTurnaround: false,
  hasPrevention: false,
};

const createParams = (overrides?: Partial<WizardQuestionPromptParams>): WizardQuestionPromptParams => ({
  archetype: 'firefighter',
  archetypeReasoning: 'Entry describes responding to a production incident',
  entryTitle: 'Production Incident Response',
  entryContent: 'At 2am on a Tuesday, I received an alert about our payment processing system being down. I quickly assembled a team including Sarah from platform and Marcus from orders.',
  signals: DEFAULT_SIGNALS,
  questionIdPrefix: 'ff',
  ...overrides,
});

const VALID_LLM_RESPONSE = JSON.stringify([
  { id: 'ff-dig-1', phase: 'dig', question: 'You mentioned Sarah and Marcus — who made the first call?', hint: 'Name the person and what they said.' },
  { id: 'ff-dig-2', phase: 'dig', question: 'What was the first dead end you hit debugging the payment system?', hint: 'The wrong hypothesis you chased.' },
  { id: 'ff-dig-3', phase: 'dig', question: 'Walk me through the 2am moment — what did the alert say?', hint: 'The exact error or dashboard.' },
  { id: 'ff-impact-1', phase: 'impact', question: 'If the payment system stayed down until morning, what was at stake?', hint: 'Revenue per hour, affected customers.' },
  { id: 'ff-impact-2', phase: 'impact', question: 'How long was the total outage from alert to fix?', hint: 'Minutes or hours.' },
  { id: 'ff-growth-1', phase: 'growth', question: 'What monitoring or runbook did you create after this?', hint: 'Something concrete that exists today.' },
]);

// =============================================================================
// buildWizardQuestionMessages
// =============================================================================

describe('buildWizardQuestionMessages', () => {
  it('returns [system, user] messages', () => {
    const messages = buildWizardQuestionMessages(createParams());
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('system');
    expect(messages[1].role).toBe('user');
  });

  it('system message contains Story Coach persona', () => {
    const messages = buildWizardQuestionMessages(createParams());
    const systemContent = messages[0].content as string;
    expect(systemContent).toContain('Story Coach');
    expect(systemContent).toContain('JSON');
  });

  it('user message contains entry title', () => {
    const messages = buildWizardQuestionMessages(createParams());
    const userContent = messages[1].content as string;
    expect(userContent).toContain('Production Incident Response');
  });

  it('user message contains entry content', () => {
    const messages = buildWizardQuestionMessages(createParams());
    const userContent = messages[1].content as string;
    expect(userContent).toContain('payment processing system');
  });

  it('user message contains archetype', () => {
    const messages = buildWizardQuestionMessages(createParams());
    const userContent = messages[1].content as string;
    expect(userContent).toContain('firefighter');
  });

  it('user message contains archetype reasoning', () => {
    const messages = buildWizardQuestionMessages(createParams());
    const userContent = messages[1].content as string;
    expect(userContent).toContain('responding to a production incident');
  });

  it('user message lists present signals', () => {
    const messages = buildWizardQuestionMessages(createParams());
    const userContent = messages[1].content as string;
    expect(userContent).toContain('crisis/urgency');
  });

  it('user message lists missing signals', () => {
    const messages = buildWizardQuestionMessages(createParams());
    const userContent = messages[1].content as string;
    expect(userContent).toContain('system design/architecture');
  });

  it('user message contains question ID prefix', () => {
    const messages = buildWizardQuestionMessages(createParams({ questionIdPrefix: 'ar' }));
    const userContent = messages[1].content as string;
    expect(userContent).toContain('ar');
  });

  it('does not contain unrendered Handlebars syntax', () => {
    const messages = buildWizardQuestionMessages(createParams());
    const userContent = messages[1].content as string;
    expect(userContent).not.toMatch(/\{\{[^}]+\}\}/);
  });

  it('handles all archetypes', () => {
    for (const [archetype, prefix] of Object.entries(ARCHETYPE_PREFIXES)) {
      const messages = buildWizardQuestionMessages(createParams({
        archetype: archetype as any,
        questionIdPrefix: prefix,
      }));
      expect(messages).toHaveLength(2);
      const userContent = messages[1].content as string;
      expect(userContent).toContain(archetype);
    }
  });
});

// =============================================================================
// parseWizardQuestionsResponse
// =============================================================================

describe('parseWizardQuestionsResponse', () => {
  it('parses valid JSON array', () => {
    const result = parseWizardQuestionsResponse(VALID_LLM_RESPONSE, 'ff');
    expect(result).not.toBeNull();
    expect(result).toHaveLength(6);
  });

  it('returns correct phase distribution (3 dig, 2 impact, 1 growth)', () => {
    const result = parseWizardQuestionsResponse(VALID_LLM_RESPONSE, 'ff')!;
    const phases = result.map((q) => q.phase);
    expect(phases.filter((p) => p === 'dig')).toHaveLength(3);
    expect(phases.filter((p) => p === 'impact')).toHaveLength(2);
    expect(phases.filter((p) => p === 'growth')).toHaveLength(1);
  });

  it('preserves question fields', () => {
    const result = parseWizardQuestionsResponse(VALID_LLM_RESPONSE, 'ff')!;
    expect(result[0].id).toBe('ff-dig-1');
    expect(result[0].question).toContain('Sarah and Marcus');
    expect(result[0].hint).toBeTruthy();
    expect(result[0].phase).toBe('dig');
  });

  it('strips markdown code blocks', () => {
    const wrapped = '```json\n' + VALID_LLM_RESPONSE + '\n```';
    const result = parseWizardQuestionsResponse(wrapped, 'ff');
    expect(result).not.toBeNull();
    expect(result).toHaveLength(6);
  });

  it('accepts { questions: [...] } wrapper', () => {
    const wrapped = JSON.stringify({ questions: JSON.parse(VALID_LLM_RESPONSE) });
    const result = parseWizardQuestionsResponse(wrapped, 'ff');
    expect(result).not.toBeNull();
    expect(result).toHaveLength(6);
  });

  it('returns null for invalid JSON', () => {
    expect(parseWizardQuestionsResponse('not json', 'ff')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseWizardQuestionsResponse('', 'ff')).toBeNull();
  });

  it('returns null for wrong count (5 questions)', () => {
    const fiveQuestions = JSON.parse(VALID_LLM_RESPONSE).slice(0, 5);
    expect(parseWizardQuestionsResponse(JSON.stringify(fiveQuestions), 'ff')).toBeNull();
  });

  it('returns null for wrong phase distribution (4 dig, 1 impact, 1 growth)', () => {
    const questions = JSON.parse(VALID_LLM_RESPONSE);
    // Change impact-2 to dig phase
    questions[4] = { ...questions[4], id: 'ff-dig-4', phase: 'dig' };
    expect(parseWizardQuestionsResponse(JSON.stringify(questions), 'ff')).toBeNull();
  });

  it('returns null for wrong ID prefix', () => {
    const questions = JSON.parse(VALID_LLM_RESPONSE);
    questions[0].id = 'ar-dig-1'; // wrong prefix
    expect(parseWizardQuestionsResponse(JSON.stringify(questions), 'ff')).toBeNull();
  });

  it('returns null for invalid phase value', () => {
    const questions = JSON.parse(VALID_LLM_RESPONSE);
    questions[0].phase = 'explore'; // invalid phase
    expect(parseWizardQuestionsResponse(JSON.stringify(questions), 'ff')).toBeNull();
  });

  it('returns null for missing question field', () => {
    const questions = JSON.parse(VALID_LLM_RESPONSE);
    delete questions[0].question;
    expect(parseWizardQuestionsResponse(JSON.stringify(questions), 'ff')).toBeNull();
  });

  it('returns null for missing hint field', () => {
    const questions = JSON.parse(VALID_LLM_RESPONSE);
    delete questions[0].hint;
    expect(parseWizardQuestionsResponse(JSON.stringify(questions), 'ff')).toBeNull();
  });

  it('returns null for non-array non-object response', () => {
    expect(parseWizardQuestionsResponse('"just a string"', 'ff')).toBeNull();
  });

  it('returns null for truncated JSON (simulating token limit cutoff)', () => {
    const truncated = VALID_LLM_RESPONSE.slice(0, 200); // Cut mid-stream
    expect(parseWizardQuestionsResponse(truncated, 'ff')).toBeNull();
  });

  it('works with different archetype prefixes', () => {
    const arQuestions = JSON.parse(VALID_LLM_RESPONSE).map((q: any) => ({
      ...q,
      id: q.id.replace('ff-', 'ar-'),
    }));
    const result = parseWizardQuestionsResponse(JSON.stringify(arQuestions), 'ar');
    expect(result).not.toBeNull();
    expect(result![0].id).toBe('ar-dig-1');
  });
});
