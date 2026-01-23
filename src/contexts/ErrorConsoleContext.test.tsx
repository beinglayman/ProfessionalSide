import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import {
  ErrorConsoleProvider,
  useErrorConsole,
  getErrorConsole,
} from './ErrorConsoleContext';

// Wrapper for hooks
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ErrorConsoleProvider>{children}</ErrorConsoleProvider>
);

describe('ErrorConsoleContext', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(performance, 'now').mockReturnValue(0);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('useErrorConsole hook', () => {
    it('throws error when used outside provider', () => {
      expect(() => {
        renderHook(() => useErrorConsole());
      }).toThrow('useErrorConsole must be used within an ErrorConsoleProvider');
    });

    it('provides initial state', () => {
      const { result } = renderHook(() => useErrorConsole(), { wrapper });

      expect(result.current.errors).toEqual([]);
      expect(result.current.traces).toEqual([]);
      expect(result.current.isOpen).toBe(false);
      expect(result.current.activeTab).toBe('errors');
    });
  });

  describe('captureError', () => {
    it('captures error with required fields', () => {
      const { result } = renderHook(() => useErrorConsole(), { wrapper });

      act(() => {
        result.current.captureError({
          source: 'TestComponent',
          message: 'Test error message',
        });
      });

      expect(result.current.errors).toHaveLength(1);
      expect(result.current.errors[0]).toMatchObject({
        source: 'TestComponent',
        message: 'Test error message',
        severity: 'error',
      });
      expect(result.current.errors[0].id).toMatch(/^err_/);
      expect(result.current.errors[0].timestamp).toBeInstanceOf(Date);
    });

    it('captures error with all optional fields', () => {
      const { result } = renderHook(() => useErrorConsole(), { wrapper });

      act(() => {
        result.current.captureError({
          source: 'TestComponent',
          message: 'Test error',
          severity: 'warn',
          details: 'Additional details',
          stack: 'Error stack trace',
          context: { userId: '123' },
        });
      });

      expect(result.current.errors[0]).toMatchObject({
        severity: 'warn',
        details: 'Additional details',
        stack: 'Error stack trace',
        context: { userId: '123' },
      });
    });

    it('returns error id', () => {
      const { result } = renderHook(() => useErrorConsole(), { wrapper });

      let errorId: string;
      act(() => {
        errorId = result.current.captureError({
          source: 'Test',
          message: 'Test',
        });
      });

      expect(errorId!).toMatch(/^err_/);
      expect(result.current.errors[0].id).toBe(errorId!);
    });

    it('enforces MAX_ERRORS limit (100)', () => {
      const { result } = renderHook(() => useErrorConsole(), { wrapper });

      // Add 105 errors
      act(() => {
        for (let i = 0; i < 105; i++) {
          result.current.captureError({
            source: 'Test',
            message: `Error ${i}`,
          });
        }
      });

      expect(result.current.errors).toHaveLength(100);
      // Newest errors should be first (FIFO drop of oldest)
      expect(result.current.errors[0].message).toBe('Error 104');
      expect(result.current.errors[99].message).toBe('Error 5');
    });
  });

  describe('captureOAuthError', () => {
    it('captures OAuth error with provider context', () => {
      const { result } = renderHook(() => useErrorConsole(), { wrapper });

      act(() => {
        result.current.captureOAuthError('microsoft', 'admin_consent_required', 'Need admin');
      });

      expect(result.current.errors).toHaveLength(1);
      expect(result.current.errors[0]).toMatchObject({
        source: 'OAuth:microsoft',
        message: 'admin_consent_required',
        severity: 'error',
        details: 'Need admin',
        context: {
          provider: 'microsoft',
          errorCode: 'admin_consent_required',
          oauthState: 'failed',
        },
      });
    });

    it('uses default details when not provided', () => {
      const { result } = renderHook(() => useErrorConsole(), { wrapper });

      act(() => {
        result.current.captureOAuthError('google', 'access_denied');
      });

      expect(result.current.errors[0].details).toBe('OAuth flow failed for google');
    });
  });

  describe('clearErrors', () => {
    it('clears all errors', () => {
      const { result } = renderHook(() => useErrorConsole(), { wrapper });

      act(() => {
        result.current.captureError({ source: 'Test', message: 'Error 1' });
        result.current.captureError({ source: 'Test', message: 'Error 2' });
      });

      expect(result.current.errors).toHaveLength(2);

      act(() => {
        result.current.clearErrors();
      });

      expect(result.current.errors).toHaveLength(0);
    });
  });

  describe('Request Tracing', () => {
    it('starts a trace and returns trace ID', () => {
      const { result } = renderHook(() => useErrorConsole(), { wrapper });

      let traceId: string;
      act(() => {
        traceId = result.current.startTrace({
          method: 'GET',
          url: '/api/users',
        });
      });

      expect(traceId!).toMatch(/^trace_/);
      // Trace should not appear in traces array until completed
      expect(result.current.traces).toHaveLength(0);
    });

    it('ends trace successfully', () => {
      const { result } = renderHook(() => useErrorConsole(), { wrapper });

      let traceId: string;
      act(() => {
        traceId = result.current.startTrace({
          method: 'GET',
          url: '/api/users',
        });
      });

      // Simulate time passing
      vi.spyOn(performance, 'now').mockReturnValue(150);

      act(() => {
        result.current.endTrace(traceId!, {
          status: 200,
          statusText: 'OK',
          data: { users: [] },
        });
      });

      expect(result.current.traces).toHaveLength(1);
      expect(result.current.traces[0]).toMatchObject({
        status: 'success',
        duration: 150,
        request: { method: 'GET', url: '/api/users' },
        response: { status: 200, statusText: 'OK', data: { users: [] } },
      });
    });

    it('fails trace and captures error', () => {
      const { result } = renderHook(() => useErrorConsole(), { wrapper });

      let traceId: string;
      act(() => {
        traceId = result.current.startTrace({
          method: 'POST',
          url: '/api/login',
        });
      });

      vi.spyOn(performance, 'now').mockReturnValue(50);

      act(() => {
        result.current.failTrace(
          traceId!,
          { message: 'Unauthorized', code: '401' },
          { status: 401, statusText: 'Unauthorized', data: { error: 'Invalid token' } }
        );
      });

      // Should have trace
      expect(result.current.traces).toHaveLength(1);
      expect(result.current.traces[0]).toMatchObject({
        status: 'error',
        duration: 50,
        error: { message: 'Unauthorized', code: '401' },
        response: { status: 401 },
      });

      // Should also capture as error with traceId link
      expect(result.current.errors).toHaveLength(1);
      expect(result.current.errors[0].traceId).toBe(traceId!);
    });

    it('redacts Authorization header', () => {
      const { result } = renderHook(() => useErrorConsole(), { wrapper });

      let traceId: string;
      act(() => {
        traceId = result.current.startTrace({
          method: 'GET',
          url: '/api/users',
          headers: {
            Authorization: 'Bearer secret-token-123',
            'Content-Type': 'application/json',
          },
        });
      });

      act(() => {
        result.current.endTrace(traceId!, { status: 200, statusText: 'OK' });
      });

      expect(result.current.traces[0].request.headers?.Authorization).toBe('[REDACTED]');
      expect(result.current.traces[0].request.headers?.['Content-Type']).toBe('application/json');
    });

    it('enforces MAX_TRACES limit (200)', () => {
      const { result } = renderHook(() => useErrorConsole(), { wrapper });

      act(() => {
        for (let i = 0; i < 205; i++) {
          const traceId = result.current.startTrace({
            method: 'GET',
            url: `/api/item/${i}`,
          });
          result.current.endTrace(traceId, { status: 200, statusText: 'OK' });
        }
      });

      expect(result.current.traces).toHaveLength(200);
      // Newest traces should be first
      expect(result.current.traces[0].request.url).toBe('/api/item/204');
    });
  });

  describe('clearTraces', () => {
    it('clears all traces', () => {
      const { result } = renderHook(() => useErrorConsole(), { wrapper });

      act(() => {
        const id = result.current.startTrace({ method: 'GET', url: '/test' });
        result.current.endTrace(id, { status: 200, statusText: 'OK' });
      });

      expect(result.current.traces).toHaveLength(1);

      act(() => {
        result.current.clearTraces();
      });

      expect(result.current.traces).toHaveLength(0);
    });
  });

  describe('UI Controls', () => {
    it('toggleConsole toggles isOpen', () => {
      const { result } = renderHook(() => useErrorConsole(), { wrapper });

      expect(result.current.isOpen).toBe(false);

      act(() => {
        result.current.toggleConsole();
      });
      expect(result.current.isOpen).toBe(true);

      act(() => {
        result.current.toggleConsole();
      });
      expect(result.current.isOpen).toBe(false);
    });

    it('openConsole sets isOpen to true', () => {
      const { result } = renderHook(() => useErrorConsole(), { wrapper });

      act(() => {
        result.current.openConsole();
      });
      expect(result.current.isOpen).toBe(true);

      // Opening again should still be true
      act(() => {
        result.current.openConsole();
      });
      expect(result.current.isOpen).toBe(true);
    });

    it('closeConsole sets isOpen to false', () => {
      const { result } = renderHook(() => useErrorConsole(), { wrapper });

      act(() => {
        result.current.openConsole();
      });
      expect(result.current.isOpen).toBe(true);

      act(() => {
        result.current.closeConsole();
      });
      expect(result.current.isOpen).toBe(false);
    });

    it('setActiveTab changes tab', () => {
      const { result } = renderHook(() => useErrorConsole(), { wrapper });

      expect(result.current.activeTab).toBe('errors');

      act(() => {
        result.current.setActiveTab('traces');
      });
      expect(result.current.activeTab).toBe('traces');

      act(() => {
        result.current.setActiveTab('errors');
      });
      expect(result.current.activeTab).toBe('errors');
    });
  });

  describe('exportAll', () => {
    it('exports valid JSON with errors and traces', () => {
      const { result } = renderHook(() => useErrorConsole(), { wrapper });

      act(() => {
        result.current.captureError({ source: 'Test', message: 'Error 1' });
        const traceId = result.current.startTrace({ method: 'GET', url: '/test' });
        result.current.endTrace(traceId, { status: 200, statusText: 'OK' });
      });

      let exportData: string;
      act(() => {
        exportData = result.current.exportAll();
      });

      const parsed = JSON.parse(exportData!);
      expect(parsed).toHaveProperty('exportedAt');
      expect(parsed).toHaveProperty('errors');
      expect(parsed).toHaveProperty('traces');
      expect(parsed).toHaveProperty('environment');
      expect(parsed.errors).toHaveLength(1);
      expect(parsed.traces).toHaveLength(1);
    });

    it('exports empty arrays when no data', () => {
      const { result } = renderHook(() => useErrorConsole(), { wrapper });

      let exportData: string;
      act(() => {
        exportData = result.current.exportAll();
      });

      const parsed = JSON.parse(exportData!);
      expect(parsed.errors).toEqual([]);
      expect(parsed.traces).toEqual([]);
    });
  });

  describe('getErrorConsole (global references)', () => {
    it('provides global access to capture functions', () => {
      renderHook(() => useErrorConsole(), { wrapper });

      const globalFns = getErrorConsole();
      expect(globalFns.captureError).not.toBeNull();
      expect(globalFns.startTrace).not.toBeNull();
      expect(globalFns.endTrace).not.toBeNull();
      expect(globalFns.failTrace).not.toBeNull();
    });

    it('global captureError works', () => {
      const { result } = renderHook(() => useErrorConsole(), { wrapper });

      const globalFns = getErrorConsole();

      act(() => {
        globalFns.captureError?.({
          source: 'GlobalTest',
          message: 'Global error',
        });
      });

      expect(result.current.errors).toHaveLength(1);
      expect(result.current.errors[0].source).toBe('GlobalTest');
    });
  });

  describe('Keyboard shortcuts', () => {
    it('Cmd+E toggles console', () => {
      const { result } = renderHook(() => useErrorConsole(), { wrapper });

      expect(result.current.isOpen).toBe(false);

      act(() => {
        window.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'e', metaKey: true })
        );
      });

      expect(result.current.isOpen).toBe(true);

      act(() => {
        window.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'e', metaKey: true })
        );
      });

      expect(result.current.isOpen).toBe(false);
    });

    it('Ctrl+E toggles console', () => {
      const { result } = renderHook(() => useErrorConsole(), { wrapper });

      act(() => {
        window.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'e', ctrlKey: true })
        );
      });

      expect(result.current.isOpen).toBe(true);
    });

    it('Escape closes console when open', () => {
      const { result } = renderHook(() => useErrorConsole(), { wrapper });

      act(() => {
        result.current.openConsole();
      });
      expect(result.current.isOpen).toBe(true);

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      });

      expect(result.current.isOpen).toBe(false);
    });

    it('Escape does nothing when console is closed', () => {
      const { result } = renderHook(() => useErrorConsole(), { wrapper });

      expect(result.current.isOpen).toBe(false);

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      });

      expect(result.current.isOpen).toBe(false);
    });
  });
});
