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

const STATUS_BAR_COLOR: Record<IntegrationStatusType, string> = {
  active: 'bg-emerald-500',
  stale: 'bg-amber-500',
  error: 'bg-red-500',
  disconnected: 'bg-gray-300',
};

const STATUS_BAR_BG: Record<IntegrationStatusType, string> = {
  active: 'bg-emerald-100',
  stale: 'bg-amber-100',
  error: 'bg-red-100',
  disconnected: 'bg-gray-100',
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

function BarRow({ integration, maxVolume }: { integration: Integration; maxVolume: number }) {
  const IconComponent = ICON_MAP[integration.icon];
  const barPercent = maxVolume > 0 ? (integration.activityVolume / maxVolume) * 100 : 0;
  const barColor = STATUS_BAR_COLOR[integration.status];
  const barBg = STATUS_BAR_BG[integration.status];
  const showAction =
    integration.status === 'stale' ||
    integration.status === 'error' ||
    integration.status === 'disconnected';

  return (
    <div className="group flex items-start gap-3 py-2">
      {/* Icon + name */}
      <div className="flex w-[120px] flex-shrink-0 items-center gap-2.5">
        <div
          className={cn(
            'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg',
            integration.connected ? 'bg-primary-50' : 'bg-gray-100'
          )}
        >
          {IconComponent ? (
            <IconComponent
              className={cn(
                'h-3.5 w-3.5',
                integration.connected ? 'text-primary-500' : 'text-gray-400'
              )}
            />
          ) : (
            <Link2 className="h-3.5 w-3.5 text-gray-400" />
          )}
        </div>
        <span className="truncate text-sm font-medium text-gray-700">{integration.name}</span>
      </div>

      {/* Bar + volume */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className={cn('h-5 flex-1 overflow-hidden rounded-full', barBg)}>
            <div
              className={cn('h-full rounded-full transition-all duration-500', barColor)}
              style={{ width: `${Math.max(barPercent, 2)}%` }}
            />
          </div>
          <span className="w-10 flex-shrink-0 text-right text-xs font-semibold text-gray-700">
            {integration.activityVolume > 0 ? integration.activityVolume : '--'}
          </span>
          {/* Action */}
          {showAction ? (
            <button
              type="button"
              className={cn(
                'flex-shrink-0 rounded px-2 py-1 text-[11px] font-semibold transition-colors',
                integration.status === 'disconnected'
                  ? 'bg-primary-50 text-primary-600 hover:bg-primary-100'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              )}
            >
              {integration.status === 'disconnected' ? (
                <span className="flex items-center gap-1">
                  <Link2 className="h-3 w-3" /> Connect
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Fix
                </span>
              )}
            </button>
          ) : (
            <div className="w-[60px] flex-shrink-0" />
          )}
        </div>
        {/* Sync time */}
        <p className="mt-0.5 text-[10px] text-gray-400">
          {integration.connected ? `Synced ${formatRelativeTime(integration.lastSync)}` : 'Not connected'}
        </p>
      </div>
    </div>
  );
}

export function IntegrationV6() {
  const data = mockIntegrations;
  const maxVolume = Math.max(...data.integrations.map((i) => i.activityVolume), 1);

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
        <div className="divide-y divide-gray-50">
          {data.integrations.map((integration) => (
            <BarRow key={integration.id} integration={integration} maxVolume={maxVolume} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
