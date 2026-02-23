/**
 * Signal Extractor Tests
 *
 * Tests for extracting collaborators and containers from rawData per tool type.
 * Covers test matrix items: #12-16, #20 from clustering redesign design doc.
 */

import { describe, it, expect } from 'vitest';
import { extractSignals, ExtractedSignals } from './signal-extractor';

// =============================================================================
// GITHUB PR: Container extraction
// =============================================================================

describe('extractSignals: GitHub PR containers', () => {
  const selfIds = ['honey.arora', 'honey@acme.com'];

  it('#14: extracts feature branch as container', () => {
    const result = extractSignals('github', {
      headRef: 'feature/oauth2-auth',
      baseRef: 'main',
      author: 'honey.arora',
      reviewers: ['bob.chen', 'sarah.kim'],
    }, selfIds);

    expect(result.container).toBe('feature/oauth2-auth');
  });

  it('#12: excludes main branch as container', () => {
    const result = extractSignals('github', {
      headRef: 'main',
      author: 'honey.arora',
    }, selfIds);

    expect(result.container).toBeNull();
  });

  it('excludes master branch as container', () => {
    const result = extractSignals('github', {
      headRef: 'master',
      author: 'honey.arora',
    }, selfIds);

    expect(result.container).toBeNull();
  });

  it('excludes develop branch as container', () => {
    const result = extractSignals('github', {
      headRef: 'develop',
      author: 'honey.arora',
    }, selfIds);

    expect(result.container).toBeNull();
  });

  it('#13: excludes release/* branches as container', () => {
    const result = extractSignals('github', {
      headRef: 'release/1.2',
      author: 'honey.arora',
    }, selfIds);

    expect(result.container).toBeNull();
  });

  it('excludes hotfix/* branches as container', () => {
    const result = extractSignals('github', {
      headRef: 'hotfix/urgent-fix',
      author: 'honey.arora',
    }, selfIds);

    expect(result.container).toBeNull();
  });

  it('handles missing headRef gracefully (no repo fallback)', () => {
    const result = extractSignals('github', {
      author: 'honey.arora',
      sha: 'abc123',
    }, selfIds);

    expect(result.container).toBeNull();
  });
});

// =============================================================================
// GITHUB: Repository + branch container fallback
// =============================================================================

describe('extractSignals: GitHub repo/branch container fallback', () => {
  const selfIds = ['honey.arora'];

  it('uses repository as container for commits (no headRef)', () => {
    const result = extractSignals('github', {
      author: 'honey.arora',
      sha: 'abc123',
      repository: 'beinglayman/ProfessionalSide',
    }, selfIds);

    expect(result.container).toBe('repo:beinglayman/ProfessionalSide');
  });

  it('uses branch as container for workflow runs', () => {
    const result = extractSignals('github', {
      author: 'honey.arora',
      branch: 'feature/ci-pipeline',
      repository: 'beinglayman/ProfessionalSide',
    }, selfIds);

    expect(result.container).toBe('feature/ci-pipeline');
  });

  it('excludes main/master branches, falls back to repo', () => {
    const result = extractSignals('github', {
      author: 'honey.arora',
      branch: 'main',
      repository: 'beinglayman/ProfessionalSide',
    }, selfIds);

    expect(result.container).toBe('repo:beinglayman/ProfessionalSide');
  });

  it('prefers headRef over branch and repository', () => {
    const result = extractSignals('github', {
      headRef: 'feature/oauth',
      branch: 'feature/ci',
      repository: 'beinglayman/ProfessionalSide',
    }, selfIds);

    expect(result.container).toBe('feature/oauth');
  });

  it('does not add repo prefix when headRef or branch is used', () => {
    const result = extractSignals('github', {
      branch: 'feature/streaming',
      repository: 'beinglayman/ProfessionalSide',
    }, selfIds);

    // branch wins, no repo: prefix
    expect(result.container).toBe('feature/streaming');
    expect(result.container).not.toContain('repo:');
  });

  it('repo: prefix prevents collision with branch names', () => {
    const result = extractSignals('github', {
      repository: 'main',
    }, selfIds);

    expect(result.container).toBe('repo:main');
  });
});

// =============================================================================
// GITHUB: Collaborator extraction
// =============================================================================

describe('extractSignals: GitHub collaborators', () => {
  const selfIds = ['honey.arora', 'honey@acme.com'];

  it('extracts reviewers as collaborators', () => {
    const result = extractSignals('github', {
      author: 'honey.arora',
      reviewers: ['bob.chen', 'sarah.kim'],
    }, selfIds);

    expect(result.collaborators).toContain('bob.chen');
    expect(result.collaborators).toContain('sarah.kim');
  });

  it('#20: excludes self from collaborators', () => {
    const result = extractSignals('github', {
      author: 'honey.arora',
      reviewers: ['honey.arora', 'bob.chen'],
    }, selfIds);

    expect(result.collaborators).not.toContain('honey.arora');
    expect(result.collaborators).toContain('bob.chen');
  });

  it('excludes self email from collaborators', () => {
    const result = extractSignals('github', {
      author: 'honey@acme.com',
      reviewers: ['bob.chen'],
    }, selfIds);

    expect(result.collaborators).not.toContain('honey@acme.com');
    expect(result.collaborators).toContain('bob.chen');
  });

  it('includes author when not self', () => {
    const result = extractSignals('github', {
      author: 'bob.chen',
      reviewers: ['sarah.kim'],
    }, selfIds);

    expect(result.collaborators).toContain('bob.chen');
    expect(result.collaborators).toContain('sarah.kim');
  });

  it('deduplicates collaborators', () => {
    const result = extractSignals('github', {
      author: 'bob.chen',
      reviewers: ['bob.chen', 'sarah.kim'],
      requestedReviewers: ['bob.chen'],
    }, selfIds);

    const bobCount = result.collaborators.filter(c => c === 'bob.chen').length;
    expect(bobCount).toBe(1);
  });
});

