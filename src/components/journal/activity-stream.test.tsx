import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ActivityStream } from './activity-stream';
import { SidebarDraftCard } from './SidebarDraftCard';
import { DraftStorySidebar } from './DraftStorySidebar';
import { DraftFilterBanner } from './DraftFilterBanner';
import { DraftPeekBar } from './DraftPeekBar';
import { ActivityGroup, Activity, ActivityStoryEdge } from '../../types/activity';

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

// --- ActivityStream tests (pure renderer) ---

describe('ActivityStream — pure renderer', () => {
  it('renders activity groups', () => {
    render(
      <ActivityStream
        groups={[makeTemporalGroup('this_week', 'This Week', 2)]}
      />
    );
    expect(screen.getByText('Activity 0 in This Week')).toBeInTheDocument();
    expect(screen.getByText('Activity 1 in This Week')).toBeInTheDocument();
  });

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
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('does not render pill toggle (removed)', () => {
    render(
      <ActivityStream
        groups={[makeTemporalGroup('this_week', 'This Week', 2)]}
      />
    );
    expect(screen.queryByText('Drafts')).not.toBeInTheDocument();
    expect(screen.queryByText('Activities')).not.toBeInTheDocument();
  });

  it('hides filter bar when hideFilters is true', () => {
    render(
      <ActivityStream
        groups={[makeTemporalGroup('this_week', 'This Week', 2)]}
        hideFilters={true}
      />
    );
    // Filter bar elements should not be present
    expect(screen.queryByRole('button', { name: /collapse/i })).not.toBeInTheDocument();
  });
});

// --- SidebarDraftCard tests ---

