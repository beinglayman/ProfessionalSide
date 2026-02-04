import { describe, it, expect } from 'vitest';
import {
  getRefType,
  getUniqueRefs,
  getMetadataSummary,
  hasExpandableContent,
  safeParseTimestamp,
  truncateText,
  INITIAL_ITEMS_LIMIT,
  MAX_COMMENT_BODY_LENGTH,
  MAX_SUMMARY_SOURCES,
  TITLE_TRUNCATE_LENGTH,
  SHORT_TITLE_TRUNCATE_LENGTH,
} from './activity-card-utils';
import { ActivityRawData } from '../../types/activity';

describe('getRefType', () => {
  describe('Jira patterns', () => {
    it('detects standard Jira ticket format', () => {
      expect(getRefType('AUTH-123')).toBe('jira');
      expect(getRefType('PERF-456')).toBe('jira');
      expect(getRefType('DOC-1')).toBe('jira');
    });

    it('rejects lowercase Jira-like patterns', () => {
      expect(getRefType('auth-123')).toBeNull();
    });

    it('rejects patterns without dash', () => {
      expect(getRefType('AUTH123')).toBeNull();
    });
  });

  describe('GitHub patterns', () => {
    it('detects org/repo#number format', () => {
      expect(getRefType('acme/backend#42')).toBe('github');
      expect(getRefType('my-org/my-repo#1')).toBe('github');
    });

    it('detects repo#number format', () => {
      expect(getRefType('backend#42')).toBe('github');
      expect(getRefType('my-repo#123')).toBe('github');
    });

    it('rejects patterns without hash', () => {
      expect(getRefType('acme/backend')).toBeNull();
    });
  });

  describe('Confluence patterns', () => {
    it('detects 6+ digit page IDs', () => {
      expect(getRefType('123456')).toBe('confluence');
      expect(getRefType('987654321')).toBe('confluence');
    });

    it('rejects short numbers', () => {
      expect(getRefType('12345')).toBeNull();
      expect(getRefType('123')).toBeNull();
    });
  });

  describe('unknown patterns', () => {
    it('returns null for unrecognized patterns', () => {
      expect(getRefType('random-text')).toBeNull();
      expect(getRefType('')).toBeNull();
      expect(getRefType('hello world')).toBeNull();
    });
  });
});

describe('getUniqueRefs', () => {
  it('filters out exact matches', () => {
    const result = getUniqueRefs(['AUTH-123', 'acme/backend#60'], 'acme/backend#60');
    expect(result).toEqual(['AUTH-123']);
  });

  it('is case-insensitive', () => {
    const result = getUniqueRefs(['ACME/Backend#60', 'AUTH-123'], 'acme/backend#60');
    expect(result).toEqual(['AUTH-123']);
  });

  it('keeps all refs when none match sourceId', () => {
    const result = getUniqueRefs(['AUTH-123', 'PERF-456'], 'DOC-789');
    expect(result).toEqual(['AUTH-123', 'PERF-456']);
  });

  it('handles empty refs array', () => {
    const result = getUniqueRefs([], 'acme/backend#60');
    expect(result).toEqual([]);
  });

  it('handles empty sourceId', () => {
    const result = getUniqueRefs(['AUTH-123'], '');
    expect(result).toEqual(['AUTH-123']);
  });
});

