import { describe, it, expect } from 'vitest';
import { toActivityContext, rankActivities, buildKnownContext, ActivityContext } from './activity-context.adapter';

// ============================================================================
// Per-tool extraction tests (grounded in mock data shapes)
// ============================================================================

describe('toActivityContext: GitHub PR', () => {
  const prActivity = {
    id: 'pr-42',
    source: 'github',
    title: 'feat(auth): implement OAuth2 flow',
    description: 'Closes AUTH-123',
    timestamp: new Date('2024-05-15'),
    rawData: {
      number: 42,
      state: 'merged',
      body: '## Summary\nImplements OAuth2 auth flow.\n## Changes\n- Add provider config',
      additions: 450,
      deletions: 120,
      changedFiles: 15,
      reviews: 3,
      commits: 8,
      author: 'honey.arora',
      reviewers: ['bob.chen', 'sarah.kim'],
      labels: ['security', 'breaking-change'],
      headRef: 'feature/oauth2-auth',
    },
  };

  it('extracts body (truncated, secret-scanned)', () => {
    const ctx = toActivityContext(prActivity as any, 'honey.arora');
    expect(ctx.body).toContain('OAuth2 auth flow');
    expect(ctx.body!.length).toBeLessThanOrEqual(500);
  });

  it('extracts people excluding self', () => {
    const ctx = toActivityContext(prActivity as any, 'honey.arora');
    expect(ctx.people).toContain('bob.chen');
    expect(ctx.people).toContain('sarah.kim');
    expect(ctx.people).not.toContain('honey.arora');
  });

  it('extracts labels', () => {
    const ctx = toActivityContext(prActivity as any, 'honey.arora');
    expect(ctx.labels).toEqual(['security', 'breaking-change']);
  });

  it('extracts scope from additions/deletions/files', () => {
    const ctx = toActivityContext(prActivity as any, 'honey.arora');
    expect(ctx.scope).toContain('450');
    expect(ctx.scope).toContain('120');
    expect(ctx.scope).toContain('15');
  });

  it('extracts container from headRef', () => {
    const ctx = toActivityContext(prActivity as any, 'honey.arora');
    expect(ctx.container).toBe('feature/oauth2-auth');
  });

  it('sets userRole to authored for PR author', () => {
    const ctx = toActivityContext(prActivity as any, 'honey.arora');
    expect(ctx.userRole).toBe('authored');
  });

  it('sets userRole to reviewed for reviewer', () => {
    const ctx = toActivityContext(prActivity as any, 'bob.chen');
    expect(ctx.userRole).toBe('reviewed');
  });

  it('sets state', () => {
    const ctx = toActivityContext(prActivity as any, 'honey.arora');
    expect(ctx.state).toBe('merged');
  });

  it('sets sourceSubtype to pr', () => {
    const ctx = toActivityContext(prActivity as any, 'honey.arora');
    expect(ctx.sourceSubtype).toBe('pr');
  });
});

describe('toActivityContext: Jira', () => {
  const jiraActivity = {
    id: 'jira-sec-100',
    source: 'jira',
    title: 'Security audit findings',
    timestamp: new Date('2024-05-10'),
    rawData: {
      key: 'SEC-100',
      status: 'Done',
      assignee: 'honey.arora',
      reporter: 'security-lead',
      watchers: ['bob.chen'],
      labels: ['security', 'audit'],
      storyPoints: 8,
      linkedIssues: ['AUTH-123', 'PERF-456'],
      comments: [
        { author: 'security-lead', body: '@honey.arora can you walk us through the token storage?' },
      ],
    },
  };

  it('extracts comment bodies as body content', () => {
    const ctx = toActivityContext(jiraActivity as any, 'honey.arora');
    expect(ctx.body).toContain('token storage');
  });

  it('extracts linkedIssues', () => {
    const ctx = toActivityContext(jiraActivity as any, 'honey.arora');
    expect(ctx.linkedItems).toEqual(['AUTH-123', 'PERF-456']);
  });

  it('extracts people from assignee, reporter, watchers', () => {
    const ctx = toActivityContext(jiraActivity as any, 'honey.arora');
    expect(ctx.people).toContain('security-lead');
    expect(ctx.people).toContain('bob.chen');
    expect(ctx.people).not.toContain('honey.arora');
  });
});

