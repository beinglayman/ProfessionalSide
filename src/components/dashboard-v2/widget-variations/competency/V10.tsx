import { useState } from 'react';
import { Grid3X3 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../ui/card';
import { cn } from '../../../../lib/utils';
import { mockCompetencyMatrix } from '../../mock-data';
import type { CompetencyMatrixData, IntensityLevel } from '../../types';

const INTENSITY_HEX: Record<IntensityLevel, string> = {
  0: 'transparent',
  1: '#E7D7F9',
  2: '#CFAFF3',
  3: '#9F5FE7',
  4: '#4B1E80',
};

const BUBBLE_RADIUS: Record<IntensityLevel, number> = {
  0: 0,
  1: 2,
  2: 4,
  3: 6,
  4: 8,
};

function getMonthLabels(weekLabels: string[]): { label: string; x: number }[] {
  const months: { label: string; x: number }[] = [];
  let lastMonth = '';
  weekLabels.forEach((dateStr, i) => {
    const d = new Date(dateStr);
    const month = d.toLocaleDateString('en-US', { month: 'short' });
    if (month !== lastMonth) {
      months.push({ label: month, x: i });
      lastMonth = month;
    }
  });
  return months;
}

export function CompetencyV10() {
  const { areas, weekLabels, totalWeeks } = mockCompetencyMatrix;
  const months = getMonthLabels(weekLabels);

  const [tooltip, setTooltip] = useState<{
    area: string; date: string; level: IntensityLevel; x: number; y: number;
  } | null>(null);

  // SVG dimensions
  const padLeft = 110;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 30;
  const chartW = totalWeeks * 18;
  const rowH = 36;
  const chartH = areas.length * rowH;
  const svgW = padLeft + chartW + padRight;
  const svgH = padTop + chartH + padBottom;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Grid3X3 className="h-5 w-5 text-primary-600" />
          <CardTitle className="text-base">Competency Bubble Matrix</CardTitle>
        </div>
        <p className="text-xs text-gray-400 mt-1">Bubble size and color indicate weekly intensity</p>
      </CardHeader>
      <CardContent className="relative">
        <div className="overflow-x-auto">
          <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full min-w-[500px]" style={{ height: svgH }}>
            {/* Grid lines - horizontal */}
            {areas.map((_, ai) => (
              <line
                key={`h-${ai}`}
                x1={padLeft}
                y1={padTop + ai * rowH + rowH / 2}
                x2={padLeft + chartW}
                y2={padTop + ai * rowH + rowH / 2}
                stroke="#F3F4F6"
                strokeWidth="1"
              />
            ))}

            {/* Grid lines - vertical (per month) */}
            {months.map((m) => (
              <line
                key={`v-${m.label}`}
                x1={padLeft + m.x * 18}
                y1={padTop}
                x2={padLeft + m.x * 18}
                y2={padTop + chartH}
                stroke="#F3F4F6"
                strokeWidth="1"
              />
            ))}

            {/* Y-axis labels */}
            {areas.map((area, ai) => (
              <text
                key={area.name}
                x={padLeft - 8}
                y={padTop + ai * rowH + rowH / 2 + 4}
                textAnchor="end"
                className="text-[10px]"
                fill="#6B7280"
              >
                {area.name}
              </text>
            ))}

            {/* X-axis month labels */}
            {months.map((m) => (
              <text
                key={`ml-${m.label}`}
                x={padLeft + m.x * 18 + 10}
                y={padTop + chartH + 18}
                textAnchor="middle"
                className="text-[10px]"
                fill="#9CA3AF"
              >
                {m.label}
              </text>
            ))}

            {/* Bubbles */}
            {areas.map((area, ai) =>
              area.weeks.map((level, wi) => {
                if (level === 0) return null;
                const cx = padLeft + wi * 18 + 9;
                const cy = padTop + ai * rowH + rowH / 2;
                const r = BUBBLE_RADIUS[level];
                return (
                  <circle
                    key={`${ai}-${wi}`}
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill={INTENSITY_HEX[level]}
                    stroke={level >= 3 ? '#4B1E80' : '#CFAFF3'}
                    strokeWidth="0.5"
                    className="cursor-pointer transition-transform hover:scale-125"
                    style={{ transformOrigin: `${cx}px ${cy}px` }}
                    onMouseEnter={(e) => {
                      const rect = (e.target as SVGElement).closest('svg')!.getBoundingClientRect();
                      setTooltip({
                        area: area.name,
                        date: weekLabels[wi],
                        level,
                        x: rect.left + (cx / svgW) * rect.width,
                        y: rect.top + (cy / svgH) * rect.height,
                      });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                );
              })
            )}
          </svg>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 mt-3 justify-center">
          {([1, 2, 3, 4] as IntensityLevel[]).map((level) => (
            <div key={level} className="flex items-center gap-1">
              <svg width={BUBBLE_RADIUS[level] * 2 + 4} height={BUBBLE_RADIUS[level] * 2 + 4}>
                <circle
                  cx={BUBBLE_RADIUS[level] + 2}
                  cy={BUBBLE_RADIUS[level] + 2}
                  r={BUBBLE_RADIUS[level]}
                  fill={INTENSITY_HEX[level]}
                  stroke="#CFAFF3"
                  strokeWidth="0.5"
                />
              </svg>
              <span className="text-[10px] text-gray-400">L{level}</span>
            </div>
          ))}
        </div>

        {/* Tooltip */}
        {tooltip && (
          <div
            className="fixed z-50 px-2.5 py-1.5 bg-gray-900 text-white text-xs rounded-md shadow-lg pointer-events-none"
            style={{ left: tooltip.x, top: tooltip.y - 40 }}
          >
            <div className="font-medium">{tooltip.area}</div>
            <div className="text-gray-300">
              {new Date(tooltip.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} &middot; Level {tooltip.level}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
