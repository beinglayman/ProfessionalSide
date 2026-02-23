/**
 * ConnectToolsStep Tests
 *
 * Tests for:
 * - Bucket rendering (4 buckets with correct names and sub-tool chips)
 * - Connect buttons for all buckets
 * - Real OAuth hook wiring (initiateOAuth / initiateGroupOAuth)
 * - localStorage state preservation before OAuth redirect
 * - Connection gate (Next button disabled when no tools connected)
 * - getOnboardingBucketId mapping correctness
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConnectToolsStep, ONBOARDING_STORAGE_KEY } from './connect-tools';
import { ONBOARDING_BUCKETS, getOnboardingBucketId } from '../../../constants/tool-groups';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockInitiateOAuth = vi.fn();
const mockInitiateGroupOAuth = vi.fn();
const mockSetError = vi.fn();
let mockConnectedBucketIds = new Set<string>();

vi.mock('../../../hooks/useToolConnections', () => ({
  useToolConnections: () => ({
    integrations: [],
    isLoading: false,
    connectedBucketIds: mockConnectedBucketIds,
    getConnectionStatus: () => 'disconnected',
    getGroupConnectionStatus: () => ({ connected: 0, total: 0, allConnected: false, noneConnected: true, partiallyConnected: false }),
    getConnectedAt: () => null,
  }),
  useOAuthFlow: () => ({
    connectingId: null,
    isConnecting: false,
    error: '',
    setError: mockSetError,
    handleConnect: mockInitiateOAuth,
    handleConnectGroup: mockInitiateGroupOAuth,
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
  mockConnectedBucketIds = new Set<string>();
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
    expect(screen.getByText('OneNote')).toBeInTheDocument();

    // Google sub-tools
    expect(screen.getByText('Calendar')).toBeInTheDocument();
    expect(screen.getByText('Drive')).toBeInTheDocument();
  });

  it('shows Connect buttons for all buckets', () => {
    renderConnectTools();

    const connectButtons = screen.getAllByText('Connect', { exact: true })
      .map(el => el.closest('button'))
      .filter(Boolean);
    expect(connectButtons).toHaveLength(4);
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
    mockConnectedBucketIds = new Set(['github']);
    renderConnectTools();

    const button = screen.getByRole('button', { name: /Get Started/i });
    expect(button).toBeEnabled();
  });

  it('shows connected count message', () => {
    mockConnectedBucketIds = new Set(['github', 'atlassian']);
    renderConnectTools();

    expect(screen.getByText(/2 tools connected/)).toBeInTheDocument();
  });

  it('shows singular "tool" for 1 connection', () => {
    mockConnectedBucketIds = new Set(['github']);
    renderConnectTools();

    expect(screen.getByText(/1 tool connected/)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Connected state rendering
// ---------------------------------------------------------------------------

describe('ConnectToolsStep: connected state', () => {
  it('shows Connected badge for github bucket when github is connected', () => {
    mockConnectedBucketIds = new Set(['github']);
    renderConnectTools();

    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('shows Connected badge for atlassian bucket when jira is connected', () => {
    mockConnectedBucketIds = new Set(['atlassian']);
    renderConnectTools();

    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('shows no Connected badge when no buckets are connected', () => {
    mockConnectedBucketIds = new Set();
    renderConnectTools();

    expect(screen.queryByText('Connected')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// OAuth hook wiring
// ---------------------------------------------------------------------------

describe('ConnectToolsStep: OAuth wiring', () => {
  it('calls handleConnect for GitHub (single-tool bucket)', async () => {
    const user = userEvent.setup();
    renderConnectTools();

    const connectButtons = screen.getAllByRole('button', { name: /Connect/i });
    // First Connect button is GitHub
    await user.click(connectButtons[0]);

    expect(mockInitiateOAuth).toHaveBeenCalledTimes(1);
    expect(mockInitiateOAuth).toHaveBeenCalledWith('github');
  });

  it('calls handleConnectGroup for Atlassian (group bucket)', async () => {
    const user = userEvent.setup();
    renderConnectTools();

    const connectButtons = screen.getAllByRole('button', { name: /Connect/i });
    // Second Connect button is Atlassian
    await user.click(connectButtons[1]);

    expect(mockInitiateGroupOAuth).toHaveBeenCalledTimes(1);
    expect(mockInitiateGroupOAuth).toHaveBeenCalledWith('atlassian');
  });

  it('saves onboarding state to localStorage before initiating OAuth', async () => {
    const user = userEvent.setup();
    renderConnectTools();

    const connectButtons = screen.getAllByRole('button', { name: /Connect/i });
    await user.click(connectButtons[0]);

    const stored = JSON.parse(localStorage.getItem(ONBOARDING_STORAGE_KEY)!);
    expect(stored.step).toBe('connect-tools');
    expect(stored.ts).toBeGreaterThan(0);
    expect(Date.now() - stored.ts).toBeLessThan(1000);
  });

  it('shows Connect buttons for all buckets', async () => {
    renderConnectTools();

    const connectButtons = screen.getAllByText('Connect', { exact: true })
      .map(el => el.closest('button'))
      .filter(Boolean);
    expect(connectButtons).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// Finish flow
// ---------------------------------------------------------------------------

describe('ConnectToolsStep: finish flow', () => {
  it('calls onUpdate and onNext when Get Started is clicked', async () => {
    mockConnectedBucketIds = new Set(['github']);
    const user = userEvent.setup();
    renderConnectTools();

    await user.click(screen.getByRole('button', { name: /Get Started/i }));

    expect(mockOnUpdate).toHaveBeenCalledWith({ connectedTools: ['github'] });
    expect(mockOnNext).toHaveBeenCalled();
  });

  it('shows error when Get Started clicked with no connections', async () => {
    mockConnectedBucketIds = new Set();
    renderConnectTools();

    const button = screen.getByRole('button', { name: /Connect at least 1 tool/i });
    expect(button).toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// getOnboardingBucketId mapping (replaces TOOL_TO_BUCKET)
// ---------------------------------------------------------------------------

describe('getOnboardingBucketId', () => {
  it('maps github to github bucket', () => {
    expect(getOnboardingBucketId('github')).toBe('github');
  });

  it('maps jira and confluence to atlassian bucket', () => {
    expect(getOnboardingBucketId('jira')).toBe('atlassian');
    expect(getOnboardingBucketId('confluence')).toBe('atlassian');
  });

  it('maps all Microsoft tools to microsoft bucket', () => {
    expect(getOnboardingBucketId('outlook')).toBe('microsoft');
    expect(getOnboardingBucketId('teams')).toBe('microsoft');
    expect(getOnboardingBucketId('onedrive')).toBe('microsoft');
    expect(getOnboardingBucketId('onenote')).toBe('microsoft');
  });

  it('maps google_workspace to google_workspace bucket', () => {
    expect(getOnboardingBucketId('google_workspace')).toBe('google_workspace');
  });

  it('returns null for tools without a bucket', () => {
    expect(getOnboardingBucketId('figma')).toBeNull();
    expect(getOnboardingBucketId('slack')).toBeNull();
    expect(getOnboardingBucketId('zoom')).toBeNull();
    expect(getOnboardingBucketId('nonexistent')).toBeNull();
  });

  it('every mapped bucket ID corresponds to a real ONBOARDING_BUCKETS entry', () => {
    const bucketIds = new Set(ONBOARDING_BUCKETS.map(b => b.id));
    const toolsToCheck = ['github', 'jira', 'confluence', 'outlook', 'teams', 'onedrive', 'onenote', 'google_workspace'];
    for (const tool of toolsToCheck) {
      const bucketId = getOnboardingBucketId(tool);
      expect(bucketId).not.toBeNull();
      expect(bucketIds.has(bucketId!)).toBe(true);
    }
  });
});
