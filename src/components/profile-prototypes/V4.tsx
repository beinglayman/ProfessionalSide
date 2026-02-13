import { useState } from 'react';
import {
  mockProfile,
  getInitials,
  formatDateRange,
  calculateDuration,
  PROFICIENCY_META,
  getConfidenceLevel,
  getCertExpiryStatus,
} from './mock-data';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import { Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
} from 'chart.js';
import {
  Briefcase,
  Code2,
  BookOpen,
  Award,
  Users,
  TrendingUp,
  Calendar,
  Target,
  BarChart3,
  Activity,
} from 'lucide-react';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip);

/* ------------------------------------------------------------------ */
/*  Helper: compute the "elapsed" fraction for a certification bar    */
/* ------------------------------------------------------------------ */
function certElapsedFraction(issueDate: string, expiryDate: string | null): number {
  if (!expiryDate) return 0; // permanent — no bar needed
  const issued = new Date(issueDate).getTime();
  const expiry = new Date(expiryDate).getTime();
  const now = Date.now();
  const total = expiry - issued;
  if (total <= 0) return 1;
  return Math.min(1, Math.max(0, (now - issued) / total));
}

/* ------------------------------------------------------------------ */
/*  Stat card data                                                    */
/* ------------------------------------------------------------------ */
const statCards = [
  {
    icon: Briefcase,
    label: 'Years Experience',
    value: mockProfile.yearsOfExperience,
    description: `in ${mockProfile.industry}`,
    accent: 'text-blue-600 bg-blue-50',
  },
  {
    icon: Code2,
    label: 'Skills',
    value: mockProfile.skills.length,
    description: `across ${new Set(mockProfile.skills.map((s) => s.category)).size} categories`,
    accent: 'text-purple-600 bg-purple-50',
  },
  {
    icon: BookOpen,
    label: 'Stories Published',
    value: mockProfile.careerStories.length,
    description: `avg ${Math.round(
      (mockProfile.careerStories.reduce((a, s) => a + s.overallConfidence, 0) /
        mockProfile.careerStories.length) *
        100
    )}% confidence`,
    accent: 'text-emerald-600 bg-emerald-50',
  },
  {
    icon: Award,
    label: 'Certifications',
    value: mockProfile.certifications.length,
    description: `${mockProfile.certifications.filter((c) => c.expiryDate && new Date(c.expiryDate).getTime() > Date.now()).length} active, ${mockProfile.certifications.filter((c) => !c.expiryDate).length} permanent`,
    accent: 'text-amber-600 bg-amber-50',
  },
];

/* ------------------------------------------------------------------ */
/*  Radar chart data & options                                        */
/* ------------------------------------------------------------------ */
const radarData = {
  labels: mockProfile.skills.map((s) => s.name),
  datasets: [
    {
      label: 'Proficiency',
      data: mockProfile.skills.map((s) => PROFICIENCY_META[s.proficiency].level),
      borderColor: 'rgb(99, 102, 241)', // primary-500
      backgroundColor: 'rgba(224, 231, 255, 0.5)', // primary-100/50
      borderWidth: 2,
      pointBackgroundColor: 'rgb(99, 102, 241)',
      pointRadius: 4,
    },
  ],
};

const radarOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    r: {
      min: 0,
      max: 4,
      ticks: {
        stepSize: 1,
        backdropColor: 'transparent',
        font: { size: 10 },
      },
      pointLabels: { font: { size: 12 } },
      grid: { color: 'rgba(0,0,0,0.06)' },
      angleLines: { color: 'rgba(0,0,0,0.06)' },
    },
  },
  plugins: {
    tooltip: {
      callbacks: {
        label: (ctx: any) => {
          const levels = ['', 'Beginner', 'Intermediate', 'Advanced', 'Expert'];
          return `${ctx.label}: ${levels[ctx.raw as number]} (${ctx.raw}/4)`;
        },
      },
    },
  },
};

