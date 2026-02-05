import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import {
  useSSE,
  INVALIDATION_DEBOUNCE_MS,
  RECONNECT_DELAY_MS,
  MAX_RECONNECT_ATTEMPTS,
} from './useSSE';

// Mock useAuth
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

  removeEventListener(type: string, listener: (event: MessageEvent) => void) {
    const listeners = this.listeners.get(type);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  close() {
    this.readyState = 2;
  }

  // Test helpers
  simulateOpen() {
    this.readyState = 1;
    this.onopen?.();
  }

  simulateError(error?: Event) {
    this.onerror?.(error || new Event('error'));
  }

  simulateEvent(type: string, data: unknown) {
    const listeners = this.listeners.get(type);
    if (listeners) {
      const event = { data: JSON.stringify(data) } as MessageEvent;
      listeners.forEach(listener => listener(event));
    }
  }

  static reset() {
    MockEventSource.instances = [];
  }

  static getLatestInstance(): MockEventSource | undefined {
    return MockEventSource.instances[MockEventSource.instances.length - 1];
  }
}

// Replace global EventSource with mock
vi.stubGlobal('EventSource', MockEventSource);

// Create wrapper with QueryClient
const createWrapper = (queryClient?: QueryClient) => {
  const client = queryClient || new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
};

describe('useSSE', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    MockEventSource.reset();
    mockUseAuth.mockReturnValue({
      token: 'test-token',
      isAuthenticated: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('Connection Management', () => {
    it('does not connect when not authenticated', () => {
      mockUseAuth.mockReturnValue({
        token: null,
        isAuthenticated: false,
      });

      renderHook(() => useSSE(), { wrapper: createWrapper() });

      expect(MockEventSource.instances).toHaveLength(0);
    });

    it('does not connect when enabled is false', () => {
      renderHook(() => useSSE({ enabled: false }), { wrapper: createWrapper() });

      expect(MockEventSource.instances).toHaveLength(0);
    });

    it('connects when authenticated and enabled', () => {
      renderHook(() => useSSE(), { wrapper: createWrapper() });

      expect(MockEventSource.instances).toHaveLength(1);
      expect(MockEventSource.getLatestInstance()?.url).toContain('/api/v1/events/stream');
      expect(MockEventSource.getLatestInstance()?.url).toContain('token=test-token');
    });

    it('encodes token in URL', () => {
      mockUseAuth.mockReturnValue({
        token: 'token with spaces & special=chars',
        isAuthenticated: true,
      });

      renderHook(() => useSSE(), { wrapper: createWrapper() });

      const instance = MockEventSource.getLatestInstance();
      expect(instance?.url).toContain(encodeURIComponent('token with spaces & special=chars'));
    });

    it('closes connection on unmount', () => {
      const { unmount } = renderHook(() => useSSE(), { wrapper: createWrapper() });

      const instance = MockEventSource.getLatestInstance();
      expect(instance?.readyState).toBe(0);

      unmount();

      expect(instance?.readyState).toBe(2); // CLOSED
    });

    it('closes existing connection before creating new one', () => {
      const { rerender } = renderHook(
        ({ token }) => {
          mockUseAuth.mockReturnValue({ token, isAuthenticated: true });
          return useSSE();
        },
        { wrapper: createWrapper(), initialProps: { token: 'token1' } }
      );

      const firstInstance = MockEventSource.getLatestInstance();
      expect(firstInstance?.readyState).toBe(0);

      // Change token to trigger reconnect
      mockUseAuth.mockReturnValue({ token: 'token2', isAuthenticated: true });
      rerender({ token: 'token2' });

      // First instance should be closed
      expect(firstInstance?.readyState).toBe(2);
      // New instance should be created
      expect(MockEventSource.instances).toHaveLength(2);
    });
  });

  describe('Reconnection Logic', () => {
    it('attempts to reconnect on error with linear backoff', () => {
      renderHook(() => useSSE(), { wrapper: createWrapper() });

      const firstInstance = MockEventSource.getLatestInstance()!;

      // Simulate connection error
      firstInstance.simulateError();

      // Should not reconnect immediately
      expect(MockEventSource.instances).toHaveLength(1);

      // After first delay (RECONNECT_DELAY_MS * 1)
      vi.advanceTimersByTime(RECONNECT_DELAY_MS);
      expect(MockEventSource.instances).toHaveLength(2);
    });

    it('stops reconnecting after max attempts', () => {
      renderHook(() => useSSE(), { wrapper: createWrapper() });

      // Trigger errors up to max attempts
      for (let i = 0; i < MAX_RECONNECT_ATTEMPTS; i++) {
        const instance = MockEventSource.getLatestInstance()!;
        instance.simulateError();
        vi.advanceTimersByTime(RECONNECT_DELAY_MS * (i + 1));
      }

      const countAfterMaxAttempts = MockEventSource.instances.length;

      // Trigger one more error
      const lastInstance = MockEventSource.getLatestInstance()!;
      lastInstance.simulateError();
      vi.advanceTimersByTime(RECONNECT_DELAY_MS * 10);

      // Should not have created any more instances
      expect(MockEventSource.instances.length).toBe(countAfterMaxAttempts);
    });

    it('resets reconnect counter on successful connection', () => {
      renderHook(() => useSSE(), { wrapper: createWrapper() });

      const firstInstance = MockEventSource.getLatestInstance()!;

      // Simulate error and reconnect
      firstInstance.simulateError();
      vi.advanceTimersByTime(RECONNECT_DELAY_MS);

      const secondInstance = MockEventSource.getLatestInstance()!;

      // Successful connection
      secondInstance.simulateOpen();

      // Simulate another error
      secondInstance.simulateError();
      vi.advanceTimersByTime(RECONNECT_DELAY_MS);

      // Should create a third instance (counter was reset)
      expect(MockEventSource.instances.length).toBe(3);
    });

    it('manual reconnect resets attempt counter', () => {
      const { result } = renderHook(() => useSSE(), { wrapper: createWrapper() });

      // Exhaust reconnect attempts
      for (let i = 0; i < MAX_RECONNECT_ATTEMPTS; i++) {
        const instance = MockEventSource.getLatestInstance()!;
        instance.simulateError();
        vi.advanceTimersByTime(RECONNECT_DELAY_MS * (i + 1));
      }

      const countAfterMaxAttempts = MockEventSource.instances.length;

      // Manual reconnect
      act(() => {
        result.current.reconnect();
      });

      // Should create a new instance
      expect(MockEventSource.instances.length).toBe(countAfterMaxAttempts + 1);
    });
  });

  describe('Event Handling', () => {
    it('calls onNarrativesComplete callback on narratives-complete event', () => {
      const onNarrativesComplete = vi.fn();

      renderHook(
        () => useSSE({ onNarrativesComplete }),
        { wrapper: createWrapper() }
      );

      const instance = MockEventSource.getLatestInstance()!;

      instance.simulateEvent('narratives-complete', {
        type: 'narratives-complete',
        data: { entriesUpdated: 5 },
      });

      expect(onNarrativesComplete).toHaveBeenCalledWith({ entriesUpdated: 5 });
    });

    it('calls onDataChanged callback on data-changed event', () => {
      const onDataChanged = vi.fn();

      renderHook(
        () => useSSE({ onDataChanged }),
        { wrapper: createWrapper() }
      );

      const instance = MockEventSource.getLatestInstance()!;

      instance.simulateEvent('data-changed', {
        type: 'data-changed',
        data: { entryId: 'entry-123', status: 'complete' },
      });

      // Callback should be called immediately
      expect(onDataChanged).toHaveBeenCalledWith({ entryId: 'entry-123', status: 'complete' });
    });

    it('handles malformed event data gracefully', () => {
      const onNarrativesComplete = vi.fn();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      renderHook(
        () => useSSE({ onNarrativesComplete }),
        { wrapper: createWrapper() }
      );

      const instance = MockEventSource.getLatestInstance()!;

      // Simulate event with invalid JSON
      const listeners = instance.listeners.get('narratives-complete');
      if (listeners) {
        listeners.forEach(listener => {
          listener({ data: 'invalid json' } as MessageEvent);
        });
      }

      expect(onNarrativesComplete).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('Query Invalidation', () => {
    it('invalidates queries immediately on narratives-complete', () => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      renderHook(() => useSSE(), { wrapper: createWrapper(queryClient) });

      const instance = MockEventSource.getLatestInstance()!;

      instance.simulateEvent('narratives-complete', {
        type: 'narratives-complete',
        data: {},
      });

      // Should invalidate immediately
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['journal'] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['activities'] });
    });

    it('debounces query invalidation on data-changed events', () => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      renderHook(() => useSSE(), { wrapper: createWrapper(queryClient) });

      const instance = MockEventSource.getLatestInstance()!;

      // Fire multiple data-changed events rapidly
      instance.simulateEvent('data-changed', { type: 'data-changed', data: { entryId: '1' } });
      instance.simulateEvent('data-changed', { type: 'data-changed', data: { entryId: '2' } });
      instance.simulateEvent('data-changed', { type: 'data-changed', data: { entryId: '3' } });

      // Should not invalidate yet (debounced)
      expect(invalidateSpy).not.toHaveBeenCalled();

      // Advance past debounce delay
      vi.advanceTimersByTime(INVALIDATION_DEBOUNCE_MS);

      // Should invalidate only once
      expect(invalidateSpy).toHaveBeenCalledTimes(2); // journal + activities
    });

    it('cancels pending debounced invalidation on narratives-complete', () => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      renderHook(() => useSSE(), { wrapper: createWrapper(queryClient) });

      const instance = MockEventSource.getLatestInstance()!;

      // Fire data-changed event (starts debounce timer)
      instance.simulateEvent('data-changed', { type: 'data-changed', data: { entryId: '1' } });

      // Before debounce completes, fire narratives-complete
      vi.advanceTimersByTime(INVALIDATION_DEBOUNCE_MS / 2);
      instance.simulateEvent('narratives-complete', { type: 'narratives-complete', data: {} });

      // Should have invalidated immediately from narratives-complete
      expect(invalidateSpy).toHaveBeenCalledTimes(2);

      // Advance past original debounce - should not trigger again
      vi.advanceTimersByTime(INVALIDATION_DEBOUNCE_MS);
      expect(invalidateSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('Callback Reference Stability', () => {
    it('does not reconnect when callback references change', () => {
      const { rerender } = renderHook(
        ({ onDataChanged }) => useSSE({ onDataChanged }),
        {
          wrapper: createWrapper(),
          initialProps: { onDataChanged: vi.fn() },
        }
      );

      const initialInstanceCount = MockEventSource.instances.length;

      // Rerender with new callback reference
      rerender({ onDataChanged: vi.fn() });

      // Should not create a new connection
      expect(MockEventSource.instances.length).toBe(initialInstanceCount);
    });

    it('uses latest callback even when reference changes', () => {
      const firstCallback = vi.fn();
      const secondCallback = vi.fn();

      const { rerender } = renderHook(
        ({ onDataChanged }) => useSSE({ onDataChanged }),
        {
          wrapper: createWrapper(),
          initialProps: { onDataChanged: firstCallback },
        }
      );

      // Update callback
      rerender({ onDataChanged: secondCallback });

      // Fire event
      const instance = MockEventSource.getLatestInstance()!;
      instance.simulateEvent('data-changed', {
        type: 'data-changed',
        data: { entryId: 'test' },
      });

      // Should call the latest callback
      expect(firstCallback).not.toHaveBeenCalled();
      expect(secondCallback).toHaveBeenCalledWith({ entryId: 'test' });
    });
  });

  describe('Cleanup', () => {
    it('clears reconnect timeout on unmount', () => {
      const { unmount } = renderHook(() => useSSE(), { wrapper: createWrapper() });

      const instance = MockEventSource.getLatestInstance()!;
      instance.simulateError();

      // Unmount before reconnect timer fires
      unmount();

      // Advance past reconnect delay
      vi.advanceTimersByTime(RECONNECT_DELAY_MS);

      // Should not have created a new instance
      expect(MockEventSource.instances.length).toBe(1);
    });

    it('clears invalidation timeout on unmount', () => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { unmount } = renderHook(() => useSSE(), {
        wrapper: createWrapper(queryClient),
      });

      const instance = MockEventSource.getLatestInstance()!;
      instance.simulateEvent('data-changed', { type: 'data-changed', data: {} });

      // Unmount before debounce completes
      unmount();

      // Advance past debounce delay
      vi.advanceTimersByTime(INVALIDATION_DEBOUNCE_MS);

      // Should not have invalidated
      expect(invalidateSpy).not.toHaveBeenCalled();
    });
  });
});
