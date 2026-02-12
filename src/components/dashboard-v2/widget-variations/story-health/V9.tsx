import React from 'react';
import { BookOpen, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../ui/card';
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
  if (days <= 7) return { color: 'text-emerald-600', label: 'Fresh' };
  if (days <= 21) return { color: 'text-amber-600', label: 'Aging' };
  return { color: 'text-red-600', label: 'Stale' };
}

/** 6x4 grid of book icons: filled=published, outlined=draft */
function BookGrid({ published, drafts }: { published: number; drafts: number }) {
  const total = published + drafts;
  const cols = 6;
  const icons = Array.from({ length: total }, (_, i) => i < published);

  return (
    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {icons.map((isPublished, i) => (
        <div
          key={i}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-md transition-colors',
            isPublished ? 'bg-primary-100' : 'bg-amber-50'
          )}
        >
          <BookOpen
            className={cn(
              'h-4 w-4',
              isPublished ? 'text-primary-600' : 'text-amber-400'
            )}
            strokeWidth={isPublished ? 2.5 : 1.5}
          />
        </div>
      ))}
    </div>
  );
}

/** SVG circular progress ring */
function CoverageRing({ covered, total }: { covered: number; total: number }) {
  const percent = (covered / total) * 100;
  const r = 40;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;

  return (
    <svg width="100" height="100" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#e5e7eb" strokeWidth="8" />
      <circle
        cx="50" cy="50" r={r} fill="none" stroke="#9F5FE7" strokeWidth="8"
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
        transform="rotate(-90 50 50)"
      />
      <text x="50" y="46" textAnchor="middle" className="text-lg font-bold" fill="#111827">
        {covered}/{total}
      </text>
      <text x="50" y="60" textAnchor="middle" className="text-[10px]" fill="#9ca3af">
        covered
      </text>
    </svg>
  );
}

/** Mini sparkline for quarterly trend */
function Sparkline({ values, labels }: { values: number[]; labels: string[] }) {
  const width = 200;
  const height = 40;
  const pad = 8;
  const max = Math.max(...values, 1);

  const points = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (width - pad * 2);
    const y = height - pad - (v / max) * (height - pad * 2);
    return { x, y, v, label: labels[i] };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height + 16}`} className="w-full">
        {/* Line */}
        <path d={pathD} fill="none" stroke="#9F5FE7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {/* Points + labels */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="3" fill="#fff" stroke="#9F5FE7" strokeWidth="1.5" />
            <text x={p.x} y={p.y - 6} textAnchor="middle" className="text-[8px]" fill="#6b7280">
              {p.v}
            </text>
            <text x={p.x} y={height + 12} textAnchor="middle" className="text-[7px]" fill="#9ca3af">
              {p.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export function StoryHealthV9() {
  const data = mockStoryHealth;
  const health = getHealthColor(data.healthScore);
  const freshness = getFreshnessInfo(data.avgDaysSinceEdit);
  const coveredCount = data.coverageAreas.filter((a) => a.covered).length;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Story Health</CardTitle>
          <Badge className={cn('border-0 px-3 py-1 text-xs font-bold', health.bg, health.text)}>
            {data.healthScore}/100 &middot; {health.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 pb-5">
        {/* Book icons grid */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium text-gray-500">Story Library</p>
            <div className="flex gap-3 text-[10px] text-gray-400">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded bg-primary-500" /> Published ({data.publishedCount})
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded border border-amber-400 bg-amber-50" /> Draft ({data.draftCount})
              </span>
            </div>
          </div>
          <BookGrid published={data.publishedCount} drafts={data.draftCount} />
        </div>

        {/* Coverage ring + list */}
        <div className="flex gap-5">
          <CoverageRing covered={coveredCount} total={data.coverageAreas.length} />
          <div className="flex flex-1 flex-col justify-center gap-1">
            {data.coverageAreas.map((item) => (
              <div key={item.area} className="flex items-center gap-1.5 text-[11px]">
                {item.covered ? (
                  <CheckCircle className="h-3 w-3 text-emerald-500" />
                ) : (
                  <XCircle className="h-3 w-3 text-red-400" />
                )}
                <span className={item.covered ? 'text-gray-700' : 'text-gray-400'}>
                  {item.area}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Sparkline trend */}
        <div>
          <p className="mb-2 text-xs font-medium text-gray-500">Quarterly Trend</p>
          <Sparkline values={data.storiesPerQuarter} labels={data.quarterLabels} />
        </div>

        {/* Freshness */}
        <p className="text-center text-xs text-gray-400">
          Last edited{' '}
          <span className={cn('font-semibold', freshness.color)}>
            {data.avgDaysSinceEdit} days ago
          </span>{' '}
          &middot; {freshness.label}
        </p>
      </CardContent>
    </Card>
  );
}
