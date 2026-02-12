import { Target } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../ui/card';
import { cn } from '../../../../lib/utils';
import { mockKPIs } from '../../mock-data';
import type { KPIItem } from '../../types';

function SemiGauge({ value, label, size = 140 }: { value: number; label: string; size?: number }) {
  const cx = size / 2;
  const cy = size / 2 + 10;
  const r = size / 2 - 16;
  const startAngle = Math.PI;
  const endAngle = 0;

  const describeArc = (startA: number, endA: number) => {
    const x1 = cx + r * Math.cos(startA);
    const y1 = cy + r * Math.sin(startA);
    const x2 = cx + r * Math.cos(endA);
    const y2 = cy + r * Math.sin(endA);
    const large = endA - startA > Math.PI ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  };

  // Background arc (full semi-circle from PI to 0)
  const bgPath = describeArc(startAngle, endAngle);

  // Value arc: proportional from PI toward 0
  const clampedValue = Math.min(Math.max(value, 0), 100);
  const valueAngle = startAngle - (clampedValue / 100) * Math.PI;
  const valuePath = describeArc(startAngle, valueAngle);

  // Zone arcs: 0-50% red, 50-75% amber, 75-100% green
  const zoneRed = describeArc(startAngle, startAngle - (50 / 100) * Math.PI);
  const zoneAmber = describeArc(startAngle - (50 / 100) * Math.PI, startAngle - (75 / 100) * Math.PI);
  const zoneGreen = describeArc(startAngle - (75 / 100) * Math.PI, endAngle);

  // Needle
  const needleAngle = startAngle - (clampedValue / 100) * Math.PI;
  const needleLen = r - 8;
  const nx = cx + needleLen * Math.cos(needleAngle);
  const ny = cy + needleLen * Math.sin(needleAngle);

  const color = clampedValue >= 75 ? '#10B981' : clampedValue >= 50 ? '#F59E0B' : '#EF4444';

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size / 2 + 24} viewBox={`0 0 ${size} ${size / 2 + 24}`}>
        {/* Zone arcs */}
        <path d={zoneRed} fill="none" stroke="#FEE2E2" strokeWidth={10} strokeLinecap="round" />
        <path d={zoneAmber} fill="none" stroke="#FEF3C7" strokeWidth={10} strokeLinecap="round" />
        <path d={zoneGreen} fill="none" stroke="#D1FAE5" strokeWidth={10} strokeLinecap="round" />
        {/* Value overlay */}
        <path d={valuePath} fill="none" stroke={color} strokeWidth={10} strokeLinecap="round" />
        {/* Needle */}
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#374151" strokeWidth={2} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={4} fill="#374151" />
        {/* Value text */}
        <text x={cx} y={cy - 12} textAnchor="middle" className="text-sm font-bold fill-gray-800">
          {Math.round(clampedValue)}%
        </text>
      </svg>
      <span className="text-xs text-gray-600 font-medium -mt-1">{label}</span>
    </div>
  );
}

export function KPIV4() {
  const { kpis } = mockKPIs;

  const grouped = kpis.reduce<Record<string, KPIItem[]>>((acc, kpi) => {
    if (!acc[kpi.category]) acc[kpi.category] = [];
    acc[kpi.category].push(kpi);
    return acc;
  }, {});

  const categoryAvgs = Object.entries(grouped).map(([cat, items]) => {
    const avg = items.reduce((s, k) => s + Math.min((k.current / k.target) * 100, 100), 0) / items.length;
    return { category: cat, value: Math.round(avg) };
  });

  const overallAvg = Math.round(
    kpis.reduce((s, k) => s + Math.min((k.current / k.target) * 100, 100), 0) / kpis.length
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary-600" />
          <CardTitle className="text-base">Gauge Dashboard</CardTitle>
        </div>
        <p className="text-xs text-gray-400 mt-1">Category completion gauges</p>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          {categoryAvgs.map(({ category, value }) => (
            <SemiGauge key={category} value={value} label={category} />
          ))}
          <SemiGauge value={overallAvg} label="Overall" />
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-4 text-[10px] text-gray-400">
          <div className="flex items-center gap-1">
            <div className="w-3 h-1.5 rounded bg-red-200" />
            <span>0-50%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-1.5 rounded bg-amber-200" />
            <span>50-75%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-1.5 rounded bg-emerald-200" />
            <span>75-100%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
