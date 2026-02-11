import { useMemo } from 'react';
import { Target, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { cn } from '../../../lib/utils';
import type { KPITrackerData, KPIItem, KPIStatus, KPITrend, RoleTemplate, WidgetVariant } from '../types';

interface KPITrackerProps {
  data: KPITrackerData;
  variant?: WidgetVariant;
}

const ROLE_LABELS: Record<RoleTemplate, string> = {
  engineer: 'Engineer',
  designer: 'Designer',
  pm: 'Product Manager',
  manager: 'Engineering Manager',
  custom: 'Custom',
};

const STATUS_CONFIG: Record<KPIStatus, { label: string; dotClass: string; badgeClass: string }> = {
  'on-track': {
    label: 'On Track',
    dotClass: 'bg-emerald-500',
    badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  'at-risk': {
    label: 'At Risk',
    dotClass: 'bg-amber-500',
    badgeClass: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  behind: {
    label: 'Behind',
    dotClass: 'bg-red-500',
    badgeClass: 'border-red-200 bg-red-50 text-red-700',
  },
};

function TrendIcon({ trend, className }: { trend: KPITrend; className?: string }) {
  const iconClass = cn(
    'h-3.5 w-3.5',
    trend === 'up' && 'text-emerald-500',
    trend === 'down' && 'text-red-500',
    trend === 'stable' && 'text-gray-400',
    className
  );

  if (trend === 'up') return <TrendingUp className={iconClass} />;
  if (trend === 'down') return <TrendingDown className={iconClass} />;
  return <Minus className={iconClass} />;
}

function StatusBadge({ status }: { status: KPIStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold', config.badgeClass)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', config.dotClass)} />
      {config.label}
    </span>
  );
}

function KPIRow({ kpi, isCompact }: { kpi: KPIItem; isCompact: boolean }) {
  const progressPercent = Math.min((kpi.current / kpi.target) * 100, 100);
  const isOver = kpi.current >= kpi.target;

  return (
    <div className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-gray-50">
      {/* Name + trend */}
      <div className={cn('flex min-w-0 flex-1 flex-col', isCompact ? 'max-w-[140px]' : 'max-w-[200px]')}>
        <span className="truncate text-sm font-medium text-gray-800">
          {kpi.name}
        </span>
        {!isCompact && (
          <div className="flex items-center gap-1 mt-0.5">
            <TrendIcon trend={kpi.trend} />
            <span className={cn(
              'text-[10px] font-medium',
              kpi.trend === 'up' && 'text-emerald-600',
              kpi.trend === 'down' && 'text-red-600',
              kpi.trend === 'stable' && 'text-gray-400',
            )}>
              {kpi.trendValue > 0 ? '+' : ''}{kpi.trendValue}%
            </span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="flex flex-1 items-center gap-2">
        <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              isOver
                ? 'bg-gradient-to-r from-primary-500 to-emerald-400'
                : kpi.status === 'behind'
                  ? 'bg-gradient-to-r from-red-400 to-red-300'
                  : kpi.status === 'at-risk'
                    ? 'bg-gradient-to-r from-amber-400 to-amber-300'
                    : 'bg-gradient-to-r from-primary-500 to-primary-400'
            )}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Values */}
      <div className="flex items-baseline gap-0.5 tabular-nums">
        <span className={cn(
          'text-sm font-semibold',
          kpi.status === 'on-track' ? 'text-gray-900' : kpi.status === 'at-risk' ? 'text-amber-700' : 'text-red-700'
        )}>
          {kpi.current}
        </span>
        <span className="text-xs text-gray-400">/</span>
        <span className="text-xs text-gray-400">{kpi.target}</span>
        {!isCompact && (
          <span className="ml-0.5 text-[10px] text-gray-400">{kpi.unit}</span>
        )}
      </div>

      {/* Status badge */}
      {!isCompact && (
        <div className="hidden w-[70px] justify-end sm:flex">
          <StatusBadge status={kpi.status} />
        </div>
      )}
    </div>
  );
}

function CategorySection({
  category,
  kpis,
  isCompact,
}: {
  category: string;
  kpis: KPIItem[];
  isCompact: boolean;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-2 px-3">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
          {category}
        </span>
        <div className="h-px flex-1 bg-gray-100" />
      </div>
      <div className="space-y-0.5">
        {kpis.map((kpi) => (
          <KPIRow key={kpi.id} kpi={kpi} isCompact={isCompact} />
        ))}
      </div>
    </div>
  );
}

export function KPITracker({ data, variant = 'detailed' }: KPITrackerProps) {
  const isCompact = variant === 'compact';
  const isMinimal = variant === 'minimal';

  const groupedKPIs = useMemo(() => {
    const groups: Record<string, KPIItem[]> = {};
    for (const kpi of data.kpis) {
      if (!groups[kpi.category]) groups[kpi.category] = [];
      groups[kpi.category].push(kpi);
    }
    return groups;
  }, [data.kpis]);

  const categoryOrder = Object.keys(groupedKPIs);

  // Summary stats
  const onTrackCount = data.kpis.filter((k) => k.status === 'on-track').length;
  const atRiskCount = data.kpis.filter((k) => k.status === 'at-risk').length;
  const behindCount = data.kpis.filter((k) => k.status === 'behind').length;

  if (isMinimal) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary-500" />
              <CardTitle className="text-base">KPI Tracker</CardTitle>
            </div>
            <Badge variant="secondary">{ROLE_LABELS[data.role]}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-xs text-gray-600">{onTrackCount} on track</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span className="text-xs text-gray-600">{atRiskCount} at risk</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              <span className="text-xs text-gray-600">{behindCount} behind</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50">
              <Target className="h-4 w-4 text-primary-600" />
            </div>
            <div>
              <CardTitle className="text-base">KPI/KRA Tracker</CardTitle>
              {!isCompact && (
                <p className="mt-0.5 text-xs text-gray-400">
                  {data.kpis.length} metrics across {categoryOrder.length} categories
                </p>
              )}
            </div>
          </div>
          <Badge variant="secondary" className="gap-1">
            {ROLE_LABELS[data.role]}
          </Badge>
        </div>

        {/* Summary strip */}
        <div className="mt-3 flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-xs font-medium text-gray-600">{onTrackCount} On Track</span>
          </div>
          <div className="h-3 w-px bg-gray-200" />
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            <span className="text-xs font-medium text-gray-600">{atRiskCount} At Risk</span>
          </div>
          <div className="h-3 w-px bg-gray-200" />
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            <span className="text-xs font-medium text-gray-600">{behindCount} Behind</span>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {categoryOrder.map((category) => (
            <CategorySection
              key={category}
              category={category}
              kpis={groupedKPIs[category]}
              isCompact={isCompact}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
