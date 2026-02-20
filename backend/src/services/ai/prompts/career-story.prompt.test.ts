/**
 * Career Story Prompt Builder Tests
 *
 * Tests for:
 * - getCareerStoryUserPrompt: Handlebars template rendering with style, userPrompt
 * - buildCareerStoryMessages: System + user message construction
 * - FRAMEWORK_SECTIONS: All frameworks have correct section keys
 * - parseCareerStoryResponse: JSON parsing with edge cases
 * - WritingStyle and userPrompt integration: conditionals render only when present
 */

import { describe, it, expect } from 'vitest';
import {
  getCareerStoryUserPrompt,
  buildCareerStoryMessages,
  FRAMEWORK_SECTIONS,
  parseCareerStoryResponse,
  CareerStoryPromptParams,
  JournalEntryContent,
  FrameworkName,
  WritingStyle,
} from './career-story.prompt';

// Factory for test journal entry content
const createJournalEntry = (overrides?: Partial<JournalEntryContent>): JournalEntryContent => ({
  title: 'Migrated Auth System',
  description: 'Led migration from LDAP to OAuth2',
  fullContent: 'Over 3 months, I led the migration of our auth system from LDAP to OAuth2, affecting 50K users.',
  category: 'engineering',
  dominantRole: 'Led',
  phases: null,
  impactHighlights: ['Zero downtime migration', '50% fewer support tickets'],
  skills: ['OAuth2', 'Node.js', 'PostgreSQL'],
  activityIds: ['act-1', 'act-2'],
  ...overrides,
});

const createParams = (overrides?: Partial<CareerStoryPromptParams>): CareerStoryPromptParams => ({
  journalEntry: createJournalEntry(),
  framework: 'STAR',
  ...overrides,
});

describe('FRAMEWORK_SECTIONS', () => {
  it('defines sections for all 8 frameworks', () => {
    const frameworks: FrameworkName[] = ['STAR', 'STARL', 'CAR', 'PAR', 'SAR', 'SOAR', 'SHARE', 'CARL'];
    for (const fw of frameworks) {
      expect(FRAMEWORK_SECTIONS[fw]).toBeDefined();
      expect(FRAMEWORK_SECTIONS[fw].length).toBeGreaterThanOrEqual(3);
    }
  });

  it('STAR has situation, task, action, result', () => {
    expect(FRAMEWORK_SECTIONS.STAR).toEqual(['situation', 'task', 'action', 'result']);
  });

  it('STARL extends STAR with learning', () => {
    expect(FRAMEWORK_SECTIONS.STARL).toEqual(['situation', 'task', 'action', 'result', 'learning']);
  });

  it('SOAR has situation, obstacles, actions, results', () => {
    expect(FRAMEWORK_SECTIONS.SOAR).toEqual(['situation', 'obstacles', 'actions', 'results']);
  });
});

describe('getCareerStoryUserPrompt', () => {
  it('includes framework name in output', () => {
    const prompt = getCareerStoryUserPrompt(createParams());
    expect(prompt).toContain('STAR');
    expect(prompt).toContain('situation, task, action, result');
  });

  it('includes journal entry title', () => {
    const prompt = getCareerStoryUserPrompt(createParams());
    expect(prompt).toContain('Migrated Auth System');
  });

  it('includes fullContent', () => {
    const prompt = getCareerStoryUserPrompt(createParams());
    expect(prompt).toContain('50K users');
  });

  it('includes section guidelines for the framework', () => {
    const prompt = getCareerStoryUserPrompt(createParams());
    expect(prompt).toContain('situation');
    expect(prompt).toContain('task');
    expect(prompt).toContain('action');
    expect(prompt).toContain('result');
  });

  describe('writing style conditional', () => {
    it('does NOT include writing style section when style is undefined', () => {
      const prompt = getCareerStoryUserPrompt(createParams());
      expect(prompt).not.toContain('## Writing Style');
    });

    it('includes writing style section when style is provided', () => {
      const prompt = getCareerStoryUserPrompt(createParams({ style: 'casual' }));
      expect(prompt).toContain('## Writing Style');
      expect(prompt).toContain('**casual**');
    });

    it.each(['professional', 'casual', 'technical', 'storytelling'] as WritingStyle[])(
      'renders %s style in the prompt',
      (style) => {
        const prompt = getCareerStoryUserPrompt(createParams({ style }));
        expect(prompt).toContain(`**${style}**`);
      }
    );
  });

  describe('userPrompt conditional', () => {
    it('does NOT include user prompt section when userPrompt is undefined', () => {
      const prompt = getCareerStoryUserPrompt(createParams());
      expect(prompt).not.toContain('## Additional Instructions from User');
    });

    it('does NOT include user prompt section when userPrompt is empty string', () => {
      const prompt = getCareerStoryUserPrompt(createParams({ userPrompt: '' }));
      expect(prompt).not.toContain('## Additional Instructions from User');
    });

    it('includes user prompt section when userPrompt is provided', () => {
      const prompt = getCareerStoryUserPrompt(createParams({
        userPrompt: 'Emphasize the leadership aspect and add more metrics',
      }));
      expect(prompt).toContain('## Additional Instructions from User');
      expect(prompt).toContain('Emphasize the leadership aspect and add more metrics');
    });

    it('renders userPrompt as a blockquote', () => {
      const prompt = getCareerStoryUserPrompt(createParams({
        userPrompt: 'Focus on technical depth',
      }));
      expect(prompt).toContain('> Focus on technical depth');
    });
  });

  describe('both style and userPrompt', () => {
    it('includes both sections when both are provided', () => {
      const prompt = getCareerStoryUserPrompt(createParams({
        style: 'technical',
        userPrompt: 'Include specific API names',
      }));
      expect(prompt).toContain('## Writing Style');
      expect(prompt).toContain('**technical**');
      expect(prompt).toContain('## Additional Instructions from User');
      expect(prompt).toContain('Include specific API names');
    });
  });
});

