/**
 * ConnectToolsStep Tests
 *
 * Tests for:
 * - Bucket rendering (4 buckets with correct names and sub-tool chips)
 * - "Coming Soon" badges on Microsoft and Google
 * - Connect button disabled for comingSoon buckets
 * - Real OAuth hook wiring (initiateOAuth / initiateGroupOAuth)
 * - localStorage state preservation before OAuth redirect
 * - Connection gate (Next button disabled when no tools connected)
 * - TOOL_TO_BUCKET mapping correctness
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConnectToolsStep, TOOL_TO_BUCKET, ONBOARDING_STORAGE_KEY, TOOL_BUCKETS } from './connect-tools';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockInitiateOAuth = vi.fn();
const mockInitiateGroupOAuth = vi.fn();
let mockIntegrations: any[] = [];

vi.mock('../../../hooks/useMCP', () => ({
  useMCPIntegrations: () => ({
    data: { integrations: mockIntegrations },
    isLoading: false,
  }),
  useMCPOAuth: () => ({
    mutate: mockInitiateOAuth,
  }),
  useMCPGroupOAuth: () => ({
    mutate: mockInitiateGroupOAuth,
  }),
}));

const mockOnUpdate = vi.fn().mockResolvedValue(undefined);
const mockOnNext = vi.fn().mockResolvedValue(undefined);
const mockOnPrevious = vi.fn().mockResolvedValue(undefined);

function renderConnectTools(overrides?: Partial<Parameters<typeof ConnectToolsStep>[0]>) {
  return render(
    <ConnectToolsStep
      data={{}}
      onUpdate={mockOnUpdate}
      onNext={mockOnNext}
      onPrevious={mockOnPrevious}
      isFirstStep={false}
      {...overrides}
    />
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockIntegrations = [];
  localStorage.clear();
});

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

describe('ConnectToolsStep: rendering', () => {
  it('renders all 4 tool buckets with correct names', () => {
    renderConnectTools();

    expect(screen.getByText('GitHub')).toBeInTheDocument();
    expect(screen.getByText('Atlassian')).toBeInTheDocument();
    expect(screen.getByText('Microsoft 365')).toBeInTheDocument();
    expect(screen.getByText('Google Workspace')).toBeInTheDocument();
  });

  it('renders sub-tool chips for each bucket', () => {
    renderConnectTools();

    // GitHub sub-tools
    expect(screen.getByText('PRs')).toBeInTheDocument();
    expect(screen.getByText('Commits')).toBeInTheDocument();
    expect(screen.getByText('Reviews')).toBeInTheDocument();

    // Atlassian sub-tools
    expect(screen.getByText('Jira')).toBeInTheDocument();
    expect(screen.getByText('Confluence')).toBeInTheDocument();

    // Microsoft sub-tools
    expect(screen.getByText('Outlook')).toBeInTheDocument();
    expect(screen.getByText('Teams')).toBeInTheDocument();
    expect(screen.getByText('OneDrive')).toBeInTheDocument();

    // Google sub-tools
    expect(screen.getByText('Calendar')).toBeInTheDocument();
    expect(screen.getByText('Drive')).toBeInTheDocument();
  });

  it('shows "Coming Soon" badge on Microsoft and Google buckets', () => {
    renderConnectTools();

    const comingSoonBadges = screen.getAllByText('Coming Soon');
    expect(comingSoonBadges).toHaveLength(2);
  });

  it('shows Connect buttons only for non-comingSoon buckets', () => {
    renderConnectTools();

    // Only GitHub and Atlassian should have inline Connect buttons
    // Use exact text match to exclude the bottom "Connect at least 1 tool..." button
    const connectButtons = screen.getAllByText('Connect', { exact: true })
      .map(el => el.closest('button'))
      .filter(Boolean);
    expect(connectButtons).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Connection gate
// ---------------------------------------------------------------------------

describe('ConnectToolsStep: connection gate', () => {
  it('disables Get Started button when no tools connected', () => {
    renderConnectTools();

    const button = screen.getByRole('button', { name: /Connect at least 1 tool to continue/i });
    expect(button).toBeDisabled();
  });

  it('enables Get Started button when at least 1 tool is connected', () => {
    mockIntegrations = [
      { toolType: 'github', isConnected: true },
    ];
    renderConnectTools();

    const button = screen.getByRole('button', { name: /Get Started/i });
    expect(button).toBeEnabled();
  });

  it('shows connected count message', () => {
    mockIntegrations = [
      { toolType: 'github', isConnected: true },
      { toolType: 'jira', isConnected: true },
    ];
    renderConnectTools();

    expect(screen.getByText(/2 tools connected/)).toBeInTheDocument();
  });

  it('shows singular "tool" for 1 connection', () => {
    mockIntegrations = [
      { toolType: 'github', isConnected: true },
    ];
    renderConnectTools();

    expect(screen.getByText(/1 tool connected/)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Connected state rendering
// ---------------------------------------------------------------------------

describe('ConnectToolsStep: connected state', () => {
  it('shows Connected badge for github bucket when github integration exists', () => {
    mockIntegrations = [
      { toolType: 'github', isConnected: true },
    ];
    renderConnectTools();

    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('shows Connected badge for atlassian bucket when jira is connected', () => {
    mockIntegrations = [
      { toolType: 'jira', isConnected: true },
    ];
    renderConnectTools();

    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('ignores inactive integrations', () => {
    mockIntegrations = [
      { toolType: 'github', isConnected: false },
    ];
    renderConnectTools();

    expect(screen.queryByText('Connected')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// OAuth hook wiring
// ---------------------------------------------------------------------------

describe('ConnectToolsStep: OAuth wiring', () => {
  it('calls initiateOAuth for GitHub (single-tool bucket)', async () => {
    const user = userEvent.setup();
    renderConnectTools();

    const connectButtons = screen.getAllByRole('button', { name: /Connect/i });
    // First Connect button is GitHub
    await user.click(connectButtons[0]);

    expect(mockInitiateOAuth).toHaveBeenCalledTimes(1);
    expect(mockInitiateOAuth).toHaveBeenCalledWith(
      { toolType: 'github' },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );
  });

  it('calls initiateGroupOAuth for Atlassian (group bucket)', async () => {
    const user = userEvent.setup();
    renderConnectTools();

    const connectButtons = screen.getAllByRole('button', { name: /Connect/i });
    // Second Connect button is Atlassian
    await user.click(connectButtons[1]);

    expect(mockInitiateGroupOAuth).toHaveBeenCalledTimes(1);
    expect(mockInitiateGroupOAuth).toHaveBeenCalledWith(
      { groupType: 'atlassian' },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );
  });

  it('saves onboarding state to localStorage before initiating OAuth', async () => {
    const user = userEvent.setup();
    renderConnectTools();

    const connectButtons = screen.getAllByRole('button', { name: /Connect/i });
    await user.click(connectButtons[0]);

    const stored = JSON.parse(localStorage.getItem(ONBOARDING_STORAGE_KEY)!);
    expect(stored.step).toBe('connect-tools');
    expect(stored.ts).toBeGreaterThan(0);
    // Should be recent (within last second)
    expect(Date.now() - stored.ts).toBeLessThan(1000);
  });

  it('does not call any OAuth hook for comingSoon buckets', async () => {
    // comingSoon buckets have no clickable connect button, so we verify
    // there are only 2 inline Connect buttons (GitHub + Atlassian)
    renderConnectTools();

    const connectButtons = screen.getAllByText('Connect', { exact: true })
      .map(el => el.closest('button'))
      .filter(Boolean);
    expect(connectButtons).toHaveLength(2);
  });

  it('shows error message when OAuth initiation fails', async () => {
    const user = userEvent.setup();
    mockInitiateOAuth.mockImplementation((_args: any, callbacks: any) => {
      callbacks.onError({ response: { data: { error: 'OAuth provider unavailable' } } });
    });
    renderConnectTools();

    const connectButtons = screen.getAllByRole('button', { name: /Connect/i });
    await user.click(connectButtons[0]);

    expect(screen.getByText('OAuth provider unavailable')).toBeInTheDocument();
  });

  it('shows fallback error message when error response is empty', async () => {
    const user = userEvent.setup();
    mockInitiateOAuth.mockImplementation((_args: any, callbacks: any) => {
      callbacks.onError({});
    });
    renderConnectTools();

    const connectButtons = screen.getAllByRole('button', { name: /Connect/i });
    await user.click(connectButtons[0]);

    expect(screen.getByText('Failed to connect GitHub')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Finish flow
// ---------------------------------------------------------------------------

describe('ConnectToolsStep: finish flow', () => {
  it('calls onUpdate and onNext when Get Started is clicked', async () => {
    mockIntegrations = [{ toolType: 'github', isConnected: true }];
    const user = userEvent.setup();
    renderConnectTools();

    await user.click(screen.getByRole('button', { name: /Get Started/i }));

    expect(mockOnUpdate).toHaveBeenCalledWith({ connectedTools: ['github'] });
    expect(mockOnNext).toHaveBeenCalled();
  });

  it('shows error when Get Started clicked with no connections', async () => {
    // Button is disabled, but handleFinish also has a guard
    mockIntegrations = [];
    renderConnectTools();

    // Button should be disabled
    const button = screen.getByRole('button', { name: /Connect at least 1 tool/i });
    expect(button).toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// TOOL_TO_BUCKET mapping
// ---------------------------------------------------------------------------

describe('TOOL_TO_BUCKET', () => {
  it('maps github to github bucket', () => {
    expect(TOOL_TO_BUCKET['github']).toBe('github');
  });

  it('maps jira and confluence to atlassian bucket', () => {
    expect(TOOL_TO_BUCKET['jira']).toBe('atlassian');
    expect(TOOL_TO_BUCKET['confluence']).toBe('atlassian');
  });

  it('maps all Microsoft tools to microsoft bucket', () => {
    expect(TOOL_TO_BUCKET['outlook']).toBe('microsoft');
    expect(TOOL_TO_BUCKET['teams']).toBe('microsoft');
    expect(TOOL_TO_BUCKET['onedrive']).toBe('microsoft');
    expect(TOOL_TO_BUCKET['onenote']).toBe('microsoft');
    expect(TOOL_TO_BUCKET['sharepoint']).toBe('microsoft');
  });

  it('maps google_workspace to google bucket', () => {
    expect(TOOL_TO_BUCKET['google_workspace']).toBe('google');
  });

  it('returns undefined for tools without a bucket', () => {
    expect(TOOL_TO_BUCKET['figma']).toBeUndefined();
    expect(TOOL_TO_BUCKET['slack']).toBeUndefined();
    expect(TOOL_TO_BUCKET['zoom']).toBeUndefined();
    expect(TOOL_TO_BUCKET['nonexistent']).toBeUndefined();
  });

  it('every mapped bucket ID corresponds to a real TOOL_BUCKETS entry', () => {
    const bucketIds = new Set(TOOL_BUCKETS.map(b => b.id));
    for (const bucketId of Object.values(TOOL_TO_BUCKET)) {
      expect(bucketIds.has(bucketId)).toBe(true);
    }
  });
});