describe('getMetadataSummary', () => {
  describe('GitHub', () => {
    it('shows state, diff, and reviews', () => {
      const rawData: ActivityRawData = {
        state: 'merged',
        additions: 100,
        deletions: 50,
        reviews: 3,
      };
      expect(getMetadataSummary('github', rawData)).toBe('merged · +100/-50 · 3 reviews');
    });

    it('handles missing fields gracefully', () => {
      expect(getMetadataSummary('github', { state: 'open' })).toBe('open');
      expect(getMetadataSummary('github', {})).toBeNull();
    });

    it('shows zero diff when only additions present', () => {
      const rawData: ActivityRawData = { additions: 50 };
      expect(getMetadataSummary('github', rawData)).toBe('+50/-0');
    });
  });

  describe('Jira', () => {
    it('shows status, priority, and points', () => {
      const rawData: ActivityRawData = {
        status: 'Done',
        priority: 'High',
        storyPoints: 8,
      };
      expect(getMetadataSummary('jira', rawData)).toBe('Done · High · 8 pts');
    });

    it('handles zero story points', () => {
      const rawData: ActivityRawData = { storyPoints: 0 };
      expect(getMetadataSummary('jira', rawData)).toBe('0 pts');
    });
  });

  describe('Confluence', () => {
    it('shows space and version', () => {
      const rawData: ActivityRawData = {
        spaceKey: 'ENG',
        version: 5,
      };
      expect(getMetadataSummary('confluence', rawData)).toBe('ENG · v5');
    });
  });

  describe('Slack', () => {
    it('shows channel and reaction count', () => {
      const rawData: ActivityRawData = {
        channelName: 'engineering',
        reactions: [
          { name: 'thumbsup', count: 3 },
          { name: 'heart', count: 2 },
        ],
      };
      expect(getMetadataSummary('slack', rawData)).toBe('#engineering · 5 reactions');
    });

    it('handles empty reactions array', () => {
      const rawData: ActivityRawData = {
        channelName: 'general',
        reactions: [],
      };
      expect(getMetadataSummary('slack', rawData)).toBe('#general');
    });
  });

  describe('Calendar/meeting sources', () => {
    it.each(['outlook', 'teams', 'google-calendar', 'google-meet'])('%s shows duration and attendees', (source) => {
      const rawData: ActivityRawData = {
        duration: 60,
        attendees: ['alice', 'bob', 'charlie'],
      };
      expect(getMetadataSummary(source, rawData)).toBe('60 min · 3 attendees');
    });

    it('handles numeric attendees count', () => {
      const rawData: ActivityRawData = {
        duration: 30,
        attendees: 5,
      };
      expect(getMetadataSummary('outlook', rawData)).toBe('30 min · 5 attendees');
    });
  });

  describe('Figma', () => {
    it('returns fileName', () => {
      const rawData: ActivityRawData = { fileName: 'Mobile-Redesign' };
      expect(getMetadataSummary('figma', rawData)).toBe('Mobile-Redesign');
    });

    it('returns null when no fileName', () => {
      expect(getMetadataSummary('figma', {})).toBeNull();
    });
  });

  describe('Microsoft file storage sources', () => {
    it.each(['onedrive', 'sharepoint'])('%s shows fileName', (source) => {
      const rawData: ActivityRawData = { fileName: 'Q4-Report.docx' };
      expect(getMetadataSummary(source, rawData)).toBe('Q4-Report.docx');
    });

    it('returns null when no fileName', () => {
      expect(getMetadataSummary('onedrive', {})).toBeNull();
    });
  });

  describe('Google Workspace docs', () => {
    it.each(['google-docs', 'google-sheets', 'google-drive'])('%s shows fileName and version', (source) => {
      const rawData: ActivityRawData = { fileName: 'Project Plan', version: 3 };
      expect(getMetadataSummary(source, rawData)).toBe('Project Plan · v3');
    });

    it('shows only fileName when no version', () => {
      const rawData: ActivityRawData = { fileName: 'Budget 2024' };
      expect(getMetadataSummary('google-sheets', rawData)).toBe('Budget 2024');
    });

    it('returns null for empty rawData', () => {
      expect(getMetadataSummary('google-docs', {})).toBeNull();
    });
  });

  describe('null/undefined handling', () => {
    it('returns null for null rawData', () => {
      expect(getMetadataSummary('github', null)).toBeNull();
    });

    it('returns null for undefined rawData', () => {
      expect(getMetadataSummary('github', undefined)).toBeNull();
    });

    it('returns null for unknown source', () => {
      expect(getMetadataSummary('unknown', { status: 'test' })).toBeNull();
    });
  });
});

