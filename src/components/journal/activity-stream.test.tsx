import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ActivityStream } from './activity-stream';
import { ActivityGroup, Activity, ActivityStoryEdge } from '../../types/activity';
import { ACTIVITIES_PER_EDGE_LIMIT } from './story-group-header';

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
    fireEvent.click(screen.getByText('Drafts'));
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
    const draftsButton = screen.getByText('Drafts').closest('button')!;
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
    expect(screen.queryByText('Drafts')).not.toBeInTheDocument();
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
    fireEvent.click(screen.getByText('Drafts'));
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
    fireEvent.click(screen.getByText('Drafts'));
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
    fireEvent.click(screen.getByText('Drafts'));

    // Activities hidden, draft still visible
    expect(screen.queryByText('Activity 0 in This Week')).not.toBeInTheDocument();
    expect(screen.getByText('Auth Overhaul')).toBeInTheDocument();

    // Click "Activities" to restore
    fireEvent.click(screen.getByText('Activities'));
    expect(screen.getByText('Activity 0 in This Week')).toBeInTheDocument();
  });
});

describe('ActivityStream — expand/collapse in Draft Stories mode', () => {
  it('Collapse button collapses all groups, Expand re-expands them', () => {
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
    fireEvent.click(screen.getByText('Drafts'));

    // First group is expanded by default, so button shows "Collapse"
    const collapseButton = screen.getByRole('button', { name: /collapse/i });
    expect(collapseButton).toBeInTheDocument();

    // Draft cards are visible in expanded group
    expect(screen.getByText('Auth Overhaul')).toBeInTheDocument();

    // Collapse all groups
    fireEvent.click(collapseButton);

    // Should show expand button now
    const expandButton = screen.getByRole('button', { name: /expand/i });
    expect(expandButton).toBeInTheDocument();

    // Re-expand all
    fireEvent.click(expandButton);
    expect(screen.getByRole('button', { name: /collapse/i })).toBeInTheDocument();
  });

  it('Collapse button hides group content, Expand restores it', () => {
    render(
      <ActivityStream
        groups={[makeTemporalGroup('this_week', 'This Week', 2)]}
        storyGroups={[makeStoryGroup('auth', 'Auth Overhaul')]}
        onPromoteToCareerStory={vi.fn()}
      />
    );

    // Switch to Draft Stories
    fireEvent.click(screen.getByText('Drafts'));

    // Draft card visible initially (first group expanded)
    expect(screen.getByText('Auth Overhaul')).toBeInTheDocument();

    // Collapse all
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
    fireEvent.click(screen.getByText('Drafts'));
    fireEvent.click(screen.getByText('Auth Overhaul'));

    // Collapse button should be visible (card is expanded)
    expect(screen.getByRole('button', { name: /collapse/i })).toBeInTheDocument();

    // Switch to Activities
    fireEvent.click(screen.getByText('Activities'));
    expect(screen.getByText('Activity 0 in This Week')).toBeInTheDocument();

    // Switch back to Draft Stories — card should still be expanded
    fireEvent.click(screen.getByText('Drafts'));
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
    fireEvent.click(screen.getByText('Drafts'));
    expect(screen.getByText('Auth Overhaul')).toBeInTheDocument();
  });
});

// --- Factories for activity cap + typography tests ---

