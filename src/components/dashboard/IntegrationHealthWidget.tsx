import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Plug, Github, Figma, Mail, MessageSquare, FileText, Users, Link2, AlertTriangle, Database,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import { useMCPIntegrations, useMCPIntegrationValidation } from '../../hooks/useMCP';
import { useActivities, isGroupedResponse } from '../../hooks/useActivities';
import type { MCPIntegration } from '../../services/mcp.service';
import { getToolName } from '../../constants/tools';

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  github: Github,
  jira: Database,
  figma: Figma,
  outlook: Mail,
  confluence: FileText,
  slack: MessageSquare,
  teams: Users,
};

type RowStatus = 'active' | 'stale' | 'error' | 'disconnected';

const STATUS_CONFIG: Record<RowStatus, { dotClass: string; label: string; pulse: boolean }> = {
  active: { dotClass: 'bg-emerald-500', label: 'Active', pulse: true },
  stale: { dotClass: 'bg-amber-500', label: 'Stale', pulse: false },
  error: { dotClass: 'bg-red-500', label: 'Error', pulse: false },
  disconnected: { dotClass: 'bg-gray-300', label: 'Disconnected', pulse: false },
};

function formatRelativeTime(isoDate: string | null): string {
  if (!isoDate) return '--';
  const diff = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function Sparkline({ data, className }: { data: number[]; className?: string }) {
  if (!data.length || data.every((v) => v === 0)) return null;
  const width = 64;
  const height = 24;
  const pad = 2;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const points = data
    .map((val, i) => {
      const x = pad + (i / (data.length - 1)) * (width - pad * 2);
      const y = height - pad - ((val - min) / range) * (height - pad * 2);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={cn('flex-shrink-0', className)} fill="none">
      <polyline
        points={points}
        stroke="#9F5FE7"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

interface IntegrationRowData {
  toolType: string;
  name: string;
  isConnected: boolean;
  status: RowStatus;
  lastUsedAt: string | null;
  sparklineData: number[];
  activityCount: number;
}

function IntegrationRow({ row }: { row: IntegrationRowData }) {
  const IconComponent = ICON_MAP[row.toolType] ?? Link2;
  const status = STATUS_CONFIG[row.status];
  const showAction = row.status === 'stale' || row.status === 'error' || row.status === 'disconnected';

  return (
    <div
      className={cn(
        'group flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 transition-colors hover:border-gray-100 hover:bg-gray-50/60',
        !row.isConnected && 'opacity-60'
      )}
    >
      {/* Icon */}
      <div className={cn(
        'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg',
        row.isConnected ? 'bg-primary-50' : 'bg-gray-100'
      )}>
        <IconComponent className={cn('h-[18px] w-[18px]', row.isConnected ? 'text-primary-500' : 'text-gray-400')} />
      </div>

      {/* Name + status */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-800">{row.name}</p>
        <div className="mt-0.5 flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            {status.pulse && (
              <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-75', status.dotClass)} />
            )}
            <span className={cn('relative inline-flex h-2 w-2 rounded-full', status.dotClass)} />
          </span>
          <span className="text-[11px] text-gray-400">
            {status.label}
            {row.isConnected && <> &middot; {formatRelativeTime(row.lastUsedAt)}</>}
          </span>
        </div>
      </div>

      {/* Sparkline + volume */}
      {row.isConnected && (
        <div className="hidden items-center gap-2.5 sm:flex">
          <Sparkline data={row.sparklineData} className="h-6 w-16" />
          <div className="text-right">
            <p className="text-sm font-semibold text-gray-800">{row.activityCount}</p>
            <p className="text-[10px] text-gray-400">events</p>
          </div>
        </div>
      )}

      {/* Action */}
      {showAction && (
        <Link
          to={'/settings?tab=integrations'}
          className={cn(
            'flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
            row.status === 'disconnected'
              ? 'bg-primary-50 text-primary-600 hover:bg-primary-100'
              : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
          )}
        >
          {row.status === 'disconnected' ? (
            <span className="flex items-center gap-1">
              <Link2 className="h-3 w-3" /> Connect
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Fix
            </span>
          )}
        </Link>
      )}
    </div>
  );
}

export function IntegrationHealthWidget() {
  const { data: integrationsData } = useMCPIntegrations();
  const { data: validationData } = useMCPIntegrationValidation();
  const { data: activitiesData } = useActivities({ limit: 200 });

  const integrations = integrationsData?.integrations ?? [];
  const validations = validationData?.validations ?? {};

  // Build per-source activity counts for last 7 days
  const sourceSparklines = useMemo(() => {
    const map: Record<string, number[]> = {};
    const today = new Date();
    const days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().split('T')[0]);
    }

    if (!activitiesData) return { map: {}, days };

    const activities = isGroupedResponse(activitiesData)
      ? activitiesData.groups.flatMap((g) => g.activities ?? [])
      : activitiesData.data ?? [];

    for (const a of activities) {
      const day = new Date(a.timestamp).toISOString().split('T')[0];
      const di = days.indexOf(day);
      if (di === -1) continue;
      if (!map[a.source]) map[a.source] = Array(7).fill(0);
      map[a.source][di]++;
    }

    return { map, days };
  }, [activitiesData]);

  const rows: IntegrationRowData[] = useMemo(() => {
    return integrations.map((integ: MCPIntegration): IntegrationRowData => {
      const validation = validations[integ.toolType];
      let status: RowStatus = 'disconnected';

      if (integ.isConnected) {
        if (validation?.status === 'expired') status = 'stale';
        else if (validation?.status === 'invalid') status = 'error';
        else status = 'active';
      }

      const sparkline = sourceSparklines.map[integ.toolType] ?? Array(7).fill(0);
      const total = sparkline.reduce((s, v) => s + v, 0);

      return {
        toolType: integ.toolType,
        name: getToolName(integ.toolType),
        isConnected: integ.isConnected,
        status,
        lastUsedAt: integ.lastUsedAt,
        sparklineData: sparkline,
        activityCount: total,
      };
    });
  }, [integrations, validations, sourceSparklines]);

  const connectedCount = rows.filter((r) => r.isConnected).length;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50">
              <Plug className="h-[18px] w-[18px] text-primary-500" />
            </div>
            <CardTitle className="text-lg">Integration Health</CardTitle>
          </div>
          <Badge variant="secondary" className="text-xs font-bold">
            {connectedCount}/{rows.length} connected
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        {rows.length > 0 ? (
          <div className="divide-y divide-gray-50">
            {rows.map((row) => (
              <IntegrationRow key={row.toolType} row={row} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Plug className="h-10 w-10 text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">No integrations configured yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
