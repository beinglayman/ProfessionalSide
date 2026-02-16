/**
 * ProfileViewPage Tab Tests
 *
 * Tests the V21 tab layout (Published, Draft Stories, Activity, Playbook)
 * and conditional rendering. Focused on tabs — doesn't test the entire profile page.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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

vi.mock('../../hooks/useMCP', () => ({
  useMCPIntegrations: () => ({ data: { integrations: [] }, isLoading: false }),
  useMCPIntegrationValidation: () => ({ data: null, isLoading: false }),
  useMCPOAuth: () => ({ mutate: vi.fn(), isPending: false }),
}));

// Stories mock — controlled per test
let mockStories: any[] = [];

vi.mock('../../hooks/useCareerStories', () => ({
  useListCareerStories: () => ({ data: { stories: mockStories } }),
  useActivities: () => ({ data: [] }),
  useSingleDerivations: () => ({ data: [] }),
  usePackets: () => ({ data: [] }),
  useStoryActivityMap: () => new Map(),
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

describe('ProfileViewPage — Tabs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStories = [];
  });

  it('renders all four tabs', () => {
    renderPage();

    expect(screen.getByText('Published')).toBeInTheDocument();
    expect(screen.getByText('Draft Stories')).toBeInTheDocument();
    expect(screen.getByText('Activity')).toBeInTheDocument();
    expect(screen.getByText('Playbook')).toBeInTheDocument();
  });

  it('defaults to Published tab with empty state when no stories', () => {
    renderPage();

    expect(screen.getByText(/No published stories yet/)).toBeInTheDocument();
  });

  it('shows published story title in Published tab', () => {
    mockStories = [
      { id: 's1', isPublished: true, title: 'Published Story', framework: 'STAR', sections: { situation: { summary: 'test' } }, activityIds: ['a1'], generatedAt: '2026-01-10T00:00:00Z', visibility: 'network', publishedAt: '2026-01-15T00:00:00Z', needsRegeneration: false, category: 'projects-impact' },
    ];
    renderPage();

    expect(screen.getByText('Published Story')).toBeInTheDocument();
  });

  it('shows draft stories empty state after switching tab', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByText('Draft Stories'));

    expect(screen.getByText(/No draft stories/)).toBeInTheDocument();
  });

  it('shows draft story in Draft Stories tab', async () => {
    const user = userEvent.setup();
    mockStories = [
      { id: 's1', isPublished: false, title: 'My Draft', framework: 'STAR', sections: {}, activityIds: [], generatedAt: '2026-01-10T00:00:00Z', visibility: 'private', publishedAt: null, needsRegeneration: false },
    ];
    renderPage();

    await user.click(screen.getByText('Draft Stories'));

    expect(screen.getByText('My Draft')).toBeInTheDocument();
  });

  it('switches between tabs', async () => {
    const user = userEvent.setup();
    renderPage();

    // Default: Published tab shows empty state
    expect(screen.getByText(/No published stories yet/)).toBeInTheDocument();

    // Switch to Draft Stories
    await user.click(screen.getByText('Draft Stories'));
    expect(screen.getByText(/No draft stories/)).toBeInTheDocument();

    // Switch back to Published
    await user.click(screen.getByText('Published'));
    expect(screen.getByText(/No published stories yet/)).toBeInTheDocument();
  });

  it('shows tab counts', () => {
    mockStories = [
      { id: 's1', isPublished: true, title: 'Pub Story', framework: 'STAR', sections: { situation: { summary: 'test' } }, activityIds: [], generatedAt: '2026-01-10T00:00:00Z', visibility: 'network', publishedAt: '2026-01-15T00:00:00Z', needsRegeneration: false },
      { id: 's2', isPublished: false, title: 'Draft Story', framework: 'STAR', sections: {}, activityIds: [], generatedAt: '2026-01-10T00:00:00Z', visibility: 'private', publishedAt: null, needsRegeneration: false },
    ];
    renderPage();

    // Published count = 1, Draft count = 1
    // The count badges render as spans inside the tab buttons
    const publishedTab = screen.getByText('Published').closest('button')!;
    expect(publishedTab).toHaveTextContent('1');

    const draftsTab = screen.getByText('Draft Stories').closest('button')!;
    expect(draftsTab).toHaveTextContent('1');
  });
});
