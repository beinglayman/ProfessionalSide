import React, { useState, useMemo } from 'react';
import {
  X,
  Trash2,
  AlertCircle,
  AlertTriangle,
  Info,
  Bug,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Filter,
  Download,
  Terminal,
  Activity,
  CheckCircle2,
  Clock,
  XCircle,
  Zap,
  FlaskConical,
} from 'lucide-react';
import { api } from '../../lib/api';
import {
  useErrorConsole,
  CapturedError,
  ErrorSeverity,
  RequestTrace,
  TraceStatus,
} from '../../contexts/ErrorConsoleContext';
import { DemoTab } from './DemoTab';
import { E2ETab } from './E2ETab';
import { isDemoMode } from '../../services/demo-mode.service';

// ===== ERROR SEVERITY CONFIG =====

// ===== UTILITY FUNCTIONS =====

const COPY_FEEDBACK_TIMEOUT_MS = 2000;

/**
 * Format a timestamp for display in the console (HH:MM:SS 24-hour format)
 */
const formatTime = (date: Date): string => {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
};

// ===== SEVERITY CONFIG =====

const severityConfig: Record<ErrorSeverity, { icon: typeof AlertCircle; color: string; bg: string }> = {
  error: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
  warn: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  debug: { icon: Bug, color: 'text-gray-500', bg: 'bg-gray-500/10' },
};

