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
  it('renders draft card title when storyGroups provided', () => {
    render(
      <ActivityStream
        groups={[makeTemporalGroup('this_week', 'This Week', 2)]}
        storyGroups={[makeStoryGroup('auth', 'Authentication System Overhaul')]}
      />
    );
    expect(screen.getByText('Authentication System Overhaul')).toBeInTheDocument();
  });

  it('shows drafts banner with correct count', () => {
    render(
      <ActivityStream
        groups={[makeTemporalGroup('this_week', 'This Week', 2)]}
        storyGroups={[
          makeStoryGroup('auth', 'Auth Overhaul'),
          makeStoryGroup('perf', 'Perf Pipeline'),
        ]}
      />
    );
    expect(screen.getByText(/2 draft stories/)).toBeInTheDocument();
  });

  it('hides drafts banner when no storyGroups', () => {
    render(
      <ActivityStream
        groups={[makeTemporalGroup('this_week', 'This Week', 2)]}
        storyGroups={[]}
      />
    );
    expect(screen.queryByText(/draft stor/i)).not.toBeInTheDocument();
  });

  it('renders Create Career Story CTA when draft card is expanded', () => {
    render(
      <ActivityStream
        groups={[makeTemporalGroup('this_week', 'This Week', 2)]}
        storyGroups={[makeStoryGroup('auth', 'Auth Overhaul')]}
        onPromoteToCareerStory={vi.fn()}
      />
    );
    // Expand the draft card by clicking the title
    fireEvent.click(screen.getByText('Auth Overhaul'));
    expect(screen.getByText(/Create Career Story/)).toBeInTheDocument();
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
    // Expand the draft card first
    fireEvent.click(screen.getByText('Auth Overhaul'));
    // Click the CTA button
    fireEvent.click(screen.getByText(/Create Career Story/));
    expect(onPromote).toHaveBeenCalledWith('story-auth');
  });

  it('toggles drafts-only mode via banner button', () => {
    render(
      <ActivityStream
        groups={[makeTemporalGroup('this_week', 'This Week', 3)]}
        storyGroups={[makeStoryGroup('auth', 'Auth Overhaul')]}
      />
    );

    // Activities visible by default
    expect(screen.getByText('Activity 0 in This Week')).toBeInTheDocument();

    // Click "Review drafts"
    fireEvent.click(screen.getByText('Review drafts'));

    // Activities hidden, draft still visible
    expect(screen.queryByText('Activity 0 in This Week')).not.toBeInTheDocument();
    expect(screen.getByText('Auth Overhaul')).toBeInTheDocument();

    // Click "Show all" to restore
    fireEvent.click(screen.getByText('Show all'));
    expect(screen.getByText('Activity 0 in This Week')).toBeInTheDocument();
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
});