describe('buildCareerStoryMessages', () => {
  it('returns array with system and user messages', () => {
    const messages = buildCareerStoryMessages(createParams());
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('system');
    expect(messages[1].role).toBe('user');
  });

  it('system message contains career story guidance', () => {
    const messages = buildCareerStoryMessages(createParams());
    const systemContent = messages[0].content as string;
    expect(systemContent.length).toBeGreaterThan(50);
  });

  it('user message contains framework and journal content', () => {
    const messages = buildCareerStoryMessages(createParams());
    const userContent = messages[1].content as string;
    expect(userContent).toContain('STAR');
    expect(userContent).toContain('Migrated Auth System');
  });

  it('passes style and userPrompt through to user message', () => {
    const messages = buildCareerStoryMessages(createParams({
      style: 'storytelling',
      userPrompt: 'Make it compelling for interviews',
    }));
    const userContent = messages[1].content as string;
    expect(userContent).toContain('**storytelling**');
    expect(userContent).toContain('Make it compelling for interviews');
  });

  it('prepends archetype guidance to system message when provided', () => {
    const messages = buildCareerStoryMessages(createParams({
      archetype: 'firefighter',
    }));
    const systemContent = messages[0].content as string;
    expect(systemContent).toContain('FIREFIGHTER');
    expect(systemContent).toContain('CRISIS RESPONSE');
  });

  it('appends extracted context to user message when provided', () => {
    const messages = buildCareerStoryMessages(createParams({
      extractedContext: {
        realStory: 'The real hero was the monitoring system I built',
        metric: '99.99% uptime for 6 months',
      },
    }));
    const userContent = messages[1].content as string;
    expect(userContent).toContain('User-Provided Context');
    expect(userContent).toContain('The real hero was the monitoring system I built');
    expect(userContent).toContain('99.99% uptime for 6 months');
  });
});

describe('parseCareerStoryResponse', () => {
  it('parses valid JSON response', () => {
    const json = JSON.stringify({
      sections: {
        situation: { summary: 'Team faced issues', evidence: [{ activityId: 'act-1' }] },
        task: { summary: 'Fix performance', evidence: [] },
        action: { summary: 'Implemented caching', evidence: [] },
        result: { summary: '10x speedup', evidence: [] },
      },
      title: 'Performance Win',
      reasoning: 'Mapped from journal phases',
    });

    const result = parseCareerStoryResponse(json);
    expect(result).not.toBeNull();
    expect(result!.title).toBe('Performance Win');
    expect(result!.sections.situation.summary).toBe('Team faced issues');
  });

  it('strips markdown code blocks', () => {
    const json = '```json\n{"sections":{"s":{"summary":"test","evidence":[]}},"title":"T","reasoning":"R"}\n```';
    const result = parseCareerStoryResponse(json);
    expect(result).not.toBeNull();
    expect(result!.title).toBe('T');
  });

  it('returns null for invalid JSON', () => {
    const result = parseCareerStoryResponse('not json at all');
    expect(result).toBeNull();
  });

  it('returns null when sections are missing', () => {
    const result = parseCareerStoryResponse(JSON.stringify({ title: 'No sections' }));
    expect(result).toBeNull();
  });

  it('defaults title to "Career Story" when missing', () => {
    const result = parseCareerStoryResponse(JSON.stringify({
      sections: { s: { summary: 'test', evidence: [] } },
    }));
    expect(result).not.toBeNull();
    expect(result!.title).toBe('Career Story');
  });

  it('defaults reasoning to empty string when missing', () => {
    const result = parseCareerStoryResponse(JSON.stringify({
      sections: { s: { summary: 'test', evidence: [] } },
      title: 'T',
    }));
    expect(result!.reasoning).toBe('');
  });
});

describe('activities in prompt (peer parameter — RH-3)', () => {
  it('includes activities section when activities are provided as peer', () => {
    const prompt = getCareerStoryUserPrompt(createParams({
      // Activities are a PEER param, NOT inside journalEntry
      activities: [{
        title: 'feat(auth): OAuth2 flow',
        date: '2024-05-15',
        source: 'github',
        sourceSubtype: 'pr',
        people: ['bob.chen'],
        userRole: 'authored',
        body: 'Implements OAuth2 with PKCE',
        labels: ['security'],
        scope: '+450/-120, 15 files',
        state: 'merged',
      }],
    }));
    expect(prompt).toContain('Source Activities');
    expect(prompt).toContain('OAuth2 with PKCE');
    expect(prompt).toContain('bob.chen');
    expect(prompt).toContain('+450/-120');
  });

  it('does NOT include activities section when no activities', () => {
    const prompt = getCareerStoryUserPrompt(createParams());
    expect(prompt).not.toContain('Source Activities');
  });
});
