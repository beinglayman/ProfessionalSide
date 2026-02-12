import { TrendingUp, TrendingDown, Minus, Target } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../ui/card';
import { cn } from '../../../../lib/utils';
import { mockKPIs } from '../../mock-data';
import type { KPIStatus, KPITrend } from '../../types';

const STATUS_COLORS: Record<KPIStatus, { border: string }> = {
  'on-track': { border: 'border-b-emerald-500' },
  'at-risk': { border: 'border-b-amber-500' },
  'behind': { border: 'border-b-red-500' },
};

const TrendIcon = ({ trend }: { trend: KPITrend }) => {
  if (trend === 'up') return <TrendingUp className="h-3 w-3 text-emerald-500" />;
  if (trend === 'down') return <TrendingDown className="h-3 w-3 text-red-500" />;
  return <Minus className="h-3 w-3 text-gray-400" />;
};

export function KPIV10() {
  const { kpis } = mockKPIs;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary-600" />
          <CardTitle className="text-base">KPI Metric Tiles</CardTitle>
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {kpis.map((kpi) => (
            <div
              key={kpi.id}
              className={cn(
                'flex-none w-[140px] bg-white border rounded-lg p-3 border-b-4',
                STATUS_COLORS[kpi.status].border
              )}
            >
              {/* Category label */}
              <span className="text-[8px] font-semibold uppercase tracking-wider text-gray-400 leading-none">
                {kpi.category}
              </span>

              {/* KPI name */}
              <p className="text-[11px] text-gray-600 font-medium mt-1.5 truncate leading-tight">
                {kpi.name}
              </p>

              {/* Large current value */}
              <div className="mt-2">
                <span className="text-2xl font-bold text-gray-900 tabular-nums leading-none">
                  {kpi.current}
                </span>
                <span className="text-xs text-gray-400 ml-0.5">
                  of {kpi.target}
                </span>
              </div>

              {/* Unit */}
              <span className="text-[9px] text-gray-400">{kpi.unit}</span>

              {/* Trend */}
              <div className="flex items-center gap-1 mt-2">
                <TrendIcon trend={kpi.trend} />
                <span
                  className={cn(
                    'text-[10px] font-medium',
                    kpi.trendValue >= 0 ? 'text-emerald-600' : 'text-red-500'
                  )}
                >
                  {kpi.trendValue > 0 ? '+' : ''}{kpi.trendValue}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
