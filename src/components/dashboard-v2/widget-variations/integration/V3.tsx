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

interface ColumnConfig {
  title: string;
  headerBg: string;
  headerText: string;
  dotClass: string;
}

const COLUMNS: Record<string, ColumnConfig> = {
  active: {
    title: 'Active',
    headerBg: 'bg-emerald-50',
    headerText: 'text-emerald-700',
    dotClass: 'bg-emerald-500',
  },
  attention: {
    title: 'Needs Attention',
    headerBg: 'bg-amber-50',
    headerText: 'text-amber-700',
    dotClass: 'bg-amber-500',
  },
  disconnected: {
    title: 'Disconnected',
    headerBg: 'bg-gray-100',
    headerText: 'text-gray-500',
    dotClass: 'bg-gray-300',
  },
};

function MiniCard({ integration }: { integration: Integration }) {
  const IconComponent = ICON_MAP[integration.icon];
  const showAction =
    integration.status === 'stale' ||
    integration.status === 'error' ||
    integration.status === 'disconnected';

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 transition-shadow hover:shadow-sm">
      <div className="flex items-center gap-2.5">
        <div
          className={cn(
            'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg',
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
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-gray-800">{integration.name}</p>
          {integration.connected && (
            <p className="text-[11px] text-gray-400">
              {formatRelativeTime(integration.lastSync)} &middot; {integration.activityVolume} events
            </p>
          )}
          {!integration.connected && (
            <p className="text-[11px] text-gray-400">Not connected</p>
          )}
        </div>
      </div>
      {showAction && (
        <button
          type="button"
          className={cn(
            'mt-2 w-full rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors',
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

function StatusColumn({
  config,
  integrations,
}: {
  config: ColumnConfig;
  integrations: Integration[];
}) {
  return (
    <div className="flex flex-1 flex-col">
      {/* Column header */}
      <div className={cn('flex items-center gap-2 rounded-t-lg px-3 py-2', config.headerBg)}>
        <span className={cn('h-2 w-2 rounded-full', config.dotClass)} />
        <span className={cn('text-xs font-semibold', config.headerText)}>{config.title}</span>
        <Badge variant="secondary" className="ml-auto text-[10px] font-bold">
          {integrations.length}
        </Badge>
      </div>
      {/* Cards */}
      <div className="flex flex-1 flex-col gap-2 rounded-b-lg border border-t-0 border-gray-100 bg-gray-50/50 p-2">
        {integrations.length === 0 && (
          <p className="py-4 text-center text-xs text-gray-400">None</p>
        )}
        {integrations.map((integration) => (
          <MiniCard key={integration.id} integration={integration} />
        ))}
      </div>
    </div>
  );
}

export function IntegrationV3() {
  const data = mockIntegrations;
  const active = data.integrations.filter(
    (i) => i.status === 'active'
  );
  const attention = data.integrations.filter(
    (i) => i.status === 'stale' || i.status === 'error'
  );
  const disconnected = data.integrations.filter(
    (i) => i.status === 'disconnected'
  );

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
        <div className="grid grid-cols-3 gap-3">
          <StatusColumn config={COLUMNS.active} integrations={active} />
          <StatusColumn config={COLUMNS.attention} integrations={attention} />
          <StatusColumn config={COLUMNS.disconnected} integrations={disconnected} />
        </div>
      </CardContent>
    </Card>
  );
}