// =============================================================================
// JIRA: Container + collaborator extraction
// =============================================================================

describe('extractSignals: Jira', () => {
  const selfIds = ['honey.arora', 'honey@acme.com'];

  it('extracts epic key as container from linkedIssues', () => {
    const result = extractSignals('jira', {
      key: 'AUTH-123',
      assignee: 'honey.arora',
      linkedIssues: [
        { key: 'AUTH-1', type: 'Epic' },
        { key: 'AUTH-124', type: 'Blocks' },
      ],
    }, selfIds);

    expect(result.container).toBe('AUTH-1');
  });

  it('returns null container when no epic in linkedIssues', () => {
    const result = extractSignals('jira', {
      key: 'AUTH-123',
      assignee: 'honey.arora',
      linkedIssues: [
        { key: 'AUTH-124', type: 'Blocks' },
      ],
    }, selfIds);

    expect(result.container).toBeNull();
  });

  it('returns null container when no linkedIssues', () => {
    const result = extractSignals('jira', {
      key: 'AUTH-123',
      assignee: 'honey.arora',
    }, selfIds);

    expect(result.container).toBeNull();
  });

  it('extracts assignee and reporter as collaborators (minus self)', () => {
    const result = extractSignals('jira', {
      assignee: 'honey.arora',
      reporter: 'bob.chen',
      watchers: ['sarah.kim'],
    }, selfIds);

    expect(result.collaborators).not.toContain('honey.arora');
    expect(result.collaborators).toContain('bob.chen');
    expect(result.collaborators).toContain('sarah.kim');
  });
});

// =============================================================================
// SLACK: Container + collaborator extraction
// =============================================================================

describe('extractSignals: Slack', () => {
  const selfIds = ['honey.arora', 'U12345'];

  it('#15: extracts threadTs as container', () => {
    const result = extractSignals('slack', {
      threadTs: '1707300000.000100',
      author: 'bob.chen',
      channelId: 'C123456',
    }, selfIds);

    expect(result.container).toBe('1707300000.000100');
  });

  it('extracts thread_ts (underscore variant) as container', () => {
    const result = extractSignals('slack', {
      thread_ts: '1707300000.000200',
      author: 'bob.chen',
    }, selfIds);

    expect(result.container).toBe('1707300000.000200');
  });

  it('#16: returns null container for root messages (no thread)', () => {
    const result = extractSignals('slack', {
      author: 'bob.chen',
      channelId: 'C123456',
    }, selfIds);

    expect(result.container).toBeNull();
  });

  it('extracts mentions as collaborators minus self', () => {
    const result = extractSignals('slack', {
      author: 'bob.chen',
      mentions: ['honey.arora', 'sarah.kim'],
    }, selfIds);

    expect(result.collaborators).not.toContain('honey.arora');
    expect(result.collaborators).toContain('bob.chen');
    expect(result.collaborators).toContain('sarah.kim');
  });
});

// =============================================================================
// CONFLUENCE: Container + collaborator extraction
// =============================================================================

describe('extractSignals: Confluence', () => {
  const selfIds = ['honey.arora'];

  it('extracts spaceKey as container', () => {
    const result = extractSignals('confluence', {
      spaceKey: 'ENG',
      creator: 'honey.arora',
      lastModifiedBy: 'bob.chen',
    }, selfIds);

    expect(result.container).toBe('ENG');
  });

  it('extracts creator and editors as collaborators minus self', () => {
    const result = extractSignals('confluence', {
      creator: 'honey.arora',
      lastModifiedBy: 'bob.chen',
      watchers: ['sarah.kim'],
    }, selfIds);

    expect(result.collaborators).not.toContain('honey.arora');
    expect(result.collaborators).toContain('bob.chen');
    expect(result.collaborators).toContain('sarah.kim');
  });
});

// =============================================================================
// EDGE CASES
// =============================================================================

describe('extractSignals: edge cases', () => {
  const selfIds = ['honey.arora'];

  it('handles null rawData', () => {
    const result = extractSignals('github', null, selfIds);

    expect(result.collaborators).toEqual([]);
    expect(result.container).toBeNull();
  });

  it('handles unknown tool type', () => {
    const result = extractSignals('unknown-tool', {
      author: 'bob.chen',
    }, selfIds);

    expect(result.collaborators).toEqual([]);
    expect(result.container).toBeNull();
  });

  it('handles empty selfIdentifiers', () => {
    const result = extractSignals('github', {
      author: 'bob.chen',
      reviewers: ['sarah.kim'],
    }, []);

    expect(result.collaborators).toContain('bob.chen');
    expect(result.collaborators).toContain('sarah.kim');
  });

  it('normalizes collaborators to lowercase', () => {
    const result = extractSignals('github', {
      author: 'Bob.Chen',
      reviewers: ['Sarah.Kim'],
    }, ['honey.arora']);

    expect(result.collaborators).toContain('bob.chen');
    expect(result.collaborators).toContain('sarah.kim');
  });
});
