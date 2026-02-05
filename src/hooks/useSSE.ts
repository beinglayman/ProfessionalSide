/**
 * Hook for connecting to Server-Sent Events (SSE) for real-time updates.
 *
 * Automatically reconnects on disconnect and handles authentication.
 * Used for receiving narrative completion notifications and data change events.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Debounce delay for query invalidations (ms). Prevents rapid-fire invalidations when multiple SSE events arrive */
export const INVALIDATION_DEBOUNCE_MS = 500;

/** Base delay between reconnection attempts (ms). Multiplied by attempt number for linear backoff */
export const RECONNECT_DELAY_MS = 3000;

/** Maximum number of reconnection attempts before giving up */
export const MAX_RECONNECT_ATTEMPTS = 5;

/** API base URL for SSE endpoint */
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

/** SSE stream endpoint path */
const SSE_ENDPOINT = '/api/v1/events/stream';

// =============================================================================
// TYPES
// =============================================================================

export type SSEEventType =
  | 'narratives-complete'
  | 'data-changed'
  | 'sync-progress'
  | 'heartbeat';

export interface SSEEventData {
  type: SSEEventType;
  data: Record<string, unknown>;
}

export interface UseSSEOptions {
  /** Called when narratives complete generating */
  onNarrativesComplete?: (data: Record<string, unknown>) => void;
  /** Called when data changes (should trigger refresh) */
  onDataChanged?: (data: Record<string, unknown>) => void;
  /** Whether SSE should be active (default: true) */
  enabled?: boolean;
}

export interface UseSSEReturn {
  /** Manually trigger a reconnection (resets attempt counter) */
  reconnect: () => void;
  /** Whether currently connected */
  isConnected: boolean;
}

/**
 * Connect to SSE stream for real-time updates.
 * Automatically invalidates React Query cache on data change events.
 */
export function useSSE({
  onNarrativesComplete,
  onDataChanged,
  enabled = true,
}: UseSSEOptions = {}): UseSSEReturn {
  const { token, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  // Connection state refs
  const eventSourceRef = useRef<EventSource | null>(null);
  const isConnectedRef = useRef(false);
  const reconnectAttemptsRef = useRef(0);

  // Timer refs for cleanup
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const invalidationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced invalidation to prevent rapid-fire refetches
  const invalidateQueries = useCallback(() => {
    if (invalidationTimeoutRef.current) {
      clearTimeout(invalidationTimeoutRef.current);
    }
    invalidationTimeoutRef.current = setTimeout(() => {
      console.log('[SSE] Debounced query invalidation triggered');
      queryClient.invalidateQueries({ queryKey: ['journal'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    }, INVALIDATION_DEBOUNCE_MS);
  }, [queryClient]);

  // Store callbacks in refs to avoid reconnecting when they change
  const onNarrativesCompleteRef = useRef(onNarrativesComplete);
  onNarrativesCompleteRef.current = onNarrativesComplete;

  const onDataChangedRef = useRef(onDataChanged);
  onDataChangedRef.current = onDataChanged;

  const connect = useCallback(() => {
    if (!token || !enabled || !isAuthenticated) {
      return;
    }

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Create SSE connection with auth token
    // Note: EventSource doesn't support custom headers, so we use query param
    const url = `${API_BASE}${SSE_ENDPOINT}?token=${encodeURIComponent(token)}`;
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('[SSE] Connected');
      isConnectedRef.current = true;
      reconnectAttemptsRef.current = 0;
    };

    eventSource.onerror = (error) => {
      console.error('[SSE] Connection error:', error);
      isConnectedRef.current = false;
      eventSource.close();

      // Attempt reconnect with backoff
      if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttemptsRef.current++;
        const delay = RECONNECT_DELAY_MS * reconnectAttemptsRef.current;
        console.log(`[SSE] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);

        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
      } else {
        console.log('[SSE] Max reconnect attempts reached');
      }
    };

    // Listen for specific event types
    eventSource.addEventListener('narratives-complete', (event) => {
      try {
        const data = JSON.parse(event.data) as SSEEventData;
        console.log('[SSE] Narratives complete:', data);

        // Clear any pending debounced invalidation
        if (invalidationTimeoutRef.current) {
          clearTimeout(invalidationTimeoutRef.current);
          invalidationTimeoutRef.current = null;
        }

        // Final invalidation - immediate, not debounced
        queryClient.invalidateQueries({ queryKey: ['journal'] });
        queryClient.invalidateQueries({ queryKey: ['activities'] });

        // Call user callback
        onNarrativesCompleteRef.current?.(data.data);
      } catch (error) {
        console.error('[SSE] Error parsing narratives-complete event:', error);
      }
    });

    eventSource.addEventListener('data-changed', (event) => {
      try {
        const data = JSON.parse(event.data) as SSEEventData;
        console.log('[SSE] Data changed:', data);

        // Use debounced invalidation for per-entry updates
        // This prevents rapid-fire refetches when multiple entries complete
        invalidateQueries();

        // Call user callback
        onDataChangedRef.current?.(data.data);
      } catch (error) {
        console.error('[SSE] Error parsing data-changed event:', error);
      }
    });

    eventSource.addEventListener('heartbeat', () => {
      // Heartbeat received - connection is alive
    });
  }, [token, enabled, isAuthenticated, queryClient, invalidateQueries]);

  // Connect/disconnect based on auth state
  useEffect(() => {
    if (enabled && isAuthenticated && token) {
      connect();
    }

    return () => {
      // Cleanup on unmount
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (invalidationTimeoutRef.current) {
        clearTimeout(invalidationTimeoutRef.current);
        invalidationTimeoutRef.current = null;
      }
    };
  }, [enabled, isAuthenticated, token, connect]);

  // Manual reconnect function
  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    connect();
  }, [connect]);

  return {
    reconnect,
    isConnected: isConnectedRef.current,
  };
}
