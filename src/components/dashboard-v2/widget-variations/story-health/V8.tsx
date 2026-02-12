import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Activity, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Card, CardContent } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { cn } from '../../../../lib/utils';
import { mockStoryHealth } from '../../mock-data';
import type { StoryHealthData } from '../../types';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip);

function getHealthColor(score: number) {
  if (score >= 75) return { bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'stroke-emerald-500', label: 'Healthy' };
  if (score >= 50) return { bg: 'bg-amber-100', text: 'text-amber-700', ring: 'stroke-amber-500', label: 'Needs Attention' };
  return { bg: 'bg-red-100', text: 'text-red-700', ring: 'stroke-red-500', label: 'At Risk' };
}

function getFreshnessInfo(days: number) {
  if (days <= 7) return { color: 'bg-emerald-500', label: 'Fresh' };
  if (days <= 21) return { color: 'bg-amber-500', label: 'Aging' };
  return { color: 'bg-red-500', label: 'Stale' };
}

function GaugeMini({ score }: { score: number }) {
  const health = getHealthColor(score);
  const r = 28;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;

  return (
    <svg width="72" height="72" viewBox="0 0 72 72">
      <circle cx="36" cy="36" r={r} fill="none" stroke="#e5e7eb" strokeWidth="6" />
      <circle
        cx="36" cy="36" r={r} fill="none"
        className={health.ring} strokeWidth="6" strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset}
        transform="rotate(-90 36 36)"
      />
      <text x="36" y="40" textAnchor="middle" className="text-sm font-bold" fill="#111827">
        {score}
      </text>
    </svg>
  );
}

export function StoryHealthV8() {
  const data = mockStoryHealth;
  const health = getHealthColor(data.healthScore);
  const freshness = getFreshnessInfo(data.avgDaysSinceEdit);

  const barData = {
    labels: data.quarterLabels,
    datasets: [{
      data: data.storiesPerQuarter,
      backgroundColor: '#9F5FE7',
      hoverBackgroundColor: '#5D259F',
      borderRadius: 4,
      barThickness: 18,
    }],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { tooltip: { backgroundColor: '#270F40', padding: 8, cornerRadius: 6 } },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#999', font: { size: 10 } }, border: { display: false } },
      y: { grid: { color: '#F5F5F5' }, ticks: { color: '#999', font: { size: 10 }, stepSize: 2 }, border: { display: false }, beginAtZero: true },
    },
  } as const;

  const donutData = {
    labels: ['Published', 'Drafts'],
    datasets: [{
      data: [data.publishedCount, data.draftCount],
      backgroundColor: ['#10b981', '#f59e0b'],
      borderWidth: 0,
      cutout: '68%',
    }],
  };

  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { tooltip: { backgroundColor: '#270F40', padding: 8, cornerRadius: 6 } },
  } as const;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="grid grid-cols-3 grid-rows-2 gap-3" style={{ gridTemplateRows: 'auto auto' }}>
          {/* Large card: health gauge + bar chart (spans 2 cols) */}
          <div className="col-span-2 rounded-xl border border-gray-100 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <GaugeMini score={data.healthScore} />
                <div>
                  <p className="text-lg font-bold text-gray-900">Story Health</p>
                  <Badge className={cn('mt-0.5 border-0 px-2 py-0.5 text-[10px] font-bold', health.bg, health.text)}>
                    {health.label}
                  </Badge>
                </div>
              </div>
              <Activity className="h-5 w-5 text-gray-300" />
            </div>
            <p className="mb-1.5 text-[11px] font-medium text-gray-400">Stories per Quarter</p>
            <div className="h-28">
              <Bar data={barData} options={barOptions} />
            </div>
          </div>

          {/* Medium card: donut / published vs drafts (1 col, tall, spans 2 rows) */}
          <div className="row-span-2 flex flex-col items-center justify-center rounded-xl border border-gray-100 bg-white p-4">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-gray-400">Published vs Drafts</p>
            <div className="relative h-28 w-28">
              <Doughnut data={donutData} options={donutOptions} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-gray-900">{data.totalStories}</span>
                <span className="text-[9px] text-gray-400">total</span>
              </div>
            </div>
            <div className="mt-3 space-y-1 text-center">
              <p className="text-xs">
                <span className="font-bold text-emerald-700">{data.publishedCount}</span>
                <span className="text-gray-400"> published</span>
              </p>
              <p className="text-xs">
                <span className="font-bold text-amber-700">{data.draftCount}</span>
                <span className="text-gray-400"> drafts</span>
              </p>
            </div>
          </div>

          {/* Small card 1: coverage grid */}
          <div className="rounded-xl border border-gray-100 bg-white p-3">
            <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-gray-400">Coverage</p>
            <div className="grid grid-cols-2 gap-1">
              {data.coverageAreas.map((item) => (
                <div
                  key={item.area}
                  className={cn(
                    'flex items-center gap-1 rounded px-1.5 py-1 text-[10px] font-medium',
                    item.covered ? 'text-emerald-700' : 'text-red-400'
                  )}
                >
                  {item.covered ? (
                    <CheckCircle className="h-2.5 w-2.5 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-2.5 w-2.5 flex-shrink-0" />
                  )}
                  <span className="truncate">{item.area}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Small card 2: freshness */}
          <div className="flex flex-col items-center justify-center rounded-xl border border-gray-100 bg-white p-3">
            <Clock className="mb-1.5 h-5 w-5 text-gray-300" />
            <p className="text-2xl font-bold text-gray-900">{data.avgDaysSinceEdit}</p>
            <p className="text-[10px] text-gray-400">days since edit</p>
            <div className="mt-2 flex items-center gap-1">
              <span className={cn('h-2 w-2 rounded-full', freshness.color)} />
              <span className="text-[10px] font-medium text-gray-500">{freshness.label}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
