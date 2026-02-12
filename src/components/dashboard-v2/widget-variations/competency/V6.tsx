import { useMemo } from 'react';
import { Grid3X3 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../ui/card';
import { mockCompetencyMatrix } from '../../mock-data';
import type { CompetencyMatrixData, IntensityLevel } from '../../types';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const AREA_COLORS = [
  { border: '#4B1E80', bg: 'rgba(75, 30, 128, 0.15)' },
  { border: '#5D259F', bg: 'rgba(93, 37, 159, 0.15)' },
  { border: '#7C3AED', bg: 'rgba(124, 58, 237, 0.15)' },
  { border: '#9F5FE7', bg: 'rgba(159, 95, 231, 0.15)' },
  { border: '#B787ED', bg: 'rgba(183, 135, 237, 0.15)' },
  { border: '#CFAFF3', bg: 'rgba(207, 175, 243, 0.15)' },
];

function formatWeekLabel(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function CompetencyV6() {
  const { areas, weekLabels } = mockCompetencyMatrix;

  const data = useMemo(() => {
    const labels = weekLabels.map((w, i) => (i % 4 === 0 ? formatWeekLabel(w) : ''));

    return {
      labels,
      datasets: areas.map((area, idx) => ({
        label: area.name,
        data: area.weeks,
        borderColor: AREA_COLORS[idx].border,
        backgroundColor: AREA_COLORS[idx].bg,
        borderWidth: 1.5,
        fill: 'origin' as const,
        tension: 0.3,
        pointRadius: 0,
        pointHitRadius: 8,
      })),
    };
  }, [areas, weekLabels]);

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index' as const,
        intersect: false,
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            font: { size: 10 },
            color: '#9CA3AF',
            maxRotation: 0,
          },
        },
        y: {
          min: 0,
          max: 4,
          ticks: {
            stepSize: 1,
            font: { size: 10 },
            color: '#9CA3AF',
            callback: (value: number | string) => {
              const labels: Record<number, string> = { 0: 'None', 1: 'Low', 2: 'Med', 3: 'High', 4: 'V.High' };
              return labels[Number(value)] ?? value;
            },
          },
          grid: { color: '#F3F4F6' },
        },
      },
      plugins: {
        legend: {
          position: 'bottom' as const,
          labels: {
            usePointStyle: true,
            pointStyle: 'rect',
            padding: 12,
            font: { size: 10 },
          },
        },
        tooltip: {
          callbacks: {
            title: (items: { dataIndex: number }[]) => {
              if (!items.length) return '';
              return formatWeekLabel(weekLabels[items[0].dataIndex]);
            },
          },
        },
      },
    }),
    [weekLabels]
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Grid3X3 className="h-5 w-5 text-primary-600" />
          <CardTitle className="text-base">Competency Area Chart</CardTitle>
        </div>
        <p className="text-xs text-gray-400 mt-1">Stacked intensity across 26 weeks</p>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <Line data={data} options={options} />
        </div>
      </CardContent>
    </Card>
  );
}