describe('SidebarDraftCard', () => {
  it('renders draft card with title and badge', () => {
    const draft = makeStoryGroup('auth', 'Auth Overhaul');
    render(
      <SidebarDraftCard
        draft={draft}
        isSelected={false}
        isMuted={false}
        onSelect={vi.fn()}
        onPromote={vi.fn()}
      />
    );
    expect(screen.getByText('Auth Overhaul')).toBeInTheDocument();
  });

  it('shows activity count with plural label', () => {
    const draft = { ...makeStoryGroup('multi', 'Multi Activity'), count: 5 };
    render(
      <SidebarDraftCard
        draft={draft}
        isSelected={false}
        isMuted={false}
        onSelect={vi.fn()}
        onPromote={vi.fn()}
      />
    );
    expect(screen.getByText('5 activities')).toBeInTheDocument();
  });

  it('shows singular "activity" when count is 1', () => {
    const draft = { ...makeStoryGroup('single', 'Single Activity'), count: 1 };
    render(
      <SidebarDraftCard
        draft={draft}
        isSelected={false}
        isMuted={false}
        onSelect={vi.fn()}
        onPromote={vi.fn()}
      />
    );
    expect(screen.getByText('1 activity')).toBeInTheDocument();
  });

  it('shows Create Story CTA in selected state', () => {
    const draft = makeStoryGroup('auth', 'Auth Overhaul');
    render(
      <SidebarDraftCard
        draft={draft}
        isSelected={true}
        isMuted={false}
        onSelect={vi.fn()}
        onPromote={vi.fn()}
      />
    );
    expect(screen.getByText('Create Story')).toBeInTheDocument();
  });

  it('hides Create Story CTA in resting state (desktop)', () => {
    const draft = makeStoryGroup('auth', 'Auth Overhaul');
    render(
      <SidebarDraftCard
        draft={draft}
        isSelected={false}
        isMuted={false}
        onSelect={vi.fn()}
        onPromote={vi.fn()}
        showCTA={false}
      />
    );
    expect(screen.queryByText('Create Story')).not.toBeInTheDocument();
  });

  it('shows Create Story CTA when showCTA=true (mobile)', () => {
    const draft = makeStoryGroup('auth', 'Auth Overhaul');
    render(
      <SidebarDraftCard
        draft={draft}
        isSelected={false}
        isMuted={false}
        onSelect={vi.fn()}
        onPromote={vi.fn()}
        showCTA={true}
      />
    );
    expect(screen.getByText('Create Story')).toBeInTheDocument();
  });

  it('calls onPromote when CTA clicked', () => {
    const onPromote = vi.fn();
    const draft = makeStoryGroup('auth', 'Auth Overhaul');
    render(
      <SidebarDraftCard
        draft={draft}
        isSelected={true}
        isMuted={false}
        onSelect={vi.fn()}
        onPromote={onPromote}
      />
    );
    fireEvent.click(screen.getByText('Create Story'));
    expect(onPromote).toHaveBeenCalledTimes(1);
  });

  it('shows description in selected state', () => {
    const draft = makeStoryGroup('auth', 'Auth Overhaul');
    render(
      <SidebarDraftCard
        draft={draft}
        isSelected={true}
        isMuted={false}
        onSelect={vi.fn()}
        onPromote={vi.fn()}
      />
    );
    expect(screen.getByText('A draft story about work')).toBeInTheDocument();
  });

  it('shows "No summary generated yet." when description is null and selected', () => {
    const draft = makeStoryGroup('nodesc', 'No Description');
    draft.storyMetadata!.description = null as unknown as string;
    render(
      <SidebarDraftCard
        draft={draft}
        isSelected={true}
        isMuted={false}
        onSelect={vi.fn()}
        onPromote={vi.fn()}
      />
    );
    expect(screen.getByText('No summary generated yet.')).toBeInTheDocument();
  });

  it('shows Clear button in selected state', () => {
    const draft = makeStoryGroup('auth', 'Auth Overhaul');
    render(
      <SidebarDraftCard
        draft={draft}
        isSelected={true}
        isMuted={false}
        onSelect={vi.fn()}
        onPromote={vi.fn()}
      />
    );
    expect(screen.getByText('Clear')).toBeInTheDocument();
  });

  it('renders card without topics gracefully', () => {
    const draft = makeStoryGroup('notopics', 'No Topics');
    draft.storyMetadata!.topics = undefined;
    render(
      <SidebarDraftCard
        draft={draft}
        isSelected={false}
        isMuted={false}
        onSelect={vi.fn()}
        onPromote={vi.fn()}
      />
    );
    expect(screen.getByText('No Topics')).toBeInTheDocument();
  });

  it('responds to keyboard Enter to select', () => {
    const onSelect = vi.fn();
    const draft = makeStoryGroup('kbd', 'Keyboard Nav');
    render(
      <SidebarDraftCard
        draft={draft}
        isSelected={false}
        isMuted={false}
        onSelect={onSelect}
        onPromote={vi.fn()}
      />
    );
    const card = screen.getByRole('button');
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});

// --- DraftStorySidebar tests ---

describe('DraftStorySidebar', () => {
  it('renders loading skeletons when isLoading', () => {
    const { container } = render(
      <DraftStorySidebar
        drafts={[]}
        selectedId={null}
        isLoading={true}
        onSelect={vi.fn()}
        onPromote={vi.fn()}
        onRegenerate={vi.fn()}
      />
    );
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('renders empty state when zero drafts', () => {
    render(
      <DraftStorySidebar
        drafts={[]}
        selectedId={null}
        isLoading={false}
        onSelect={vi.fn()}
        onPromote={vi.fn()}
        onRegenerate={vi.fn()}
      />
    );
    expect(screen.getByText(/stories form automatically/i)).toBeInTheDocument();
  });

  it('renders draft cards with count badge', () => {
    const drafts = [
      makeStoryGroup('auth', 'Auth Overhaul'),
      makeStoryGroup('perf', 'Perf Pipeline'),
    ];
    render(
      <DraftStorySidebar
        drafts={drafts}
        selectedId={null}
        isLoading={false}
        onSelect={vi.fn()}
        onPromote={vi.fn()}
        onRegenerate={vi.fn()}
      />
    );
    expect(screen.getByText('Auth Overhaul')).toBeInTheDocument();
    expect(screen.getByText('Perf Pipeline')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // count badge
  });

  it('shows footer hint when no selection', () => {
    render(
      <DraftStorySidebar
        drafts={[makeStoryGroup('auth', 'Auth Overhaul')]}
        selectedId={null}
        isLoading={false}
        onSelect={vi.fn()}
        onPromote={vi.fn()}
        onRegenerate={vi.fn()}
      />
    );
    expect(screen.getByText(/click a story/i)).toBeInTheDocument();
  });

});

// --- DraftFilterBanner tests ---

describe('DraftFilterBanner', () => {
  it('shows draft title and match count', () => {
    render(
      <DraftFilterBanner
        draftTitle="OAuth2 Security"
        matchCount={5}
        totalCount={7}
        missingCount={2}
        onClear={vi.fn()}
      />
    );
    expect(screen.getByText(/showing 5 activities for: oauth2 security/i)).toBeInTheDocument();
    expect(screen.getByText(/2 outside current time range/i)).toBeInTheDocument();
  });

  it('calls onClear when Clear button clicked', () => {
    const onClear = vi.fn();
    render(
      <DraftFilterBanner
        draftTitle="Test"
        matchCount={3}
        totalCount={3}
        missingCount={0}
        onClear={onClear}
      />
    );
    fireEvent.click(screen.getByText('Clear'));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('shows paused filters message when matches exist', () => {
    render(
      <DraftFilterBanner
        draftTitle="Test"
        matchCount={3}
        totalCount={3}
        missingCount={0}
        onClear={vi.fn()}
      />
    );
    expect(screen.getByText(/source and time filters paused/i)).toBeInTheDocument();
  });

  it('shows "no activities found" when matchCount is 0', () => {
    render(
      <DraftFilterBanner
        draftTitle="Old Feature"
        matchCount={0}
        totalCount={12}
        missingCount={12}
        onClear={vi.fn()}
      />
    );
    expect(screen.getByText(/no activities found for: old feature/i)).toBeInTheDocument();
    expect(screen.getByText(/outside the loaded time range/i)).toBeInTheDocument();
  });
});

// --- DraftPeekBar tests ---

describe('DraftPeekBar', () => {
  it('shows draft count', () => {
    render(
      <DraftPeekBar count={3} isLoading={false} isOpen={false} onTap={vi.fn()} />
    );
    expect(screen.getByText('3 Draft Stories')).toBeInTheDocument();
  });

  it('shows singular for 1 draft', () => {
    render(
      <DraftPeekBar count={1} isLoading={false} isOpen={false} onTap={vi.fn()} />
    );
    expect(screen.getByText('1 Draft Story')).toBeInTheDocument();
  });

  it('shows shimmer loading state', () => {
    const { container } = render(
      <DraftPeekBar count={0} isLoading={true} isOpen={false} onTap={vi.fn()} />
    );
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('returns null when count=0 and not loading', () => {
    const { container } = render(
      <DraftPeekBar count={0} isLoading={false} isOpen={false} onTap={vi.fn()} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('calls onTap when clicked', () => {
    const onTap = vi.fn();
    render(
      <DraftPeekBar count={3} isLoading={false} isOpen={false} onTap={onTap} />
    );
    fireEvent.click(screen.getByRole('button'));
    expect(onTap).toHaveBeenCalledTimes(1);
  });
});
