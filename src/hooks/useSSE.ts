/**
 * Hook for connecting to Server-Sent Events (SSE) for real-time updates.
 *
 * Automatically reconnects on disconnect and handles authentication.
 * Used for receiving narrative completion notifications and data change events.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';

export type SSEEventType =
  | 'narratives-complete'
  | 'data-changed'
  | 'sync-progress'
  | 'heartbeat';

interface SSEEventData {
  type: SSEEventType;
  data: Record<string, unknown>;
}

interface UseSSEOptions {
  /** Called when narratives complete generating */
  onNarrativesComplete?: (data: Record<string, unknown>) => void;
  /** Called when data changes (should trigger refresh) */
  onDataChanged?: (data: Record<string, unknown>) => void;
  /** Whether SSE should be active (default: true) */
  enabled?: boolean;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
const RECONNECT_DELAY_MS = 3000;
const MAX_RECONNECT_ATTEMPTS = 5;

/**
 * Connect to SSE stream for real-time updates.
 * Automatically invalidates React Query cache on data change events.
 */
export function useSSE({
  onNarrativesComplete,
  onDataChanged,
  enabled = true,
}: UseSSEOptions = {}) {
  const { token, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
    const url = `${API_BASE}/api/v1/events/stream?token=${encodeURIComponent(token)}`;
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('[SSE] Connected');
      reconnectAttemptsRef.current = 0;
    };

    eventSource.onerror = (error) => {
      console.error('[SSE] Connection error:', error);
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

        // Invalidate queries to refresh data
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

        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['journal'] });
        queryClient.invalidateQueries({ queryKey: ['activities'] });

        // Call user callback
        onDataChangedRef.current?.(data.data);
      } catch (error) {
        console.error('[SSE] Error parsing data-changed event:', error);
      }
    });

    eventSource.addEventListener('heartbeat', () => {
      // Heartbeat received - connection is alive
    });
  }, [token, enabled, isAuthenticated, queryClient]);

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
    };
  }, [enabled, isAuthenticated, token, connect]);

  // Manual reconnect function
  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    connect();
  }, [connect]);

  return { reconnect };
}
