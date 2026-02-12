import { TrendingUp, TrendingDown, Minus, Target } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { cn } from '../../../../lib/utils';
import { mockKPIs } from '../../mock-data';
import type { KPIItem, KPIStatus, KPITrend } from '../../types';

const STATUS_COLORS: Record<KPIStatus, { bg: string; text: string; border: string; dot: string }> = {
  'on-track': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-400', dot: 'bg-emerald-500' },
  'at-risk': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-400', dot: 'bg-amber-500' },
  'behind': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-400', dot: 'bg-red-500' },
};

const PROGRESS_COLORS: Record<KPIStatus, string> = {
  'on-track': 'from-primary-400 to-primary-600',
  'at-risk': 'from-amber-300 to-amber-500',
  'behind': 'from-red-300 to-red-500',
};

const TrendIcon = ({ trend, className }: { trend: KPITrend; className?: string }) => {
  if (trend === 'up') return <TrendingUp className={cn('h-3.5 w-3.5 text-emerald-500', className)} />;
  if (trend === 'down') return <TrendingDown className={cn('h-3.5 w-3.5 text-red-500', className)} />;
  return <Minus className={cn('h-3.5 w-3.5 text-gray-400', className)} />;
};

export function KPIV1() {
  const { kpis, role } = mockKPIs;

  const grouped = kpis.reduce<Record<string, KPIItem[]>>((acc, kpi) => {
    if (!acc[kpi.category]) acc[kpi.category] = [];
    acc[kpi.category].push(kpi);
    return acc;
  }, {});

  const counts = {
    'on-track': kpis.filter((k) => k.status === 'on-track').length,
    'at-risk': kpis.filter((k) => k.status === 'at-risk').length,
    behind: kpis.filter((k) => k.status === 'behind').length,
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary-600" />
            <CardTitle className="text-base">KPI/KRA Tracker</CardTitle>
          </div>
          <Badge variant="secondary" className="text-xs capitalize">
            {role}
          </Badge>
        </div>
        {/* Summary strip */}
        <div className="flex items-center gap-4 mt-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className={cn('h-2 w-2 rounded-full', STATUS_COLORS['on-track'].dot)} />
            <span className="text-gray-600">On Track</span>
            <span className="font-semibold text-gray-800">{counts['on-track']}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={cn('h-2 w-2 rounded-full', STATUS_COLORS['at-risk'].dot)} />
            <span className="text-gray-600">At Risk</span>
            <span className="font-semibold text-gray-800">{counts['at-risk']}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={cn('h-2 w-2 rounded-full', STATUS_COLORS['behind'].dot)} />
            <span className="text-gray-600">Behind</span>
            <span className="font-semibold text-gray-800">{counts.behind}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category}>
            <div className="flex items-center gap-2 mb-2.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                {category}
              </span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            <div className="space-y-2.5">
              {items.map((kpi) => {
                const pct = Math.min((kpi.current / kpi.target) * 100, 100);
                return (
                  <div key={kpi.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-700 font-medium">{kpi.name}</span>
                        <TrendIcon trend={kpi.trend} />
                        <span className={cn('text-[10px]', kpi.trendValue >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                          {kpi.trendValue > 0 ? '+' : ''}{kpi.trendValue}%
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">
                          {kpi.current}/{kpi.target} {kpi.unit}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn('text-[10px] px-1.5 py-0', STATUS_COLORS[kpi.status].bg, STATUS_COLORS[kpi.status].text, STATUS_COLORS[kpi.status].border)}
                        >
                          {kpi.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full bg-gradient-to-r transition-all', PROGRESS_COLORS[kpi.status])}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