describe('hasExpandableContent', () => {
  it('returns true when description exists', () => {
    expect(hasExpandableContent('github', null, 'Some description')).toBe(true);
  });

  it('returns true when uniqueRefs exist', () => {
    expect(hasExpandableContent('github', null, null, 2)).toBe(true);
  });

  it('returns false when no content', () => {
    expect(hasExpandableContent('github', null, null, 0)).toBe(false);
  });

  describe('source-specific checks', () => {
    it('github: true when changedFiles exists', () => {
      expect(hasExpandableContent('github', { changedFiles: 5 })).toBe(true);
    });

    it('github: true when requestedReviewers exists', () => {
      expect(hasExpandableContent('github', { requestedReviewers: ['alice'] })).toBe(true);
    });

    it('jira: true when labels exist', () => {
      expect(hasExpandableContent('jira', { labels: ['security'] })).toBe(true);
    });

    it('jira: true when assignee exists', () => {
      expect(hasExpandableContent('jira', { assignee: 'alice' })).toBe(true);
    });

    it('slack: true when reactions exist', () => {
      expect(hasExpandableContent('slack', { reactions: [{ name: 'thumbsup', count: 1 }] })).toBe(true);
    });

    it('any source: true when comments exist', () => {
      expect(hasExpandableContent('unknown', { comments: [{ author: 'alice', body: 'test' }] })).toBe(true);
    });

    it.each(['outlook', 'teams', 'google-calendar', 'google-meet'])('%s: true when attendees exist', (source) => {
      expect(hasExpandableContent(source, { attendees: ['alice', 'bob'] })).toBe(true);
    });

    it.each(['outlook', 'teams', 'google-calendar', 'google-meet'])('%s: true when organizer exists', (source) => {
      expect(hasExpandableContent(source, { organizer: 'alice' })).toBe(true);
    });

    it.each(['onedrive', 'sharepoint', 'google-docs', 'google-sheets', 'google-drive'])('%s: true when lastModifiedBy exists', (source) => {
      expect(hasExpandableContent(source, { lastModifiedBy: 'alice' })).toBe(true);
    });

    it.each(['onedrive', 'sharepoint', 'google-docs', 'google-sheets', 'google-drive'])('%s: false when empty rawData', (source) => {
      expect(hasExpandableContent(source, {})).toBe(false);
    });
  });
});

describe('safeParseTimestamp', () => {
  it('parses valid ISO timestamp', () => {
    const result = safeParseTimestamp('2024-01-15T10:30:00Z');
    expect(result).toBeInstanceOf(Date);
    expect(result?.getFullYear()).toBe(2024);
  });

  it('parses valid date string', () => {
    const result = safeParseTimestamp('2024-01-15');
    expect(result).toBeInstanceOf(Date);
  });

  it('returns null for invalid string', () => {
    expect(safeParseTimestamp('not-a-date')).toBeNull();
    expect(safeParseTimestamp('')).toBeNull();
  });

  it('returns null for invalid date', () => {
    expect(safeParseTimestamp('Invalid Date')).toBeNull();
  });
});

describe('truncateText', () => {
  it('returns text unchanged when shorter than maxLength', () => {
    expect(truncateText('short', 10)).toBe('short');
  });

  it('returns text unchanged when exactly maxLength', () => {
    expect(truncateText('exact', 5)).toBe('exact');
  });

  it('truncates and adds ellipsis when longer than maxLength', () => {
    expect(truncateText('this is a long text', 10)).toBe('this is a ...');
  });

  it('uses custom suffix when provided', () => {
    expect(truncateText('this is a long text', 10, '…')).toBe('this is a …');
  });

  it('handles empty string', () => {
    expect(truncateText('', 10)).toBe('');
  });

  it('handles maxLength of 0', () => {
    expect(truncateText('test', 0)).toBe('...');
  });
});

describe('constants', () => {
  it('INITIAL_ITEMS_LIMIT is defined and positive', () => {
    expect(INITIAL_ITEMS_LIMIT).toBeGreaterThan(0);
    expect(INITIAL_ITEMS_LIMIT).toBe(5);
  });

  it('MAX_COMMENT_BODY_LENGTH is defined and reasonable', () => {
    expect(MAX_COMMENT_BODY_LENGTH).toBeGreaterThan(0);
    expect(MAX_COMMENT_BODY_LENGTH).toBe(100);
  });

  it('MAX_SUMMARY_SOURCES is defined and reasonable', () => {
    expect(MAX_SUMMARY_SOURCES).toBeGreaterThan(0);
    expect(MAX_SUMMARY_SOURCES).toBe(3);
  });

  it('TITLE_TRUNCATE_LENGTH is defined', () => {
    expect(TITLE_TRUNCATE_LENGTH).toBe(30);
  });

  it('SHORT_TITLE_TRUNCATE_LENGTH is defined and smaller than TITLE_TRUNCATE_LENGTH', () => {
    expect(SHORT_TITLE_TRUNCATE_LENGTH).toBe(25);
    expect(SHORT_TITLE_TRUNCATE_LENGTH).toBeLessThan(TITLE_TRUNCATE_LENGTH);
  });
});