describe('toActivityContext: Slack', () => {
  const slackActivity = {
    id: 'slack-launch',
    source: 'slack',
    title: 'Collab feature launched!',
    timestamp: new Date('2024-06-01'),
    rawData: {
      channelName: 'engineering',
      mentions: ['arjun.desai'],
      reactions: [{ name: 'rocket', count: 12 }, { name: 'tada', count: 8 }],
    },
  };

  it('extracts reactions as sentiment', () => {
    const ctx = toActivityContext(slackActivity as any, 'ketan');
    expect(ctx.sentiment).toContain('rocket:12');
    expect(ctx.sentiment).toContain('tada:8');
  });
});

describe('toActivityContext: Google Calendar', () => {
  const calActivity = {
    id: 'cal-1on1',
    source: 'google-calendar',
    title: '1:1 with EM',
    timestamp: new Date('2024-05-20'),
    rawData: {
      organizer: 'manager@company.com',
      attendees: ['honey.arora', 'manager@company.com'],
      duration: 30,
      recurring: true,
    },
  };

  it('marks recurring meetings as isRoutine', () => {
    const ctx = toActivityContext(calActivity as any, 'honey.arora');
    expect(ctx.isRoutine).toBe(true);
  });

  it('does NOT mark one-off meetings as routine', () => {
    const oneOff = { ...calActivity, rawData: { ...calActivity.rawData, recurring: false } };
    const ctx = toActivityContext(oneOff as any, 'honey.arora');
    expect(ctx.isRoutine).toBeUndefined();
  });
});

describe('toActivityContext: Outlook', () => {
  const outlookActivity = {
    id: 'outlook-1',
    source: 'outlook',
    title: 'Urgent — Duplicate credit deductions',
    timestamp: new Date('2024-05-25'),
    rawData: {
      from: 'nisha.gupta@company.com',
      to: ['ketan@company.com', 'arjun@company.com'],
      cc: ['vikram@company.com'],
      subject: 'Fwd: Urgent — Duplicate credit deductions reported',
    },
  };

  it('extracts subject as body', () => {
    const ctx = toActivityContext(outlookActivity as any, 'ketan@company.com');
    expect(ctx.body).toContain('Duplicate credit deductions');
  });

  it('extracts people from from/to/cc', () => {
    const ctx = toActivityContext(outlookActivity as any, 'ketan@company.com');
    expect(ctx.people).toContain('nisha.gupta@company.com');
    expect(ctx.people).toContain('arjun@company.com');
    expect(ctx.people).toContain('vikram@company.com');
    expect(ctx.people).not.toContain('ketan@company.com');
  });

  it('handles legacy attendees as number (v1 mock data shape)', () => {
    const legacy = {
      ...outlookActivity,
      rawData: { organizer: 'honey.arora', attendees: 5 },
    };
    const ctx = toActivityContext(legacy as any, 'honey.arora');
    // Should not crash — number attendees is ignored for people extraction
    expect(ctx.people).toEqual([]);
  });
});

describe('toActivityContext: Default (Confluence, Figma, OneDrive, etc.)', () => {
  const confluenceActivity = {
    id: 'conf-1',
    source: 'confluence',
    title: 'Architecture Decision Record: Auth Migration',
    timestamp: new Date('2024-05-12'),
    rawData: {
      creator: 'honey.arora',
      lastModifiedBy: 'honey.arora',
      watchers: ['bob.chen', 'sarah.kim'],
    },
  };

  it('extracts people from generic fields', () => {
    const ctx = toActivityContext(confluenceActivity as any, 'honey.arora');
    expect(ctx.people).toContain('bob.chen');
    expect(ctx.people).toContain('sarah.kim');
    expect(ctx.people).not.toContain('honey.arora');
  });

  it('sets source from activity', () => {
    const ctx = toActivityContext(confluenceActivity as any, 'honey.arora');
    expect(ctx.source).toBe('confluence');
  });

  it('sets userRole to mentioned (generic default)', () => {
    const ctx = toActivityContext(confluenceActivity as any, 'honey.arora');
    expect(ctx.userRole).toBe('mentioned');
  });

  it('handles unknown source gracefully', () => {
    const unknown = { id: 'x', source: 'notion', title: 'Test', rawData: {} };
    const ctx = toActivityContext(unknown as any, 'me');
    expect(ctx.source).toBe('notion');
    expect(ctx.people).toEqual([]);
  });
});

