/**
 * MCPCallbackPage Tests
 *
 * Tests for:
 * - Onboarding return detection (fresh localStorage → redirect to /onboarding)
 * - Default redirect (no localStorage → redirect to /settings)
 * - Stale localStorage ignored (>15 min old)
 * - Malformed localStorage handled gracefully
 * - localStorage cleanup after use
 * - Error state rendering
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ONBOARDING_STORAGE_KEY } from '../onboarding/steps/connect-tools';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockCaptureOAuthError = vi.fn();
const mockOpenConsole = vi.fn();

vi.mock('../../contexts/ErrorConsoleContext', () => ({
  useErrorConsole: () => ({
    captureOAuthError: mockCaptureOAuthError,
    openConsole: mockOpenConsole,
  }),
}));

// Lazy import so mocks are registered first
let MCPCallbackPage: React.ComponentType;

beforeEach(async () => {
  vi.clearAllMocks();
  vi.useFakeTimers({ shouldAdvanceTime: true });
  localStorage.clear();
  // Dynamic import to ensure mocks are in place
  const mod = await import('./callback');
  MCPCallbackPage = mod.MCPCallbackPage;
});

afterEach(() => {
  vi.useRealTimers();
});

function renderCallback(searchParams: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/mcp/callback${searchParams}`]}>
        <MCPCallbackPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

// ---------------------------------------------------------------------------
// Success: onboarding return detection
// ---------------------------------------------------------------------------

describe('MCPCallbackPage: onboarding return', () => {
  it('redirects to /onboarding when fresh onboarding-oauth-return exists', async () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify({
      step: 'connect-tools',
      ts: Date.now(),
    }));

    renderCallback('?success=true&tool=github');

    await waitFor(() => {
      expect(screen.getByText(/Successfully connected Github/)).toBeInTheDocument();
      expect(screen.getByText(/Redirecting to onboarding/)).toBeInTheDocument();
    });

    // Advance past redirect delay
    vi.advanceTimersByTime(2500);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        '/onboarding',
        { state: { returnToStep: 'connect-tools' } }
      );
    });
  });

  it('redirects to /settings when no onboarding-oauth-return exists', async () => {
    renderCallback('?success=true&tool=github');

    await waitFor(() => {
      expect(screen.getByText(/Successfully connected Github/)).toBeInTheDocument();
      expect(screen.getByText(/Redirecting to settings/)).toBeInTheDocument();
    });

    vi.advanceTimersByTime(2500);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        '/settings',
        { state: { tab: 'integrations' } }
      );
    });
  });

  it('ignores stale onboarding-oauth-return (>15 min old)', async () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify({
      step: 'connect-tools',
      ts: Date.now() - 16 * 60 * 1000, // 16 min ago
    }));

    renderCallback('?success=true&tool=github');

    await waitFor(() => {
      expect(screen.getByText(/Redirecting to settings/)).toBeInTheDocument();
    });

    vi.advanceTimersByTime(2500);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        '/settings',
        { state: { tab: 'integrations' } }
      );
    });
  });

  it('cleans up localStorage after use (fresh)', async () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify({
      step: 'connect-tools',
      ts: Date.now(),
    }));

    renderCallback('?success=true&tool=github');

    await waitFor(() => {
      expect(localStorage.getItem(ONBOARDING_STORAGE_KEY)).toBeNull();
    });
  });

  it('cleans up localStorage after use (stale)', async () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify({
      step: 'connect-tools',
      ts: Date.now() - 20 * 60 * 1000,
    }));

    renderCallback('?success=true&tool=github');

    await waitFor(() => {
      expect(localStorage.getItem(ONBOARDING_STORAGE_KEY)).toBeNull();
    });
  });

  it('handles malformed localStorage gracefully (falls through to settings)', async () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, 'not-valid-json{{{');

    renderCallback('?success=true&tool=github');

    await waitFor(() => {
      expect(screen.getByText(/Redirecting to settings/)).toBeInTheDocument();
    });

    vi.advanceTimersByTime(2500);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        '/settings',
        { state: { tab: 'integrations' } }
      );
    });

    // Should have been cleaned up
    expect(localStorage.getItem(ONBOARDING_STORAGE_KEY)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Success: multi-tool
// ---------------------------------------------------------------------------

describe('MCPCallbackPage: multi-tool success', () => {
  it('shows combined tool names for group OAuth', async () => {
    renderCallback('?success=true&tools=jira,confluence');

    await waitFor(() => {
      expect(screen.getByText(/Successfully connected Jira and Confluence/)).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Error states
// ---------------------------------------------------------------------------

describe('MCPCallbackPage: error handling', () => {
  it('shows error message for known error codes', async () => {
    renderCallback('?error=access_denied');

    await waitFor(() => {
      expect(screen.getByText('Connection Failed')).toBeInTheDocument();
      expect(screen.getByText('Access was denied by the user or organization')).toBeInTheDocument();
    });
  });

  it('shows generic error for unknown error codes', async () => {
    renderCallback('?error=some_new_error');

    await waitFor(() => {
      expect(screen.getByText('Authorization failed: some_new_error')).toBeInTheDocument();
    });
  });

  it('captures OAuth error to error console', async () => {
    renderCallback('?error=callback_failed&tool=github');

    await waitFor(() => {
      expect(mockCaptureOAuthError).toHaveBeenCalledWith(
        'github',
        'callback_failed',
        expect.stringContaining('callback_failed')
      );
    });
  });

  it('shows error when neither success nor error param present', async () => {
    renderCallback('?random=param');

    await waitFor(() => {
      expect(screen.getByText('Connection Failed')).toBeInTheDocument();
      expect(screen.getByText('Missing required authorization parameters')).toBeInTheDocument();
    });
  });
});
