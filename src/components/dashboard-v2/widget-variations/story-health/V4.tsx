import React from 'react';
import { BookOpen, FileCheck, FilePen, Activity, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Card, CardContent } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { cn } from '../../../../lib/utils';
import { mockStoryHealth } from '../../mock-data';
import type { StoryHealthData } from '../../types';

function getHealthColor(score: number) {
  if (score >= 75) return { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Healthy' };
  if (score >= 50) return { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Needs Attention' };
  return { bg: 'bg-red-100', text: 'text-red-700', label: 'At Risk' };
}

function getFreshnessInfo(days: number) {
  if (days <= 7) return { color: 'bg-emerald-500', label: 'Fresh' };
  if (days <= 21) return { color: 'bg-amber-500', label: 'Aging' };
  return { color: 'bg-red-500', label: 'Stale' };
}

export function StoryHealthV4() {
  const data = mockStoryHealth;
  const health = getHealthColor(data.healthScore);
  const freshness = getFreshnessInfo(data.avgDaysSinceEdit);

  const stats = [
    {
      icon: Activity,
      label: 'Health Score',
      value: data.healthScore.toString(),
      suffix: '/100',
      colorClass: health.text.replace('text-', ''),
    },
    {
      icon: BookOpen,
      label: 'Total Stories',
      value: data.totalStories.toString(),
      suffix: '',
      colorClass: 'gray-900',
    },
    {
      icon: FileCheck,
      label: 'Published',
      value: data.publishedCount.toString(),
      suffix: '',
      colorClass: 'emerald-700',
    },
    {
      icon: FilePen,
      label: 'Drafts',
      value: data.draftCount.toString(),
      suffix: '',
      colorClass: 'amber-700',
    },
  ];

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex min-h-[280px]">
          {/* Left half: large stacked numbers */}
          <div className="flex flex-1 flex-col justify-center gap-5 p-6">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50">
                    <Icon className="h-4 w-4 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
                      {stat.label}
                    </p>
                    <p className={cn('text-2xl font-bold', `text-${stat.colorClass}`)}>
                      {stat.value}
                      {stat.suffix && (
                        <span className="ml-0.5 text-sm font-normal text-gray-400">
                          {stat.suffix}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Divider */}
          <div className="w-px bg-gray-100" />

          {/* Right half: coverage + freshness */}
          <div className="flex flex-1 flex-col justify-center gap-5 p-6">
            {/* Health badge */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Status</span>
              <Badge className={cn('border-0 px-2.5 py-0.5 text-xs font-bold', health.bg, health.text)}>
                {health.label}
              </Badge>
            </div>

            {/* Coverage grid */}
            <div>
              <p className="mb-2 text-xs font-medium text-gray-500">Coverage Areas</p>
              <div className="grid grid-cols-2 gap-1.5">
                {data.coverageAreas.map((item) => (
                  <div
                    key={item.area}
                    className={cn(
                      'flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-medium',
                      item.covered
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-red-50 text-red-500'
                    )}
                  >
                    {item.covered ? (
                      <CheckCircle className="h-3 w-3 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-3 w-3 flex-shrink-0" />
                    )}
                    <span className="truncate">{item.area}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Freshness */}
            <div className="flex items-center gap-2 rounded-lg border border-gray-100 px-3 py-2">
              <Clock className="h-3.5 w-3.5 text-gray-400" />
              <span className="text-xs text-gray-600">
                {data.avgDaysSinceEdit} days since last edit
              </span>
              <span className={cn('ml-auto h-2 w-2 rounded-full', freshness.color)} />
              <span className="text-[11px] text-gray-400">{freshness.label}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