describe('toActivityContext: Google Docs', () => {
  const docsActivity = {
    id: 'gdoc-1',
    source: 'google-docs',
    title: 'Architecture Decision Record: Auth Migration',
    timestamp: new Date('2024-05-12'),
    rawData: {
      owner: 'honey.arora',
      lastModifiedBy: 'honey.arora',
      contributors: ['bob.chen', 'sarah.kim'],
      suggestedEditors: ['vikram.patel'],
      comments: [
        { author: 'bob.chen', body: 'Should we consider OAuth2 here?' },
        { author: 'sarah.kim', body: 'Looks good, approved.' },
      ],
    },
  };

  it('sets userRole to authored when user is owner', () => {
    const ctx = toActivityContext(docsActivity as any, 'honey.arora');
    expect(ctx.userRole).toBe('authored');
  });

  it('sets userRole to contributed when user is contributor', () => {
    const ctx = toActivityContext(docsActivity as any, 'bob.chen');
    expect(ctx.userRole).toBe('contributed');
  });

  it('sets userRole to mentioned for others', () => {
    const ctx = toActivityContext(docsActivity as any, 'vikram.patel');
    expect(ctx.userRole).toBe('mentioned');
  });

  it('extracts people from owner, lastModifiedBy, contributors, suggestedEditors, comments', () => {
    const ctx = toActivityContext(docsActivity as any, 'honey.arora');
    expect(ctx.people).toContain('bob.chen');
    expect(ctx.people).toContain('sarah.kim');
    expect(ctx.people).toContain('vikram.patel');
    expect(ctx.people).not.toContain('honey.arora');
  });

  it('extracts comment bodies via shared extractCommentBodies helper', () => {
    const ctx = toActivityContext(docsActivity as any, 'honey.arora');
    expect(ctx.body).toContain('OAuth2');
    expect(ctx.body).toContain('approved');
  });

  it('sets source to google-docs', () => {
    const ctx = toActivityContext(docsActivity as any, 'honey.arora');
    expect(ctx.source).toBe('google-docs');
  });

  it('handles no comments gracefully', () => {
    const noComments = { ...docsActivity, rawData: { owner: 'honey.arora' } };
    const ctx = toActivityContext(noComments as any, 'honey.arora');
    expect(ctx.body).toBeUndefined();
  });
});

