/**
 * ProfileViewPage Timeline Toggle Tests
 *
 * Tests the Timeline / Category segmented toggle and conditional rendering.
 * Focused on the new toggle feature — doesn't test the entire profile page.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ProfileViewPage } from './view';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockProfile = {
  name: 'Test User',
  title: 'Engineer',
  avatar: null,
  bio: null,
  location: null,
  company: null,
  industry: null,
  yearsOfExperience: null,
  specializations: [],
  careerHighlights: null,
  careerGoals: [],
  professionalInterests: [],
  workExperiences: [],
  education: [],
  certifications: [],
  topSkills: [],
  onboardingData: null,
};

vi.mock('../../hooks/useProfile', () => ({
  useProfile: () => ({
    profile: mockProfile,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('../../hooks/useDocumentTitle', () => ({
  useDocumentTitle: vi.fn(),
}));

vi.mock('../../utils/avatar', () => ({
  getAvatarUrl: () => '/avatar.png',
  handleAvatarError: vi.fn(),
}));

vi.mock('../../hooks/usePublicProfile', () => ({
  useFollowCounts: () => ({ data: null }),
}));

// Stories mock — controlled per test
let mockStories: any[] = [];
let mockActivities: any[] = [];

vi.mock('../../hooks/useCareerStories', () => ({
  useListCareerStories: () => ({ data: { stories: mockStories } }),
  useStoryActivityMap: () => {
    const map = new Map();
    for (const a of mockActivities) map.set(a.id, a);
    return map;
  },
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <ProfileViewPage />
    </MemoryRouter>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ProfileViewPage — Timeline Toggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStories = [];
    mockActivities = [];
  });

  it('hides toggle when no published stories', () => {
    mockStories = [
      { id: 's1', isPublished: false, title: 'Draft', framework: 'STAR', sections: {}, activityIds: [], generatedAt: '2026-01-10T00:00:00Z', visibility: 'private', publishedAt: null, needsRegeneration: false },
    ];
    renderPage();

    expect(screen.queryByText('Timeline')).not.toBeInTheDocument();
    expect(screen.queryByText('Category')).not.toBeInTheDocument();
  });

  it('shows toggle when published stories exist', () => {
    mockStories = [
      { id: 's1', isPublished: true, title: 'Published Story', framework: 'STAR', sections: { situation: { summary: 'test' } }, activityIds: ['a1'], generatedAt: '2026-01-10T00:00:00Z', visibility: 'network', publishedAt: '2026-01-15T00:00:00Z', needsRegeneration: false, category: 'projects-impact' },
    ];
    mockActivities = [
      { id: 'a1', timestamp: '2026-01-10T00:00:00Z', source: 'github', sourceId: 'src-1', sourceUrl: null, title: 'PR #123', description: null, userId: 'user-1', clusterId: null, crossToolRefs: [], rawData: null, createdAt: '2026-01-10T00:00:00Z', updatedAt: '2026-01-10T00:00:00Z' },
    ];
    renderPage();

    expect(screen.getByText('Timeline')).toBeInTheDocument();
    expect(screen.getByText('Category')).toBeInTheDocument();
  });

  it('defaults to timeline view', () => {
    mockStories = [
      { id: 's1', isPublished: true, title: 'My Story', framework: 'STAR', sections: { situation: { summary: 'test' } }, activityIds: ['a1'], generatedAt: '2026-01-10T00:00:00Z', visibility: 'network', publishedAt: '2026-01-15T00:00:00Z', needsRegeneration: false, category: 'projects-impact' },
    ];
    mockActivities = [
      { id: 'a1', timestamp: '2026-01-10T00:00:00Z', source: 'github', sourceId: 'src-1', sourceUrl: null, title: 'PR', description: null, userId: 'user-1', clusterId: null, crossToolRefs: [], rawData: null, createdAt: '2026-01-10T00:00:00Z', updatedAt: '2026-01-10T00:00:00Z' },
    ];
    renderPage();

    const timelineBtn = screen.getByText('Timeline');
    expect(timelineBtn.closest('button')).toHaveAttribute('aria-pressed', 'true');

    const categoryBtn = screen.getByText('Category');
    expect(categoryBtn.closest('button')).toHaveAttribute('aria-pressed', 'false');
  });

  it('switches to category view on click', async () => {
    const user = userEvent.setup();
    mockStories = [
      { id: 's1', isPublished: true, title: 'Story One', framework: 'STAR', sections: { situation: { summary: 'test' } }, activityIds: ['a1'], generatedAt: '2026-01-10T00:00:00Z', visibility: 'network', publishedAt: '2026-01-15T00:00:00Z', needsRegeneration: false, category: 'projects-impact' },
    ];
    mockActivities = [
      { id: 'a1', timestamp: '2026-01-10T00:00:00Z', source: 'github', sourceId: 'src-1', sourceUrl: null, title: 'PR', description: null, userId: 'user-1', clusterId: null, crossToolRefs: [], rawData: null, createdAt: '2026-01-10T00:00:00Z', updatedAt: '2026-01-10T00:00:00Z' },
    ];
    renderPage();

    await user.click(screen.getByText('Category'));

    // Category view shows brag doc category labels
    expect(screen.getByText('Projects & Impact')).toBeInTheDocument();
    expect(screen.getByText('Leadership & Collaboration')).toBeInTheDocument();
    expect(screen.getByText('Growth & Learning')).toBeInTheDocument();
    expect(screen.getByText('External')).toBeInTheDocument();
  });

  it('shows quarter label in timeline view', () => {
    mockStories = [
      { id: 's1', isPublished: true, title: 'Q1 Story', framework: 'STAR', sections: { situation: { summary: 'test' } }, activityIds: ['a1'], generatedAt: '2026-01-10T00:00:00Z', visibility: 'network', publishedAt: '2026-01-15T00:00:00Z', needsRegeneration: false, category: 'projects-impact' },
    ];
    mockActivities = [
      { id: 'a1', timestamp: '2026-01-10T00:00:00Z', source: 'github', sourceId: 'src-1', sourceUrl: null, title: 'PR', description: null, userId: 'user-1', clusterId: null, crossToolRefs: [], rawData: null, createdAt: '2026-01-10T00:00:00Z', updatedAt: '2026-01-10T00:00:00Z' },
    ];
    renderPage();

    expect(screen.getByText('Q1 2026')).toBeInTheDocument();
  });

  it('shows empty timeline placeholder when no published stories', () => {
    mockStories = [];
    renderPage();

    // Timeline view is default; should show empty state
    expect(screen.getByText(/No published stories yet/)).toBeInTheDocument();
  });

  it('switches back to timeline from category', async () => {
    const user = userEvent.setup();
    mockStories = [
      { id: 's1', isPublished: true, title: 'Story', framework: 'STAR', sections: { situation: { summary: 'test' } }, activityIds: ['a1'], generatedAt: '2026-01-10T00:00:00Z', visibility: 'network', publishedAt: '2026-01-15T00:00:00Z', needsRegeneration: false, category: 'projects-impact' },
    ];
    mockActivities = [
      { id: 'a1', timestamp: '2026-01-10T00:00:00Z', source: 'github', sourceId: 'src-1', sourceUrl: null, title: 'PR', description: null, userId: 'user-1', clusterId: null, crossToolRefs: [], rawData: null, createdAt: '2026-01-10T00:00:00Z', updatedAt: '2026-01-10T00:00:00Z' },
    ];
    renderPage();

    // Switch to category, then back
    await user.click(screen.getByText('Category'));
    expect(screen.getByText('Projects & Impact')).toBeInTheDocument();

    await user.click(screen.getByText('Timeline'));
    expect(screen.getByText('Q1 2026')).toBeInTheDocument();
  });
});
