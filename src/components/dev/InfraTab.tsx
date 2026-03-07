import React, { useState, useCallback } from 'react';
import {
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Database,
  Server,
  Copy,
  Check,
  Download,
  Shield,
} from 'lucide-react';
import { api } from '../../lib/api';

interface TableStatus {
  exists: boolean;
  count: number | null;
  error: string | null;
}

interface InfraDiag {
  health: 'healthy' | 'degraded' | 'error';
  diagnosisMs: number;
  summary: {
    missingTables: string[];
    failedTables: string[];
    ghostMigrations: string[];
    totalTables: number;
    existingTables: number;
  };
  tables: Record<string, TableStatus>;
  migrations: Array<{
    migration_name?: string;
    finished_at?: string;
    applied_steps_count?: number;
    rolled_back_at?: string | null;
    error?: string;
  }>;
  connection: {
    ssl: boolean | string;
    pgVersion: string;
    databaseUrlSet: boolean;
    databaseUrlHasSsl: boolean;
  };
  runtime: {
    nodeVersion: string;
    nodeEnv: string;
    uptimeSeconds: number;
    memoryMB: { rss: number; heapUsed: number; heapTotal: number };
    platform: string;
    pid: number;
  };
}

const COPY_TIMEOUT = 2000;

const HealthBadge: React.FC<{ health: InfraDiag['health'] }> = ({ health }) => {
  const config = {
    healthy: { icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/20', label: 'Healthy' },
    degraded: { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-500/20', label: 'Degraded' },
    error: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/20', label: 'Error' },
  }[health];
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${config.bg} ${config.color}`}>
      <Icon size={12} />
      {config.label}
    </span>
  );
};

const formatUptime = (s: number) => {
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h ${m}m`;
};

export const InfraTab: React.FC = () => {
  const [data, setData] = useState<InfraDiag | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const runDiagnostics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/debug/infra');
      setData(res.data.data);
      setLastFetched(new Date());
    } catch (e: any) {
      setError(e.response?.data?.message || e.message || 'Failed to reach backend');
    } finally {
      setLoading(false);
    }
  }, []);

  const copyReport = async () => {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), COPY_TIMEOUT);
    } catch {
      // clipboard may not be available
    }
  };

  const downloadReport = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `infra-diag-${new Date().toISOString().slice(0, 19).replace(/:/g, '')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Not yet run
  if (!data && !loading && !error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-3">
        <Server size={32} className="opacity-50" />
        <p className="text-sm">Infrastructure Diagnostics</p>
        <p className="text-xs text-gray-600 max-w-sm text-center">
          Check database tables, migrations, connection status, and runtime info.
          Useful for debugging deployment issues.
        </p>
        <button
          onClick={runDiagnostics}
          className="mt-2 flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-md transition-colors"
        >
          <Database size={14} />
          Run Diagnostics
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 text-xs">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {data && <HealthBadge health={data.health} />}
          {data && (
            <span className="text-gray-500">
              {data.diagnosisMs}ms
              {lastFetched && <> &middot; {lastFetched.toLocaleTimeString()}</>}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {data && (
            <>
              <button
                onClick={copyReport}
                className="flex items-center gap-1 px-2 py-1 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded"
                title="Copy JSON report"
              >
                {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                <span className="hidden sm:inline">Copy</span>
              </button>
              <button
                onClick={downloadReport}
                className="flex items-center gap-1 px-2 py-1 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded"
                title="Download JSON report"
              >
                <Download size={14} />
                <span className="hidden sm:inline">Download</span>
              </button>
            </>
          )}
          <button
            onClick={runDiagnostics}
            disabled={loading}
            className="flex items-center gap-1 px-2 py-1 text-gray-400 hover:text-blue-400 hover:bg-gray-700 rounded disabled:opacity-50"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            <span className="hidden sm:inline">{loading ? 'Running...' : 'Re-run'}</span>
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded p-3 text-red-300">
          <div className="font-semibold mb-1">Diagnostics failed</div>
          <div className="font-mono">{error}</div>
          <p className="text-red-400/70 mt-1">
            If the backend is unreachable, check Azure Portal &rarr; Log stream for container startup errors.
          </p>
        </div>
      )}

      {loading && !data && (
        <div className="flex items-center justify-center py-12 text-gray-500">
          <Loader2 size={20} className="animate-spin mr-2" />
          Running diagnostics...
        </div>
      )}

      {data && (
        <>
          {/* Summary alerts */}
          {data.summary.missingTables.length > 0 && (
            <div className="bg-red-900/20 border border-red-800 rounded p-3">
              <div className="flex items-center gap-2 text-red-400 font-semibold mb-1">
                <XCircle size={14} />
                Missing Tables ({data.summary.missingTables.length})
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {data.summary.missingTables.map((t) => (
                  <span key={t} className="px-2 py-0.5 bg-red-500/20 text-red-300 rounded font-mono">{t}</span>
                ))}
              </div>
            </div>
          )}

          {data.summary.ghostMigrations.length > 0 && (
            <div className="bg-yellow-900/20 border border-yellow-800 rounded p-3">
              <div className="flex items-center gap-2 text-yellow-400 font-semibold mb-1">
                <AlertTriangle size={14} />
                Ghost Migrations
              </div>
              <p className="text-yellow-300/80 mb-1">
                These migrations are recorded as applied but their tables don't exist.
                Delete the row from <code className="bg-black/30 px-1 rounded">_prisma_migrations</code> and redeploy.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {data.summary.ghostMigrations.map((m) => (
                  <span key={m} className="px-2 py-0.5 bg-yellow-500/20 text-yellow-300 rounded font-mono">{m}</span>
                ))}
              </div>
            </div>
          )}

          {/* Tables grid */}
          <div>
            <div className="text-gray-400 font-semibold mb-2 flex items-center gap-1.5">
              <Database size={14} />
              Tables ({data.summary.existingTables}/{data.summary.totalTables})
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {Object.entries(data.tables).map(([name, info]) => (
                <div
                  key={name}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded font-mono ${
                    info.exists
                      ? 'bg-green-900/10 border border-green-900/30'
                      : 'bg-red-900/20 border border-red-800/50'
                  }`}
                >
                  <span className={info.exists ? 'text-gray-300' : 'text-red-300'}>{name}</span>
                  {info.exists ? (
                    <span className="text-green-400/70 ml-2">{info.count}</span>
                  ) : (
                    <XCircle size={12} className="text-red-400 ml-2" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Migrations */}
          <div>
            <div className="text-gray-400 font-semibold mb-2">Recent Migrations (last 10)</div>
            <div className="bg-black/30 rounded overflow-hidden">
              {data.migrations.map((m, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between px-3 py-1.5 font-mono border-b border-gray-800 last:border-0 ${
                    m.error ? 'text-red-300' : m.rolled_back_at ? 'text-yellow-300' : 'text-gray-300'
                  }`}
                >
                  <span className="truncate flex-1">
                    {m.error || m.migration_name || 'unknown'}
                  </span>
                  <span className="text-gray-500 ml-3 flex-shrink-0">
                    {m.finished_at
                      ? new Date(m.finished_at).toLocaleDateString()
                      : m.rolled_back_at
                        ? 'rolled back'
                        : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Connection + Runtime side by side */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="text-gray-400 font-semibold mb-2 flex items-center gap-1.5">
                <Shield size={14} />
                Connection
              </div>
              <div className="bg-black/30 rounded p-3 space-y-1.5 font-mono">
                <Row label="SSL active" value={String(data.connection.ssl)} ok={data.connection.ssl === true} />
                <Row label="DATABASE_URL set" value={String(data.connection.databaseUrlSet)} ok={data.connection.databaseUrlSet} />
                <Row label="sslmode in URL" value={String(data.connection.databaseUrlHasSsl)} ok={data.connection.databaseUrlHasSsl} />
                <Row label="PG version" value={data.connection.pgVersion} />
              </div>
            </div>
            <div>
              <div className="text-gray-400 font-semibold mb-2 flex items-center gap-1.5">
                <Server size={14} />
                Runtime
              </div>
              <div className="bg-black/30 rounded p-3 space-y-1.5 font-mono">
                <Row label="Node" value={data.runtime.nodeVersion} />
                <Row label="NODE_ENV" value={data.runtime.nodeEnv} ok={data.runtime.nodeEnv === 'production'} />
                <Row label="Uptime" value={formatUptime(data.runtime.uptimeSeconds)} />
                <Row label="Memory (RSS)" value={`${data.runtime.memoryMB.rss} MB`} />
                <Row label="Heap" value={`${data.runtime.memoryMB.heapUsed}/${data.runtime.memoryMB.heapTotal} MB`} />
                <Row label="PID" value={String(data.runtime.pid)} />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const Row: React.FC<{ label: string; value: string; ok?: boolean }> = ({ label, value, ok }) => (
  <div className="flex items-center justify-between">
    <span className="text-gray-500">{label}</span>
    <span className={ok === true ? 'text-green-400' : ok === false ? 'text-yellow-400' : 'text-gray-300'}>
      {value}
    </span>
  </div>
);
