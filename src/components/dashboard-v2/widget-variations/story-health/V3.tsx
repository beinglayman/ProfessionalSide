import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { cn } from '../../../../lib/utils';
import { mockStoryHealth } from '../../mock-data';
import type { StoryHealthData } from '../../types';

function getHealthColor(score: number) {
  if (score >= 75) return { bg: 'bg-emerald-100', text: 'text-emerald-700', stroke: '#10b981', label: 'Healthy' };
  if (score >= 50) return { bg: 'bg-amber-100', text: 'text-amber-700', stroke: '#f59e0b', label: 'Needs Attention' };
  return { bg: 'bg-red-100', text: 'text-red-700', stroke: '#ef4444', label: 'At Risk' };
}

function getFreshnessInfo(days: number) {
  if (days <= 7) return { color: 'bg-emerald-500', label: 'Fresh' };
  if (days <= 21) return { color: 'bg-amber-500', label: 'Aging' };
  return { color: 'bg-red-500', label: 'Stale' };
}

function SemiCircleGauge({ score, size = 200 }: { score: number; size?: number }) {
  const health = getHealthColor(score);
  const cx = size / 2;
  const cy = size / 2 + 10;
  const r = size / 2 - 16;
  const startAngle = Math.PI;
  const endAngle = 0;
  const scoreAngle = startAngle - (score / 100) * Math.PI;

  const arcPath = (angle1: number, angle2: number) => {
    const x1 = cx + r * Math.cos(angle1);
    const y1 = cy - r * Math.sin(angle1);
    const x2 = cx + r * Math.cos(angle2);
    const y2 = cy - r * Math.sin(angle2);
    const largeArc = Math.abs(angle1 - angle2) > Math.PI ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
  };

  return (
    <svg width={size} height={size / 2 + 30} viewBox={`0 0 ${size} ${size / 2 + 30}`}>
      {/* Track */}
      <path
        d={arcPath(startAngle, endAngle)}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth="12"
        strokeLinecap="round"
      />
      {/* Score arc */}
      <path
        d={arcPath(startAngle, scoreAngle)}
        fill="none"
        stroke={health.stroke}
        strokeWidth="12"
        strokeLinecap="round"
      />
      {/* Score text */}
      <text x={cx} y={cy - 20} textAnchor="middle" className="text-4xl font-bold" fill="#111827">
        {score}
      </text>
      <text x={cx} y={cy} textAnchor="middle" className="text-sm" fill="#9ca3af">
        / 100
      </text>
    </svg>
  );
}

export function StoryHealthV3() {
  const data = mockStoryHealth;
  const health = getHealthColor(data.healthScore);
  const freshness = getFreshnessInfo(data.avgDaysSinceEdit);

  const pills = [
    { label: `${data.totalStories} stories`, style: 'bg-gray-100 text-gray-700' },
    { label: `${data.publishedCount} published`, style: 'bg-emerald-50 text-emerald-700' },
    { label: `${data.draftCount} drafts`, style: 'bg-amber-50 text-amber-700' },
    { label: `${data.avgDaysSinceEdit}d fresh`, style: cn(freshness.color === 'bg-emerald-500' ? 'bg-emerald-50 text-emerald-700' : freshness.color === 'bg-amber-500' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700') },
  ];

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Story Health</CardTitle>
          <Badge className={cn('border-0 px-2.5 py-0.5 text-xs font-bold', health.bg, health.text)}>
            {health.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col items-center pb-5">
        {/* SVG Gauge */}
        <SemiCircleGauge score={data.healthScore} />

        {/* Stat pills */}
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {pills.map((pill) => (
            <span
              key={pill.label}
              className={cn('rounded-full px-3 py-1 text-xs font-semibold', pill.style)}
            >
              {pill.label}
            </span>
          ))}
        </div>

        {/* Coverage chips */}
        <div className="mt-5 w-full">
          <p className="mb-2 text-center text-xs font-medium text-gray-500">Coverage Areas</p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {data.coverageAreas.map((item) => (
              <span
                key={item.area}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium',
                  item.covered
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-red-50 text-red-500'
                )}
              >
                {item.covered ? (
                  <CheckCircle className="h-3 w-3" />
                ) : (
                  <XCircle className="h-3 w-3" />
                )}
                {item.area}
              </span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
