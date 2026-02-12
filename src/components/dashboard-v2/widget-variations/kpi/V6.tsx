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

const LANE_CONFIG: Record<KPIStatus, { header: string; headerBg: string; bodyBg: string; headerText: string }> = {
  'on-track': { header: 'On Track', headerBg: 'bg-emerald-500', bodyBg: 'bg-emerald-50/50', headerText: 'text-white' },
  'at-risk': { header: 'At Risk', headerBg: 'bg-amber-500', bodyBg: 'bg-amber-50/50', headerText: 'text-white' },
  'behind': { header: 'Behind', headerBg: 'bg-red-500', bodyBg: 'bg-red-50/50', headerText: 'text-white' },
};

const CATEGORY_COLORS: Record<string, string> = {
  Engineering: 'bg-primary-100 text-primary-700',
  Documentation: 'bg-blue-100 text-blue-700',
  Leadership: 'bg-indigo-100 text-indigo-700',
  Growth: 'bg-teal-100 text-teal-700',
  Communication: 'bg-violet-100 text-violet-700',
};

const TrendIcon = ({ trend }: { trend: KPITrend }) => {
  if (trend === 'up') return <TrendingUp className="h-3 w-3 text-emerald-500" />;
  if (trend === 'down') return <TrendingDown className="h-3 w-3 text-red-500" />;
  return <Minus className="h-3 w-3 text-gray-400" />;
};

function KPIMiniCard({ kpi }: { kpi: KPIItem }) {
  return (
    <div className="bg-white rounded-md border border-gray-200 p-2.5 shadow-sm">
      <p className="text-xs font-medium text-gray-800 mb-1.5 leading-tight">{kpi.name}</p>
      <Badge variant="secondary" className={cn('text-[9px] px-1 py-0 mb-1.5', CATEGORY_COLORS[kpi.category] || 'bg-gray-100 text-gray-600')}>
        {kpi.category}
      </Badge>
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-700 font-semibold tabular-nums">
          {kpi.current}<span className="text-gray-400 font-normal">/{kpi.target}</span>
          <span className="text-[10px] text-gray-400 ml-0.5">{kpi.unit}</span>
        </span>
        <div className="flex items-center gap-0.5">
          <TrendIcon trend={kpi.trend} />
          <span className={cn('text-[10px]', kpi.trendValue >= 0 ? 'text-emerald-600' : 'text-red-500')}>
            {kpi.trendValue > 0 ? '+' : ''}{kpi.trendValue}%
          </span>
        </div>
      </div>
    </div>
  );
}

export function KPIV6() {
  const { kpis } = mockKPIs;

  const lanes: Record<KPIStatus, KPIItem[]> = {
    'on-track': kpis.filter((k) => k.status === 'on-track'),
    'at-risk': kpis.filter((k) => k.status === 'at-risk'),
    'behind': kpis.filter((k) => k.status === 'behind'),
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary-600" />
          <CardTitle className="text-base">Status Swimlanes</CardTitle>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          {(['on-track', 'at-risk', 'behind'] as KPIStatus[]).map((status) => {
            const config = LANE_CONFIG[status];
            const items = lanes[status];
            return (
              <div key={status} className={cn('rounded-lg overflow-hidden', config.bodyBg)}>
                {/* Header */}
                <div className={cn('px-3 py-2 flex items-center justify-between', config.headerBg)}>
                  <span className={cn('text-xs font-semibold', config.headerText)}>{config.header}</span>
                  <Badge variant="secondary" className="bg-white/20 text-white text-[10px] px-1.5 py-0">
                    {items.length}
                  </Badge>
                </div>
                {/* Cards */}
                <div className="p-2 space-y-2">
                  {items.length === 0 ? (
                    <p className="text-[10px] text-gray-400 text-center py-4">No KPIs</p>
                  ) : (
                    items.map((kpi) => <KPIMiniCard key={kpi.id} kpi={kpi} />)
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