describe('toActivityContext: Google Sheets', () => {
  const sheetsActivity = {
    id: 'gsheet-1',
    source: 'google-sheets',
    title: 'Q2 Sprint Metrics',
    timestamp: new Date('2024-06-01'),
    rawData: {
      owner: 'honey.arora',
      lastModifiedBy: 'bob.chen',
      mentions: ['sarah.kim'],
      sheets: ['Sprint 1', 'Sprint 2', 'Sprint 3'],
      comments: [
        { author: 'bob.chen', body: 'Updated velocity numbers' },
      ],
    },
  };

  it('sets userRole to authored when user is owner', () => {
    const ctx = toActivityContext(sheetsActivity as any, 'honey.arora');
    expect(ctx.userRole).toBe('authored');
  });

  it('sets userRole to mentioned for non-owner', () => {
    const ctx = toActivityContext(sheetsActivity as any, 'bob.chen');
    expect(ctx.userRole).toBe('mentioned');
  });

  it('extracts people from owner, lastModifiedBy, mentions, comments', () => {
    const ctx = toActivityContext(sheetsActivity as any, 'honey.arora');
    expect(ctx.people).toContain('bob.chen');
    expect(ctx.people).toContain('sarah.kim');
    expect(ctx.people).not.toContain('honey.arora');
  });

  it('extracts scope from sheets.length', () => {
    const ctx = toActivityContext(sheetsActivity as any, 'honey.arora');
    expect(ctx.scope).toBe('3 sheets');
  });

  it('extracts comment bodies via shared extractCommentBodies helper', () => {
    const ctx = toActivityContext(sheetsActivity as any, 'honey.arora');
    expect(ctx.body).toContain('velocity numbers');
  });

  it('sets source to google-sheets', () => {
    const ctx = toActivityContext(sheetsActivity as any, 'honey.arora');
    expect(ctx.source).toBe('google-sheets');
  });

  it('handles missing sheets gracefully', () => {
    const noSheets = { ...sheetsActivity, rawData: { owner: 'honey.arora' } };
    const ctx = toActivityContext(noSheets as any, 'honey.arora');
    expect(ctx.scope).toBeUndefined();
  });
});

// ============================================================================
// Ranking tests
// ============================================================================

describe('rankActivities', () => {
  const mkActivity = (id: string, source: string, rawData: any) => ({
    id,
    source,
    title: `Activity ${id}`,
    timestamp: new Date(),
    rawData,
  });

  it('ranks PR with body + labels higher than bare commit', () => {
    const pr = mkActivity('pr-1', 'github', {
      state: 'merged', body: 'Rich PR description with details', author: 'me',
      additions: 300, deletions: 50, changedFiles: 10, reviewers: ['a', 'b', 'c'],
      labels: ['security'],
    });
    const commit = mkActivity('commit-1', 'github', {
      message: 'fix typo', author: 'me', additions: 2, deletions: 2,
    });

    const ranked = rankActivities([pr, commit] as any[], null, 'me');
    expect(ranked[0].activity.id).toBe('pr-1');
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
  });

  it('caps at maxCount', () => {
    const activities = Array.from({ length: 30 }, (_, i) =>
      mkActivity(`act-${i}`, 'github', { author: 'me', additions: i * 10 })
    );
    const ranked = rankActivities(activities as any[], null, 'me', 10);
    expect(ranked).toHaveLength(10);
  });

  it('penalizes routine meetings', () => {
    const routine = mkActivity('cal-1', 'google-calendar', {
      organizer: 'me', attendees: ['me', 'other'], recurring: true, duration: 30,
    });
    const oneOff = mkActivity('cal-2', 'google-calendar', {
      organizer: 'me', attendees: ['me', 'a', 'b', 'c'], duration: 60,
    });

    const ranked = rankActivities([routine, oneOff] as any[], null, 'me');
    const routineRank = ranked.find(r => r.activity.id === 'cal-1')!;
    const oneOffRank = ranked.find(r => r.activity.id === 'cal-2')!;
    expect(oneOffRank.score).toBeGreaterThan(routineRank.score);
  });

  it('boosts activities with high reactions', () => {
    const celebrated = mkActivity('slack-1', 'slack', {
      reactions: [{ name: 'rocket', count: 12 }, { name: 'tada', count: 8 }],
    });
    const quiet = mkActivity('slack-2', 'slack', {});

    const ranked = rankActivities([celebrated, quiet] as any[], null, 'me');
    const celebRank = ranked.find(r => r.activity.id === 'slack-1')!;
    const quietRank = ranked.find(r => r.activity.id === 'slack-2')!;
    expect(celebRank.score).toBeGreaterThan(quietRank.score);
  });

  it('passes all activities when count is under max', () => {
    const activities = [
      mkActivity('a1', 'github', { author: 'me' }),
      mkActivity('a2', 'github', { author: 'me' }),
    ];
    const ranked = rankActivities(activities as any[], null, 'me', 20);
    expect(ranked).toHaveLength(2);
  });

  it('uses activityEdges from format7Data when available', () => {
    const primary = mkActivity('a1', 'github', { author: 'me' });
    const contextual = mkActivity('a2', 'github', { author: 'me' });
    const f7 = {
      activityEdges: [
        { activityId: 'a1', type: 'primary' },
        { activityId: 'a2', type: 'contextual' },
      ],
    };

    const ranked = rankActivities([primary, contextual] as any[], f7 as any, 'me');
    expect(ranked[0].activity.id).toBe('a1');
  });
});

