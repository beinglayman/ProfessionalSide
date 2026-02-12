import React from 'react';
import {
  Plug,
  Github,
  SquareKanban,
  Hash,
  Mail,
  Figma,
  Video,
  Link2,
  AlertTriangle,
  CheckCircle2,
  Circle,
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
  SquareKanban,
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

function ConnectedRow({ integration }: { integration: Integration }) {
  const IconComponent = ICON_MAP[integration.icon];
  const status = STATUS_CONFIG[integration.status];
  const showFix = integration.status === 'stale' || integration.status === 'error';

  return (
    <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-gray-50">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary-50">
        {IconComponent ? (
          <IconComponent className="h-4 w-4 text-primary-500" />
        ) : (
          <Link2 className="h-4 w-4 text-gray-400" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-800">{integration.name}</p>
        <div className="mt-0.5 flex items-center gap-1.5">
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
          <span className="text-[11px] text-gray-400">
            {status.label} &middot; {formatRelativeTime(integration.lastSync)}
          </span>
        </div>
      </div>

      <Sparkline data={integration.sparklineData} className="hidden h-6 w-16 sm:block" />

      <div className="text-right">
        <p className="text-sm font-semibold text-gray-800">{integration.activityVolume}</p>
        <p className="text-[10px] text-gray-400">events</p>
      </div>

      {showFix && (
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

function AvailableCard({ integration }: { integration: Integration }) {
  const IconComponent = ICON_MAP[integration.icon];

  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-gray-300 bg-gray-50/50 p-5 transition-colors hover:border-primary-300 hover:bg-primary-50/30">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100">
        {IconComponent ? (
          <IconComponent className="h-6 w-6 text-gray-400" />
        ) : (
          <Link2 className="h-6 w-6 text-gray-400" />
        )}
      </div>
      <p className="mt-3 text-sm font-semibold text-gray-700">{integration.name}</p>
      <p className="mt-1 text-[11px] text-gray-400">Not connected</p>
      <button
        type="button"
        className="mt-3 rounded-lg bg-primary-600 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-700"
      >
        <span className="flex items-center gap-1">
          <Link2 className="h-3 w-3" /> Connect
        </span>
      </button>
    </div>
  );
}

export function IntegrationV7() {
  const data = mockIntegrations;
  const connected = data.integrations.filter((i) => i.connected);
  const available = data.integrations.filter((i) => !i.connected);

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
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          {/* Connected section */}
          <div className="lg:col-span-3">
            <div className="mb-2 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <h4 className="text-sm font-semibold text-gray-700">
                Connected ({connected.length})
              </h4>
            </div>
            <div className="divide-y divide-gray-50 rounded-xl border border-gray-200 bg-white">
              {connected.map((integration) => (
                <ConnectedRow key={integration.id} integration={integration} />
              ))}
            </div>
          </div>

          {/* Available section */}
          <div className="lg:col-span-2">
            <div className="mb-2 flex items-center gap-2">
              <Circle className="h-4 w-4 text-gray-400" />
              <h4 className="text-sm font-semibold text-gray-700">
                Available ({available.length})
              </h4>
            </div>
            <div className="grid gap-3">
              {available.map((integration) => (
                <AvailableCard key={integration.id} integration={integration} />
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
