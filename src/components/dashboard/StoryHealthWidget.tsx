import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, CheckCircle, XCircle, PenLine, Activity, BarChart3, Package } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { cn } from '../../lib/utils';
import { useListCareerStories, usePackets } from '../../hooks/useCareerStories';
import { useActivities, isGroupedResponse } from '../../hooks/useActivities';
import { BRAG_DOC_CATEGORIES } from '../career-stories/constants';
import type { CareerStory } from '../../types/career-stories';

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

  const draftGroupCount = useMemo(() => {
    if (!activitiesData || !isGroupedResponse(activitiesData)) return 0;
    return activitiesData.groups.filter((g) => g.key !== 'unassigned').length;
  }, [activitiesData]);

  const packetsCount = packets?.length ?? 0;

  // Coverage: which BRAG_DOC_CATEGORIES have stories
  const coveredCategories = useMemo(() => {
    const cats = new Set<string>();
    for (const s of stories) {
      if (s.category) cats.add(s.category);
    }
    return cats;
  }, [stories]);

  // Health score: published ratio × 100
  const healthScore = stories.length > 0 ? Math.round((publishedCount / stories.length) * 100) : 0;

  const cards = [
    {
      title: 'Impact Score',
      content: <MiniGauge score={healthScore} />,
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
        <div className="grid grid-cols-2 gap-1">
          {BRAG_DOC_CATEGORIES.map((cat) => (
            <div
              key={cat.value}
              className={cn(
                'flex items-center gap-1 rounded px-1.5 py-1 text-[10px] font-medium',
                coveredCategories.has(cat.value) ? 'text-emerald-700' : 'text-red-400'
              )}
            >
              {coveredCategories.has(cat.value) ? (
                <CheckCircle className="h-2.5 w-2.5 flex-shrink-0" />
              ) : (
                <XCircle className="h-2.5 w-2.5 flex-shrink-0" />
              )}
              <span className="truncate">{cat.label}</span>
            </div>
          ))}
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
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
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
