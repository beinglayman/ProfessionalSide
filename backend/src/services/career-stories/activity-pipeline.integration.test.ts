/**
 * Activity Pipeline Integration Smoke Test
 *
 * Verifies the full pipeline with mock data:
 * Activities → toActivityContext → rankActivities → LLM input
 *
 * Validates:
 * - Secret scanner strips secrets from PR body
 * - Ranker prioritizes high-signal activities over routine ones
 * - buildLLMInput handles journal entry separately (RH-2)
 * - Activities compose as peer via rankActivities (RH-2)
 * - enforceQuestionCount normalizes question arrays (RJ-6)
 * - knownContext extracts primitives from ranked activities (RH-5)
 */

import { describe, it, expect } from 'vitest';
import { buildLLMInput } from './llm-input.builder';
import { toActivityContext, rankActivities, buildKnownContext } from './activity-context.adapter';
import { enforceQuestionCount } from '../ai/prompts/wizard-questions.prompt';

describe('Pipeline integration: mock data → LLM input', () => {
  const mockActivities = [
    {
      id: 'pr-42',
      source: 'github',
      title: 'feat(auth): implement OAuth2 flow',
      timestamp: new Date('2024-05-15'),
      rawData: {
        number: 42,
        state: 'merged',
        body: 'Implements OAuth2 auth flow. API_KEY=sk-test-12345 should not leak.',
        additions: 450,
        deletions: 120,
        changedFiles: 15,
        author: 'honey.arora',
        reviewers: ['bob.chen', 'sarah.kim'],
        labels: ['security', 'breaking-change'],
        headRef: 'feature/oauth2-auth',
      },
    },
    {
      id: 'cal-1on1',
      source: 'google-calendar',
      title: '1:1 with EM',
      timestamp: new Date('2024-05-20'),
      rawData: {
        organizer: 'manager',
        attendees: ['honey.arora', 'manager'],
        duration: 30,
        recurring: true,
      },
    },
    {
      id: 'jira-101',
      source: 'jira',
      title: 'PROJ-101: Migrate auth to OAuth2',
      timestamp: new Date('2024-05-10'),
      rawData: {
        key: 'PROJ-101',
        status: 'Done',
        issueType: 'Story',
        description: 'Migrate from basic auth to OAuth2 for all API endpoints.',
        assignee: 'honey.arora',
        reporter: 'sarah.kim',
        labels: ['security', 'migration'],
        storyPoints: 8,
      },
    },
  ];

  it('secret scanner strips API key from PR body', () => {
    const ctx = toActivityContext(mockActivities[0] as any, 'honey.arora');
    expect(ctx.body).not.toContain('sk-test-12345');
    expect(ctx.body).toContain('OAuth2 auth flow');
  });

  it('ranker puts PR above routine 1:1', () => {
    const ranked = rankActivities(mockActivities as any[], null, 'honey.arora');
    // PR should rank higher than 1:1 (more signals: body, labels, code scope, people)
    const prIdx = ranked.findIndex(r => r.activity.id === 'pr-42');
    const calIdx = ranked.findIndex(r => r.activity.id === 'cal-1on1');
    expect(prIdx).toBeLessThan(calIdx);
  });

  it('ranker excludes self from people lists', () => {
    const ranked = rankActivities(mockActivities as any[], null, 'honey.arora');
    const prCtx = ranked.find(r => r.activity.id === 'pr-42')!.context;
    expect(prCtx.people).not.toContain('honey.arora');
    expect(prCtx.people).toContain('bob.chen');
    expect(prCtx.people).toContain('sarah.kim');
  });

  it('buildLLMInput extracts format7Data fields (activities are separate — RH-2)', () => {
    const result = buildLLMInput({
      journalEntry: {
        title: 'Auth Migration',
        fullContent: 'Migrated auth system',
        activityIds: ['pr-42', 'cal-1on1'],
        format7Data: {
          dominantRole: 'Led',
          summary: { technologies_used: ['OAuth2', 'Security'] },
        },
      },
    });

    // buildLLMInput only handles journal entry — no activities (RH-2)
    expect(result.dominantRole).toBe('Led');
    expect(result.skills).toContain('OAuth2');
  });

  it('activities compose separately via rankActivities (RH-2)', () => {
    const ranked = rankActivities(mockActivities as any[], null, 'honey.arora', 20);
    // Can be passed as peer to buildCareerStoryMessages
    expect(ranked.map(r => r.context)).toHaveLength(3);
    expect(ranked[0].context.source).toBe('github');
  });

  it('buildKnownContext produces valid primitives from ranked activities (RH-5)', () => {
    const ranked = rankActivities(mockActivities as any[], null, 'honey.arora');
    const knownContext = buildKnownContext(ranked.map(r => r.context));

    expect(knownContext).toBeDefined();
    expect(knownContext!.collaborators).toContain('bob.chen');
    expect(knownContext!.collaborators).toContain('sarah.kim');
    expect(knownContext!.collaborators).not.toContain('honey.arora');
    expect(knownContext!.labels).toContain('security');
    expect(knownContext!.tools).toContain('github');
    // These are string primitives, not ActivityContext[] (RH-5)
    expect(typeof knownContext!.collaborators).toBe('string');
  });

  it('enforceQuestionCount pads empty to 3 fallbacks (RJ-6)', () => {
    const result = enforceQuestionCount([], 'ff');
    expect(result).toHaveLength(3);
    expect(result.map(q => q.phase)).toEqual(['dig', 'impact', 'growth']);
  });

  it('full pipeline: activities → rank → context → primitives', () => {
    // Step 1: Normalize
    const contexts = mockActivities.map(a =>
      toActivityContext(a as any, 'honey.arora'),
    );
    expect(contexts).toHaveLength(3);
    expect(contexts[0].source).toBe('github');
    expect(contexts[1].source).toBe('google-calendar');
    expect(contexts[2].source).toBe('jira');

    // Step 2: Rank
    const ranked = rankActivities(mockActivities as any[], null, 'honey.arora');
    expect(ranked[0].score).toBeGreaterThan(ranked[ranked.length - 1].score);

    // Step 3: Extract primitives for knownContext
    const collaborators = [...new Set(ranked.flatMap(a => a.context.people))].join(', ');
    const tools = [...new Set(ranked.map(a => a.context.source))].join(', ');
    const labels = [...new Set(ranked.flatMap(a => a.context.labels || []))].join(', ');

    expect(collaborators).toBeTruthy();
    expect(tools).toContain('github');
    expect(labels).toContain('security');

    // Step 4: buildLLMInput is separate (RH-2)
    const llmInput = buildLLMInput({
      journalEntry: {
        title: 'Auth Migration',
        fullContent: 'Migrated the authentication system from basic auth to OAuth2.',
        activityIds: mockActivities.map(a => a.id),
        format7Data: { dominantRole: 'Led', summary: { technologies_used: ['OAuth2'] } },
      },
    });
    expect(llmInput.title).toBe('Auth Migration');
    expect(llmInput.dominantRole).toBe('Led');
    // Activities are NOT in llmInput — they're a peer (RH-2)
  });
});
