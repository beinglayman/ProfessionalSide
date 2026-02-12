import { TrendingUp, TrendingDown, Minus, Target } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { cn } from '../../../../lib/utils';
import { mockKPIs } from '../../mock-data';
import type { KPIItem, KPIStatus, KPITrend } from '../../types';

const STATUS_COLORS: Record<KPIStatus, { bg: string; text: string; dot: string }> = {
  'on-track': { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  'at-risk': { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  'behind': { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
};

const CATEGORY_COLORS: Record<string, string> = {
  Engineering: 'bg-primary-100 text-primary-700',
  Documentation: 'bg-blue-100 text-blue-700',
  Leadership: 'bg-indigo-100 text-indigo-700',
  Growth: 'bg-teal-100 text-teal-700',
  Communication: 'bg-violet-100 text-violet-700',
};

const TrendIcon = ({ trend, value }: { trend: KPITrend; value: number }) => {
  const icon = trend === 'up'
    ? <TrendingUp className="h-3 w-3 text-emerald-500" />
    : trend === 'down'
    ? <TrendingDown className="h-3 w-3 text-red-500" />
    : <Minus className="h-3 w-3 text-gray-400" />;

  return (
    <div className="flex items-center gap-0.5">
      {icon}
      <span className={cn('text-[10px]', value >= 0 ? 'text-emerald-600' : 'text-red-500')}>
        {value > 0 ? '+' : ''}{value}%
      </span>
    </div>
  );
};

export function KPIV5() {
  const { kpis } = mockKPIs;

  const grouped = kpis.reduce<Record<string, KPIItem[]>>((acc, kpi) => {
    if (!acc[kpi.category]) acc[kpi.category] = [];
    acc[kpi.category].push(kpi);
    return acc;
  }, {});

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary-600" />
          <CardTitle className="text-base">KPI Tracker — Table</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-gray-50/50">
                <th className="text-left py-2 px-3 font-medium text-gray-500">Category</th>
                <th className="text-left py-2 px-3 font-medium text-gray-500">KPI Name</th>
                <th className="text-right py-2 px-3 font-medium text-gray-500">Current</th>
                <th className="text-right py-2 px-3 font-medium text-gray-500">Target</th>
                <th className="text-left py-2 px-3 font-medium text-gray-500 min-w-[100px]">Progress</th>
                <th className="text-left py-2 px-3 font-medium text-gray-500">Trend</th>
                <th className="text-left py-2 px-3 font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(grouped).map(([category, items]) =>
                items.map((kpi, idx) => {
                  const pct = Math.min(Math.round((kpi.current / kpi.target) * 100), 100);
                  const barColor = kpi.status === 'on-track' ? 'bg-emerald-400' : kpi.status === 'at-risk' ? 'bg-amber-400' : 'bg-red-400';
                  return (
                    <tr
                      key={kpi.id}
                      className={cn('border-b last:border-b-0', idx % 2 === 1 ? 'bg-gray-50/30' : 'bg-white')}
                    >
                      <td className="py-2 px-3">
                        {idx === 0 && (
                          <Badge variant="secondary" className={cn('text-[10px] px-1.5 py-0', CATEGORY_COLORS[category] || 'bg-gray-100 text-gray-700')}>
                            {category}
                          </Badge>
                        )}
                      </td>
                      <td className="py-2 px-3 text-gray-700 font-medium">{kpi.name}</td>
                      <td className="py-2 px-3 text-right tabular-nums text-gray-800">{kpi.current}</td>
                      <td className="py-2 px-3 text-right tabular-nums text-gray-500">{kpi.target}</td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1.5">
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className={cn('h-full rounded-full', barColor)} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[10px] text-gray-500 tabular-nums w-7 text-right">{pct}%</span>
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <TrendIcon trend={kpi.trend} value={kpi.trendValue} />
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1">
                          <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_COLORS[kpi.status].dot)} />
                          <span className={cn('capitalize', STATUS_COLORS[kpi.status].text)}>{kpi.status}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
