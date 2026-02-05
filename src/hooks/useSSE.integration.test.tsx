/**
 * Integration tests for SSE per-story updates
 *
 * Tests the flow:
 * 1. SSE receives data-changed event with entryId
 * 2. Debounced query invalidation triggers
 * 3. Callbacks are invoked with correct data
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import {
  useSSE,
  INVALIDATION_DEBOUNCE_MS,
} from './useSSE';

// =============================================================================
// MOCKS
// =============================================================================

const mockUseAuth = vi.fn();
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock EventSource
class MockEventSource {
  url: string;
  onopen: (() => void) | null = null;
  onerror: ((error: Event) => void) | null = null;
  listeners: Map<string, ((event: MessageEvent) => void)[]> = new Map();
  readyState: number = 0;

  static instances: MockEventSource[] = [];

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: (event: MessageEvent) => void) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)!.push(listener);
  }

  removeEventListener() {}
  close() { this.readyState = 2; }

  simulateOpen() {
    this.readyState = 1;
    this.onopen?.();
  }

  simulateEvent(type: string, data: unknown) {
    const listeners = this.listeners.get(type);
    if (listeners) {
      const event = { data: JSON.stringify(data) } as MessageEvent;
      listeners.forEach(listener => listener(event));
    }
  }

  static reset() { MockEventSource.instances = []; }
  static getLatestInstance() { return MockEventSource.instances[MockEventSource.instances.length - 1]; }
}

vi.stubGlobal('EventSource', MockEventSource);

// Wrapper with QueryClient
const createTestWrapper = (queryClient: QueryClient) => {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

// =============================================================================
// TESTS
// =============================================================================

describe('SSE Per-Story Updates', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.useFakeTimers();
    MockEventSource.reset();

    mockUseAuth.mockReturnValue({
      token: 'test-token',
      isAuthenticated: true,
    });

    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  afterEach(() => {
    // Flush any pending timers before cleanup
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('Per-Entry data-changed Events', () => {
    it('receives entryId in data-changed callback', () => {
      const onDataChanged = vi.fn();

      renderHook(
        () => useSSE({ onDataChanged }),
        { wrapper: createTestWrapper(queryClient) }
      );

      const sse = MockEventSource.getLatestInstance()!;

      // Simulate successful connection
      act(() => {
        sse.simulateOpen();
      });

      // Simulate backend completing narrative for entry-123
      act(() => {
        sse.simulateEvent('data-changed', {
          type: 'data-changed',
          data: {
            entryId: 'entry-123',
            status: 'complete',
            timestamp: '2024-01-15T10:30:00Z',
          },
        });
      });

      expect(onDataChanged).toHaveBeenCalledWith({
        entryId: 'entry-123',
        status: 'complete',
        timestamp: '2024-01-15T10:30:00Z',
      });
    });

    it('receives multiple entries in sequence', () => {
      const onDataChanged = vi.fn();

      renderHook(
        () => useSSE({ onDataChanged }),
        { wrapper: createTestWrapper(queryClient) }
      );

      const sse = MockEventSource.getLatestInstance()!;
      act(() => {
        sse.simulateOpen();
      });

      // Simulate 3 entries completing in sequence
      act(() => {
        sse.simulateEvent('data-changed', {
          type: 'data-changed',
          data: { entryId: 'entry-1', status: 'complete' },
        });
      });

      act(() => {
        sse.simulateEvent('data-changed', {
          type: 'data-changed',
          data: { entryId: 'entry-2', status: 'complete' },
        });
      });

      act(() => {
        sse.simulateEvent('data-changed', {
          type: 'data-changed',
          data: { entryId: 'entry-3', status: 'complete' },
        });
      });

      // All 3 should have been received
      expect(onDataChanged).toHaveBeenCalledTimes(3);
      expect(onDataChanged).toHaveBeenNthCalledWith(1, { entryId: 'entry-1', status: 'complete' });
      expect(onDataChanged).toHaveBeenNthCalledWith(2, { entryId: 'entry-2', status: 'complete' });
      expect(onDataChanged).toHaveBeenNthCalledWith(3, { entryId: 'entry-3', status: 'complete' });
    });

    it('handles error status for individual entry', () => {
      const onDataChanged = vi.fn();

      renderHook(
        () => useSSE({ onDataChanged }),
        { wrapper: createTestWrapper(queryClient) }
      );

      const sse = MockEventSource.getLatestInstance()!;
      act(() => {
        sse.simulateOpen();
      });

      act(() => {
        sse.simulateEvent('data-changed', {
          type: 'data-changed',
          data: {
            entryId: 'entry-failed',
            status: 'error',
            error: 'LLM timeout after 30s',
          },
        });
      });

      expect(onDataChanged).toHaveBeenCalledWith({
        entryId: 'entry-failed',
        status: 'error',
        error: 'LLM timeout after 30s',
      });
    });
  });

  describe('Query Invalidation for Stories', () => {
    it('debounces invalidation when multiple entries complete rapidly', () => {
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      renderHook(
        () => useSSE(),
        { wrapper: createTestWrapper(queryClient) }
      );

      const sse = MockEventSource.getLatestInstance()!;

      // Simulate 5 entries completing within debounce window
      act(() => {
        for (let i = 1; i <= 5; i++) {
          sse.simulateEvent('data-changed', {
            type: 'data-changed',
            data: { entryId: `entry-${i}`, status: 'complete' },
          });
        }
      });

      // Before debounce - should not have invalidated
      expect(invalidateSpy).not.toHaveBeenCalled();

      // Advance past debounce
      act(() => {
        vi.advanceTimersByTime(INVALIDATION_DEBOUNCE_MS + 10);
      });

      // Should only invalidate once (debounced)
      // 2 calls: one for 'journal', one for 'activities'
      expect(invalidateSpy).toHaveBeenCalledTimes(2);
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['journal'] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['activities'] });
    });

    it('invalidates immediately on narratives-complete (final event)', () => {
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      renderHook(
        () => useSSE(),
        { wrapper: createTestWrapper(queryClient) }
      );

      const sse = MockEventSource.getLatestInstance()!;

      act(() => {
        sse.simulateEvent('narratives-complete', {
          type: 'narratives-complete',
          data: { entriesUpdated: 8 },
        });
      });

      // Should invalidate immediately (no debounce)
      expect(invalidateSpy).toHaveBeenCalledTimes(2);
    });

    it('cancels pending debounce when narratives-complete arrives', () => {
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      renderHook(
        () => useSSE(),
        { wrapper: createTestWrapper(queryClient) }
      );

      const sse = MockEventSource.getLatestInstance()!;

      // Start debounce with data-changed
      act(() => {
        sse.simulateEvent('data-changed', {
          type: 'data-changed',
          data: { entryId: 'entry-1' },
        });
      });

      // Halfway through debounce, send narratives-complete
      act(() => {
        vi.advanceTimersByTime(INVALIDATION_DEBOUNCE_MS / 2);
      });

      act(() => {
        sse.simulateEvent('narratives-complete', {
          type: 'narratives-complete',
          data: { entriesUpdated: 1 },
        });
      });

      // Should have invalidated immediately from narratives-complete
      expect(invalidateSpy).toHaveBeenCalledTimes(2);

      // Advance past original debounce - should NOT invalidate again
      act(() => {
        vi.advanceTimersByTime(INVALIDATION_DEBOUNCE_MS);
      });

      // Still only 2 calls (debounced one was cancelled)
      expect(invalidateSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('narratives-complete Event', () => {
    it('receives entriesUpdated count', () => {
      const onNarrativesComplete = vi.fn();

      renderHook(
        () => useSSE({ onNarrativesComplete }),
        { wrapper: createTestWrapper(queryClient) }
      );

      const sse = MockEventSource.getLatestInstance()!;

      act(() => {
        sse.simulateEvent('narratives-complete', {
          type: 'narratives-complete',
          data: {
            entriesUpdated: 8,
            timestamp: '2024-01-15T10:35:00Z',
          },
        });
      });

      expect(onNarrativesComplete).toHaveBeenCalledWith({
        entriesUpdated: 8,
        timestamp: '2024-01-15T10:35:00Z',
      });
    });

    it('receives error info if generation failed', () => {
      const onNarrativesComplete = vi.fn();

      renderHook(
        () => useSSE({ onNarrativesComplete }),
        { wrapper: createTestWrapper(queryClient) }
      );

      const sse = MockEventSource.getLatestInstance()!;

      act(() => {
        sse.simulateEvent('narratives-complete', {
          type: 'narratives-complete',
          data: {
            error: 'Background generation failed',
            timestamp: '2024-01-15T10:35:00Z',
          },
        });
      });

      expect(onNarrativesComplete).toHaveBeenCalledWith({
        error: 'Background generation failed',
        timestamp: '2024-01-15T10:35:00Z',
      });
    });
  });

  describe('Real-world Scenario: 8 Stories Enhancement', () => {
    it('handles typical sync flow: multiple data-changed then narratives-complete', () => {
      const onDataChanged = vi.fn();
      const onNarrativesComplete = vi.fn();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      renderHook(
        () => useSSE({ onDataChanged, onNarrativesComplete }),
        { wrapper: createTestWrapper(queryClient) }
      );

      const sse = MockEventSource.getLatestInstance()!;

      // Simulate 8 stories completing over ~10 seconds
      // Stories 1-3 complete quickly (within debounce)
      act(() => {
        sse.simulateEvent('data-changed', { type: 'data-changed', data: { entryId: 'story-1', status: 'complete' } });
        sse.simulateEvent('data-changed', { type: 'data-changed', data: { entryId: 'story-2', status: 'complete' } });
        sse.simulateEvent('data-changed', { type: 'data-changed', data: { entryId: 'story-3', status: 'complete' } });
      });

      // First debounce fires
      act(() => {
        vi.advanceTimersByTime(INVALIDATION_DEBOUNCE_MS + 10);
      });

      expect(onDataChanged).toHaveBeenCalledTimes(3);
      expect(invalidateSpy).toHaveBeenCalledTimes(2); // First batch

      // Stories 4-6 complete
      act(() => {
        sse.simulateEvent('data-changed', { type: 'data-changed', data: { entryId: 'story-4', status: 'complete' } });
        sse.simulateEvent('data-changed', { type: 'data-changed', data: { entryId: 'story-5', status: 'complete' } });
        sse.simulateEvent('data-changed', { type: 'data-changed', data: { entryId: 'story-6', status: 'complete' } });
      });

      act(() => {
        vi.advanceTimersByTime(INVALIDATION_DEBOUNCE_MS + 10);
      });

      expect(onDataChanged).toHaveBeenCalledTimes(6);
      expect(invalidateSpy).toHaveBeenCalledTimes(4); // Second batch

      // Stories 7-8 complete, then narratives-complete
      act(() => {
        sse.simulateEvent('data-changed', { type: 'data-changed', data: { entryId: 'story-7', status: 'complete' } });
        sse.simulateEvent('data-changed', { type: 'data-changed', data: { entryId: 'story-8', status: 'complete' } });
      });

      // narratives-complete arrives before debounce
      act(() => {
        vi.advanceTimersByTime(100);
        sse.simulateEvent('narratives-complete', {
          type: 'narratives-complete',
          data: { entriesUpdated: 8 },
        });
      });

      expect(onDataChanged).toHaveBeenCalledTimes(8);
      expect(onNarrativesComplete).toHaveBeenCalledTimes(1);
      expect(onNarrativesComplete).toHaveBeenCalledWith({ entriesUpdated: 8 });

      // Final invalidation from narratives-complete (immediate)
      expect(invalidateSpy).toHaveBeenCalledTimes(6);
    });

    it('handles mixed success and error statuses', () => {
      const onDataChanged = vi.fn();
      const onNarrativesComplete = vi.fn();

      renderHook(
        () => useSSE({ onDataChanged, onNarrativesComplete }),
        { wrapper: createTestWrapper(queryClient) }
      );

      const sse = MockEventSource.getLatestInstance()!;

      // 6 succeed, 2 fail
      act(() => {
        sse.simulateEvent('data-changed', { type: 'data-changed', data: { entryId: 'story-1', status: 'complete' } });
        sse.simulateEvent('data-changed', { type: 'data-changed', data: { entryId: 'story-2', status: 'complete' } });
        sse.simulateEvent('data-changed', { type: 'data-changed', data: { entryId: 'story-3', status: 'error', error: 'Timeout' } });
        sse.simulateEvent('data-changed', { type: 'data-changed', data: { entryId: 'story-4', status: 'complete' } });
        sse.simulateEvent('data-changed', { type: 'data-changed', data: { entryId: 'story-5', status: 'complete' } });
        sse.simulateEvent('data-changed', { type: 'data-changed', data: { entryId: 'story-6', status: 'error', error: 'LLM unavailable' } });
        sse.simulateEvent('data-changed', { type: 'data-changed', data: { entryId: 'story-7', status: 'complete' } });
        sse.simulateEvent('data-changed', { type: 'data-changed', data: { entryId: 'story-8', status: 'complete' } });
      });

      expect(onDataChanged).toHaveBeenCalledTimes(8);

      // Verify error entries received error status
      const errorCalls = onDataChanged.mock.calls.filter(
        (call) => call[0].status === 'error'
      );
      expect(errorCalls).toHaveLength(2);
      expect(errorCalls[0][0].entryId).toBe('story-3');
      expect(errorCalls[1][0].entryId).toBe('story-6');

      // narratives-complete still fires (with error info potentially)
      act(() => {
        sse.simulateEvent('narratives-complete', {
          type: 'narratives-complete',
          data: { entriesUpdated: 8 },
        });
      });

      expect(onNarrativesComplete).toHaveBeenCalledTimes(1);
    });
  });
});
