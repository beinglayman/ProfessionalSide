import { FileText, MessageSquare, Code, Users, GitBranch, Lightbulb } from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { mockCompetencyMatrix } from '../../mock-data';
import type { CompetencyMatrixData, IntensityLevel } from '../../types';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  FileText, MessageSquare, Code, Users, GitBranch, Lightbulb,
};

const INTENSITY_COLORS: Record<IntensityLevel, string> = {
  0: 'bg-gray-100',
  1: 'bg-primary-100',
  2: 'bg-primary-200',
  3: 'bg-primary-400',
  4: 'bg-primary-600',
};

function getScore(weeks: IntensityLevel[]): number {
  return Math.round((weeks.reduce((s, w) => s + w, 0) / (weeks.length * 4)) * 100);
}

function getTrend(weeks: IntensityLevel[]): 'up' | 'down' | 'stable' {
  const recent = weeks.slice(-4).reduce((s, w) => s + w, 0) / 4;
  const previous = weeks.slice(-8, -4).reduce((s, w) => s + w, 0) / 4;
  const diff = recent - previous;
  if (diff > 0.3) return 'up';
  if (diff < -0.3) return 'down';
  return 'stable';
}

function TrendArrow({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  if (trend === 'up') {
    return (
      <svg viewBox="0 0 12 12" className="w-3.5 h-3.5 text-emerald-500">
        <path d="M6 2 L10 7 L7.5 7 L7.5 10 L4.5 10 L4.5 7 L2 7 Z" fill="currentColor" />
      </svg>
    );
  }
  if (trend === 'down') {
    return (
      <svg viewBox="0 0 12 12" className="w-3.5 h-3.5 text-red-500">
        <path d="M6 10 L10 5 L7.5 5 L7.5 2 L4.5 2 L4.5 5 L2 5 Z" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 12 12" className="w-3.5 h-3.5 text-amber-500">
      <rect x="2" y="5" width="8" height="2" rx="1" fill="currentColor" />
    </svg>
  );
}

export function CompetencyV7() {
  const { areas } = mockCompetencyMatrix;

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      {/* Rows */}
      {areas.map((area, idx) => {
        const Icon = ICON_MAP[area.icon];
        const score = getScore(area.weeks);
        const trend = getTrend(area.weeks);

        return (
          <div
            key={area.name}
            className={cn(
              'flex items-center gap-3 px-3.5 py-2 transition-colors hover:bg-gray-50',
              idx < areas.length - 1 && 'border-b border-gray-100'
            )}
          >
            {/* Icon */}
            {Icon && <Icon className="h-4 w-4 text-primary-500 shrink-0" />}

            {/* Name */}
            <span className="text-xs font-medium text-gray-700 w-[90px] shrink-0 truncate">
              {area.name}
            </span>

            {/* Mini heatmap strip */}
            <div className="flex gap-[2px] flex-1 min-w-0">
              {area.weeks.map((level, wi) => (
                <div
                  key={wi}
                  className={cn('w-2 h-2 rounded-[1px] shrink-0', INTENSITY_COLORS[level])}
                />
              ))}
            </div>

            {/* Score */}
            <span className="text-xs font-semibold text-gray-700 w-[36px] text-right shrink-0">
              {score}%
            </span>

            {/* Trend */}
            <div className="shrink-0">
              <TrendArrow trend={trend} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
