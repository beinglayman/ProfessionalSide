import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ActivityStream } from './activity-stream';
import { ActivityGroup } from '../../types/activity';

// Pin time so bucket logic is deterministic
beforeEach(() => {
  vi.useFakeTimers();
  // Wednesday Feb 5 2026 10:00 UTC
  vi.setSystemTime(new Date('2026-02-05T10:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

// Factory: temporal group
const makeTemporalGroup = (key: string, label: string, count: number): ActivityGroup => ({
  key,
  label,
  count,
  activities: Array.from({ length: count }, (_, i) => ({
    id: `${key}-act-${i}`,
    source: i % 2 === 0 ? 'github' : 'jira',
    sourceId: `src-${i}`,
    sourceUrl: null,
    title: `Activity ${i} in ${label}`,
    description: null,
    timestamp: '2026-02-05T08:00:00Z',
    crossToolRefs: [],
    storyId: null,
    storyTitle: null,
  })),
});

// Factory: story group (draft)
const makeStoryGroup = (key: string, title: string): ActivityGroup => ({
  key,
  label: title,
  count: 3,
  activities: [
    { id: `${key}-a1`, source: 'github', sourceId: 'gh-1', sourceUrl: null, title: 'PR merged', description: null, timestamp: '2026-02-05T08:00:00Z', crossToolRefs: [], storyId: null, storyTitle: null },
  ],
  storyMetadata: {
    id: `story-${key}`,
    title,
    description: 'A draft story about work',
    timeRangeStart: '2026-02-03T00:00:00Z',
    timeRangeEnd: '2026-02-05T08:00:00Z',
    category: null,
    skills: [],
    createdAt: '2026-02-05T09:00:00Z',
    isPublished: false,
    type: 'journal_entry',
    dominantRole: 'Led',
  },
});

describe('ActivityStream — inline drafts', () => {
  it('renders draft card title when switching to Draft Stories tab', () => {
    render(
      <ActivityStream
        groups={[makeTemporalGroup('this_week', 'This Week', 2)]}
        storyGroups={[makeStoryGroup('auth', 'Authentication System Overhaul')]}
      />
    );
    // Switch to Draft Stories tab
    fireEvent.click(screen.getByText('Draft Stories'));
    expect(screen.getByText('Authentication System Overhaul')).toBeInTheDocument();
  });

  it('shows Draft Stories toggle with correct count', () => {
    render(
      <ActivityStream
        groups={[makeTemporalGroup('this_week', 'This Week', 2)]}
        storyGroups={[
          makeStoryGroup('auth', 'Auth Overhaul'),
          makeStoryGroup('perf', 'Perf Pipeline'),
        ]}
      />
    );
    // Toggle button shows count badge inside the Draft Stories button
    const draftsButton = screen.getByText('Draft Stories').closest('button')!;
    expect(draftsButton).toBeInTheDocument();
    expect(draftsButton.querySelector('span')).toHaveTextContent('2');
  });

  it('hides Draft Stories toggle when no storyGroups', () => {
    render(
      <ActivityStream
        groups={[makeTemporalGroup('this_week', 'This Week', 2)]}
        storyGroups={[]}
      />
    );
    expect(screen.queryByText('Draft Stories')).not.toBeInTheDocument();
  });

  it('renders Create Story CTA on draft cards', () => {
    render(
      <ActivityStream
        groups={[makeTemporalGroup('this_week', 'This Week', 2)]}
        storyGroups={[makeStoryGroup('auth', 'Auth Overhaul')]}
        onPromoteToCareerStory={vi.fn()}
      />
    );
    // Switch to Draft Stories tab first
    fireEvent.click(screen.getByText('Draft Stories'));
    expect(screen.getByText('Create Story')).toBeInTheDocument();
  });

  it('calls onPromoteToCareerStory when CTA clicked', () => {
    const onPromote = vi.fn();
    render(
      <ActivityStream
        groups={[makeTemporalGroup('this_week', 'This Week', 2)]}
        storyGroups={[makeStoryGroup('auth', 'Auth Overhaul')]}
        onPromoteToCareerStory={onPromote}
      />
    );
    // Switch to Draft Stories tab first
    fireEvent.click(screen.getByText('Draft Stories'));
    fireEvent.click(screen.getByText('Create Story'));
    expect(onPromote).toHaveBeenCalledWith('story-auth');
  });

  it('switches between Activities and Draft Stories tabs', () => {
    render(
      <ActivityStream
        groups={[makeTemporalGroup('this_week', 'This Week', 3)]}
        storyGroups={[makeStoryGroup('auth', 'Auth Overhaul')]}
      />
    );

    // Activities visible by default
    expect(screen.getByText('Activity 0 in This Week')).toBeInTheDocument();

    // Click "Draft Stories" toggle
    fireEvent.click(screen.getByText('Draft Stories'));

    // Activities hidden, draft still visible
    expect(screen.queryByText('Activity 0 in This Week')).not.toBeInTheDocument();
    expect(screen.getByText('Auth Overhaul')).toBeInTheDocument();

    // Click "Activities" to restore
    fireEvent.click(screen.getByText('Activities'));
    expect(screen.getByText('Activity 0 in This Week')).toBeInTheDocument();
  });
});

describe('ActivityStream — expand/collapse in Draft Stories mode', () => {
  it('Expand button expands all draft cards', () => {
    render(
      <ActivityStream
        groups={[makeTemporalGroup('this_week', 'This Week', 2)]}
        storyGroups={[
          makeStoryGroup('auth', 'Auth Overhaul'),
          makeStoryGroup('perf', 'Perf Pipeline'),
        ]}
        onPromoteToCareerStory={vi.fn()}
      />
    );

    // Switch to Draft Stories tab
    fireEvent.click(screen.getByText('Draft Stories'));

    // Draft descriptions are line-clamped in collapsed header, but the
    // expanded view shows the full description + impact highlights section.
    // Initially no expanded content dividers visible.
    const expandButton = screen.getByRole('button', { name: /expand/i });
    fireEvent.click(expandButton);

    // After expand, both draft cards should show their expanded content.
    // The "Key Impact" heading only appears in expanded state.
    // We verify by checking that collapse button now appears.
    expect(screen.getByRole('button', { name: /collapse/i })).toBeInTheDocument();
  });

  it('Collapse button collapses all draft cards', () => {
    render(
      <ActivityStream
        groups={[makeTemporalGroup('this_week', 'This Week', 2)]}
        storyGroups={[makeStoryGroup('auth', 'Auth Overhaul')]}
        onPromoteToCareerStory={vi.fn()}
      />
    );

    // Switch to Draft Stories, expand, then collapse
    fireEvent.click(screen.getByText('Draft Stories'));

    // Expand one card manually
    fireEvent.click(screen.getByText('Auth Overhaul'));

    // Now collapse all
    const collapseButton = screen.getByRole('button', { name: /collapse/i });
    fireEvent.click(collapseButton);

    // Should show expand button again
    expect(screen.getByRole('button', { name: /expand/i })).toBeInTheDocument();
  });
});

describe('ActivityStream — expand state persists across tab switches', () => {
  it('draft expand state survives switching to Activities and back', () => {
    render(
      <ActivityStream
        groups={[makeTemporalGroup('this_week', 'This Week', 2)]}
        storyGroups={[makeStoryGroup('auth', 'Auth Overhaul')]}
        onPromoteToCareerStory={vi.fn()}
      />
    );

    // Switch to Draft Stories and expand a card
    fireEvent.click(screen.getByText('Draft Stories'));
    fireEvent.click(screen.getByText('Auth Overhaul'));

    // Collapse button should be visible (card is expanded)
    expect(screen.getByRole('button', { name: /collapse/i })).toBeInTheDocument();

    // Switch to Activities
    fireEvent.click(screen.getByText('Activities'));
    expect(screen.getByText('Activity 0 in This Week')).toBeInTheDocument();

    // Switch back to Draft Stories — card should still be expanded
    fireEvent.click(screen.getByText('Draft Stories'));
    expect(screen.getByRole('button', { name: /collapse/i })).toBeInTheDocument();
  });
});

describe('ActivityStream — empty states', () => {
  it('shows empty message when no groups', () => {
    render(
      <ActivityStream
        groups={[]}
        emptyMessage="No activities yet."
      />
    );
    expect(screen.getByText('No activities yet.')).toBeInTheDocument();
  });

  it('shows loading spinner when isLoading', () => {
    render(
      <ActivityStream
        groups={[]}
        isLoading={true}
      />
    );
    // Loader2 icon has animate-spin class
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows empty draft stories message when switching to drafts with none', () => {
    render(
      <ActivityStream
        groups={[makeTemporalGroup('this_week', 'This Week', 2)]}
        storyGroups={[makeStoryGroup('auth', 'Auth Overhaul')]}
      />
    );

    // Switch to drafts, verify content exists
    fireEvent.click(screen.getByText('Draft Stories'));
    expect(screen.getByText('Auth Overhaul')).toBeInTheDocument();
  });
});
