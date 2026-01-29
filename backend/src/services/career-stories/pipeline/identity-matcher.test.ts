/**
 * IdentityMatcher Tests
 *
 * Tests for participation level detection based on CareerPersona.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { IdentityMatcher } from './identity-matcher';
import { CareerPersona, HydratedActivity, ToolType } from './types';

describe('IdentityMatcher', () => {
  const testPersona: CareerPersona = {
    displayName: 'Honey Arora',
    emails: ['honey.arora@acme.com', 'honey@personal.com'],
    identities: {
      jira: {
        accountId: 'jira-123',
        displayName: 'honey.arora',
        emailAddress: 'honey.arora@acme.com',
      },
      github: {
        login: 'honey-arora',
        id: 12345,
      },
      confluence: {
        accountId: 'conf-123',
        publicName: 'Honey Arora',
      },
      slack: {
        userId: 'U0HONEY',
        displayName: 'honey.arora',
      },
      google: {
        email: 'honey.arora@acme.com',
      },
      figma: {
        email: 'honey.arora@acme.com',
      },
      outlook: {
        email: 'honey.arora@acme.com',
      },
    },
  };

  let matcher: IdentityMatcher;

  beforeEach(() => {
    matcher = new IdentityMatcher(testPersona);
  });

  function createActivity(
    source: ToolType,
    rawData: Record<string, unknown> = {}
  ): HydratedActivity {
    return {
      id: 'test-activity',
      source,
      title: 'Test Activity',
      timestamp: new Date(),
      refs: [],
      rawData,
    };
  }

  describe('Jira participation', () => {
    it('detects initiator when user is assignee', () => {
      const activity = createActivity('jira', { assignee: 'honey.arora' });
      const result = matcher.detectParticipation(activity);

      expect(result.level).toBe('initiator');
      expect(result.signals).toContain('jira-assignee');
    });

    it('detects initiator when user is reporter', () => {
      const activity = createActivity('jira', { reporter: 'honey.arora' });
      const result = matcher.detectParticipation(activity);

      expect(result.level).toBe('initiator');
      expect(result.signals).toContain('jira-reporter');
    });

    it('detects observer when user is watcher', () => {
      const activity = createActivity('jira', {
        assignee: 'someone.else',
        watchers: ['honey.arora', 'another.person'],
      });
      const result = matcher.detectParticipation(activity);

      expect(result.level).toBe('observer');
      expect(result.signals).toContain('jira-watcher');
    });

    it('detects mentioned when user is in mentions', () => {
      const activity = createActivity('jira', {
        assignee: 'someone.else',
        mentions: ['honey.arora'],
      });
      const result = matcher.detectParticipation(activity);

      expect(result.level).toBe('mentioned');
      expect(result.signals).toContain('jira-mentioned');
    });

    it('prioritizes higher-weight signals', () => {
      // User is both assignee (weight 10) and watcher (weight 2)
      const activity = createActivity('jira', {
        assignee: 'honey.arora',
        watchers: ['honey.arora'],
      });
      const result = matcher.detectParticipation(activity);

      expect(result.level).toBe('initiator');
      expect(result.signals).toContain('jira-assignee');
      expect(result.signals).toContain('jira-watcher');
    });
  });

  describe('GitHub participation', () => {
    it('detects initiator when user is PR author', () => {
      const activity = createActivity('github', { author: 'honey-arora' });
      const result = matcher.detectParticipation(activity);

      expect(result.level).toBe('initiator');
      expect(result.signals).toContain('github-author');
    });

    it('detects contributor when user is reviewer', () => {
      const activity = createActivity('github', {
        author: 'someone.else',
        reviewers: ['honey-arora'],
      });
      const result = matcher.detectParticipation(activity);

      expect(result.level).toBe('contributor');
      expect(result.signals).toContain('github-reviewer');
    });

    it('detects contributor when user is requested reviewer', () => {
      const activity = createActivity('github', {
        author: 'someone.else',
        requestedReviewers: ['honey-arora'],
      });
      const result = matcher.detectParticipation(activity);

      expect(result.level).toBe('contributor');
      expect(result.signals).toContain('github-reviewer');
    });

    it('detects mentioned when user is in mentions', () => {
      const activity = createActivity('github', {
        author: 'someone.else',
        mentions: ['honey-arora'],
      });
      const result = matcher.detectParticipation(activity);

      expect(result.level).toBe('mentioned');
      expect(result.signals).toContain('github-mentioned');
    });
  });

  describe('Confluence participation', () => {
    it('detects initiator when user is creator', () => {
      const activity = createActivity('confluence', { creator: 'Honey Arora' });
      const result = matcher.detectParticipation(activity);

      expect(result.level).toBe('initiator');
      expect(result.signals).toContain('confluence-creator');
    });

    it('detects contributor when user is last modifier', () => {
      const activity = createActivity('confluence', {
        creator: 'someone.else',
        lastModifiedBy: 'Honey Arora',
      });
      const result = matcher.detectParticipation(activity);

      expect(result.level).toBe('contributor');
      expect(result.signals).toContain('confluence-editor');
    });

    it('detects observer when user is watcher', () => {
      const activity = createActivity('confluence', {
        creator: 'someone.else',
        watchers: ['Honey Arora'],
      });
      const result = matcher.detectParticipation(activity);

      expect(result.level).toBe('observer');
      expect(result.signals).toContain('confluence-watcher');
    });
  });

  describe('Slack participation', () => {
    it('detects initiator when user is author', () => {
      const activity = createActivity('slack', { author: 'honey.arora' });
      const result = matcher.detectParticipation(activity);

      expect(result.level).toBe('initiator');
      expect(result.signals).toContain('slack-author');
    });

    it('detects initiator when user is author via userId', () => {
      const activity = createActivity('slack', { userId: 'U0HONEY' });
      const result = matcher.detectParticipation(activity);

      expect(result.level).toBe('initiator');
      expect(result.signals).toContain('slack-author');
    });

    it('detects contributor when user replies', () => {
      const activity = createActivity('slack', {
        author: 'honey.arora',
        isReply: true,
      });
      const result = matcher.detectParticipation(activity);

      // Should have both author and replier signals
      expect(result.signals).toContain('slack-author');
      expect(result.signals).toContain('slack-replier');
    });

    it('detects mentioned when user is in mentions', () => {
      const activity = createActivity('slack', {
        author: 'someone.else',
        mentions: ['U0HONEY'],
      });
      const result = matcher.detectParticipation(activity);

      expect(result.level).toBe('mentioned');
      expect(result.signals).toContain('slack-mentioned');
    });
  });

  describe('Google participation', () => {
    it('detects initiator when user is meeting organizer', () => {
      const activity = createActivity('google', {
        organizer: 'honey.arora@acme.com',
      });
      const result = matcher.detectParticipation(activity);

      expect(result.level).toBe('initiator');
      expect(result.signals).toContain('google-organizer');
    });

    it('detects initiator when user is doc owner', () => {
      const activity = createActivity('google', {
        owner: 'honey.arora@acme.com',
      });
      const result = matcher.detectParticipation(activity);

      expect(result.level).toBe('initiator');
      expect(result.signals).toContain('google-owner');
    });

    it('detects observer when user is attendee', () => {
      const activity = createActivity('google', {
        organizer: 'someone.else@acme.com',
        attendees: ['honey.arora@acme.com', 'another@acme.com'],
      });
      const result = matcher.detectParticipation(activity);

      expect(result.level).toBe('observer');
      expect(result.signals).toContain('google-attendee');
    });
  });

  describe('Outlook participation', () => {
    it('detects initiator when user is meeting organizer', () => {
      const activity = createActivity('outlook', {
        organizer: 'honey.arora@acme.com',
      });
      const result = matcher.detectParticipation(activity);

      expect(result.level).toBe('initiator');
      expect(result.signals).toContain('outlook-organizer');
    });

    it('detects observer when user is attendee', () => {
      const activity = createActivity('outlook', {
        organizer: 'someone.else@acme.com',
        attendees: ['honey.arora@acme.com'],
      });
      const result = matcher.detectParticipation(activity);

      expect(result.level).toBe('observer');
      expect(result.signals).toContain('outlook-attendee');
    });
  });

  describe('Figma participation', () => {
    it('detects initiator when user is file owner', () => {
      const activity = createActivity('figma', {
        owner: 'honey.arora@acme.com',
      });
      const result = matcher.detectParticipation(activity);

      expect(result.level).toBe('initiator');
      expect(result.signals).toContain('figma-owner');
    });

    it('detects initiator when user is creator', () => {
      const activity = createActivity('figma', {
        creator: 'honey.arora@acme.com',
      });
      const result = matcher.detectParticipation(activity);

      expect(result.level).toBe('initiator');
      expect(result.signals).toContain('figma-owner');
    });

    it('detects contributor when user is editor', () => {
      const activity = createActivity('figma', {
        owner: 'someone.else@acme.com',
        editors: ['honey.arora@acme.com'],
      });
      const result = matcher.detectParticipation(activity);

      expect(result.level).toBe('contributor');
      expect(result.signals).toContain('figma-editor');
    });
  });

  describe('edge cases', () => {
    it('returns observer with no signals when no match', () => {
      const activity = createActivity('jira', {
        assignee: 'someone.else',
        reporter: 'another.person',
      });
      const result = matcher.detectParticipation(activity);

      expect(result.level).toBe('observer');
      expect(result.signals).toHaveLength(0);
    });

    it('handles missing rawData gracefully', () => {
      const activity = createActivity('jira', undefined);
      const result = matcher.detectParticipation(activity);

      expect(result.level).toBe('observer');
      expect(result.signals).toHaveLength(0);
    });

    it('handles empty arrays gracefully', () => {
      const activity = createActivity('jira', {
        watchers: [],
        mentions: [],
      });
      const result = matcher.detectParticipation(activity);

      expect(result.level).toBe('observer');
      expect(result.signals).toHaveLength(0);
    });

    it('matches case-insensitively', () => {
      const activity = createActivity('jira', {
        assignee: 'HONEY.ARORA',
      });
      const result = matcher.detectParticipation(activity);

      expect(result.level).toBe('initiator');
      expect(result.signals).toContain('jira-assignee');
    });

    it('matches by email', () => {
      const activity = createActivity('jira', {
        assignee: 'honey.arora@acme.com',
      });
      const result = matcher.detectParticipation(activity);

      expect(result.level).toBe('initiator');
      expect(result.signals).toContain('jira-assignee');
    });

    it('handles unknown tool types', () => {
      const activity = createActivity('generic' as ToolType, {
        assignee: 'honey.arora',
      });
      const result = matcher.detectParticipation(activity);

      expect(result.level).toBe('observer');
      expect(result.signals).toHaveLength(0);
    });
  });

  describe('persona without identities', () => {
    it('still matches by email', () => {
      const minimalPersona: CareerPersona = {
        displayName: 'Honey',
        emails: ['honey.arora@acme.com'],
        identities: {},
      };
      const minimalMatcher = new IdentityMatcher(minimalPersona);

      const activity = createActivity('jira', {
        assignee: 'honey.arora@acme.com',
      });
      const result = minimalMatcher.detectParticipation(activity);

      expect(result.level).toBe('initiator');
      expect(result.signals).toContain('jira-assignee');
    });
  });
});
