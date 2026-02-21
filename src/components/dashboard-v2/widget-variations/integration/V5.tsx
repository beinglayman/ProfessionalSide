import React, { useState } from 'react';
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
  { ringClass: string; label: string; dotClass: string; pulse: boolean }
> = {
  active: { ringClass: 'ring-emerald-500', label: 'Active', dotClass: 'bg-emerald-500', pulse: true },
  stale: { ringClass: 'ring-amber-500', label: 'Stale', dotClass: 'bg-amber-500', pulse: false },
  error: { ringClass: 'ring-red-500', label: 'Error', dotClass: 'bg-red-500', pulse: false },
  disconnected: { ringClass: 'ring-gray-300', label: 'Disconnected', dotClass: 'bg-gray-300', pulse: false },
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

function DetailPanel({ integration }: { integration: Integration }) {
  const status = STATUS_CONFIG[integration.status];
  const showAction =
    integration.status === 'stale' ||
    integration.status === 'error' ||
    integration.status === 'disconnected';

  return (
    <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50/50 p-4 transition-all">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-gray-800">{integration.name}</h4>
          <div className="mt-1 flex items-center gap-2">
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
            <span className="text-xs text-gray-500">{status.label}</span>
            {integration.connected && (
              <span className="text-xs text-gray-400">
                &middot; Synced {formatRelativeTime(integration.lastSync)}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {integration.connected && (
            <>
              <Sparkline data={integration.sparklineData} className="h-6 w-16" />
              <div className="text-right">
                <p className="text-lg font-bold text-gray-800">{integration.activityVolume}</p>
                <p className="text-[10px] text-gray-400">events</p>
              </div>
            </>
          )}
          {showAction && (
            <button
              type="button"
              className={cn(
                'rounded-lg px-4 py-1.5 text-xs font-semibold transition-colors',
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
          )}
        </div>
      </div>
    </div>
  );
}

export function IntegrationV5() {
  const data = mockIntegrations;
  // Default to first connected integration
  const firstConnected = data.integrations.find((i) => i.connected);
  const [selectedId, setSelectedId] = useState<string>(firstConnected?.id ?? data.integrations[0].id);
  const selected = data.integrations.find((i) => i.id === selectedId) ?? data.integrations[0];

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
        {/* Icon row */}
        <div className="flex items-center justify-around py-2">
          {data.integrations.map((integration) => {
            const IconComponent = ICON_MAP[integration.icon];
            const status = STATUS_CONFIG[integration.status];
            const isSelected = integration.id === selectedId;

            return (
              <button
                key={integration.id}
                type="button"
                onClick={() => setSelectedId(integration.id)}
                className={cn(
                  'flex h-12 w-12 items-center justify-center rounded-full ring-2 transition-all',
                  status.ringClass,
                  isSelected ? 'scale-110 ring-[3px] shadow-md' : 'hover:scale-105',
                  integration.connected ? 'bg-white' : 'bg-gray-50'
                )}
              >
                {IconComponent ? (
                  <IconComponent
                    className={cn(
                      'h-5 w-5',
                      integration.connected ? 'text-gray-700' : 'text-gray-400'
                    )}
                  />
                ) : (
                  <Link2 className="h-5 w-5 text-gray-400" />
                )}
              </button>
            );
          })}
        </div>

        {/* Detail panel */}
        <DetailPanel integration={selected} />
      </CardContent>
    </Card>
  );
}
