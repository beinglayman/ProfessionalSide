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
  ArrowUpDown,
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
  { dotClass: string; label: string }
> = {
  active: { dotClass: 'bg-emerald-500', label: 'Active' },
  stale: { dotClass: 'bg-amber-500', label: 'Stale' },
  error: { dotClass: 'bg-red-500', label: 'Error' },
  disconnected: { dotClass: 'bg-gray-300', label: 'Disconnected' },
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

const COLUMNS = [
  { key: 'icon', label: '', width: 'w-10' },
  { key: 'name', label: 'Name', width: 'flex-1' },
  { key: 'status', label: 'Status', width: 'w-28' },
  { key: 'lastSync', label: 'Last Sync', width: 'w-24' },
  { key: 'volume', label: 'Volume', width: 'w-20' },
  { key: 'action', label: '', width: 'w-20' },
] as const;

function TableRow({
  integration,
  even,
}: {
  integration: Integration;
  even: boolean;
}) {
  const IconComponent = ICON_MAP[integration.icon];
  const status = STATUS_CONFIG[integration.status];
  const showAction =
    integration.status === 'stale' ||
    integration.status === 'error' ||
    integration.status === 'disconnected';

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-3 py-2 transition-colors hover:bg-gray-100/60',
        even ? 'bg-gray-50/60' : 'bg-white'
      )}
    >
      {/* Icon */}
      <div className="w-10 flex-shrink-0">
        <div
          className={cn(
            'flex h-6 w-6 items-center justify-center rounded',
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
      </div>

      {/* Name */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-800">{integration.name}</p>
      </div>

      {/* Status */}
      <div className="w-28 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <span className={cn('h-1.5 w-1.5 rounded-full', status.dotClass)} />
          <span className="text-xs text-gray-600">{status.label}</span>
        </div>
      </div>

      {/* Last Sync */}
      <div className="w-24 flex-shrink-0">
        <span className="text-xs text-gray-500">
          {integration.connected ? formatRelativeTime(integration.lastSync) : '--'}
        </span>
      </div>

      {/* Volume */}
      <div className="w-20 flex-shrink-0 text-right">
        <span className="text-xs font-medium text-gray-700">
          {integration.activityVolume > 0 ? integration.activityVolume : '--'}
        </span>
      </div>

      {/* Action */}
      <div className="w-20 flex-shrink-0 text-right">
        {showAction && (
          <button
            type="button"
            className={cn(
              'rounded px-2 py-1 text-[11px] font-semibold transition-colors',
              integration.status === 'disconnected'
                ? 'bg-primary-50 text-primary-600 hover:bg-primary-100'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            )}
          >
            {integration.status === 'disconnected' ? 'Connect' : 'Fix'}
          </button>
        )}
      </div>
    </div>
  );
}

export function IntegrationV4() {
  const data = mockIntegrations;

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
      <CardContent className="px-0 pb-0">
        {/* Header row */}
        <div className="flex items-center gap-3 border-b border-gray-200 bg-gray-50 px-3 py-2">
          <div className="w-10 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              Name <ArrowUpDown className="h-3 w-3 text-gray-300" />
            </span>
          </div>
          <div className="w-28 flex-shrink-0">
            <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              Status <ArrowUpDown className="h-3 w-3 text-gray-300" />
            </span>
          </div>
          <div className="w-24 flex-shrink-0">
            <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              Last Sync <ArrowUpDown className="h-3 w-3 text-gray-300" />
            </span>
          </div>
          <div className="w-20 flex-shrink-0 text-right">
            <span className="flex items-center justify-end gap-1 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              Volume <ArrowUpDown className="h-3 w-3 text-gray-300" />
            </span>
          </div>
          <div className="w-20 flex-shrink-0" />
        </div>

        {/* Rows */}
        <div className="divide-y divide-gray-100">
          {data.integrations.map((integration, idx) => (
            <TableRow
              key={integration.id}
              integration={integration}
              even={idx % 2 === 1}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
