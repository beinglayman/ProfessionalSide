import React from 'react';
import { BookOpen, CheckCircle, PenLine, Clock, Activity, BarChart3 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../ui/card';
import { cn } from '../../../../lib/utils';
import { mockStoryHealth } from '../../mock-data';
import type { StoryHealthData } from '../../types';

function getHealthColor(score: number) {
  if (score >= 75) return { bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'stroke-emerald-500', label: 'Healthy' };
  if (score >= 50) return { bg: 'bg-amber-100', text: 'text-amber-700', ring: 'stroke-amber-500', label: 'Needs Attention' };
  return { bg: 'bg-red-100', text: 'text-red-700', ring: 'stroke-red-500', label: 'At Risk' };
}

function getFreshnessInfo(days: number) {
  if (days <= 7) return { color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Fresh' };
  if (days <= 21) return { color: 'text-amber-600', bg: 'bg-amber-50', label: 'Aging' };
  return { color: 'text-red-600', bg: 'bg-red-50', label: 'Stale' };
}

function MiniGauge({ score }: { score: number }) {
  const health = getHealthColor(score);
  const r = 20;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;

  return (
    <svg width="52" height="52" viewBox="0 0 52 52" className="flex-shrink-0">
      <circle cx="26" cy="26" r={r} fill="none" stroke="#e5e7eb" strokeWidth="5" />
      <circle
        cx="26"
        cy="26"
        r={r}
        fill="none"
        className={health.ring}
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 26 26)"
      />
      <text x="26" y="30" textAnchor="middle" className="text-xs font-bold" fill="#111827">
        {score}
      </text>
    </svg>
  );
}

export function StoryHealthV5() {
  const data = mockStoryHealth;
  const health = getHealthColor(data.healthScore);
  const freshness = getFreshnessInfo(data.avgDaysSinceEdit);
  const coveredCount = data.coverageAreas.filter((a) => a.covered).length;
  const coveragePercent = Math.round((coveredCount / data.coverageAreas.length) * 100);

  const cards = [
    {
      title: 'Health Score',
      content: (
        <div className="flex items-center gap-3">
          <MiniGauge score={data.healthScore} />
          <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', health.bg, health.text)}>
            {health.label}
          </span>
        </div>
      ),
      icon: Activity,
      iconColor: 'text-primary-500',
      iconBg: 'bg-primary-50',
    },
    {
      title: 'Total Stories',
      content: (
        <p className="text-3xl font-bold text-gray-900">{data.totalStories}</p>
      ),
      icon: BookOpen,
      iconColor: 'text-gray-500',
      iconBg: 'bg-gray-50',
    },
    {
      title: 'Published',
      content: (
        <p className="text-3xl font-bold text-emerald-700">{data.publishedCount}</p>
      ),
      icon: CheckCircle,
      iconColor: 'text-emerald-500',
      iconBg: 'bg-emerald-50',
    },
    {
      title: 'Drafts',
      content: (
        <p className="text-3xl font-bold text-amber-700">{data.draftCount}</p>
      ),
      icon: PenLine,
      iconColor: 'text-amber-500',
      iconBg: 'bg-amber-50',
    },
    {
      title: 'Coverage',
      content: (
        <div>
          <p className="text-xl font-bold text-gray-900">
            {coveredCount}/{data.coverageAreas.length}
          </p>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-primary-500 transition-all"
              style={{ width: `${coveragePercent}%` }}
            />
          </div>
          <p className="mt-1 text-[10px] text-gray-400">{coveragePercent}% areas covered</p>
        </div>
      ),
      icon: BarChart3,
      iconColor: 'text-primary-500',
      iconBg: 'bg-primary-50',
    },
    {
      title: 'Freshness',
      content: (
        <div>
          <p className="text-xl font-bold text-gray-900">{data.avgDaysSinceEdit} days</p>
          <span className={cn('mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold', freshness.bg, freshness.color)}>
            {freshness.label}
          </span>
        </div>
      ),
      icon: Clock,
      iconColor: 'text-amber-500',
      iconBg: 'bg-amber-50',
    },
  ];

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Story Health</CardTitle>
      </CardHeader>
      <CardContent className="pb-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className="rounded-xl border border-gray-100 bg-white p-4 transition-shadow hover:shadow-md"
              >
                <div className="mb-3 flex items-center gap-2">
                  <div className={cn('flex h-7 w-7 items-center justify-center rounded-lg', card.iconBg)}>
                    <Icon className={cn('h-3.5 w-3.5', card.iconColor)} />
                  </div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
                    {card.title}
                  </p>
                </div>
                {card.content}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
