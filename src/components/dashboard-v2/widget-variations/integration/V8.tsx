import React from 'react';
import {
  Plug,
  Github,
  KanbanSquare,
  Hash,
  Mail,
  Figma,
  Video,
  Link2,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { cn } from '../../../../lib/utils';
import { mockIntegrations } from '../../mock-data';
import type {
  IntegrationHealthData,
  Integration,
  IntegrationStatusType,
} from '../../types';

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  Github,
  KanbanSquare,
  Hash,
  Mail,
  Figma,
  Video,
};

const STATUS_CONFIG: Record<
  IntegrationStatusType,
  { dotClass: string; label: string; pulse: boolean }
> = {
  active: { dotClass: 'bg-emerald-500', label: 'Active', pulse: true },
  stale: { dotClass: 'bg-amber-500', label: 'Stale', pulse: false },
  error: { dotClass: 'bg-red-500', label: 'Error', pulse: false },
  disconnected: { dotClass: 'bg-gray-300', label: 'Disconnected', pulse: false },
};

function formatRelativeTime(isoDate: string): string {
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

function LargeTile({ integration }: { integration: Integration }) {
  const IconComponent = ICON_MAP[integration.icon];
  const status = STATUS_CONFIG[integration.status];
  const showAction = integration.status === 'stale' || integration.status === 'error';

  return (
    <div className="group col-span-2 flex items-center gap-4 rounded-xl border border-gray-200 border-l-[3px] border-l-primary-400 bg-white p-4 transition-all hover:shadow-md">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary-50">
        {IconComponent ? (
          <IconComponent className="h-5 w-5 text-primary-500" />
        ) : (
          <Link2 className="h-5 w-5 text-gray-400" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-gray-800">{integration.name}</p>
          <span className="relative flex h-2 w-2">
            {status.pulse && (
              <span
                className={cn(
                  'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
                  status.dotClass
                )}
              />
            )}
            <span className={cn('relative inline-flex h-2 w-2 rounded-full', status.dotClass)} />
          </span>
        </div>
        <p className="mt-0.5 text-[11px] text-gray-400">
          {status.label} &middot; Synced {formatRelativeTime(integration.lastSync)}
        </p>
      </div>

      <Sparkline data={integration.sparklineData} className="hidden h-6 w-16 sm:block" />

      <div className="text-right">
        <p className="text-lg font-bold text-gray-800">{integration.activityVolume}</p>
        <p className="text-[10px] text-gray-400">events</p>
      </div>

      {showAction && (
        <button
          type="button"
          className="flex-shrink-0 rounded-lg bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 transition-colors hover:bg-amber-100"
        >
          <span className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> Fix
          </span>
        </button>
      )}
    </div>
  );
}

function SmallTile({ integration }: { integration: Integration }) {
  const IconComponent = ICON_MAP[integration.icon];

  return (
    <div className="group col-span-1 flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50/50 p-4 transition-all hover:border-primary-300 hover:bg-white hover:shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
        {IconComponent ? (
          <IconComponent className="h-5 w-5 text-gray-400" />
        ) : (
          <Link2 className="h-5 w-5 text-gray-400" />
        )}
      </div>
      <p className="mt-2 text-sm font-medium text-gray-500">{integration.name}</p>
      <button
        type="button"
        className="mt-2 rounded-lg bg-primary-50 px-3 py-1 text-[11px] font-semibold text-primary-600 transition-colors hover:bg-primary-100"
      >
        <span className="flex items-center gap-1">
          <Link2 className="h-3 w-3" /> Connect
        </span>
      </button>
    </div>
  );
}

export function IntegrationV8() {
  const data = mockIntegrations;
  const connected = data.integrations.filter((i) => i.connected);
  const disconnected = data.integrations.filter((i) => !i.connected);

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
            {data.totalConnected}/{data.totalAvailable} connected
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="grid grid-cols-4 gap-3">
          {/* Large tiles for connected integrations */}
          {connected.map((integration) => (
            <LargeTile key={integration.id} integration={integration} />
          ))}
          {/* Small tiles for disconnected integrations */}
          {disconnected.map((integration) => (
            <SmallTile key={integration.id} integration={integration} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
