// Shared mock body placeholder representing the ActivityStream
// Rendered below every header variant — purely decorative skeleton

import { cn } from '../../lib/utils';

const GROUPS = [
  { label: 'Today', count: 3 },
  { label: 'Yesterday', count: 2 },
  { label: 'This Week', count: 3 },
];

const SOURCE_COLORS = ['bg-blue-400', 'bg-purple-400', 'bg-amber-400', 'bg-emerald-400'];

function SkeletonCard({ index }: { index: number }) {
  const color = SOURCE_COLORS[index % SOURCE_COLORS.length];
  return (
    <div className="flex items-start gap-3 rounded-lg border border-gray-100 bg-white p-4">
      {/* Source dot */}
      <div className={cn('mt-1 h-3 w-3 shrink-0 rounded-full', color)} />
      {/* Content */}
      <div className="flex-1 space-y-2">
        <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-gray-100" />
      </div>
      {/* Timestamp */}
      <div className="h-3 w-14 shrink-0 animate-pulse rounded bg-gray-100" />
    </div>
  );
}

export function MockBody() {
  let cardIdx = 0;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-8">
      <div className="space-y-6">
        {GROUPS.map((group) => (
          <div key={group.label}>
            {/* Group header */}
            <div className="mb-3 flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                {group.label}
              </span>
              <div className="h-px flex-1 bg-gray-100" />
              <span className="text-xs text-gray-300">{group.count} items</span>
            </div>
            {/* Skeleton cards */}
            <div className="space-y-2">
              {Array.from({ length: group.count }, (_, i) => {
                const idx = cardIdx++;
                return <SkeletonCard key={idx} index={idx} />;
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
