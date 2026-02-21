import { describe, it, expect } from 'vitest';
import { buildLLMInput } from './llm-input.builder';

const baseJournalEntry = {
  title: 'Migrated Auth System',
  description: 'Led migration from LDAP to OAuth2',
  fullContent: 'Over 3 months, I led the migration...',
  category: 'engineering',
  activityIds: ['act-1', 'act-2'],
  format7Data: {
    dominantRole: 'Led',
    phases: [{ name: 'Planning', summary: 'Analyzed requirements', activityIds: ['act-1'] }],
    impactHighlights: ['Zero downtime migration'],
    summary: { technologies_used: ['OAuth2', 'Node.js'] },
    context: { primary_focus: 'Security' },
  },
};

describe('buildLLMInput', () => {
  it('extracts format7Data fields into JournalEntryContent', () => {
    const result = buildLLMInput({ journalEntry: baseJournalEntry });
    expect(result.dominantRole).toBe('Led');
    expect(result.phases).toHaveLength(1);
    expect(result.phases![0].name).toBe('Planning');
    expect(result.impactHighlights).toEqual(['Zero downtime migration']);
    expect(result.skills).toEqual(['OAuth2', 'Node.js']);
  });

  it('uses context.primary_focus as fallback for dominantRole', () => {
    const entry = {
      ...baseJournalEntry,
      format7Data: { context: { primary_focus: 'Performance' } },
    };
    const result = buildLLMInput({ journalEntry: entry });
    expect(result.dominantRole).toBe('Performance');
  });

  it('handles null format7Data gracefully', () => {
    const entry = { ...baseJournalEntry, format7Data: null };
    const result = buildLLMInput({ journalEntry: entry });
    expect(result.dominantRole).toBeNull();
    expect(result.phases).toBeNull();
    expect(result.skills).toBeNull();
  });

  it('handles undefined format7Data gracefully', () => {
    const entry = { ...baseJournalEntry, format7Data: undefined };
    const result = buildLLMInput({ journalEntry: entry });
    expect(result.dominantRole).toBeNull();
    expect(result.phases).toBeNull();
  });

  it('handles empty format7Data object gracefully', () => {
    const entry = { ...baseJournalEntry, format7Data: {} };
    const result = buildLLMInput({ journalEntry: entry });
    expect(result.dominantRole).toBeNull();
    expect(result.phases).toBeNull();
    expect(result.skills).toBeNull();
  });

  it('preserves title, description, fullContent, category, activityIds', () => {
    const result = buildLLMInput({ journalEntry: baseJournalEntry });
    expect(result.title).toBe('Migrated Auth System');
    expect(result.description).toBe('Led migration from LDAP to OAuth2');
    expect(result.fullContent).toContain('3 months');
    expect(result.category).toBe('engineering');
    expect(result.activityIds).toEqual(['act-1', 'act-2']);
  });

  it('uses frameworkComponents as fallback for phases', () => {
    const entry = {
      ...baseJournalEntry,
      format7Data: {
        frameworkComponents: [
          { name: 'Context', label: 'Context', content: 'Background info' },
        ],
      },
    };
    const result = buildLLMInput({ journalEntry: entry });
    expect(result.phases).toHaveLength(1);
    expect(result.phases![0].name).toBe('Context');
    expect(result.phases![0].summary).toBe('Background info');
    expect(result.phases![0].activityIds).toEqual([]);
  });

  it('prefers impactHighlights over extractedContext.metric', () => {
    const result = buildLLMInput({
      journalEntry: baseJournalEntry,
      extractedContext: { metric: 'Fallback metric' },
    });
    expect(result.impactHighlights).toEqual(['Zero downtime migration']);
  });

  it('falls back to extractedContext.metric when no impactHighlights', () => {
    const entry = { ...baseJournalEntry, format7Data: {} };
    const result = buildLLMInput({
      journalEntry: entry,
      extractedContext: { metric: '40% latency reduction' },
    });
    expect(result.impactHighlights).toEqual(['40% latency reduction']);
  });

  it('defaults title to Untitled when null', () => {
    const entry = { ...baseJournalEntry, title: null };
    const result = buildLLMInput({ journalEntry: entry });
    expect(result.title).toBe('Untitled');
  });
});
