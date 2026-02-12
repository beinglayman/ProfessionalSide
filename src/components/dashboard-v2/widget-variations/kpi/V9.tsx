import { Target } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../ui/card';
import { cn } from '../../../../lib/utils';
import { mockKPIs } from '../../mock-data';
import type { KPIItem, KPIStatus } from '../../types';

const STATUS_BORDER: Record<KPIStatus, string> = {
  'on-track': 'border-emerald-400',
  'at-risk': 'border-amber-400',
  'behind': 'border-red-400',
};

function getIntensityClass(pct: number): string {
  if (pct >= 90) return 'bg-primary-600 text-white';
  if (pct >= 75) return 'bg-primary-400 text-white';
  if (pct >= 60) return 'bg-primary-300 text-gray-800';
  if (pct >= 40) return 'bg-primary-200 text-gray-800';
  if (pct >= 20) return 'bg-primary-100 text-gray-700';
  return 'bg-primary-50 text-gray-600';
}

export function KPIV9() {
  const { kpis } = mockKPIs;

  const grouped = kpis.reduce<Record<string, KPIItem[]>>((acc, kpi) => {
    if (!acc[kpi.category]) acc[kpi.category] = [];
    acc[kpi.category].push(kpi);
    return acc;
  }, {});

  // Max KPIs in any category (for grid columns)
  const maxCols = Math.max(...Object.values(grouped).map((g) => g.length));

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary-600" />
          <CardTitle className="text-base">KPI Heat Grid</CardTitle>
        </div>
        <p className="text-xs text-gray-400 mt-1">Darker purple = higher completion</p>
      </CardHeader>

      <CardContent>
        <div className="space-y-2">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category} className="flex items-stretch gap-2">
              {/* Category label */}
              <div className="w-24 shrink-0 flex items-center">
                <span className="text-[11px] font-semibold text-gray-600 truncate">{category}</span>
              </div>

              {/* Heat cells */}
              <div
                className="grid gap-1.5 flex-1"
                style={{ gridTemplateColumns: `repeat(${maxCols}, minmax(0, 1fr))` }}
              >
                {items.map((kpi) => {
                  const pct = Math.min(Math.round((kpi.current / kpi.target) * 100), 100);
                  return (
                    <div
                      key={kpi.id}
                      className={cn(
                        'rounded-md p-2 border-2 transition-all',
                        getIntensityClass(pct),
                        STATUS_BORDER[kpi.status]
                      )}
                      title={`${kpi.name}: ${pct}% complete`}
                    >
                      <p className="text-[10px] font-medium leading-tight truncate">{kpi.name}</p>
                      <p className="text-[9px] opacity-80 mt-0.5 tabular-nums">
                        {kpi.current}/{kpi.target}
                      </p>
                    </div>
                  );
                })}

                {/* Empty cells for alignment */}
                {Array.from({ length: maxCols - items.length }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Color scale legend */}
        <div className="flex items-center justify-center gap-1 mt-4 text-[10px] text-gray-400">
          <span>0%</span>
          {[
            'bg-primary-50',
            'bg-primary-100',
            'bg-primary-200',
            'bg-primary-300',
            'bg-primary-400',
            'bg-primary-600',
          ].map((cls) => (
            <div key={cls} className={cn('w-5 h-3 rounded-sm', cls)} />
          ))}
          <span>100%</span>
        </div>

        {/* Status border legend */}
        <div className="flex items-center justify-center gap-4 mt-2 text-[10px] text-gray-400">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm border-2 border-emerald-400 bg-gray-50" />
            <span>On Track</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm border-2 border-amber-400 bg-gray-50" />
            <span>At Risk</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm border-2 border-red-400 bg-gray-50" />
            <span>Behind</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
