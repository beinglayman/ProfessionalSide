import { useMemo } from 'react';
import { Target } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../ui/card';
import { cn } from '../../../../lib/utils';
import { mockKPIs } from '../../mock-data';
import type { KPIStatus } from '../../types';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

const STATUS_COLORS: Record<KPIStatus, { dot: string; bar: string }> = {
  'on-track': { dot: 'bg-emerald-500', bar: 'bg-emerald-400' },
  'at-risk': { dot: 'bg-amber-500', bar: 'bg-amber-400' },
  'behind': { dot: 'bg-red-500', bar: 'bg-red-400' },
};

const centerTextPlugin = {
  id: 'kpiDonutCenter',
  afterDraw(chart: ChartJS) {
    const { ctx, width, height } = chart;
    const meta = chart.getDatasetMeta(0);
    if (!meta || meta.data.length === 0) return;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const centerX = width / 2;
    const centerY = height / 2 - 8;

    // Count text
    const onTrackCount = chart.data.datasets[0].data[0] as number;
    const total = (chart.data.datasets[0].data as number[]).reduce((a, b) => a + b, 0);

    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillStyle = '#1F2937';
    ctx.fillText(`${onTrackCount} of ${total}`, centerX, centerY);

    ctx.font = '500 11px system-ui, sans-serif';
    ctx.fillStyle = '#6B7280';
    ctx.fillText('On Track', centerX, centerY + 18);

    ctx.restore();
  },
};

export function KPIV7() {
  const { kpis } = mockKPIs;

  const counts = {
    'on-track': kpis.filter((k) => k.status === 'on-track').length,
    'at-risk': kpis.filter((k) => k.status === 'at-risk').length,
    'behind': kpis.filter((k) => k.status === 'behind').length,
  };

  const data = useMemo(() => ({
    labels: ['On Track', 'At Risk', 'Behind'],
    datasets: [{
      data: [counts['on-track'], counts['at-risk'], counts['behind']],
      backgroundColor: ['#10B981', '#F59E0B', '#EF4444'],
      borderWidth: 0,
      cutout: '72%',
    }],
  }), []);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: { label: string; parsed: number }) => `${ctx.label}: ${ctx.parsed} KPIs`,
        },
      },
    },
  }), []);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary-600" />
          <CardTitle className="text-base">KPI/KRA Tracker</CardTitle>
        </div>
      </CardHeader>

      <CardContent>
        {/* Donut */}
        <div className="h-[200px] mx-auto max-w-[200px]">
          <Doughnut data={data} options={options} plugins={[centerTextPlugin]} />
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-3 text-xs">
          {(['on-track', 'at-risk', 'behind'] as KPIStatus[]).map((s) => (
            <div key={s} className="flex items-center gap-1">
              <span className={cn('h-2 w-2 rounded-full', STATUS_COLORS[s].dot)} />
              <span className="capitalize text-gray-600">{s}</span>
              <span className="font-semibold text-gray-800">{counts[s]}</span>
            </div>
          ))}
        </div>

        {/* KPI list */}
        <div className="mt-4 space-y-2">
          {kpis.map((kpi) => {
            const pct = Math.min(Math.round((kpi.current / kpi.target) * 100), 100);
            return (
              <div key={kpi.id} className="flex items-center gap-2 text-xs">
                <span className="text-gray-600 truncate flex-1 min-w-0">{kpi.name}</span>
                <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden shrink-0">
                  <div
                    className={cn('h-full rounded-full', STATUS_COLORS[kpi.status].bar)}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-gray-700 font-medium tabular-nums w-16 text-right shrink-0">
                  {kpi.current}/{kpi.target}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
