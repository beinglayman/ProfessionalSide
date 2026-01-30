/**
 * ErrorConsoleContext - Developer debug console for AI-assisted debugging
 *
 * Provides a global error and API trace capture system accessible via Cmd+E.
 * Captures console.error, console.warn, unhandled exceptions, promise rejections,
 * and all API requests/responses for export to AI debugging tools.
 *
 * @example
 * // Wrap app with provider
 * <ErrorConsoleProvider>
 *   <App />
 *   <ErrorConsole />
 * </ErrorConsoleProvider>
 *
 * @example
 * // Manual error capture
 * const { captureError, captureOAuthError } = useErrorConsole();
 * captureOAuthError('microsoft', 'admin_consent_required', 'Details...');
 *
 * @example
 * // Access from non-React code (e.g., axios interceptors)
 * import { getErrorConsole } from './ErrorConsoleContext';
 * const { startTrace, endTrace, failTrace } = getErrorConsole();
 */
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

export type ErrorSeverity = 'error' | 'warn' | 'info' | 'debug';
export type TraceStatus = 'success' | 'error' | 'pending';

/**
 * Structured request-response trace for AI debugging.
 * Captures full request/response cycle with timing and context.
 */
export interface RequestTrace {
  id: string;
  timestamp: Date;
  duration?: number;
  status: TraceStatus;

  // Request details
  request: {
    method: string;
    url: string;
    baseURL?: string;
    headers?: Record<string, string>;
    params?: Record<string, unknown>;
    data?: unknown;
  };

  // Response details
  response?: {
    status: number;
    statusText: string;
    headers?: Record<string, string>;
    data?: unknown;
  };

  // Error details (if failed)
  error?: {
    message: string;
    code?: string;
    stack?: string;
  };

  // Context for debugging
  context: {
    page: string;
    component?: string;
    action?: string;
    userId?: string;
    userAgent: string;
  };
}

/**
 * Captured error with full context for debugging.
 * Includes source, message, stack trace, and optional trace link.
 */
export interface CapturedError {
  id: string;
  timestamp: Date;
  severity: ErrorSeverity;
  source: string;
  message: string;
  details?: string;
  stack?: string;
  context?: Record<string, unknown>;
  url?: string;
  userAgent?: string;
  // Link to request trace if this error came from an API call
  traceId?: string;
}

interface ErrorConsoleContextType {
  // Errors
  errors: CapturedError[];
  captureError: (error: Partial<CapturedError> & { message: string; source: string }) => string;
  captureOAuthError: (provider: string, errorCode: string, details?: string) => string;
  clearErrors: () => void;

  // Request traces
  traces: RequestTrace[];
  startTrace: (request: RequestTrace['request'], context?: Partial<RequestTrace['context']>) => string;
  endTrace: (traceId: string, response: RequestTrace['response']) => void;
  failTrace: (traceId: string, error: RequestTrace['error'], response?: RequestTrace['response']) => void;
  clearTraces: () => void;

  // UI controls
  isOpen: boolean;
  activeTab: 'errors' | 'traces' | 'demo';
  setActiveTab: (tab: 'errors' | 'traces' | 'demo') => void;
  toggleConsole: () => void;
  openConsole: () => void;
  closeConsole: () => void;

  // Export
  exportAll: () => string;
}

const ErrorConsoleContext = createContext<ErrorConsoleContextType | undefined>(undefined);

/**
 * Maximum number of errors to retain in memory.
 * When exceeded, oldest errors are dropped (FIFO).
 */
const MAX_ERRORS = 100;

/**
 * Maximum number of API request traces to retain.
 * When exceeded, oldest traces are dropped (FIFO).
 */
const MAX_TRACES = 200;

/**
 * Global references for use in non-React code (e.g., axios interceptors).
 * These are set when ErrorConsoleProvider mounts and cleared on unmount.
 */
let globalCaptureError: ErrorConsoleContextType['captureError'] | null = null;
let globalStartTrace: ErrorConsoleContextType['startTrace'] | null = null;
let globalEndTrace: ErrorConsoleContextType['endTrace'] | null = null;
let globalFailTrace: ErrorConsoleContextType['failTrace'] | null = null;

/**
 * Get error console functions for use outside React components.
 * Returns null for each function if provider is not mounted.
 */
