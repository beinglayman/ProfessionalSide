import { Target } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../ui/card';
import { cn } from '../../../../lib/utils';
import { mockKPIs } from '../../mock-data';
import type { KPIItem, KPIStatus } from '../../types';

const STATUS_BAR_COLORS: Record<KPIStatus, string> = {
  'on-track': 'bg-emerald-400',
  'at-risk': 'bg-amber-400',
  'behind': 'bg-red-400',
};

const STATUS_DOT_COLORS: Record<KPIStatus, string> = {
  'on-track': 'bg-emerald-500',
  'at-risk': 'bg-amber-500',
  'behind': 'bg-red-500',
};

export function KPIV8() {
  const { kpis } = mockKPIs;

  const grouped = kpis.reduce<Record<string, KPIItem[]>>((acc, kpi) => {
    if (!acc[kpi.category]) acc[kpi.category] = [];
    acc[kpi.category].push(kpi);
    return acc;
  }, {});

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary-600" />
          <CardTitle className="text-base">Category Progress Bars</CardTitle>
        </div>
        <p className="text-xs text-gray-400 mt-1">Stacked KPIs by category</p>
      </CardHeader>

      <CardContent className="space-y-4">
        {Object.entries(grouped).map(([category, items]) => {
          const categoryAvg = Math.round(
            items.reduce((s, k) => s + Math.min((k.current / k.target) * 100, 100), 0) / items.length
          );

          // Each segment's width proportional to (current/target) weighted equally
          const totalWeight = items.length;

          return (
            <div key={category}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-gray-700">{category}</span>
                <span className="text-xs font-bold text-gray-800 tabular-nums">{categoryAvg}%</span>
              </div>

              {/* Stacked bar */}
              <div className="flex h-5 rounded-md overflow-hidden bg-gray-100 gap-px">
                {items.map((kpi) => {
                  const completion = Math.min((kpi.current / kpi.target) * 100, 100);
                  const segWidth = 100 / totalWeight;
                  // The filled portion within each segment
                  const fillPct = completion;

                  return (
                    <div
                      key={kpi.id}
                      className="relative bg-gray-100 overflow-hidden"
                      style={{ width: `${segWidth}%` }}
                      title={`${kpi.name}: ${kpi.current}/${kpi.target} ${kpi.unit} (${Math.round(completion)}%)`}
                    >
                      <div
                        className={cn('h-full transition-all', STATUS_BAR_COLORS[kpi.status])}
                        style={{ width: `${fillPct}%` }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* KPI labels below */}
              <div className="flex mt-1 gap-2">
                {items.map((kpi) => (
                  <div key={kpi.id} className="flex items-center gap-1 text-[9px] text-gray-500" style={{ flex: `0 0 ${100 / items.length}%` }}>
                    <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', STATUS_DOT_COLORS[kpi.status])} />
                    <span className="truncate">{kpi.name}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 pt-2 text-[10px] text-gray-400 border-t">
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-sm bg-emerald-400" />
            <span>On Track</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-sm bg-amber-400" />
            <span>At Risk</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-sm bg-red-400" />
            <span>Behind</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
