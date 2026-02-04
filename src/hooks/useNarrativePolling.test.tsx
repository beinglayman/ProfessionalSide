import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { useNarrativePolling } from './useNarrativePolling';
import {
  NARRATIVE_POLL_INTERVAL_MS,
  NARRATIVE_POLL_TIMEOUT_MS,
} from '../services/sync.service';

// Create wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useNarrativePolling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('does not start polling when isGenerating is false', () => {
    const onPollingComplete = vi.fn();

    renderHook(
      () =>
        useNarrativePolling({
          isGenerating: false,
          onPollingComplete,
        }),
      { wrapper: createWrapper() }
    );

    // Advance past the poll interval
    vi.advanceTimersByTime(NARRATIVE_POLL_INTERVAL_MS * 2);

    // Should not call onPollingComplete since polling never started
    expect(onPollingComplete).not.toHaveBeenCalled();
  });

  it('starts polling when isGenerating becomes true', () => {
    const onPollingComplete = vi.fn();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    renderHook(
      () =>
        useNarrativePolling({
          isGenerating: true,
          onPollingComplete,
        }),
      { wrapper }
    );

    // Advance to first poll interval
    vi.advanceTimersByTime(NARRATIVE_POLL_INTERVAL_MS);

    // Should have invalidated queries
    expect(invalidateSpy).toHaveBeenCalled();
  });

  it('stops polling after timeout and calls onPollingComplete', () => {
    const onPollingComplete = vi.fn();

    renderHook(
      () =>
        useNarrativePolling({
          isGenerating: true,
          onPollingComplete,
        }),
      { wrapper: createWrapper() }
    );

    // Should not complete before timeout
    vi.advanceTimersByTime(NARRATIVE_POLL_TIMEOUT_MS - 1000);
    expect(onPollingComplete).not.toHaveBeenCalled();

    // Should complete after timeout
    vi.advanceTimersByTime(1000);
    expect(onPollingComplete).toHaveBeenCalledTimes(1);
  });

  it('stops polling when isGenerating becomes false', () => {
    const onPollingComplete = vi.fn();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { rerender } = renderHook(
      ({ isGenerating }) =>
        useNarrativePolling({
          isGenerating,
          onPollingComplete,
        }),
      {
        wrapper,
        initialProps: { isGenerating: true },
      }
    );

    // Let one poll happen
    vi.advanceTimersByTime(NARRATIVE_POLL_INTERVAL_MS);
    const callCountAfterFirstPoll = invalidateSpy.mock.calls.length;

    // Turn off isGenerating
    rerender({ isGenerating: false });

    // Advance time - no more polling should happen
    vi.advanceTimersByTime(NARRATIVE_POLL_INTERVAL_MS * 3);

    // Call count should not have increased significantly
    // (may have one more call from cleanup, but not continued polling)
    expect(invalidateSpy.mock.calls.length).toBeLessThanOrEqual(
      callCountAfterFirstPoll + 2
    );
  });

  it('cleans up intervals on unmount', () => {
    const onPollingComplete = vi.fn();

    const { unmount } = renderHook(
      () =>
        useNarrativePolling({
          isGenerating: true,
          onPollingComplete,
        }),
      { wrapper: createWrapper() }
    );

    // Unmount before timeout
    unmount();

    // Advance past timeout
    vi.advanceTimersByTime(NARRATIVE_POLL_TIMEOUT_MS + 1000);

    // Should not call onPollingComplete since component unmounted
    expect(onPollingComplete).not.toHaveBeenCalled();
  });

  it('invalidates custom query keys when provided', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const customKeys = [['custom-key-1'], ['custom-key-2']];

    renderHook(
      () =>
        useNarrativePolling({
          isGenerating: true,
          queryKeys: customKeys,
        }),
      { wrapper }
    );

    // Advance to first poll
    vi.advanceTimersByTime(NARRATIVE_POLL_INTERVAL_MS);

    // Should have invalidated both custom keys
    const calls = invalidateSpy.mock.calls;
    const invalidatedKeys = calls.map((call) => call[0]?.queryKey);

    expect(invalidatedKeys).toContainEqual(['custom-key-1']);
    expect(invalidatedKeys).toContainEqual(['custom-key-2']);
  });

  it('returns stopPolling function that stops polling immediately', () => {
    const onPollingComplete = vi.fn();

    const { result } = renderHook(
      () =>
        useNarrativePolling({
          isGenerating: true,
          onPollingComplete,
        }),
      { wrapper: createWrapper() }
    );

    // Stop polling manually
    act(() => {
      result.current.stopPolling();
    });

    // Should call onPollingComplete immediately
    expect(onPollingComplete).toHaveBeenCalledTimes(1);

    // Advance past timeout - should not call again
    vi.advanceTimersByTime(NARRATIVE_POLL_TIMEOUT_MS);
    expect(onPollingComplete).toHaveBeenCalledTimes(1);
  });
});
