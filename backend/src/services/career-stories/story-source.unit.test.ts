/**
 * Pure unit tests for StorySourceService methods that don't require a database.
 * These test computePublishReadiness() — the diff-aware publish gate.
 */

import { describe, expect, it } from 'vitest';
import { StorySourceService, type StorySourceRow } from './story-source.service';

const service = new StorySourceService();

const makeSource = (overrides: Partial<StorySourceRow> = {}): StorySourceRow => ({
  id: '1',
  storyId: 'x',
  derivationId: null,
  sectionKey: 'result',
  sourceType: 'activity',
  activityId: 'act-1',
  label: 'PR #42',
  content: null,
  url: null,
  annotation: null,
  toolType: null,
  role: null,
  questionId: null,
  sortOrder: 0,
  excludedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('computePublishReadiness', () => {
  const sectionKeys = ['situation', 'task', 'action', 'result'];

  it('returns ready=true when all sections are unchanged from original', () => {
    const sections = {
      situation: { summary: 'Original situation text.' },
      task: { summary: 'Original task text.' },
      action: { summary: 'Original action text.' },
      result: { summary: 'Original result text.' },
    };
    const originalSections = { ...sections };

    const readiness = service.computePublishReadiness([], sections, originalSections, sectionKeys);

    expect(readiness.ready).toBe(true);
    expect(readiness.ungroundedClaims).toEqual([]);
  });

  it('blocks user-edited section with ungrounded percentage claim', () => {
    const sections = {
      situation: { summary: 'Original situation.' },
      result: { summary: 'We achieved a 90% reduction in latency.' },
    };
    const originalSections = {
      situation: { summary: 'Original situation.' },
      result: { summary: 'We improved latency.' },
    };

    const readiness = service.computePublishReadiness([], sections, originalSections, ['situation', 'result']);

    expect(readiness.ready).toBe(false);
    expect(readiness.ungroundedClaims).toHaveLength(1);
    expect(readiness.ungroundedClaims[0].sectionKey).toBe('result');
    expect(readiness.ungroundedClaims[0].claim).toContain('90%');
    expect(readiness.ungroundedClaims[0].isUserEdited).toBe(true);
  });

  it('allows user-edited section with claim when activity source is linked', () => {
    const sections = {
      result: { summary: 'We achieved a 90% reduction in latency.' },
    };
    const originalSections = {
      result: { summary: 'We improved latency.' },
    };
    const sources = [makeSource({ sectionKey: 'result', sourceType: 'activity' })];

    const readiness = service.computePublishReadiness(sources, sections, originalSections, ['result']);

    expect(readiness.ready).toBe(true);
    expect(readiness.ungroundedClaims).toEqual([]);
  });

  it('does NOT count user_note sources as grounding evidence', () => {
    const sections = {
      result: { summary: 'We achieved a 90% reduction in latency.' },
    };
    const originalSections = {
      result: { summary: 'We improved latency.' },
    };
    const sources = [makeSource({ sectionKey: 'result', sourceType: 'user_note' })];

    const readiness = service.computePublishReadiness(sources, sections, originalSections, ['result']);

    expect(readiness.ready).toBe(false);
    expect(readiness.ungroundedClaims).toHaveLength(1);
  });

  it('does NOT count excluded activity sources as grounding evidence', () => {
    const sections = {
      result: { summary: 'We achieved a 90% reduction in latency.' },
    };
    const originalSections = {
      result: { summary: 'We improved latency.' },
    };
    const sources = [makeSource({ sectionKey: 'result', excludedAt: new Date() })];

    const readiness = service.computePublishReadiness(sources, sections, originalSections, ['result']);

    expect(readiness.ready).toBe(false);
    expect(readiness.ungroundedClaims).toHaveLength(1);
  });

  it('treats all sections as user-written when originalSections is null (legacy)', () => {
    const sections = {
      result: { summary: 'Saved $50,000 in operational costs.' },
      action: { summary: 'Built a prototype.' },
    };

    const readiness = service.computePublishReadiness([], sections, null, ['result', 'action']);

    expect(readiness.ready).toBe(false);
    expect(readiness.ungroundedClaims).toHaveLength(1);
    expect(readiness.ungroundedClaims[0].sectionKey).toBe('result');
    expect(readiness.ungroundedClaims[0].claim).toContain('Saved $50,000');
  });

  it('finds ALL ungrounded patterns in a single section (no break)', () => {
    const sections = {
      result: { summary: 'We achieved 40% improvement and saved $100,000 and led a team of 5 engineers.' },
    };
    const originalSections = {
      result: { summary: 'We improved the system.' },
    };

    const readiness = service.computePublishReadiness([], sections, originalSections, ['result']);

    expect(readiness.ready).toBe(false);
    // Should find: percentage, cost, team size = 3 claims
    expect(readiness.ungroundedClaims.length).toBeGreaterThanOrEqual(3);
    const claimTexts = readiness.ungroundedClaims.map(c => c.claim);
    expect(claimTexts.some(c => c.includes('40%'))).toBe(true);
    expect(claimTexts.some(c => c.includes('$100,000'))).toBe(true);
    expect(claimTexts.some(c => c.includes('led a team of 5'))).toBe(true);
  });

  it('flags dollar claims in user-edited sections', () => {
    const sections = { result: { summary: 'This saved $2M annually.' } };
    const originalSections = { result: { summary: 'This reduced costs.' } };

    const readiness = service.computePublishReadiness([], sections, originalSections, ['result']);

    expect(readiness.ready).toBe(false);
    expect(readiness.ungroundedClaims[0].claim).toContain('saved $2');
  });

  it('flags superlative claims in user-edited sections', () => {
    const sections = { result: { summary: 'This was the first ever automated pipeline.' } };
    const originalSections = { result: { summary: 'We built a pipeline.' } };

    const readiness = service.computePublishReadiness([], sections, originalSections, ['result']);

    expect(readiness.ready).toBe(false);
    expect(readiness.ungroundedClaims[0].claim).toContain('first ever');
  });

  it('flags multiplier claims in user-edited sections', () => {
    const sections = { result: { summary: 'We achieved 3x faster deployments.' } };
    const originalSections = { result: { summary: 'Deployments got faster.' } };

    const readiness = service.computePublishReadiness([], sections, originalSections, ['result']);

    expect(readiness.ready).toBe(false);
    expect(readiness.ungroundedClaims[0].claim).toContain('3x faster');
  });

  it('allows user-edited sections with no quantified claims', () => {
    const sections = {
      situation: { summary: 'The team was struggling with technical debt.' },
      action: { summary: 'I refactored the authentication module completely.' },
    };
    const originalSections = {
      situation: { summary: 'There was technical debt.' },
      action: { summary: 'I cleaned up the auth module.' },
    };

    const readiness = service.computePublishReadiness([], sections, originalSections, ['situation', 'action']);

    expect(readiness.ready).toBe(true);
    expect(readiness.ungroundedClaims).toEqual([]);
  });

  it('only checks sections in the provided sectionKeys list', () => {
    const sections = {
      result: { summary: 'We achieved 90% improvement.' },
      learning: { summary: 'Saved $1M.' },
    };
    const originalSections = {
      result: { summary: 'Improved things.' },
      learning: { summary: 'Learned things.' },
    };
    // Only check 'learning', not 'result'
    const readiness = service.computePublishReadiness([], sections, originalSections, ['learning']);

    expect(readiness.ungroundedClaims).toHaveLength(1);
    expect(readiness.ungroundedClaims[0].sectionKey).toBe('learning');
  });

  it('ignores sources with sectionKey "unassigned"', () => {
    const sections = {
      result: { summary: 'We achieved 40% improvement.' },
    };
    const originalSections = {
      result: { summary: 'We improved things.' },
    };
    const sources = [makeSource({ sectionKey: 'unassigned', sourceType: 'activity' })];

    const readiness = service.computePublishReadiness(sources, sections, originalSections, ['result']);

    expect(readiness.ready).toBe(false);
    expect(readiness.ungroundedClaims).toHaveLength(1);
  });

  it('handles mixed sections: some unchanged, some edited with claims, some edited without', () => {
    const sections = {
      situation: { summary: 'Unchanged situation text.' },
      task: { summary: 'I rewrote the task description.' },
      action: { summary: 'Led a team of 15 engineers to build it.' },
      result: { summary: 'Achieved 50% faster deployments.' },
    };
    const originalSections = {
      situation: { summary: 'Unchanged situation text.' },
      task: { summary: 'Original task.' },
      action: { summary: 'Built the system.' },
      result: { summary: 'Deployments improved.' },
    };

    const readiness = service.computePublishReadiness([], sections, originalSections, sectionKeys);

    expect(readiness.ready).toBe(false);
    // action has team size claim, result has percentage claim
    expect(readiness.ungroundedClaims).toHaveLength(2);
    const flaggedSections = readiness.ungroundedClaims.map(c => c.sectionKey);
    expect(flaggedSections).toContain('action');
    expect(flaggedSections).toContain('result');
    // situation is unchanged — not flagged
    // task is edited but has no quantified claim — not flagged
    expect(flaggedSections).not.toContain('situation');
    expect(flaggedSections).not.toContain('task');
  });
});