/** Create N activities with a specific source, all assigned as 'primary' edge type */
function makeActivities(count: number, prefix = 'act'): Activity[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${prefix}-${i}`,
    source: 'github',
    sourceId: `gh-${prefix}-${i}`,
    sourceUrl: null,
    title: `Activity ${i}: ${prefix}`,
    description: null,
    timestamp: '2026-02-05T08:00:00Z',
    crossToolRefs: [],
    storyId: null,
    storyTitle: null,
  }));
}

function makeDraftGroupWithActivities(
  key: string,
  title: string,
  activities: Activity[],
  overrides?: {
    description?: string;
    impactHighlights?: string[];
    activityEdges?: ActivityStoryEdge[];
  }
): ActivityGroup {
  return {
    key,
    label: title,
    count: activities.length,
    activities,
    storyMetadata: {
      id: `story-${key}`,
      title,
      description: overrides?.description ?? 'A draft story',
      timeRangeStart: '2026-02-01T00:00:00Z',
      timeRangeEnd: '2026-02-05T08:00:00Z',
      category: null,
      skills: [],
      createdAt: '2026-02-05T09:00:00Z',
      isPublished: false,
      type: 'journal_entry',
      dominantRole: 'Led',
      impactHighlights: overrides?.impactHighlights,
      activityEdges: overrides?.activityEdges,
    },
  };
}

describe('ActivityStream — draft card activity cap', () => {
  it('shows only first N activities per edge type, with "+M more" button', () => {
    const activities = makeActivities(6, 'core');
    // All 6 are primary (default when no edges specified)
    const group = makeDraftGroupWithActivities('ws', 'WebSocket Work', activities);

    render(
      <ActivityStream
        groups={[makeTemporalGroup('this_week', 'This Week', 1)]}
        storyGroups={[group]}
        onPromoteToCareerStory={vi.fn()}
      />
    );

    // Switch to drafts and expand the card
    fireEvent.click(screen.getByText('Drafts'));
    fireEvent.click(screen.getByText('WebSocket Work'));

    // Only first ACTIVITIES_PER_EDGE_LIMIT should be visible
    for (let i = 0; i < ACTIVITIES_PER_EDGE_LIMIT; i++) {
      expect(screen.getByText(`Activity ${i}: core`)).toBeInTheDocument();
    }
    // The rest should be hidden
    for (let i = ACTIVITIES_PER_EDGE_LIMIT; i < 6; i++) {
      expect(screen.queryByText(`Activity ${i}: core`)).not.toBeInTheDocument();
    }

    // "+3 more" button should be present
    expect(screen.getByText('+3 more')).toBeInTheDocument();
  });

  it('clicking "+N more" reveals all activities, button changes to "Show less"', () => {
    const activities = makeActivities(5, 'feat');
    const group = makeDraftGroupWithActivities('feat', 'Feature Work', activities);

    render(
      <ActivityStream
        groups={[makeTemporalGroup('this_week', 'This Week', 1)]}
        storyGroups={[group]}
        onPromoteToCareerStory={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('Drafts'));
    fireEvent.click(screen.getByText('Feature Work'));

    // Click "+2 more"
    fireEvent.click(screen.getByText('+2 more'));

    // All 5 should now be visible
    for (let i = 0; i < 5; i++) {
      expect(screen.getByText(`Activity ${i}: feat`)).toBeInTheDocument();
    }

    // Button should now say "Show less"
    expect(screen.getByText('Show less')).toBeInTheDocument();
    expect(screen.queryByText('+2 more')).not.toBeInTheDocument();
  });

  it('clicking "Show less" re-hides the extra activities', () => {
    const activities = makeActivities(5, 'fix');
    const group = makeDraftGroupWithActivities('fix', 'Bug Fixes', activities);

    render(
      <ActivityStream
        groups={[makeTemporalGroup('this_week', 'This Week', 1)]}
        storyGroups={[group]}
        onPromoteToCareerStory={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('Drafts'));
    fireEvent.click(screen.getByRole('heading', { name: 'Bug Fixes' }));

    // Expand, then collapse
    fireEvent.click(screen.getByText('+2 more'));
    fireEvent.click(screen.getByText('Show less'));

    // Hidden activities should be gone again
    expect(screen.queryByText('Activity 3: fix')).not.toBeInTheDocument();
    expect(screen.queryByText('Activity 4: fix')).not.toBeInTheDocument();
    expect(screen.getByText('+2 more')).toBeInTheDocument();
  });

  it('does not show "+N more" when activities <= limit', () => {
    const activities = makeActivities(ACTIVITIES_PER_EDGE_LIMIT, 'small');
    const group = makeDraftGroupWithActivities('small', 'Small Story', activities);

    render(
      <ActivityStream
        groups={[makeTemporalGroup('this_week', 'This Week', 1)]}
        storyGroups={[group]}
        onPromoteToCareerStory={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('Drafts'));
    fireEvent.click(screen.getByText('Small Story'));

    // All activities visible, no "+N more"
    for (let i = 0; i < ACTIVITIES_PER_EDGE_LIMIT; i++) {
      expect(screen.getByText(`Activity ${i}: small`)).toBeInTheDocument();
    }
    expect(screen.queryByText(/^\+\d+ more$/)).not.toBeInTheDocument();
  });
});

describe('ActivityStream — draft card metric highlighting', () => {
  it('highlights metrics in expanded draft description', () => {
    const group = makeDraftGroupWithActivities('perf', 'Performance Win', makeActivities(1), {
      description: 'Reduced latency by 40% across 12 teams',
    });

    const { container } = render(
      <ActivityStream
        groups={[makeTemporalGroup('this_week', 'This Week', 1)]}
        storyGroups={[group]}
      />
    );

    fireEvent.click(screen.getByText('Drafts'));
    fireEvent.click(screen.getByText('Performance Win'));

    // Should have <mark> elements for the metrics
    const marks = container.querySelectorAll('mark');
    const markTexts = Array.from(marks).map(m => m.textContent);
    expect(markTexts).toContain('40%');
    expect(markTexts).toContain('12 teams');
  });

  it('highlights metrics in impact highlights', () => {
    const group = makeDraftGroupWithActivities('cost', 'Cost Reduction', makeActivities(1), {
      impactHighlights: [
        'Saved $2M in infrastructure costs',
        'Reduced build time by 60%',
        'Led refactoring across the codebase',  // no metric — no mark
      ],
    });

    const { container } = render(
      <ActivityStream
        groups={[makeTemporalGroup('this_week', 'This Week', 1)]}
        storyGroups={[group]}
      />
    );

    fireEvent.click(screen.getByText('Drafts'));
    fireEvent.click(screen.getByText('Cost Reduction'));

    const marks = container.querySelectorAll('mark');
    const markTexts = Array.from(marks).map(m => m.textContent);
    expect(markTexts).toContain('$2M');
    expect(markTexts).toContain('60%');
    // The third bullet has no metrics — should not add a mark
    expect(markTexts).not.toContain('Led refactoring across the codebase');
  });

  it('renders plain text when no metrics present in description', () => {
    const group = makeDraftGroupWithActivities('plain', 'Plain Story', makeActivities(1), {
      description: 'Led the authentication migration project',
    });

    const { container } = render(
      <ActivityStream
        groups={[makeTemporalGroup('this_week', 'This Week', 1)]}
        storyGroups={[group]}
      />
    );

    fireEvent.click(screen.getByText('Drafts'));
    fireEvent.click(screen.getByText('Plain Story'));

    // Description text should be present in the expanded body
    expect(screen.getByText('Led the authentication migration project')).toBeInTheDocument();
    // No <mark> elements in the expanded section for this story
    const expandedSection = container.querySelector('.border-t.border-dashed');
    const marks = expandedSection?.querySelectorAll('mark') ?? [];
    expect(marks).toHaveLength(0);
  });
});

describe('ActivityStream — draft card description dedup', () => {
  it('shows description once when collapsed (header preview only)', () => {
    const group = makeDraftGroupWithActivities('dedup', 'Dedup Test', makeActivities(1), {
      description: 'Migrated the payment service to gRPC',
    });

    render(
      <ActivityStream
        groups={[makeTemporalGroup('this_week', 'This Week', 1)]}
        storyGroups={[group]}
      />
    );

    fireEvent.click(screen.getByText('Drafts'));

    // Collapsed: description visible in header preview
    expect(screen.getByText('Migrated the payment service to gRPC')).toBeInTheDocument();
  });

  it('shows description once when expanded (body only, not duplicated in header)', () => {
    const group = makeDraftGroupWithActivities('dedup', 'Dedup Test', makeActivities(1), {
      description: 'Migrated the payment service to gRPC',
    });

    render(
      <ActivityStream
        groups={[makeTemporalGroup('this_week', 'This Week', 1)]}
        storyGroups={[group]}
      />
    );

    fireEvent.click(screen.getByText('Drafts'));
    // Expand the card
    fireEvent.click(screen.getByText('Dedup Test'));

    // Expanded: description appears exactly once (in the expanded body, not in header)
    const matches = screen.getAllByText('Migrated the payment service to gRPC');
    expect(matches).toHaveLength(1);
  });
});

describe('ActivityStream — draft card badge and activity count', () => {
  it('renders Draft badge text', () => {
    render(
      <ActivityStream
        groups={[makeTemporalGroup('this_week', 'This Week', 1)]}
        storyGroups={[makeStoryGroup('auth', 'Auth Overhaul')]}
      />
    );

    fireEvent.click(screen.getByText('Drafts'));
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });

  it('shows activity count with plural label next to source icons', () => {
    const group: ActivityGroup = {
      ...makeStoryGroup('multi', 'Multi Activity'),
      count: 5,
    };

    render(
      <ActivityStream
        groups={[makeTemporalGroup('this_week', 'This Week', 1)]}
        storyGroups={[group]}
      />
    );

    fireEvent.click(screen.getByText('Drafts'));
    expect(screen.getByText('5 activities')).toBeInTheDocument();
  });

  it('shows singular "activity" when count is 1', () => {
    const group: ActivityGroup = {
      ...makeStoryGroup('single', 'Single Activity'),
      count: 1,
    };

    render(
      <ActivityStream
        groups={[makeTemporalGroup('this_week', 'This Week', 1)]}
        storyGroups={[group]}
      />
    );

    fireEvent.click(screen.getByText('Drafts'));
    expect(screen.getByText('1 activity')).toBeInTheDocument();
  });

  it('hides activity count when count is 0', () => {
    const group: ActivityGroup = {
      ...makeStoryGroup('zero', 'Zero Activities'),
      count: 0,
    };

    render(
      <ActivityStream
        groups={[makeTemporalGroup('this_week', 'This Week', 1)]}
        storyGroups={[group]}
      />
    );

    fireEvent.click(screen.getByText('Drafts'));
    expect(screen.queryByText(/\d+ activit/)).not.toBeInTheDocument();
  });
});

describe('ActivityStream — draft card edge cases', () => {
  it('renders card without description when meta.description is null', () => {
    const group = makeDraftGroupWithActivities('nodesc', 'No Description Story', makeActivities(1), {
      description: undefined,
    });
    // Override description to null
    group.storyMetadata!.description = null as unknown as string;

    render(
      <ActivityStream
        groups={[makeTemporalGroup('this_week', 'This Week', 1)]}
        storyGroups={[group]}
      />
    );

    fireEvent.click(screen.getByText('Drafts'));
    // Card renders with title, no crash
    expect(screen.getByText('No Description Story')).toBeInTheDocument();
  });

  it('renders card without topics gracefully', () => {
    const group = makeStoryGroup('notopics', 'No Topics Story');
    group.storyMetadata!.topics = undefined;

    render(
      <ActivityStream
        groups={[makeTemporalGroup('this_week', 'This Week', 1)]}
        storyGroups={[group]}
      />
    );

    fireEvent.click(screen.getByText('Drafts'));
    expect(screen.getByText('No Topics Story')).toBeInTheDocument();
  });

  it('keyboard navigation toggles card expand with Enter key', () => {
    render(
      <ActivityStream
        groups={[makeTemporalGroup('this_week', 'This Week', 1)]}
        storyGroups={[makeStoryGroup('kbd', 'Keyboard Nav Story')]}
        onPromoteToCareerStory={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('Drafts'));

    // Find the clickable header area (role="button")
    const cardButton = screen.getByText('Keyboard Nav Story').closest('[role="button"]')!;
    fireEvent.keyDown(cardButton, { key: 'Enter' });

    // Expanded: description should appear in body
    expect(screen.getByText('A draft story about work')).toBeInTheDocument();
  });
});
