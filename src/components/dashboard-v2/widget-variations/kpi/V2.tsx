import { useMemo } from 'react';
import { Target } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../ui/card';
import { cn } from '../../../../lib/utils';
import { mockKPIs } from '../../mock-data';
import type { KPIItem, KPIStatus } from '../../types';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Radar } from 'react-chartjs-2';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const STATUS_COLORS: Record<KPIStatus, { dot: string }> = {
  'on-track': { dot: 'bg-emerald-500' },
  'at-risk': { dot: 'bg-amber-500' },
  'behind': { dot: 'bg-red-500' },
};

export function KPIV2() {
  const { kpis } = mockKPIs;

  const grouped = kpis.reduce<Record<string, KPIItem[]>>((acc, kpi) => {
    if (!acc[kpi.category]) acc[kpi.category] = [];
    acc[kpi.category].push(kpi);
    return acc;
  }, {});

  const categories = Object.keys(grouped);

  const categoryAvgs = useMemo(() => {
    return categories.map((cat) => {
      const items = grouped[cat];
      const avg = items.reduce((sum, k) => sum + Math.min((k.current / k.target) * 100, 100), 0) / items.length;
      return Math.round(avg);
    });
  }, []);

  const data = useMemo(() => ({
    labels: categories,
    datasets: [
      {
        label: 'Completion %',
        data: categoryAvgs,
        backgroundColor: 'rgba(93, 37, 159, 0.2)',
        borderColor: '#7C3AED',
        borderWidth: 2,
        pointBackgroundColor: '#7C3AED',
        pointRadius: 4,
        fill: true,
      },
    ],
  }), []);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        min: 0,
        max: 100,
        ticks: { stepSize: 25, display: true, backdropColor: 'transparent', font: { size: 9 }, color: '#9CA3AF' },
        grid: { color: '#E5E7EB' },
        angleLines: { color: '#E5E7EB' },
        pointLabels: { font: { size: 11, weight: '500' as const }, color: '#374151' },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: { parsed: { r: number } }) => `${ctx.parsed.r}% completion`,
        },
      },
    },
  }), []);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary-600" />
          <CardTitle className="text-base">KPI Radar Overview</CardTitle>
        </div>
        <p className="text-xs text-gray-400 mt-1">Average completion % per category</p>
      </CardHeader>

      <CardContent>
        <div className="h-[260px]">
          <Radar data={data} options={options} />
        </div>

        <div className="mt-4 space-y-1.5">
          {kpis.map((kpi) => {
            const pct = Math.min(Math.round((kpi.current / kpi.target) * 100), 100);
            return (
              <div key={kpi.id} className="flex items-center gap-2 text-xs">
                <span className={cn('h-2 w-2 rounded-full shrink-0', STATUS_COLORS[kpi.status].dot)} />
                <span className="text-gray-600 truncate flex-1">{kpi.name}</span>
                <span className="text-gray-800 font-medium tabular-nums">{pct}%</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
