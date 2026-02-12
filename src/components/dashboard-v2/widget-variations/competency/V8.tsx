import { useMemo } from 'react';
import { Grid3X3 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../ui/card';
import { mockCompetencyMatrix } from '../../mock-data';
import type { CompetencyMatrixData, IntensityLevel } from '../../types';
import {
  Chart as ChartJS,
  RadialLinearScale,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { PolarArea } from 'react-chartjs-2';

ChartJS.register(RadialLinearScale, ArcElement, Tooltip, Legend);

const SLICE_COLORS = [
  'rgba(75, 30, 128, 0.7)',
  'rgba(93, 37, 159, 0.7)',
  'rgba(124, 58, 237, 0.7)',
  'rgba(159, 95, 231, 0.7)',
  'rgba(183, 135, 237, 0.7)',
  'rgba(207, 175, 243, 0.7)',
];

const SLICE_BORDERS = [
  '#4B1E80',
  '#5D259F',
  '#7C3AED',
  '#9F5FE7',
  '#B787ED',
  '#CFAFF3',
];

function getScore(weeks: IntensityLevel[]): number {
  return Math.round((weeks.reduce((s, w) => s + w, 0) / (weeks.length * 4)) * 100);
}

export function CompetencyV8() {
  const { areas } = mockCompetencyMatrix;

  const data = useMemo(() => {
    return {
      labels: areas.map((a) => a.name),
      datasets: [
        {
          data: areas.map((a) => getScore(a.weeks)),
          backgroundColor: SLICE_COLORS,
          borderColor: SLICE_BORDERS,
          borderWidth: 1.5,
        },
      ],
    };
  }, [areas]);

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          min: 0,
          max: 100,
          ticks: {
            stepSize: 25,
            display: true,
            backdropColor: 'transparent',
            font: { size: 9 },
            color: '#9CA3AF',
          },
          grid: { color: '#F3F4F6' },
        },
      },
      plugins: {
        legend: {
          position: 'bottom' as const,
          labels: {
            usePointStyle: true,
            pointStyle: 'rectRounded',
            padding: 14,
            font: { size: 11 },
            color: '#374151',
          },
        },
        tooltip: {
          callbacks: {
            label: (ctx: { label: string; parsed: { r: number } }) =>
              `${ctx.label}: ${ctx.parsed.r}%`,
          },
        },
      },
    }),
    []
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Grid3X3 className="h-5 w-5 text-primary-600" />
          <CardTitle className="text-base">Competency Polar Area</CardTitle>
        </div>
        <p className="text-xs text-gray-400 mt-1">Slice radius proportional to average score</p>
      </CardHeader>
      <CardContent>
        <div className="h-[320px]">
          <PolarArea data={data} options={options} />
        </div>
      </CardContent>
    </Card>
  );
}
