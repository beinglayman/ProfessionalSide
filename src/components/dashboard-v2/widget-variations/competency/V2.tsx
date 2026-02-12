import { useMemo } from 'react';
import { Grid3X3 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../ui/card';
import { mockCompetencyMatrix } from '../../mock-data';
import type { CompetencyMatrixData, IntensityLevel } from '../../types';
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

function avgIntensity(weeks: IntensityLevel[]): number {
  return +(weeks.reduce((s, w) => s + w, 0) / weeks.length).toFixed(2);
}

export function CompetencyV2() {
  const { areas } = mockCompetencyMatrix;

  const data = useMemo(() => {
    const labels = areas.map((a) => a.name);
    // Recent = last 13 weeks; Earlier = first 13 weeks
    const recentAvg = areas.map((a) => avgIntensity(a.weeks.slice(13)));
    const earlierAvg = areas.map((a) => avgIntensity(a.weeks.slice(0, 13)));

    return {
      labels,
      datasets: [
        {
          label: 'Recent (Last 13 wk)',
          data: recentAvg,
          backgroundColor: 'rgba(93, 37, 159, 0.25)',
          borderColor: '#5D259F',
          borderWidth: 2,
          pointBackgroundColor: '#5D259F',
          pointRadius: 4,
        },
        {
          label: 'Earlier (First 13 wk)',
          data: earlierAvg,
          backgroundColor: 'rgba(207, 175, 243, 0.2)',
          borderColor: '#CFAFF3',
          borderWidth: 2,
          borderDash: [4, 4],
          pointBackgroundColor: '#CFAFF3',
          pointRadius: 3,
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
          max: 4,
          ticks: {
            stepSize: 1,
            display: true,
            backdropColor: 'transparent',
            font: { size: 10 },
            color: '#9CA3AF',
          },
          grid: { color: '#E5E7EB' },
          angleLines: { color: '#E5E7EB' },
          pointLabels: {
            font: { size: 11, weight: '500' as const },
            color: '#374151',
          },
        },
      },
      plugins: {
        legend: {
          position: 'bottom' as const,
          labels: {
            usePointStyle: true,
            pointStyle: 'circle',
            padding: 16,
            font: { size: 11 },
          },
        },
        tooltip: {
          callbacks: {
            label: (ctx: { dataset: { label?: string }; parsed: { r: number } }) =>
              `${ctx.dataset.label}: ${ctx.parsed.r.toFixed(1)} / 4.0`,
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
          <CardTitle className="text-base">Competency Radar</CardTitle>
        </div>
        <p className="text-xs text-gray-400 mt-1">Average intensity per area (0-4 scale)</p>
      </CardHeader>
      <CardContent>
        <div className="h-[320px]">
          <Radar data={data} options={options} />
        </div>
      </CardContent>
    </Card>
  );
}
