/**
 * MCPCallbackPage Tests
 *
 * Tests the post-OAuth callback page behavior:
 * - Success flow: navigates to /timeline, sets sync-in-progress, fires background sync
 * - Error flow: displays error messages, captures to error console
 * - Missing params: shows missing parameters error
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ONBOARDING_STORAGE_KEY } from '../onboarding/steps/connect-tools';
import { SYNC_IN_PROGRESS_KEY } from '../../constants/sync';

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

const mockRunLiveSync = vi.fn().mockResolvedValue(undefined);
const mockSetLastSyncAt = vi.fn();

vi.mock('../../services/sync.service', () => ({
  runLiveSync: (...args: unknown[]) => mockRunLiveSync(...args),
  setLastSyncAt: () => mockSetLastSyncAt(),
}));

// Lazy import so mocks are registered first
let MCPCallbackPage: React.ComponentType;

beforeEach(async () => {
  vi.clearAllMocks();
  vi.useFakeTimers({ shouldAdvanceTime: true });
  localStorage.clear();
  sessionStorage.clear();
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

  // Spy on invalidateQueries so we can assert it was called
  const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/mcp/callback${searchParams}`]}>
        <MCPCallbackPage />
      </MemoryRouter>
    </QueryClientProvider>
  );

  return { queryClient, invalidateSpy };
}

// ---------------------------------------------------------------------------
// Success flow
// ---------------------------------------------------------------------------

describe('MCPCallbackPage: success flow', () => {
  it('navigates to /timeline on success', async () => {
    renderCallback('?success=true&tool=github');

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/timeline', { replace: true });
    });
  });

  it('sets sync-in-progress sessionStorage', async () => {
    renderCallback('?success=true&tool=github');

    await waitFor(() => {
      expect(sessionStorage.getItem(SYNC_IN_PROGRESS_KEY)).toBe('true');
    });
  });

  it('calls setLastSyncAt', async () => {
    renderCallback('?success=true&tool=github');

    await waitFor(() => {
      expect(mockSetLastSyncAt).toHaveBeenCalled();
    });
  });

  it('removes onboarding localStorage', async () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify({
      step: 'connect-tools',
      ts: Date.now(),
    }));

    renderCallback('?success=true&tool=github');

    await waitFor(() => {
      expect(localStorage.getItem(ONBOARDING_STORAGE_KEY)).toBeNull();
    });
  });

  it('fires runLiveSync in background', async () => {
    renderCallback('?success=true&tool=github');

    await waitFor(() => {
      expect(mockRunLiveSync).toHaveBeenCalled();
    });
  });

  it('invalidates integrations cache', async () => {
    const { invalidateSpy } = renderCallback('?success=true&tool=github');

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['mcp', 'integrations'] })
      );
    });
  });

  it('handles multi-tool success', async () => {
    renderCallback('?success=true&tools=jira,confluence');

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/timeline', { replace: true });
    });
  });
});

// ---------------------------------------------------------------------------
// Error flow
// ---------------------------------------------------------------------------

describe('MCPCallbackPage: error handling', () => {
  it('shows error for known error codes', async () => {
    renderCallback('?error=access_denied');

    await waitFor(() => {
      expect(screen.getByText('Connection Failed')).toBeInTheDocument();
      expect(screen.getByText('Access was denied by the user or organization')).toBeInTheDocument();
    });
  });

  it('shows generic error for unknown codes', async () => {
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

  it('shows error when no params present', async () => {
    renderCallback('?random=param');

    await waitFor(() => {
      expect(screen.getByText('Connection Failed')).toBeInTheDocument();
      expect(screen.getByText('Missing required authorization parameters')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Sync failure resilience
// ---------------------------------------------------------------------------

describe('MCPCallbackPage: sync failure resilience', () => {
  it('navigates to /timeline even when runLiveSync rejects', async () => {
    mockRunLiveSync.mockRejectedValueOnce(new Error('Network failure'));

    renderCallback('?success=true&tool=github');

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/timeline', { replace: true });
    });
  });

  it('sets sync-in-progress flag before runLiveSync executes', async () => {
    // Make runLiveSync hang to verify ordering
    mockRunLiveSync.mockImplementationOnce(() => new Promise(() => {}));

    renderCallback('?success=true&tool=github');

    await waitFor(() => {
      expect(sessionStorage.getItem(SYNC_IN_PROGRESS_KEY)).toBe('true');
      expect(mockNavigate).toHaveBeenCalledWith('/timeline', { replace: true });
    });
  });

  it('logs warning when runLiveSync fails', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Simulate sync error that reaches the onError callback
    mockRunLiveSync.mockImplementationOnce((callbacks: { onError: (err: Error) => void }) => {
      callbacks.onError(new Error('Sync timeout'));
      return Promise.resolve();
    });

    renderCallback('?success=true&tool=github');

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Callback]'),
        expect.stringContaining('Sync timeout')
      );
    });

    consoleSpy.mockRestore();
  });
});
