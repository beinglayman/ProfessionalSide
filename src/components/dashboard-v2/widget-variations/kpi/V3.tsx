import { TrendingUp, TrendingDown, Minus, Target } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../ui/card';
import { cn } from '../../../../lib/utils';
import { mockKPIs } from '../../mock-data';
import type { KPIStatus, KPITrend } from '../../types';

const STATUS_COLORS: Record<KPIStatus, { border: string; ring: string }> = {
  'on-track': { border: 'border-l-emerald-400', ring: 'text-emerald-500' },
  'at-risk': { border: 'border-l-amber-400', ring: 'text-amber-500' },
  'behind': { border: 'border-l-red-400', ring: 'text-red-500' },
};

const RING_STROKE: Record<KPIStatus, string> = {
  'on-track': '#10B981',
  'at-risk': '#F59E0B',
  'behind': '#EF4444',
};

const TrendIcon = ({ trend }: { trend: KPITrend }) => {
  if (trend === 'up') return <TrendingUp className="h-3 w-3 text-emerald-500" />;
  if (trend === 'down') return <TrendingDown className="h-3 w-3 text-red-500" />;
  return <Minus className="h-3 w-3 text-gray-400" />;
};

function CircularProgress({ pct, status, size = 48 }: { pct: number; status: KPIStatus; size?: number }) {
  const r = (size - 6) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (Math.min(pct, 100) / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E5E7EB" strokeWidth={4} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={RING_STROKE[status]} strokeWidth={4} strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={offset}
        className="transition-all duration-500"
      />
    </svg>
  );
}

export function KPIV3() {
  const { kpis } = mockKPIs;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary-600" />
          <CardTitle className="text-base">KPI Card Grid</CardTitle>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {kpis.map((kpi) => {
            const pct = Math.min(Math.round((kpi.current / kpi.target) * 100), 100);
            return (
              <div
                key={kpi.id}
                className={cn(
                  'border rounded-lg p-3 border-l-4 bg-white',
                  STATUS_COLORS[kpi.status].border
                )}
              >
                <p className="text-xs text-gray-500 font-medium truncate mb-2">{kpi.name}</p>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg font-bold text-gray-900">
                      {kpi.current}<span className="text-sm font-normal text-gray-400">/{kpi.target}</span>
                    </div>
                    <span className="text-[10px] text-gray-400">{kpi.unit}</span>
                  </div>
                  <div className="relative">
                    <CircularProgress pct={pct} status={kpi.status} />
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-gray-600 rotate-0">
                      {pct}%
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 mt-2 text-[10px]">
                  <TrendIcon trend={kpi.trend} />
                  <span className={cn(kpi.trendValue >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                    {kpi.trendValue > 0 ? '+' : ''}{kpi.trendValue}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
