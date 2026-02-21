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
  { dotClass: string; label: string; borderClass: string; badgeBg: string; badgeText: string }
> = {
  active: {
    dotClass: 'bg-emerald-500',
    label: 'Active',
    borderClass: 'border-t-emerald-500',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
  },
  stale: {
    dotClass: 'bg-amber-500',
    label: 'Stale',
    borderClass: 'border-t-amber-500',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-700',
  },
  error: {
    dotClass: 'bg-red-500',
    label: 'Error',
    borderClass: 'border-t-red-500',
    badgeBg: 'bg-red-50',
    badgeText: 'text-red-700',
  },
  disconnected: {
    dotClass: 'bg-gray-300',
    label: 'Disconnected',
    borderClass: 'border-t-gray-300',
    badgeBg: 'bg-gray-100',
    badgeText: 'text-gray-500',
  },
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

function IntegrationCard({ integration }: { integration: Integration }) {
  const IconComponent = ICON_MAP[integration.icon];
  const status = STATUS_CONFIG[integration.status];
  const showAction = integration.status === 'stale' || integration.status === 'error' || integration.status === 'disconnected';

  return (
    <div
      className={cn(
        'flex flex-col items-center rounded-xl border border-gray-200 border-t-[3px] bg-white p-4 transition-shadow hover:shadow-md',
        status.borderClass
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-xl',
          integration.connected ? 'bg-primary-50' : 'bg-gray-100'
        )}
      >
        {IconComponent ? (
          <IconComponent
            className={cn(
              'h-5 w-5',
              integration.connected ? 'text-primary-500' : 'text-gray-400'
            )}
          />
        ) : (
          <Link2 className="h-5 w-5 text-gray-400" />
        )}
      </div>

      {/* Name */}
      <p className="mt-3 text-sm font-semibold text-gray-800">{integration.name}</p>

      {/* Status badge */}
      <div
        className={cn(
          'mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium',
          status.badgeBg,
          status.badgeText
        )}
      >
        <span className={cn('h-1.5 w-1.5 rounded-full', status.dotClass)} />
        {status.label}
      </div>

      {/* Last sync */}
      <p className="mt-2 text-[11px] text-gray-400">
        {integration.connected ? `Synced ${formatRelativeTime(integration.lastSync)}` : 'Not connected'}
      </p>

      {/* Activity stat */}
      {integration.connected && (
        <p className="mt-3 text-2xl font-bold text-gray-800">
          {integration.activityVolume}
          <span className="ml-1 text-xs font-normal text-gray-400">events</span>
        </p>
      )}

      {/* Action */}
      {showAction && (
        <button
          type="button"
          className={cn(
            'mt-3 w-full rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
            integration.status === 'disconnected'
              ? 'bg-primary-50 text-primary-600 hover:bg-primary-100'
              : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
          )}
        >
          {integration.status === 'disconnected' ? (
            <span className="flex items-center justify-center gap-1">
              <Link2 className="h-3 w-3" /> Connect
            </span>
          ) : (
            <span className="flex items-center justify-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Fix
            </span>
          )}
        </button>
      )}
    </div>
  );
}

export function IntegrationV2() {
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
      <CardContent className="pb-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {data.integrations.map((integration) => (
            <IntegrationCard key={integration.id} integration={integration} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
