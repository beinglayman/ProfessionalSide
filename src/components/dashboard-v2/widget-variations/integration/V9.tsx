import React, { useState } from 'react';
import {
  Plug,
  Github,
  SquareKanban,
  Hash,
  Mail,
  Figma,
  Video,
  Link2,
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

const STATUS_LINE_COLOR: Record<IntegrationStatusType, string> = {
  active: '#10b981',
  stale: '#f59e0b',
  error: '#ef4444',
  disconnected: '#d1d5db',
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

export function IntegrationV9() {
  const data = mockIntegrations;
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const hoveredIntegration = data.integrations.find((i) => i.id === hoveredId);

  // SVG layout
  const size = 280;
  const cx = size / 2;
  const cy = size / 2;
  const outerRadius = 110;
  const centerRadius = 32;
  const iconRadius = 20;

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
        <div className="flex flex-col items-center">
          {/* SVG hub-spoke diagram */}
          <svg
            viewBox={`0 0 ${size} ${size}`}
            className="h-[280px] w-[280px]"
          >
            {/* Spokes (lines from center to each icon) */}
            {data.integrations.map((integration, idx) => {
              const angle = (idx / data.integrations.length) * Math.PI * 2 - Math.PI / 2;
              const ix = cx + Math.cos(angle) * outerRadius;
              const iy = cy + Math.sin(angle) * outerRadius;
              const lineColor = STATUS_LINE_COLOR[integration.status];
              const thickness = integration.connected
                ? 1.5 + (integration.activityVolume / maxVolume) * 2.5
                : 1;
              const isDashed = integration.status === 'disconnected';

              return (
                <line
                  key={`line-${integration.id}`}
                  x1={cx}
                  y1={cy}
                  x2={ix}
                  y2={iy}
                  stroke={lineColor}
                  strokeWidth={thickness}
                  strokeDasharray={isDashed ? '4 3' : 'none'}
                  opacity={hoveredId && hoveredId !== integration.id ? 0.3 : 0.8}
                  className="transition-opacity duration-200"
                />
              );
            })}

            {/* Center circle */}
            <circle cx={cx} cy={cy} r={centerRadius} fill="#5D259F" />
            <text
              x={cx}
              y={cy - 4}
              textAnchor="middle"
              className="text-[8px] font-bold fill-white"
            >
              In
            </text>
            <text
              x={cx}
              y={cy + 7}
              textAnchor="middle"
              className="text-[7px] fill-white/80"
            >
              Chronicle
            </text>

            {/* Integration nodes */}
            {data.integrations.map((integration, idx) => {
              const angle = (idx / data.integrations.length) * Math.PI * 2 - Math.PI / 2;
              const ix = cx + Math.cos(angle) * outerRadius;
              const iy = cy + Math.sin(angle) * outerRadius;
              const status = STATUS_CONFIG[integration.status];
              const lineColor = STATUS_LINE_COLOR[integration.status];
              const isHovered = hoveredId === integration.id;

              return (
                <g
                  key={`node-${integration.id}`}
                  onMouseEnter={() => setHoveredId(integration.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className="cursor-pointer"
                >
                  {/* Outer ring */}
                  <circle
                    cx={ix}
                    cy={iy}
                    r={iconRadius + 3}
                    fill="none"
                    stroke={lineColor}
                    strokeWidth={isHovered ? 2.5 : 1.5}
                    opacity={hoveredId && !isHovered ? 0.3 : 1}
                    className="transition-all duration-200"
                  />
                  {/* Background circle */}
                  <circle
                    cx={ix}
                    cy={iy}
                    r={iconRadius}
                    fill={integration.connected ? 'white' : '#f9fafb'}
                    stroke="#e5e7eb"
                    strokeWidth={0.5}
                    opacity={hoveredId && !isHovered ? 0.4 : 1}
                    className="transition-opacity duration-200"
                  />
                  {/* Icon placeholder (letter abbreviation since we can't render React components inside SVG foreignObject reliably) */}
                  <text
                    x={ix}
                    y={iy + 1}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className={cn(
                      'text-[10px] font-bold',
                      integration.connected ? 'fill-primary-600' : 'fill-gray-400'
                    )}
                  >
                    {integration.name.slice(0, 2).toUpperCase()}
                  </text>
                  {/* Name label below node */}
                  <text
                    x={ix}
                    y={iy + iconRadius + 12}
                    textAnchor="middle"
                    className="text-[7px] fill-gray-500"
                  >
                    {integration.name.length > 10
                      ? integration.name.slice(0, 9) + '...'
                      : integration.name}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Hover tooltip below SVG */}
          <div
            className={cn(
              'mt-2 w-full rounded-lg border border-gray-200 bg-gray-50/50 p-3 text-center transition-all',
              hoveredIntegration ? 'opacity-100' : 'opacity-0'
            )}
          >
            {hoveredIntegration ? (
              <div className="flex items-center justify-center gap-4">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'h-2 w-2 rounded-full',
                      STATUS_CONFIG[hoveredIntegration.status].dotClass
                    )}
                  />
                  <span className="text-sm font-semibold text-gray-800">
                    {hoveredIntegration.name}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  {STATUS_CONFIG[hoveredIntegration.status].label}
                </span>
                {hoveredIntegration.connected && (
                  <>
                    <span className="text-xs text-gray-400">
                      Synced {formatRelativeTime(hoveredIntegration.lastSync)}
                    </span>
                    <span className="text-xs font-medium text-gray-700">
                      {hoveredIntegration.activityVolume} events
                    </span>
                  </>
                )}
                {!hoveredIntegration.connected && (
                  <span className="text-xs text-gray-400">Not connected</span>
                )}
              </div>
            ) : (
              <span className="text-xs text-gray-400">Hover over a node for details</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
