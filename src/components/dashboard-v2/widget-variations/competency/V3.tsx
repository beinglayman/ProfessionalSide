import { FileText, MessageSquare, Code, Users, GitBranch, Lightbulb, Grid3X3, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../ui/card';
import { cn } from '../../../../lib/utils';
import { mockCompetencyMatrix } from '../../mock-data';
import type { CompetencyMatrixData, IntensityLevel } from '../../types';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  FileText, MessageSquare, Code, Users, GitBranch, Lightbulb,
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

function Sparkline({ data }: { data: IntensityLevel[] }) {
  const width = 120;
  const height = 32;
  const max = 4;
  const points = data.map((v, i) => ({
    x: (i / (data.length - 1)) * width,
    y: height - (v / max) * height,
  }));
  const line = points.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join(' ');
  const areaPath = `${line} L${width},${height} L0,${height} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-8" preserveAspectRatio="none">
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9F5FE7" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#9F5FE7" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#sparkGrad)" />
      <path d={line} fill="none" stroke="#5D259F" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

const TREND_CONFIG = {
  up: { Icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  down: { Icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-50' },
  stable: { Icon: Minus, color: 'text-amber-500', bg: 'bg-amber-50' },
};

const TREND_LABELS: Record<string, string> = {
  up: 'Improving',
  down: 'Declining',
  stable: 'Steady',
};

export function CompetencyV3() {
  const { areas } = mockCompetencyMatrix;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Grid3X3 className="h-5 w-5 text-primary-600" />
          <CardTitle className="text-base">Competency Sparklines</CardTitle>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Trend based on last 4 vs previous 4 weeks
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {areas.map((area) => {
            const Icon = ICON_MAP[area.icon];
            const score = getScore(area.weeks);
            const trend = getTrend(area.weeks);
            const { Icon: TrendIcon, color, bg } = TREND_CONFIG[trend];

            return (
              <div
                key={area.name}
                className="rounded-lg border border-gray-100 bg-white p-3.5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-50">
                      {Icon && <Icon className="h-3.5 w-3.5 text-primary-600" />}
                    </div>
                    <span className="text-xs font-medium text-gray-600">{area.name}</span>
                  </div>
                  <div
                    className={cn('flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium', bg, color)}
                    title={TREND_LABELS[trend]}
                  >
                    <TrendIcon className="h-3 w-3" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1.5">{score}%</div>
                <Sparkline data={area.weeks} />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
