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
  Clock,
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

function getTimeGroup(isoDate: string): string {
  if (!isoDate) return 'not-connected';
  const diff = Date.now() - new Date(isoDate).getTime();
  const hours = diff / 3_600_000;
  if (hours < 1) return 'just-now';
  if (hours < 24) return 'today';
  if (hours < 168) return 'this-week';
  return 'older';
}

const TIME_GROUP_LABELS: Record<string, string> = {
  'just-now': 'Just now',
  today: 'Today',
  'this-week': 'This week',
  older: 'Older',
  'not-connected': 'Not connected',
};

const TIME_GROUP_ORDER = ['just-now', 'today', 'this-week', 'older', 'not-connected'];

function TimelineEvent({ integration }: { integration: Integration }) {
  const IconComponent = ICON_MAP[integration.icon];
  const status = STATUS_CONFIG[integration.status];

  return (
    <div className="relative flex gap-4 pb-4 last:pb-0">
      {/* Timeline dot */}
      <div className="relative flex flex-col items-center">
        <div
          className={cn(
            'z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 border-white shadow-sm',
            integration.connected ? 'bg-primary-50' : 'bg-gray-100'
          )}
        >
          {IconComponent ? (
            <IconComponent
              className={cn(
                'h-4 w-4',
                integration.connected ? 'text-primary-500' : 'text-gray-400'
              )}
            />
          ) : (
            <Link2 className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-gray-800">{integration.name}</p>
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
          {integration.connected && integration.activityVolume > 0 && (
            <Badge variant="secondary" className="text-[10px] font-bold">
              {integration.activityVolume} events
            </Badge>
          )}
        </div>
        <p className="mt-0.5 text-xs text-gray-400">
          {integration.connected
            ? `Synced ${formatRelativeTime(integration.lastSync)}`
            : 'Not connected'}
        </p>
        {!integration.connected && (
          <button
            type="button"
            className="mt-1.5 rounded-md bg-primary-50 px-2.5 py-1 text-[11px] font-semibold text-primary-600 transition-colors hover:bg-primary-100"
          >
            <span className="flex items-center gap-1">
              <Link2 className="h-3 w-3" /> Connect
            </span>
          </button>
        )}
        {(integration.status === 'stale' || integration.status === 'error') && (
          <button
            type="button"
            className="mt-1.5 rounded-md bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 transition-colors hover:bg-amber-100"
          >
            Fix sync issue
          </button>
        )}
      </div>
    </div>
  );
}

export function IntegrationV10() {
  const data = mockIntegrations;

  // Group integrations by time bucket
  const grouped = new Map<string, Integration[]>();
  for (const integration of data.integrations) {
    const group = getTimeGroup(integration.lastSync);
    if (!grouped.has(group)) grouped.set(group, []);
    grouped.get(group)!.push(integration);
  }

  // Sort groups by predefined order
  const sortedGroups = TIME_GROUP_ORDER.filter((g) => grouped.has(g));

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
        <div className="relative">
          {/* Purple timeline line */}
          <div className="absolute bottom-0 left-[15px] top-0 w-0.5 bg-primary-200" />

          {sortedGroups.map((groupKey) => {
            const integrations = grouped.get(groupKey)!;
            return (
              <div key={groupKey} className="relative mb-4 last:mb-0">
                {/* Group header */}
                <div className="relative mb-3 flex items-center gap-2 pl-10">
                  <Clock className="h-3 w-3 text-gray-400" />
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    {TIME_GROUP_LABELS[groupKey]}
                  </h4>
                  <div className="flex-1 border-b border-dashed border-gray-200" />
                </div>

                {/* Events in group */}
                <div className="space-y-1">
                  {integrations.map((integration) => (
                    <TimelineEvent key={integration.id} integration={integration} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
