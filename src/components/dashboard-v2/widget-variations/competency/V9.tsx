import { FileText, MessageSquare, Code, Users, GitBranch, Lightbulb, Grid3X3 } from 'lucide-react';
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

function MiniSparkline({ data }: { data: IntensityLevel[] }) {
  const w = 80;
  const h = 20;
  const max = 4;
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * w,
    y: h - (v / max) * h,
  }));
  const d = pts.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-20 h-5" preserveAspectRatio="none">
      <path d={d} fill="none" stroke="#9F5FE7" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

function barColor(score: number): string {
  if (score >= 67) return 'bg-primary-600';
  if (score >= 40) return 'bg-primary-400';
  return 'bg-primary-200';
}

function barGradient(score: number): string {
  if (score >= 67) return 'from-primary-500 to-primary-600';
  if (score >= 40) return 'from-primary-300 to-primary-400';
  return 'from-primary-100 to-primary-200';
}

export function CompetencyV9() {
  const { areas } = mockCompetencyMatrix;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Grid3X3 className="h-5 w-5 text-primary-600" />
          <CardTitle className="text-base">Competency Progress</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {areas.map((area) => {
          const Icon = ICON_MAP[area.icon];
          const score = getScore(area.weeks);

          return (
            <div key={area.name} className="flex items-center gap-3">
              {/* Icon + Name */}
              <div className="flex items-center gap-2 w-[120px] shrink-0">
                {Icon && (
                  <div className="flex h-6 w-6 items-center justify-center rounded bg-primary-50">
                    <Icon className="h-3.5 w-3.5 text-primary-600" />
                  </div>
                )}
                <span className="text-xs font-medium text-gray-600 truncate">{area.name}</span>
              </div>

              {/* Progress bar */}
              <div className="flex-1 min-w-0">
                <div className="h-2.5 w-full rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full bg-gradient-to-r transition-all duration-700',
                      barGradient(score)
                    )}
                    style={{ width: `${score}%` }}
                  />
                </div>
              </div>

              {/* Score */}
              <span className="text-xs font-bold text-gray-700 w-[36px] text-right shrink-0">
                {score}%
              </span>

              {/* Sparkline */}
              <div className="shrink-0">
                <MiniSparkline data={area.weeks} />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
