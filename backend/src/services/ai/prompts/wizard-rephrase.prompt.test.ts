/**
 * Tests for the Ship 4b wizard-rephrase parser. Focus is on the fallback
 * paths: whatever the LLM gives us, the parser should return a sane Map
 * that the caller can safely merge or ignore - never throw.
 */

import { describe, it, expect } from 'vitest';
import {
  buildRephraseMessages,
  parseRephraseResponse,
} from './wizard-rephrase.prompt';

describe('parseRephraseResponse', () => {
  it('parses a well-formed response into a Map keyed by intentId', () => {
    const raw = JSON.stringify({
      questions: [
        {
          intentId: 'stakes',
          question:
            'The payments-api outage ran 42 minutes - what was the worst case you were racing to prevent?',
          chips: [
            { label: 'Revenue at risk', value: 'revenue' },
            { label: 'Customer trust', value: 'trust' },
          ],
        },
        {
          intentId: 'result',
          question:
            'What specific metric proves the fix worked - error rate, latency, recovered transactions?',
          chips: [{ label: 'Error rate dropped', value: 'error-rate' }],
        },
      ],
    });

    const out = parseRephraseResponse(raw);
    expect(out.size).toBe(2);
    expect(out.get('stakes')?.chips).toHaveLength(2);
    expect(out.get('result')?.question).toContain('metric');
  });

  it('strips markdown code fences from the response', () => {
    const raw = '```json\n' + JSON.stringify({
      questions: [
        {
          intentId: 'situation',
          question: 'What did the team look like going into this specific incident window?',
          chips: [],
        },
      ],
    }) + '\n```';

    const out = parseRephraseResponse(raw);
    expect(out.size).toBe(1);
    expect(out.get('situation')).toBeDefined();
  });

  it('drops entries with unknown intentId', () => {
    const raw = JSON.stringify({
      questions: [
        {
          intentId: 'not-a-real-intent',
          question: 'Question with enough length to pass the sanity check threshold.',
          chips: [],
        },
      ],
    });
    expect(parseRephraseResponse(raw).size).toBe(0);
  });

  it('drops questions that are too short', () => {
    const raw = JSON.stringify({
      questions: [
        {
          intentId: 'stakes',
          question: 'tiny',
          chips: [],
        },
      ],
    });
    expect(parseRephraseResponse(raw).size).toBe(0);
  });

  it('drops questions that exceed the length ceiling', () => {
    const raw = JSON.stringify({
      questions: [
        {
          intentId: 'result',
          question: 'x'.repeat(300),
          chips: [],
        },
      ],
    });
    expect(parseRephraseResponse(raw).size).toBe(0);
  });

  it('silently filters malformed chip entries but keeps the question', () => {
    const raw = JSON.stringify({
      questions: [
        {
          intentId: 'hardest',
          question: 'What was the hardest or least obvious part of this particular work?',
          chips: [
            { label: 'Valid', value: 'valid' },
            { label: 'No value field' }, // missing value
            null, // not an object
            { label: '', value: 'empty-label' }, // empty label
          ],
        },
      ],
    });
    const out = parseRephraseResponse(raw);
    expect(out.get('hardest')?.chips).toEqual([{ label: 'Valid', value: 'valid' }]);
  });

  it('returns an empty map for non-JSON input', () => {
    expect(parseRephraseResponse('not-json at all').size).toBe(0);
  });

  it('returns an empty map when questions is not an array', () => {
    expect(parseRephraseResponse(JSON.stringify({ questions: 'nope' })).size).toBe(0);
  });

  it('caps chips at 4 entries', () => {
    const raw = JSON.stringify({
      questions: [
        {
          intentId: 'role',
          question: 'What specifically was your role versus what the team around you was doing?',
          chips: [
            { label: 'A', value: 'a' },
            { label: 'B', value: 'b' },
            { label: 'C', value: 'c' },
            { label: 'D', value: 'd' },
            { label: 'E', value: 'e' },
          ],
        },
      ],
    });
    expect(parseRephraseResponse(raw).get('role')?.chips).toHaveLength(4);
  });
});

describe('buildRephraseMessages', () => {
  it('includes draft context and lists all intents in order', () => {
    const msgs = buildRephraseMessages({
      entryTitle: 'Payments API outage',
      entryDescription: '42-minute outage, rolled back quickly.',
      dominantRole: 'Led',
      topics: ['payments', 'incident response'],
      skills: ['debugging'],
      archetype: 'firefighter',
      intents: [
        { id: 'stakes', genericQuestion: 'What would have gone wrong?' },
        { id: 'result', genericQuestion: 'What is the metric?' },
      ],
    });

    expect(msgs).toHaveLength(2);
    expect(msgs[0].role).toBe('system');
    expect(msgs[1].role).toBe('user');
    const userContent = msgs[1].content as string;
    expect(userContent).toContain('Payments API outage');
    expect(userContent).toContain('firefighter');
    expect(userContent).toMatch(/1\. \[stakes\]/);
    expect(userContent).toMatch(/2\. \[result\]/);
    expect(userContent).toContain('stakes | result');
  });

  it('handles missing optional fields gracefully', () => {
    const msgs = buildRephraseMessages({
      entryTitle: 'Some Draft',
      entryDescription: 'Short description.',
      intents: [{ id: 'learning', genericQuestion: 'What did you learn?' }],
    });
    const userContent = msgs[1].content as string;
    expect(userContent).toContain('Role: (not classified)');
    expect(userContent).toContain('Topics: (none surfaced)');
    expect(userContent).toContain('Skills: (none surfaced)');
  });
});