// ============================================================================
// Edge cases
// ============================================================================

describe('edge cases', () => {
  it('handles empty activities array', () => {
    const ranked = rankActivities([], null, 'me');
    expect(ranked).toEqual([]);
  });

  it('handles activity with null rawData', () => {
    const activity = { id: 'x', source: 'github', title: 'Test', rawData: null };
    const ctx = toActivityContext(activity as any, 'me');
    expect(ctx.source).toBe('github');
    expect(ctx.people).toEqual([]);
    expect(ctx.body).toBeUndefined();
  });

  it('handles activity with undefined rawData', () => {
    const activity = { id: 'x', source: 'slack', title: 'Test' };
    const ctx = toActivityContext(activity as any, 'me');
    expect(ctx.source).toBe('slack');
    expect(ctx.people).toEqual([]);
  });
});

// ============================================================================
// buildKnownContext
// ============================================================================

describe('buildKnownContext', () => {
  const mkContext = (overrides: Partial<ActivityContext> = {}): ActivityContext => ({
    title: 'Test',
    date: '2024-05-15',
    source: 'github',
    people: ['alice'],
    userRole: 'authored',
    ...overrides,
  });

  it('returns undefined for empty array', () => {
    expect(buildKnownContext([])).toBeUndefined();
  });

  it('extracts dateRange from sorted dates', () => {
    const ctx = buildKnownContext([
      mkContext({ date: '2024-06-01' }),
      mkContext({ date: '2024-05-01' }),
      mkContext({ date: '2024-05-15' }),
    ]);
    expect(ctx?.dateRange).toBe('2024-05-01 to 2024-06-01');
  });

  it('returns undefined dateRange for single date', () => {
    const ctx = buildKnownContext([mkContext({ date: '2024-05-15' })]);
    expect(ctx?.dateRange).toBeUndefined();
  });

  it('deduplicates collaborators across activities', () => {
    const ctx = buildKnownContext([
      mkContext({ people: ['alice', 'bob'] }),
      mkContext({ people: ['bob', 'charlie'] }),
    ]);
    expect(ctx?.collaborators).toBe('alice, bob, charlie');
  });

  it('caps collaborators at 8', () => {
    const people = Array.from({ length: 12 }, (_, i) => `person-${i}`);
    const ctx = buildKnownContext([mkContext({ people })]);
    expect(ctx?.collaborators?.split(', ')).toHaveLength(8);
  });

  it('sums code stats from scope fields', () => {
    const ctx = buildKnownContext([
      mkContext({ scope: '+450/-120, 15 files' }),
      mkContext({ scope: '+100/-30, 5 files' }),
    ]);
    expect(ctx?.codeStats).toBe('550+ lines of code');
  });

  it('aggregates tools', () => {
    const ctx = buildKnownContext([
      mkContext({ source: 'github' }),
      mkContext({ source: 'jira' }),
      mkContext({ source: 'github' }),
    ]);
    expect(ctx?.tools).toBe('github, jira');
  });

  it('aggregates labels', () => {
    const ctx = buildKnownContext([
      mkContext({ labels: ['security', 'breaking'] }),
      mkContext({ labels: ['security', 'migration'] }),
    ]);
    expect(ctx?.labels).toBe('security, breaking, migration');
  });

  it('returns undefined for fields with no data', () => {
    const ctx = buildKnownContext([mkContext({ people: [], labels: undefined, scope: undefined })]);
    expect(ctx?.collaborators).toBeUndefined();
    expect(ctx?.labels).toBeUndefined();
    expect(ctx?.codeStats).toBeUndefined();
  });
});
