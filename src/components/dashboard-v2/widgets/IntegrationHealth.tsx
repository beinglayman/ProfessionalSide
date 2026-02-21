import React from 'react';
import {
  Plug,
  Github,
  KanbanSquare,
  Hash,
  Mail,
  Figma,
  Video,
  AlertTriangle,
  Link2,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '../../ui/card';
import { Badge } from '../../ui/badge';
import { cn } from '../../../lib/utils';
import type {
  Integration,
  IntegrationHealthData,
  IntegrationStatusType,
  WidgetVariant,
} from '../types';

interface IntegrationHealthProps {
  data: IntegrationHealthData;
  variant?: WidgetVariant;
}

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  Github,
  KanbanSquare,
  Hash,
  Mail,
  Figma,
  Video,
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

const STATUS_CONFIG: Record<
  IntegrationStatusType,
  { dotClass: string; label: string; pulse: boolean }
> = {
  active: {
    dotClass: 'bg-emerald-500',
    label: 'Active',
    pulse: true,
  },
  stale: {
    dotClass: 'bg-amber-500',
    label: 'Stale',
    pulse: false,
  },
  error: {
    dotClass: 'bg-red-500',
    label: 'Error',
    pulse: false,
  },
  disconnected: {
    dotClass: 'bg-gray-300',
    label: 'Disconnected',
    pulse: false,
  },
};

function Sparkline({
  data,
  className,
}: {
  data: number[];
  className?: string;
}) {
  if (!data.length || data.every((v) => v === 0)) return null;

  const width = 64;
  const height = 24;
  const padding = 2;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;

  const points = data
    .map((val, i) => {
      const x = padding + (i / (data.length - 1)) * (width - padding * 2);
      const y =
        height - padding - ((val - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn('flex-shrink-0', className)}
      fill="none"
    >
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

function IntegrationRow({
  integration,
  compact,
}: {
  integration: Integration;
  compact: boolean;
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
        'group flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 transition-colors hover:border-gray-100 hover:bg-gray-50/60',
        !integration.connected && 'opacity-60'
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg',
          integration.connected ? 'bg-primary-50' : 'bg-gray-100'
        )}
      >
        {IconComponent ? (
          <IconComponent
            className={cn(
              'h-[18px] w-[18px]',
              integration.connected ? 'text-primary-500' : 'text-gray-400'
            )}
          />
        ) : (
          <Link2 className="h-[18px] w-[18px] text-gray-400" />
        )}
      </div>

      {/* Name and status */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-800">
          {integration.name}
        </p>
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
            <span
              className={cn(
                'relative inline-flex h-2 w-2 rounded-full',
                status.dotClass
              )}
            />
          </span>
          <span className="text-[11px] text-gray-400">
            {status.label}
            {integration.connected && (
              <> &middot; {formatRelativeTime(integration.lastSync)}</>
            )}
          </span>
        </div>
      </div>

      {/* Activity + sparkline (hidden in compact) */}
      {!compact && integration.connected && (
        <div className="hidden items-center gap-2.5 sm:flex">
          <Sparkline data={integration.sparklineData} className="h-6 w-16" />
          <div className="text-right">
            <p className="text-sm font-semibold text-gray-800">
              {integration.activityVolume}
            </p>
            <p className="text-[10px] text-gray-400">events</p>
          </div>
        </div>
      )}

      {/* Action button */}
      {showAction && (
        <button
          type="button"
          className={cn(
            'flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
            integration.status === 'disconnected'
              ? 'bg-primary-50 text-primary-600 hover:bg-primary-100'
              : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
          )}
        >
          {integration.status === 'disconnected' ? (
            <span className="flex items-center gap-1">
              <Link2 className="h-3 w-3" />
              Connect
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Fix
            </span>
          )}
        </button>
      )}
    </div>
  );
}

export const IntegrationHealth: React.FC<IntegrationHealthProps> = ({
  data,
  variant = 'detailed',
}) => {
  const activeCount = data.integrations.filter(
    (i) => i.status === 'active'
  ).length;
  const hasIssues = data.integrations.some(
    (i) => i.status === 'stale' || i.status === 'error'
  );

  if (variant === 'minimal') {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50">
                <Plug className="h-4 w-4 text-primary-500" />
              </div>
              <CardTitle className="text-base">Integrations</CardTitle>
            </div>
            <Badge variant="secondary" className="text-xs font-bold">
              {data.totalConnected}/{data.totalAvailable}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {data.integrations
                .filter((i) => i.connected)
                .slice(0, 4)
                .map((integration) => {
                  const Icon = ICON_MAP[integration.icon];
                  return (
                    <div
                      key={integration.id}
                      className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-primary-50"
                    >
                      {Icon && (
                        <Icon className="h-3.5 w-3.5 text-primary-500" />
                      )}
                    </div>
                  );
                })}
            </div>
            <span className="text-xs text-gray-400">
              {activeCount} active{hasIssues ? ' \u00b7 issues detected' : ''}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50">
              <Plug className="h-[18px] w-[18px] text-primary-500" />
            </div>
            <div>
              <CardTitle className="text-lg">Integration Health</CardTitle>
              <p className="mt-0.5 text-xs text-gray-400">
                {activeCount} active, {data.totalAvailable - data.totalConnected}{' '}
                available
              </p>
            </div>
          </div>
          <Badge
            variant={hasIssues ? 'outline' : 'secondary'}
            className={cn(
              'text-xs font-bold',
              hasIssues && 'border-amber-200 bg-amber-50 text-amber-700'
            )}
          >
            {data.totalConnected}/{data.totalAvailable} connected
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pb-4">
        <div className="divide-y divide-gray-50">
          {data.integrations.map((integration) => (
            <IntegrationRow
              key={integration.id}
              integration={integration}
              compact={variant === 'compact'}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