/* ------------------------------------------------------------------ */
/*  Experience bar colors by recency                                  */
/* ------------------------------------------------------------------ */
const EXP_BAR_COLORS = ['bg-primary-500', 'bg-primary-400', 'bg-primary-300'];

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */
export function ProfileV4() {
  const p = mockProfile;

  /* Compute experience timeline scale (years) */
  const allDates = p.experience.flatMap((e) => [
    new Date(e.startDate).getTime(),
    (e.endDate ? new Date(e.endDate) : new Date()).getTime(),
  ]);
  const timelineStart = Math.min(...allDates);
  const timelineEnd = Math.max(...allDates);
  const timelineSpan = timelineEnd - timelineStart || 1;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      {/* ---- Compact Header ---- */}
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary-600 text-sm font-bold text-white">
          {getInitials(p.name)}
        </div>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-gray-900">{p.name}</h1>
          <span className="text-gray-400">|</span>
          <span className="text-sm text-gray-600">{p.title}</span>
          <Badge variant="secondary">{p.company}</Badge>
        </div>
      </div>

      {/* ---- Stat Cards Row ---- */}
      <div className="grid grid-cols-4 gap-4">
        {statCards.map((sc) => (
          <Card key={sc.label}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={cn('rounded-lg p-2', sc.accent)}>
                  <sc.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-500">{sc.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{sc.value}</p>
                  <p className="truncate text-xs text-gray-400">{sc.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ---- Two-column: Radar + Profile Completeness ---- */}
      <div className="grid grid-cols-2 gap-6">
        {/* Skill Proficiency Radar */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4 text-primary-500" />
              Skill Proficiency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <Radar data={radarData} options={radarOptions as any} />
            </div>
          </CardContent>
        </Card>

        {/* Profile Completeness */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-primary-500" />
              Profile Completeness
              <Badge variant="secondary" className="ml-auto">
                {p.profileCompleteness.overall}%
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {p.profileCompleteness.byCategory.map((cat) => (
                <div key={cat.category}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-gray-600">{cat.category}</span>
                    <span className="font-medium text-gray-900">{cat.percentage}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-primary-500 transition-all"
                      style={{ width: `${cat.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ---- Experience Timeline ---- */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4 text-primary-500" />
            Experience Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {p.experience.map((exp, idx) => {
              const start = new Date(exp.startDate).getTime();
              const end = exp.endDate ? new Date(exp.endDate).getTime() : Date.now();
              const leftPct = ((start - timelineStart) / timelineSpan) * 100;
              const widthPct = ((end - start) / timelineSpan) * 100;

              return (
                <div key={exp.id} className="flex items-center gap-4">
                  {/* Labels */}
                  <div className="w-48 flex-shrink-0">
                    <p className="text-sm font-medium text-gray-900">{exp.company}</p>
                    <p className="text-xs text-gray-500">{exp.title}</p>
                  </div>

                  {/* Bar */}
                  <div className="relative h-7 flex-1 rounded bg-gray-50">
                    <div
                      className={cn(
                        'absolute top-0.5 bottom-0.5 rounded',
                        EXP_BAR_COLORS[idx] ?? 'bg-primary-200'
                      )}
                      style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                    />
                  </div>

                  {/* Duration label */}
                  <span className="w-20 flex-shrink-0 text-right text-xs text-gray-500">
                    {calculateDuration(exp.startDate, exp.endDate)}
                  </span>
                </div>
              );
            })}

            {/* Axis labels */}
            <div className="ml-52 flex justify-between text-[10px] text-gray-400">
              <span>{new Date(timelineStart).getFullYear()}</span>
              <span>{new Date(timelineEnd).getFullYear()}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ---- Career Stories Confidence ---- */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-primary-500" />
            Career Stories Confidence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {p.careerStories.map((story) => {
              const pct = Math.round(story.overallConfidence * 100);
              const conf = getConfidenceLevel(story.overallConfidence);

              return (
                <Card key={story.id} className="border-gray-100 shadow-none">
                  <CardContent className="flex items-center gap-4 p-4">
                    {/* Circular gauge */}
                    <div className="relative flex h-16 w-16 flex-shrink-0 items-center justify-center">
                      <div
                        className="absolute inset-0 rounded-full"
                        style={{
                          background: `conic-gradient(from 0deg, rgb(99, 102, 241) ${pct}%, rgb(229, 231, 235) ${pct}%)`,
                        }}
                      />
                      <div className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white text-xs font-bold text-gray-900">
                        {pct}%
                      </div>
                    </div>

                    {/* Details */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {story.title}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <Badge variant="outline" className="text-[10px]">
                          {story.framework}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">
                          {story.archetype}
                        </Badge>
                      </div>
                      <p className={cn('mt-1 text-xs', conf.color)}>{conf.label}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ---- Certifications Status ---- */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Award className="h-4 w-4 text-primary-500" />
            Certifications Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {p.certifications.map((cert) => {
              const status = getCertExpiryStatus(cert.expiryDate);
              const elapsed = certElapsedFraction(cert.issueDate, cert.expiryDate);
              const isPermanent = !cert.expiryDate;

              return (
                <div key={cert.id} className="flex items-center gap-4">
                  {/* Name + Org */}
                  <div className="w-56 flex-shrink-0">
                    <p className="text-sm font-medium text-gray-900">{cert.name}</p>
                    <p className="text-xs text-gray-500">{cert.organization}</p>
                  </div>

                  {/* Progress bar */}
                  <div className="flex-1">
                    {isPermanent ? (
                      <div className="flex h-2 w-full items-center">
                        <div className="h-full w-full rounded-full bg-emerald-200" />
                      </div>
                    ) : (
                      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            elapsed > 0.85 ? 'bg-amber-400' : 'bg-primary-500'
                          )}
                          style={{ width: `${Math.round(elapsed * 100)}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Expiry badge */}
                  <Badge
                    variant="outline"
                    className={cn('w-36 justify-center text-[10px]', status.color)}
                  >
                    {status.label}
                  </Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ---- Network Stats ---- */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-primary-500" />
            Network
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Followers */}
            <div className="flex items-center gap-3">
              <span className="w-20 text-sm text-gray-600">Followers</span>
              <div className="flex-1">
                <div className="h-4 w-full overflow-hidden rounded-full bg-gray-50">
                  <div
                    className="flex h-full items-center rounded-full bg-primary-500 pl-2 text-[10px] font-medium text-white"
                    style={{
                      width: `${Math.round(
                        (p.networkStats.followers /
                          (p.networkStats.followers + p.networkStats.following)) *
                          100
                      )}%`,
                    }}
                  >
                    {p.networkStats.followers}
                  </div>
                </div>
              </div>
            </div>

            {/* Following */}
            <div className="flex items-center gap-3">
              <span className="w-20 text-sm text-gray-600">Following</span>
              <div className="flex-1">
                <div className="h-4 w-full overflow-hidden rounded-full bg-gray-50">
                  <div
                    className="flex h-full items-center rounded-full bg-primary-300 pl-2 text-[10px] font-medium text-gray-700"
                    style={{
                      width: `${Math.round(
                        (p.networkStats.following /
                          (p.networkStats.followers + p.networkStats.following)) *
                          100
                      )}%`,
                    }}
                  >
                    {p.networkStats.following}
                  </div>
                </div>
              </div>
            </div>

            {/* Summary */}
            <p className="text-xs text-gray-400">
              <TrendingUp className="mr-1 inline-block h-3 w-3" />
              {Math.round((p.networkStats.followers / p.networkStats.following) * 10) / 10}:1
              follower-to-following ratio
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