export const getErrorConsole = () => ({
  captureError: globalCaptureError,
  startTrace: globalStartTrace,
  endTrace: globalEndTrace,
  failTrace: globalFailTrace,
});

export const ErrorConsoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [errors, setErrors] = useState<CapturedError[]>([]);
  const [traces, setTraces] = useState<RequestTrace[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'errors' | 'traces' | 'demo'>('errors');
  const originalConsoleError = useRef<typeof console.error | null>(null);
  const originalConsoleWarn = useRef<typeof console.warn | null>(null);
  const pendingTraces = useRef<Map<string, { trace: RequestTrace; startTime: number }>>(new Map());

  const generateId = () => `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

  // ===== ERROR CAPTURE =====

  const captureError = useCallback((error: Partial<CapturedError> & { message: string; source: string }): string => {
    const id = `err_${generateId()}`;
    const newError: CapturedError = {
      id,
      timestamp: new Date(),
      severity: error.severity || 'error',
      source: error.source,
      message: error.message,
      details: error.details,
      stack: error.stack,
      context: error.context,
      url: window.location.href,
      userAgent: navigator.userAgent,
      traceId: error.traceId,
    };

    setErrors(prev => [newError, ...prev].slice(0, MAX_ERRORS));

    // Log to original console
    if (originalConsoleError.current) {
      originalConsoleError.current(`[ErrorConsole] ${error.source}:`, error.message, error.context || '');
    }

    return id;
  }, []);

  const captureOAuthError = useCallback((provider: string, errorCode: string, details?: string): string => {
    return captureError({
      severity: 'error',
      source: `OAuth:${provider}`,
      message: errorCode,
      details: details || `OAuth flow failed for ${provider}`,
      context: {
        provider,
        errorCode,
        oauthState: 'failed',
      },
    });
  }, [captureError]);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  // ===== REQUEST TRACE =====

  const startTrace = useCallback((
    request: RequestTrace['request'],
    context?: Partial<RequestTrace['context']>
  ): string => {
    const id = `trace_${generateId()}`;
    const trace: RequestTrace = {
      id,
      timestamp: new Date(),
      status: 'pending',
      request: {
        ...request,
        // Sanitize sensitive headers
        headers: request.headers ? {
          ...request.headers,
          Authorization: request.headers.Authorization ? '[REDACTED]' : undefined,
        } : undefined,
      },
      context: {
        page: window.location.pathname,
        userAgent: navigator.userAgent,
        ...context,
      },
    };

    pendingTraces.current.set(id, { trace, startTime: performance.now() });

    return id;
  }, []);

  const endTrace = useCallback((traceId: string, response: RequestTrace['response']) => {
    const pending = pendingTraces.current.get(traceId);
    if (!pending) return;

    const duration = Math.round(performance.now() - pending.startTime);
    const completedTrace: RequestTrace = {
      ...pending.trace,
      status: 'success',
      duration,
      response,
    };

    pendingTraces.current.delete(traceId);
    setTraces(prev => [completedTrace, ...prev].slice(0, MAX_TRACES));
  }, []);

  const failTrace = useCallback((
    traceId: string,
    error: RequestTrace['error'],
    response?: RequestTrace['response']
  ) => {
    const pending = pendingTraces.current.get(traceId);
    if (!pending) return;

    const duration = Math.round(performance.now() - pending.startTime);
    const failedTrace: RequestTrace = {
      ...pending.trace,
      status: 'error',
      duration,
      response,
      error,
    };

    pendingTraces.current.delete(traceId);
    setTraces(prev => [failedTrace, ...prev].slice(0, MAX_TRACES));

    // Also capture as an error with link to trace
    captureError({
      severity: response?.status && response.status >= 500 ? 'error' : 'warn',
      source: `API:${pending.trace.request.method}`,
      message: `${pending.trace.request.url} - ${error.message}`,
      details: response ? `HTTP ${response.status} ${response.statusText}` : undefined,
      stack: error.stack,
      context: {
        traceId,
        endpoint: pending.trace.request.url,
        method: pending.trace.request.method,
        status: response?.status,
        responseData: response?.data,
      },
      traceId,
    });
  }, [captureError]);

  const clearTraces = useCallback(() => {
    setTraces([]);
    pendingTraces.current.clear();
  }, []);

  // ===== UI CONTROLS =====

  const toggleConsole = useCallback(() => setIsOpen(prev => !prev), []);
  const openConsole = useCallback(() => setIsOpen(true), []);
  const closeConsole = useCallback(() => setIsOpen(false), []);

  // ===== EXPORT =====

  const exportAll = useCallback((): string => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      errors,
      traces,
      environment: {
        url: window.location.href,
        userAgent: navigator.userAgent,
      },
    };
    return JSON.stringify(exportData, null, 2);
  }, [errors, traces]);

  // ===== GLOBAL REFERENCES =====

  useEffect(() => {
    globalCaptureError = captureError;
    globalStartTrace = startTrace;
    globalEndTrace = endTrace;
    globalFailTrace = failTrace;

    return () => {
      globalCaptureError = null;
      globalStartTrace = null;
      globalEndTrace = null;
      globalFailTrace = null;
    };
  }, [captureError, startTrace, endTrace, failTrace]);

  // ===== CONSOLE INTERCEPTION =====

  useEffect(() => {
    originalConsoleError.current = console.error;
    originalConsoleWarn.current = console.warn;

    console.error = (...args: unknown[]) => {
      const message = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');

      // Skip React internal warnings (act() warnings, etc.) to avoid recursive state updates during tests
      if (message.includes('act(...)') || message.includes('Warning: An update to')) {
        originalConsoleError.current?.apply(console, args);
        return;
      }

      setErrors(prev => {
        const newError: CapturedError = {
          id: `err_${generateId()}`,
          timestamp: new Date(),
          severity: 'error',
          source: 'console.error',
          message: message.slice(0, 500),
          details: message.length > 500 ? message : undefined,
          url: window.location.href,
        };
        return [newError, ...prev].slice(0, MAX_ERRORS);
      });

      originalConsoleError.current?.apply(console, args);
    };

    console.warn = (...args: unknown[]) => {
      const message = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');

      setErrors(prev => {
        const newError: CapturedError = {
          id: `err_${generateId()}`,
          timestamp: new Date(),
          severity: 'warn',
          source: 'console.warn',
          message: message.slice(0, 500),
          details: message.length > 500 ? message : undefined,
          url: window.location.href,
        };
        return [newError, ...prev].slice(0, MAX_ERRORS);
      });

      originalConsoleWarn.current?.apply(console, args);
    };

    // Global error handlers
    const handleGlobalError = (event: ErrorEvent) => {
      setErrors(prev => {
        const newError: CapturedError = {
          id: `err_${generateId()}`,
          timestamp: new Date(),
          severity: 'error',
          source: 'window.onerror',
          message: event.message,
          stack: event.error?.stack,
          context: {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
          },
          url: window.location.href,
        };
        return [newError, ...prev].slice(0, MAX_ERRORS);
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message = reason?.message || String(reason);

      setErrors(prev => {
        const newError: CapturedError = {
          id: `err_${generateId()}`,
          timestamp: new Date(),
          severity: 'error',
          source: 'unhandledrejection',
          message: message.slice(0, 500),
          stack: reason?.stack,
          url: window.location.href,
        };
        return [newError, ...prev].slice(0, MAX_ERRORS);
      });
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      console.error = originalConsoleError.current!;
      console.warn = originalConsoleWarn.current!;
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // ===== KEYBOARD SHORTCUTS =====

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Cmd+E / Ctrl+E - Toggle console
      if ((event.metaKey || event.ctrlKey) && event.key === 'e') {
        event.preventDefault();
        toggleConsole();
      }
      // Escape - Close console
      if (event.key === 'Escape' && isOpen) {
        closeConsole();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, toggleConsole, closeConsole]);

  return (
    <ErrorConsoleContext.Provider
      value={{
        errors,
        captureError,
        captureOAuthError,
        clearErrors,
        traces,
        startTrace,
        endTrace,
        failTrace,
        clearTraces,
        isOpen,
        activeTab,
        setActiveTab,
        toggleConsole,
        openConsole,
        closeConsole,
        exportAll,
      }}
    >
      {children}
    </ErrorConsoleContext.Provider>
  );
};

/**
 * Hook to access error console functionality within React components.
 * @throws Error if used outside ErrorConsoleProvider
 */
export const useErrorConsole = () => {
  const context = useContext(ErrorConsoleContext);
  if (context === undefined) {
    throw new Error('useErrorConsole must be used within an ErrorConsoleProvider');
  }
  return context;
};
