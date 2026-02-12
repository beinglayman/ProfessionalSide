import React from 'react';
import { BookOpen } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { cn } from '../../../../lib/utils';
import { mockStoryHealth } from '../../mock-data';
import type { StoryHealthData } from '../../types';

function getHealthColor(score: number) {
  if (score >= 75) return { bg: 'bg-emerald-100', text: 'text-emerald-700', bar: 'bg-emerald-500', label: 'Healthy' };
  if (score >= 50) return { bg: 'bg-amber-100', text: 'text-amber-700', bar: 'bg-amber-500', label: 'Needs Attention' };
  return { bg: 'bg-red-100', text: 'text-red-700', bar: 'bg-red-500', label: 'At Risk' };
}

function getFreshnessInfo(days: number) {
  if (days <= 7) return { bar: 'bg-emerald-500', percent: 100, label: 'Fresh', text: 'text-emerald-700' };
  if (days <= 21) return { bar: 'bg-amber-500', percent: 60, label: 'Aging', text: 'text-amber-700' };
  return { bar: 'bg-red-500', percent: 25, label: 'Stale', text: 'text-red-700' };
}

interface ProgressBarProps {
  label: string;
  value: number;
  max: number;
  barColor: string;
  displayValue: string;
  sublabel?: string;
}

function ProgressBar({ label, value, max, barColor, displayValue, sublabel }: ProgressBarProps) {
  const percent = Math.min((value / max) * 100, 100);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm font-medium text-gray-700">{label}</span>
          {sublabel && (
            <span className="ml-2 text-[11px] text-gray-400">{sublabel}</span>
          )}
        </div>
        <span className="text-sm font-bold text-gray-900">{displayValue}</span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className={cn('h-full rounded-full transition-all duration-500', barColor)}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export function StoryHealthV6() {
  const data = mockStoryHealth;
  const health = getHealthColor(data.healthScore);
  const freshness = getFreshnessInfo(data.avgDaysSinceEdit);
  const coveredCount = data.coverageAreas.filter((a) => a.covered).length;
  const publishedPercent = Math.round((data.publishedCount / data.totalStories) * 100);
  const coveragePercent = Math.round((coveredCount / data.coverageAreas.length) * 100);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50">
              <BookOpen className="h-[18px] w-[18px] text-primary-500" />
            </div>
            <CardTitle className="text-lg">Story Health</CardTitle>
          </div>
          <Badge className={cn('border-0 px-2.5 py-0.5 text-xs font-bold', health.bg, health.text)}>
            {health.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 pb-5">
        <ProgressBar
          label="Health Score"
          value={data.healthScore}
          max={100}
          barColor={health.bar}
          displayValue={`${data.healthScore}/100`}
        />

        <ProgressBar
          label="Published"
          value={data.publishedCount}
          max={data.totalStories}
          barColor="bg-emerald-500"
          displayValue={`${data.publishedCount}/${data.totalStories}`}
          sublabel={`${publishedPercent}%`}
        />

        <ProgressBar
          label="Coverage"
          value={coveredCount}
          max={data.coverageAreas.length}
          barColor="bg-amber-500"
          displayValue={`${coveredCount}/${data.coverageAreas.length}`}
          sublabel={`${coveragePercent}%`}
        />

        <ProgressBar
          label="Freshness"
          value={freshness.percent}
          max={100}
          barColor={freshness.bar}
          displayValue={`${data.avgDaysSinceEdit}d`}
          sublabel={freshness.label}
        />

        {/* Summary row */}
        <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
          <div className="flex gap-4 text-xs text-gray-500">
            <span>
              <span className="font-semibold text-gray-900">{data.totalStories}</span> total
            </span>
            <span>
              <span className="font-semibold text-emerald-700">{data.publishedCount}</span> published
            </span>
            <span>
              <span className="font-semibold text-amber-700">{data.draftCount}</span> drafts
            </span>
          </div>
          <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', health.bg, health.text)}>
            {data.healthScore}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