const traceStatusConfig: Record<TraceStatus, { icon: typeof CheckCircle2; color: string; bg: string }> = {
  success: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10' },
  error: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
  pending: { icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
};

// ===== ERROR ITEM COMPONENT =====

const ErrorItem: React.FC<{ error: CapturedError }> = ({ error }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const config = severityConfig[error.severity];
  const Icon = config.icon;

  const copyToClipboard = async () => {
    try {
      const text = JSON.stringify(error, null, 2);
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), COPY_FEEDBACK_TIMEOUT_MS);
    } catch {
      // Clipboard API may fail in some contexts (e.g., non-secure origins)
      console.warn('Failed to copy to clipboard');
    }
  };

  return (
    <div className={`border-b border-gray-700 ${config.bg}`}>
      <div
        className="flex items-start gap-2 p-2 cursor-pointer hover:bg-white/5"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <button className="mt-0.5 text-gray-500">
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        <Icon size={14} className={`mt-0.5 flex-shrink-0 ${config.color}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-500 font-mono">{formatTime(error.timestamp)}</span>
            <span className="px-1.5 py-0.5 rounded bg-gray-700 text-gray-300 font-medium">
              {error.source}
            </span>
            {error.traceId && (
              <span className="px-1.5 py-0.5 rounded bg-blue-900/50 text-blue-400 text-[10px]">
                has trace
              </span>
            )}
          </div>
          <p className="text-sm text-gray-200 mt-0.5 font-mono truncate">{error.message}</p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            copyToClipboard();
          }}
          className="p-1 text-gray-500 hover:text-gray-300"
          title="Copy error details"
        >
          {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
        </button>
      </div>

      {isExpanded && (
        <div className="px-8 pb-3 space-y-2">
          {error.details && (
            <div>
              <div className="text-xs text-gray-500 mb-1">Details</div>
              <pre className="text-xs text-gray-300 bg-black/30 p-2 rounded overflow-x-auto font-mono">
                {error.details}
              </pre>
            </div>
          )}
          {error.stack && (
            <div>
              <div className="text-xs text-gray-500 mb-1">Stack Trace</div>
              <pre className="text-xs text-gray-400 bg-black/30 p-2 rounded overflow-x-auto font-mono max-h-40 overflow-y-auto">
                {error.stack}
              </pre>
            </div>
          )}
          {error.context && Object.keys(error.context).length > 0 && (
            <div>
              <div className="text-xs text-gray-500 mb-1">Context</div>
              <pre className="text-xs text-gray-300 bg-black/30 p-2 rounded overflow-x-auto font-mono">
                {JSON.stringify(error.context, null, 2)}
              </pre>
            </div>
          )}
          {error.url && (
            <div className="text-xs">
              <span className="text-gray-500">URL: </span>
              <span className="text-gray-400 font-mono">{error.url}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ===== TRACE ITEM COMPONENT =====

const TraceItem: React.FC<{ trace: RequestTrace }> = ({ trace }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const config = traceStatusConfig[trace.status];
  const Icon = config.icon;

  const copyToClipboard = async () => {
    try {
      const text = JSON.stringify(trace, null, 2);
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), COPY_FEEDBACK_TIMEOUT_MS);
    } catch {
      // Clipboard API may fail in some contexts
      console.warn('Failed to copy to clipboard');
    }
  };

  const getMethodColor = (method: string) => {
    const colors: Record<string, string> = {
      GET: 'text-green-400',
      POST: 'text-blue-400',
      PUT: 'text-yellow-400',
      PATCH: 'text-orange-400',
      DELETE: 'text-red-400',
    };
    return colors[method] || 'text-gray-400';
  };

  return (
    <div className={`border-b border-gray-700 ${config.bg}`}>
      <div
        className="flex items-start gap-2 p-2 cursor-pointer hover:bg-white/5"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <button className="mt-0.5 text-gray-500">
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        <Icon size={14} className={`mt-0.5 flex-shrink-0 ${config.color}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-500 font-mono">{formatTime(trace.timestamp)}</span>
            <span className={`font-bold ${getMethodColor(trace.request.method)}`}>
              {trace.request.method}
            </span>
            {trace.response && (
              <span className={`px-1.5 py-0.5 rounded font-mono ${
                trace.response.status >= 200 && trace.response.status < 300
                  ? 'bg-green-900/50 text-green-400'
                  : trace.response.status >= 400
                    ? 'bg-red-900/50 text-red-400'
                    : 'bg-yellow-900/50 text-yellow-400'
              }`}>
                {trace.response.status}
              </span>
            )}
            {trace.duration && (
              <span className="text-gray-500">{trace.duration}ms</span>
            )}
          </div>
          <p className="text-sm text-gray-200 mt-0.5 font-mono truncate">{trace.request.url}</p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            copyToClipboard();
          }}
          className="p-1 text-gray-500 hover:text-gray-300"
          title="Copy trace details"
        >
          {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
        </button>
      </div>

      {isExpanded && (
        <div className="px-8 pb-3 space-y-3">
          {/* Request Section */}
          <div>
            <div className="text-xs text-gray-500 mb-1 font-semibold">Request</div>
            <div className="bg-black/30 rounded p-2 space-y-2">
              <div className="text-xs">
                <span className="text-gray-500">URL: </span>
                <span className="text-gray-300 font-mono">
                  {trace.request.baseURL}{trace.request.url}
                </span>
              </div>
              {trace.request.params && Object.keys(trace.request.params).length > 0 && (
                <div>
                  <div className="text-xs text-gray-500">Params:</div>
                  <pre className="text-xs text-gray-300 font-mono mt-1">
                    {JSON.stringify(trace.request.params, null, 2)}
                  </pre>
                </div>
              )}
              {trace.request.data && (
                <div>
                  <div className="text-xs text-gray-500">Body:</div>
                  <pre className="text-xs text-gray-300 font-mono mt-1 max-h-32 overflow-y-auto">
                    {JSON.stringify(trace.request.data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>

          {/* Response Section */}
          {trace.response && (
            <div>
              <div className="text-xs text-gray-500 mb-1 font-semibold">Response</div>
              <div className="bg-black/30 rounded p-2 space-y-2">
                <div className="text-xs">
                  <span className="text-gray-500">Status: </span>
                  <span className={`font-mono ${
                    trace.response.status >= 200 && trace.response.status < 300
                      ? 'text-green-400'
                      : 'text-red-400'
                  }`}>
                    {trace.response.status} {trace.response.statusText}
                  </span>
                </div>
                {trace.response.data && (
                  <div>
                    <div className="text-xs text-gray-500">Data:</div>
                    <pre className="text-xs text-gray-300 font-mono mt-1 max-h-48 overflow-y-auto">
                      {JSON.stringify(trace.response.data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error Section */}
          {trace.error && (
            <div>
              <div className="text-xs text-red-400 mb-1 font-semibold">Error</div>
              <div className="bg-red-900/20 rounded p-2 space-y-2">
                <div className="text-xs text-red-300">{trace.error.message}</div>
                {trace.error.code && (
                  <div className="text-xs">
                    <span className="text-gray-500">Code: </span>
                    <span className="text-red-400 font-mono">{trace.error.code}</span>
                  </div>
                )}
                {trace.error.stack && (
                  <pre className="text-xs text-red-300/70 font-mono mt-1 max-h-32 overflow-y-auto">
                    {trace.error.stack}
                  </pre>
                )}
              </div>
            </div>
          )}

          {/* Context Section */}
          <div>
            <div className="text-xs text-gray-500 mb-1 font-semibold">Context</div>
            <div className="bg-black/30 rounded p-2 text-xs space-y-1">
              <div>
                <span className="text-gray-500">Page: </span>
                <span className="text-gray-300 font-mono">{trace.context.page}</span>
              </div>
              {trace.context.component && (
                <div>
                  <span className="text-gray-500">Component: </span>
                  <span className="text-gray-300 font-mono">{trace.context.component}</span>
                </div>
              )}
              {trace.context.action && (
                <div>
                  <span className="text-gray-500">Action: </span>
                  <span className="text-gray-300 font-mono">{trace.context.action}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ===== SIMULATE ERROR FUNCTIONS =====

const randomId = () => Math.random().toString(36).substring(2, 8);

const errorMessages = [
  'Failed to fetch user data',
  'Network connection timeout',
  'Invalid response format',
  'Session expired unexpectedly',
  'Database query failed',
  'Rate limit exceeded',
  'Permission denied',
  'Resource not found',
  'Validation error occurred',
  'Unexpected server response',
];

const getRandomMessage = () => errorMessages[Math.floor(Math.random() * errorMessages.length)];

const simulateErrors = {
  consoleError: () => {
    console.error(`[Simulated:${randomId()}] ${getRandomMessage()}`);
  },
  consoleWarn: () => {
    console.warn(`[Simulated:${randomId()}] ${getRandomMessage()}`);
  },
  unhandledException: () => {
    setTimeout(() => {
      throw new Error(`[Simulated:${randomId()}] ${getRandomMessage()}`);
    }, 0);
  },
  promiseRejection: () => {
    Promise.reject(new Error(`[Simulated:${randomId()}] ${getRandomMessage()}`));
  },
  apiError: async () => {
    try {
      // Call a non-existent endpoint to trigger 404
      await api.get(`/debug/simulate-error-${randomId()}`);
    } catch {
      // Error is captured by interceptor
    }
  },
  api500: async () => {
    try {
      // Call test endpoint that returns 500
      await api.post(`/debug/simulate-500-${randomId()}`);
    } catch {
      // Error is captured by interceptor
    }
  },
};

// ===== MAIN ERROR CONSOLE COMPONENT =====

export const ErrorConsole: React.FC = () => {
  const {
    errors,
    traces,
    isOpen,
    activeTab,
    setActiveTab,
    closeConsole,
    clearErrors,
    clearTraces,
    exportAll,
  } = useErrorConsole();
  const [showSimulateMenu, setShowSimulateMenu] = useState(false);

  const [errorFilter, setErrorFilter] = useState<ErrorSeverity | 'all'>('all');
  const [traceFilter, setTraceFilter] = useState<TraceStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredErrors = useMemo(() => {
    return errors.filter((error) => {
      const matchesFilter = errorFilter === 'all' || error.severity === errorFilter;
      const matchesSearch =
        searchQuery === '' ||
        error.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        error.source.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [errors, errorFilter, searchQuery]);

  const filteredTraces = useMemo(() => {
    return traces.filter((trace) => {
      const matchesFilter = traceFilter === 'all' || trace.status === traceFilter;
      const matchesSearch =
        searchQuery === '' ||
        trace.request.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trace.request.method.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [traces, traceFilter, searchQuery]);

  const errorCounts = useMemo(() => {
    return errors.reduce(
      (acc, error) => {
        acc[error.severity] = (acc[error.severity] || 0) + 1;
        return acc;
      },
      {} as Record<ErrorSeverity, number>
    );
  }, [errors]);

  const traceCounts = useMemo(() => {
    return traces.reduce(
      (acc, trace) => {
        acc[trace.status] = (acc[trace.status] || 0) + 1;
        return acc;
      },
      {} as Record<TraceStatus, number>
    );
  }, [traces]);

  const handleExport = () => {
    const data = exportAll();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center p-4 pointer-events-none">
      <div
        className="w-full max-w-5xl h-[70vh] bg-gray-900 rounded-lg shadow-2xl border border-gray-700 flex flex-col pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700 bg-gray-800 rounded-t-lg">
          <div className="flex items-center gap-3">
            <Terminal size={18} className="text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-200">Debug Console</h2>

            {/* Tab Switcher */}
            <div className="flex items-center bg-gray-700 rounded-md p-0.5 ml-2">
              <button
                onClick={() => setActiveTab('errors')}
                className={`px-3 py-1 text-xs rounded ${
                  activeTab === 'errors'
                    ? 'bg-gray-600 text-white'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                Errors
                {errors.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">
                    {errors.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('traces')}
                className={`px-3 py-1 text-xs rounded flex items-center gap-1 ${
                  activeTab === 'traces'
                    ? 'bg-gray-600 text-white'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <Activity size={12} />
                Traces
                {traces.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">
                    {traces.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('demo')}
                className={`px-3 py-1 text-xs rounded flex items-center gap-1 ${
                  activeTab === 'demo'
                    ? 'bg-gray-600 text-white'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <FlaskConical size={12} />
                Demo
                {isDemoMode() && (
                  <span className="ml-1 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">
                    ON
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('e2e')}
                className={`px-3 py-1 text-xs rounded flex items-center gap-1 ${
                  activeTab === 'e2e'
                    ? 'bg-gray-600 text-white'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                E2E
              </button>
            </div>

            {/* Status badges */}
            <div className="flex items-center gap-1 ml-2">
              {activeTab === 'errors' ? (
                <>
                  {errorCounts.error > 0 && (
                    <span className="px-1.5 py-0.5 text-xs rounded bg-red-500/20 text-red-400">
                      {errorCounts.error} err
                    </span>
                  )}
                  {errorCounts.warn > 0 && (
                    <span className="px-1.5 py-0.5 text-xs rounded bg-yellow-500/20 text-yellow-400">
                      {errorCounts.warn} warn
                    </span>
                  )}
                </>
              ) : (
                <>
                  {traceCounts.error > 0 && (
                    <span className="px-1.5 py-0.5 text-xs rounded bg-red-500/20 text-red-400">
                      {traceCounts.error} failed
                    </span>
                  )}
                  {traceCounts.success > 0 && (
                    <span className="px-1.5 py-0.5 text-xs rounded bg-green-500/20 text-green-400">
                      {traceCounts.success} ok
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 hidden sm:inline">
              <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-gray-300">Cmd+E</kbd>
            </span>
            <button
              onClick={closeConsole}
              className="p-1 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Toolbar (hidden in demo/e2e tabs) */}
        {activeTab !== 'demo' && activeTab !== 'e2e' && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-700 bg-gray-800/50">
          <div className="flex items-center gap-1">
            <Filter size={14} className="text-gray-500" />
            {activeTab === 'errors' ? (
              <select
                value={errorFilter}
                onChange={(e) => setErrorFilter(e.target.value as ErrorSeverity | 'all')}
                className="text-xs bg-gray-700 text-gray-300 border-none rounded px-2 py-1 focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">All</option>
                <option value="error">Errors</option>
                <option value="warn">Warnings</option>
                <option value="info">Info</option>
                <option value="debug">Debug</option>
              </select>
            ) : (
              <select
                value={traceFilter}
                onChange={(e) => setTraceFilter(e.target.value as TraceStatus | 'all')}
                className="text-xs bg-gray-700 text-gray-300 border-none rounded px-2 py-1 focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">All</option>
                <option value="success">Success</option>
                <option value="error">Failed</option>
                <option value="pending">Pending</option>
              </select>
            )}
          </div>
          <input
            type="text"
            placeholder={activeTab === 'errors' ? 'Search errors...' : 'Search traces...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 text-xs bg-gray-700 text-gray-300 border-none rounded px-3 py-1.5 placeholder-gray-500 focus:ring-1 focus:ring-blue-500"
          />
          <div className="relative">
            <button
              onClick={() => setShowSimulateMenu(!showSimulateMenu)}
              className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-yellow-400 hover:bg-gray-700 rounded"
              title="Simulate errors for testing"
            >
              <Zap size={14} />
              <span className="hidden sm:inline">Simulate</span>
            </button>
            {showSimulateMenu && (
              <div className="absolute top-full right-0 mt-1 bg-gray-800 border border-gray-700 rounded-md shadow-lg py-1 z-10 min-w-[180px]">
                <div className="px-3 py-1 text-xs text-gray-500 border-b border-gray-700">Frontend Errors</div>
                <button
                  onClick={() => { simulateErrors.consoleError(); setShowSimulateMenu(false); }}
                  className="w-full px-3 py-1.5 text-xs text-left text-gray-300 hover:bg-gray-700"
                >
                  console.error
                </button>
                <button
                  onClick={() => { simulateErrors.consoleWarn(); setShowSimulateMenu(false); }}
                  className="w-full px-3 py-1.5 text-xs text-left text-gray-300 hover:bg-gray-700"
                >
                  console.warn
                </button>
                <button
                  onClick={() => { simulateErrors.unhandledException(); setShowSimulateMenu(false); }}
                  className="w-full px-3 py-1.5 text-xs text-left text-gray-300 hover:bg-gray-700"
                >
                  Unhandled Exception
                </button>
                <button
                  onClick={() => { simulateErrors.promiseRejection(); setShowSimulateMenu(false); }}
                  className="w-full px-3 py-1.5 text-xs text-left text-gray-300 hover:bg-gray-700"
                >
                  Promise Rejection
                </button>
                <div className="px-3 py-1 text-xs text-gray-500 border-b border-t border-gray-700 mt-1">API Errors</div>
                <button
                  onClick={() => { simulateErrors.apiError(); setShowSimulateMenu(false); }}
                  className="w-full px-3 py-1.5 text-xs text-left text-gray-300 hover:bg-gray-700"
                >
                  API 404 (Not Found)
                </button>
                <button
                  onClick={() => { simulateErrors.api500(); setShowSimulateMenu(false); }}
                  className="w-full px-3 py-1.5 text-xs text-left text-gray-300 hover:bg-gray-700"
                >
                  API 500 (Server Error)
                </button>
              </div>
            )}
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded"
            title="Export all as JSON"
          >
            <Download size={14} />
            <span className="hidden sm:inline">Export</span>
          </button>
          <button
            onClick={activeTab === 'errors' ? clearErrors : clearTraces}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded"
            title={`Clear ${activeTab}`}
          >
            <Trash2 size={14} />
            <span className="hidden sm:inline">Clear</span>
          </button>
        </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'e2e' ? (
            <E2ETab />
          ) : activeTab === 'demo' ? (
            <DemoTab />
          ) : activeTab === 'errors' ? (
            filteredErrors.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <AlertCircle size={32} className="mb-2 opacity-50" />
                <p className="text-sm">
                  {errors.length === 0 ? 'No errors captured' : 'No matching errors'}
                </p>
                <p className="text-xs mt-1">Errors will appear here automatically</p>
              </div>
            ) : (
              filteredErrors.map((error) => <ErrorItem key={error.id} error={error} />)
            )
          ) : filteredTraces.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <Activity size={32} className="mb-2 opacity-50" />
              <p className="text-sm">
                {traces.length === 0 ? 'No API requests captured' : 'No matching traces'}
              </p>
              <p className="text-xs mt-1">API requests will appear here automatically</p>
            </div>
          ) : (
            filteredTraces.map((trace) => <TraceItem key={trace.id} trace={trace} />)
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-gray-700 bg-gray-800/50 rounded-b-lg">
          <p className="text-xs text-gray-500">
            {activeTab === 'e2e'
              ? 'E2E tools for test account lifecycle: reset sessions and delete test users.'
              : activeTab === 'demo'
              ? 'Toggle demo mode for YC pitch demos. Demo data is isolated from real user data.'
              : activeTab === 'errors'
              ? 'Captures: console.error, console.warn, unhandled exceptions, promise rejections, API errors'
              : 'Captures: All API requests with full request/response data for AI debugging'}
          </p>
        </div>
      </div>
    </div>
  );
};
