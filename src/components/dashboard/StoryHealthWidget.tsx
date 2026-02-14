import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, CheckCircle, PenLine, Clock, Activity, BarChart3, Package } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { cn } from '../../lib/utils';
import { useListCareerStories, usePackets } from '../../hooks/useCareerStories';
import { useActivities, isGroupedResponse } from '../../hooks/useActivities';
import { BRAG_DOC_CATEGORIES } from '../career-stories/constants';
import type { CareerStory, BragDocCategory } from '../../types/career-stories';

function MiniGauge({ score }: { score: number }) {
  const r = 20;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;

  let ringClass = 'stroke-red-500';
  if (score >= 75) ringClass = 'stroke-emerald-500';
  else if (score >= 50) ringClass = 'stroke-amber-500';

  return (
    <svg width="52" height="52" viewBox="0 0 52 52" className="flex-shrink-0">
      <circle cx="26" cy="26" r={r} fill="none" stroke="#e5e7eb" strokeWidth="5" />
      <circle
        cx="26" cy="26" r={r}
        fill="none" className={ringClass}
        strokeWidth="5" strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={offset}
        transform="rotate(-90 26 26)"
      />
      <text x="26" y="30" textAnchor="middle" className="text-xs font-bold" fill="#111827">
        {score}
      </text>
    </svg>
  );
}

function getHealthLabel(score: number) {
  if (score >= 75) return { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Healthy' };
  if (score >= 50) return { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Needs Attention' };
  return { bg: 'bg-red-100', text: 'text-red-700', label: 'At Risk' };
}

export function StoryHealthWidget() {
  const { data: storiesResult } = useListCareerStories();
  const { data: packets } = usePackets();
  const { data: activitiesData } = useActivities({ groupBy: 'story' });

  const stories: CareerStory[] = useMemo(() => {
    if (!storiesResult) return [];
    if (Array.isArray(storiesResult)) return storiesResult;
    if ((storiesResult as any)?.stories) return (storiesResult as any).stories;
    return [];
  }, [storiesResult]);

  const publishedCount = stories.filter((s) => s.isPublished).length;

  // Draft stories from activity grouping
  const draftGroupCount = useMemo(() => {
    if (!activitiesData || !isGroupedResponse(activitiesData)) return 0;
    return activitiesData.groups.filter((g) => g.key !== 'unassigned').length;
  }, [activitiesData]);

  const pendingReviewCount = stories.filter((s) => s.needsRegeneration).length;
  const packetsCount = packets?.length ?? 0;

  // Coverage: unique categories used vs total BRAG_DOC_CATEGORIES
  const totalCategories = BRAG_DOC_CATEGORIES.length;
  const usedCategories = useMemo(() => {
    const cats = new Set<string>();
    for (const s of stories) {
      if (s.category) cats.add(s.category);
    }
    return cats.size;
  }, [stories]);
  const coveragePercent = totalCategories > 0 ? Math.round((usedCategories / totalCategories) * 100) : 0;

  // Health score: published ratio × 100
  const healthScore = stories.length > 0 ? Math.round((publishedCount / stories.length) * 100) : 0;
  const health = getHealthLabel(healthScore);

  const cards = [
    {
      title: 'Impact Score',
      content: (
        <div className="flex items-center gap-3">
          <MiniGauge score={healthScore} />
          <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', health.bg, health.text)}>
            {health.label}
          </span>
        </div>
      ),
      icon: Activity,
      iconColor: 'text-primary-500',
      iconBg: 'bg-primary-50',
      link: '/stories',
    },
    {
      title: 'Published',
      content: <p className="text-3xl font-bold text-emerald-700">{publishedCount}</p>,
      icon: CheckCircle,
      iconColor: 'text-emerald-500',
      iconBg: 'bg-emerald-50',
      link: null,
    },
    {
      title: 'Drafts',
      content: <p className="text-3xl font-bold text-amber-700">{draftGroupCount}</p>,
      icon: PenLine,
      iconColor: 'text-amber-500',
      iconBg: 'bg-amber-50',
      link: '/stories',
    },
    {
      title: 'Pending Review',
      content: <p className="text-3xl font-bold text-red-700">{pendingReviewCount}</p>,
      icon: Clock,
      iconColor: 'text-red-500',
      iconBg: 'bg-red-50',
      link: '/stories',
    },
    {
      title: 'Packets',
      content: <p className="text-3xl font-bold text-gray-900">{packetsCount}</p>,
      icon: Package,
      iconColor: 'text-blue-500',
      iconBg: 'bg-blue-50',
      link: '/stories',
    },
    {
      title: 'Coverage',
      content: (
        <div>
          <p className="text-xl font-bold text-gray-900">
            {usedCategories}/{totalCategories}
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
      link: null,
    },
  ];

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Story Health</CardTitle>
      </CardHeader>
      <CardContent className="pb-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {cards.map((card) => {
            const Icon = card.icon;
            const inner = (
              <div
                className={cn(
                  'rounded-xl border border-gray-100 bg-white p-4 transition-shadow hover:shadow-md',
                  card.link && 'cursor-pointer'
                )}
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

            return card.link ? (
              <Link key={card.title} to={card.link} className="no-underline">
                {inner}
              </Link>
            ) : (
              <div key={card.title}>{inner}</div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
