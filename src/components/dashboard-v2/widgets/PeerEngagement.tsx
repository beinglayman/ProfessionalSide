import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Users, Award, MessageCircle, ShieldCheck, Eye } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '../../ui/card';
import { cn } from '../../../lib/utils';
import type { PeerEngagementData, WidgetVariant } from '../types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip
);

interface PeerEngagementProps {
  data: PeerEngagementData;
  variant?: WidgetVariant;
}

function CircularProgress({
  value,
  label,
  icon: Icon,
  color,
}: {
  value: number;
  label: string;
  icon: React.FC<{ className?: string }>;
  color: 'purple' | 'emerald';
}) {
  const size = 96;
  const strokeWidth = 7;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  const colorMap = {
    purple: {
      stroke: '#9F5FE7',
      track: '#F3EBFC',
      text: 'text-primary-600',
      bg: 'bg-primary-50',
    },
    emerald: {
      stroke: '#10B981',
      track: '#D1FAE5',
      text: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
  };
  const colors = colorMap[color];

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={colors.track}
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={colors.stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Icon className={cn('h-4 w-4', colors.text)} />
          <span className={cn('mt-0.5 text-lg font-bold', colors.text)}>
            {value}
          </span>
        </div>
      </div>
      <span className="text-xs font-medium text-gray-500">{label}</span>
    </div>
  );
}

export const PeerEngagement: React.FC<PeerEngagementProps> = ({
  data,
  variant = 'detailed',
}) => {
  const latestConnections =
    data.networkGrowth.length > 0
      ? data.networkGrowth[data.networkGrowth.length - 1].connections
      : 0;

  const chartData = {
    labels: data.networkGrowth.map((d) => d.month),
    datasets: [
      {
        data: data.networkGrowth.map((d) => d.connections),
        borderColor: '#9F5FE7',
        backgroundColor: (ctx: { chart: { ctx: CanvasRenderingContext2D; chartArea: { top: number; bottom: number } | null } }) => {
          const chartCtx = ctx.chart.ctx;
          const area = ctx.chart.chartArea;
          if (!area) return 'rgba(159, 95, 231, 0.1)';
          const gradient = chartCtx.createLinearGradient(
            0,
            area.top,
            0,
            area.bottom
          );
          gradient.addColorStop(0, 'rgba(159, 95, 231, 0.2)');
          gradient.addColorStop(1, 'rgba(159, 95, 231, 0.02)');
          return gradient;
        },
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: '#5D259F',
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 2,
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      tooltip: {
        backgroundColor: '#270F40',
        titleFont: { family: 'Inter', size: 12 },
        bodyFont: { family: 'Inter', size: 12 },
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: (ctx: { parsed: { y: number } }) =>
            `${ctx.parsed.y} connections`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: '#999999',
          font: { family: 'Inter', size: 11 },
        },
        border: { display: false },
      },
      y: {
        grid: { color: '#F5F5F5' },
        ticks: {
          color: '#999999',
          font: { family: 'Inter', size: 11 },
        },
        border: { display: false },
      },
    },
  } as const;

  const stats = [
    {
      label: 'Attestations',
      value: data.attestationsReceived,
      icon: ShieldCheck,
      accent: 'text-primary-600',
      bg: 'bg-primary-50',
    },
    {
      label: 'Endorsements',
      value: data.endorsements,
      icon: Award,
      accent: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: 'Comments',
      value: data.comments,
      icon: MessageCircle,
      accent: 'text-sky-600',
      bg: 'bg-sky-50',
    },
    {
      label: 'Network',
      value: latestConnections,
      icon: Users,
      accent: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
  ];

  if (variant === 'minimal') {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50">
                <Users className="h-4 w-4 text-primary-500" />
              </div>
              <CardTitle className="text-base">Peer Engagement</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="grid grid-cols-2 gap-3">
            {stats.slice(0, 2).map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-xl font-bold text-gray-900">{s.value}</p>
                <p className="text-[11px] text-gray-400">{s.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50">
            <Users className="h-[18px] w-[18px] text-primary-500" />
          </div>
          <div>
            <CardTitle className="text-lg">Peer Engagement</CardTitle>
            <p className="mt-0.5 text-xs text-gray-400">
              Recognition and network growth
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 pb-5">
        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-2.5">
          {stats.map((s) => {
            const StatIcon = s.icon;
            return (
              <div
                key={s.label}
                className="rounded-xl border border-gray-100 bg-gray-50/50 p-3 text-center"
              >
                <div
                  className={cn(
                    'mx-auto flex h-7 w-7 items-center justify-center rounded-lg',
                    s.bg
                  )}
                >
                  <StatIcon className={cn('h-3.5 w-3.5', s.accent)} />
                </div>
                <p className="mt-1.5 text-lg font-bold text-gray-900">
                  {s.value}
                </p>
                <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
                  {s.label}
                </p>
              </div>
            );
          })}
        </div>

        {/* Network growth chart */}
        {variant === 'detailed' && (
          <div>
            <p className="mb-2 text-xs font-medium text-gray-500">
              Network Growth
            </p>
            <div className="h-40">
              <Line data={chartData} options={chartOptions} />
            </div>
          </div>
        )}

        {/* Score circles */}
        <div>
          <p className="mb-3 text-xs font-medium text-gray-500">
            Reputation Scores
          </p>
          <div className="flex items-center justify-center gap-10">
            <CircularProgress
              value={data.visibilityScore}
              label="Visibility"
              icon={Eye}
              color="purple"
            />
            <CircularProgress
              value={data.credibilityScore}
              label="Credibility"
              icon={ShieldCheck}
              color="emerald"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
