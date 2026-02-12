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

function SemiGauge({ score, label, icon }: { score: number; label: string; icon: string }) {
  const Icon = ICON_MAP[icon];
  const radius = 60;
  const strokeWidth = 10;
  const cx = 70;
  const cy = 70;
  const circumference = Math.PI * radius; // semi-circle
  const filled = (score / 100) * circumference;

  // Color zone: red < 34, amber 34-66, green 67+
  const zoneColor = score >= 67 ? '#10B981' : score >= 34 ? '#F59E0B' : '#EF4444';
  const needleAngle = -180 + (score / 100) * 180;

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-1.5 mb-1">
        {Icon && <Icon className="h-3.5 w-3.5 text-primary-500" />}
        <span className="text-xs font-medium text-gray-600">{label}</span>
      </div>
      <svg viewBox="0 0 140 85" className="w-full max-w-[160px]">
        {/* Background arc */}
        <path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Color zone indicators */}
        <path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none"
          stroke={zoneColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          className="transition-all duration-700"
        />
        {/* Needle */}
        <g transform={`rotate(${needleAngle}, ${cx}, ${cy})`}>
          <line
            x1={cx}
            y1={cy}
            x2={cx - radius + 15}
            y2={cy}
            stroke="#374151"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx={cx} cy={cy} r="3" fill="#374151" />
        </g>
        {/* Score label */}
        <text
          x={cx}
          y={cy + 2}
          textAnchor="middle"
          className="text-[11px] font-bold"
          fill="#111827"
        >
          {score}%
        </text>
        {/* Zone labels */}
        <text x={cx - radius - 2} y={cy + 12} textAnchor="start" className="text-[7px]" fill="#9CA3AF">0</text>
        <text x={cx + radius + 2} y={cy + 12} textAnchor="end" className="text-[7px]" fill="#9CA3AF">100</text>
      </svg>
    </div>
  );
}

export function CompetencyV5() {
  const { areas } = mockCompetencyMatrix;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Grid3X3 className="h-5 w-5 text-primary-600" />
          <CardTitle className="text-base">Competency Gauges</CardTitle>
        </div>
        <p className="text-xs text-gray-400 mt-1">Score zones: red (0-33%), amber (34-66%), green (67-100%)</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {areas.map((area) => (
            <SemiGauge
              key={area.name}
              score={getScore(area.weeks)}
              label={area.name}
              icon={area.icon}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
