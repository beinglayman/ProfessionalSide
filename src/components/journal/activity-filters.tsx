import React from 'react';
import { Sun, Calendar, Clock, History, GitBranch, CalendarDays, Star, Users } from 'lucide-react';
import { SUPPORTED_SOURCES, ActivitySource, TEMPORAL_BUCKETS, TemporalBucket, StoryGroupingMethod, STORY_GROUPING_LABELS, StoryDominantRole, STORY_ROLE_LABELS } from '../../types/activity';
import { cn } from '../../lib/utils';

// Source icons - small inline versions
const SourceIcons: Record<string, React.FC<{ className?: string }>> = {
  github: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
    </svg>
  ),
  jira: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.53 2c0 2.4 1.97 4.35 4.35 4.35h1.78v1.7c0 2.4 1.95 4.35 4.33 4.35V2.84c0-.46-.37-.84-.84-.84H11.53zm-4.76 4.8c0 2.4 1.95 4.35 4.33 4.35h1.78v1.7c0 2.4 1.95 4.35 4.33 4.35V7.64c0-.46-.37-.84-.84-.84H6.77zm-4.76 4.8c0 2.4 1.95 4.35 4.33 4.35h1.78v1.7c0 2.4 1.95 4.35 4.33 4.35v-9.56c0-.46-.37-.84-.84-.84H2.01z"/>
    </svg>
  ),
  confluence: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M1.29 17.39c-.27.42-.36.93-.24 1.42.12.48.43.89.86 1.15l5.94 3.59c.43.27.94.36 1.42.24.49-.12.9-.43 1.16-.86 1.11-1.86 2.65-3.43 4.5-4.57 1.84-1.13 3.93-1.8 6.08-1.94.5-.04.97-.28 1.29-.66.33-.38.49-.88.44-1.38l-.58-6.35c-.05-.5-.29-.97-.67-1.29-.38-.33-.88-.49-1.38-.44-3.19.25-6.3 1.28-9.07 3.01-2.76 1.73-5.1 4.12-6.76 6.97l-2.99 1.11z"/>
    </svg>
  ),
  teams: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.72 7.32h-3.4v4.6c0 .88-.72 1.6-1.6 1.6-.88 0-1.6-.72-1.6-1.6v-5.4c0-.88.72-1.6 1.6-1.6h5.4c.88 0 1.6.72 1.6 1.6v10c0 .88-.72 1.6-1.6 1.6h-2.8"/>
      <circle cx="18.72" cy="3.32" r="2"/>
      <path d="M13.32 19.12H2.12c-.88 0-1.6-.72-1.6-1.6v-8c0-.88.72-1.6 1.6-1.6h11.2c.88 0 1.6.72 1.6 1.6v8c0 .88-.72 1.6-1.6 1.6z"/>
      <circle cx="7.72" cy="5.72" r="2.4"/>
    </svg>
  ),
  outlook: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 7.387v10.478c0 .23-.08.424-.238.576-.156.154-.354.234-.594.234h-8.924v-6.09l1.613 1.18c.104.078.222.117.354.117.13 0 .25-.04.354-.118L24 7.387zm-.874-.652L16.203 12.5l-1.96-1.435V5.226h8.924c.237 0 .434.083.593.243.16.16.24.357.24.597v.67zM14.243 5.226v6.339L7.03 6.09V4.556c0-.23.08-.425.236-.58.16-.155.356-.233.596-.233h6.382v1.483zm0 6.842v6.706H7.862c-.24 0-.437-.08-.596-.234-.157-.152-.236-.346-.236-.576v-1.062l7.213-4.834z"/>
    </svg>
  ),
  slack: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M5.04 15.2a2.52 2.52 0 01-2.52 2.52A2.52 2.52 0 010 15.2a2.52 2.52 0 012.52-2.52h2.52v2.52m1.26 0a2.52 2.52 0 012.52-2.52 2.52 2.52 0 012.52 2.52v6.28A2.52 2.52 0 018.82 24a2.52 2.52 0 01-2.52-2.52V15.2"/>
      <path d="M8.82 5.04A2.52 2.52 0 016.3 2.52 2.52 2.52 0 018.82 0a2.52 2.52 0 012.52 2.52v2.52H8.82m0 1.26a2.52 2.52 0 012.52 2.52 2.52 2.52 0 01-2.52 2.52H2.52A2.52 2.52 0 010 8.82a2.52 2.52 0 012.52-2.52h6.3"/>
      <path d="M18.96 8.82a2.52 2.52 0 012.52-2.52A2.52 2.52 0 0124 8.82a2.52 2.52 0 01-2.52 2.52h-2.52V8.82m-1.26 0a2.52 2.52 0 01-2.52 2.52 2.52 2.52 0 01-2.52-2.52V2.52A2.52 2.52 0 0115.18 0a2.52 2.52 0 012.52 2.52v6.3"/>
      <path d="M15.18 18.96a2.52 2.52 0 012.52 2.52A2.52 2.52 0 0115.18 24a2.52 2.52 0 01-2.52-2.52v-2.52h2.52m0-1.26a2.52 2.52 0 01-2.52-2.52 2.52 2.52 0 012.52-2.52h6.3A2.52 2.52 0 0124 15.18a2.52 2.52 0 01-2.52 2.52h-6.3"/>
    </svg>
  ),
  figma: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M5 5.5A3.5 3.5 0 018.5 2H12v7H8.5A3.5 3.5 0 015 5.5z"/>
      <path d="M12 2h3.5A3.5 3.5 0 0115.5 9H12V2z"/>
      <path d="M12 12.5a3.5 3.5 0 117 0 3.5 3.5 0 01-7 0z"/>
      <path d="M5 19.5A3.5 3.5 0 018.5 16H12v3.5a3.5 3.5 0 01-7 0z"/>
      <path d="M5 12.5A3.5 3.5 0 018.5 9H12v7H8.5A3.5 3.5 0 015 12.5z"/>
    </svg>
  ),
  'google-calendar': ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z"/>
    </svg>
  ),
};

// Temporal filter labels
const TEMPORAL_LABELS: Record<TemporalBucket, { label: string; icon: React.FC<{ className?: string }> }> = {
  today: { label: 'Today', icon: Sun },
  yesterday: { label: 'Yesterday', icon: Calendar },
  this_week: { label: 'This Week', icon: Calendar },
  last_week: { label: 'Last Week', icon: Calendar },
  this_month: { label: 'This Month', icon: Clock },
  older: { label: 'Older', icon: History },
};

interface TemporalFiltersProps {
  availableBuckets: TemporalBucket[];
  selectedBuckets: TemporalBucket[];
  onToggle: (bucket: TemporalBucket) => void;
  counts?: Record<TemporalBucket, number>;
}

/**
 * Horizontal filter chips for temporal grouping
 */
export function TemporalFilters({
  availableBuckets,
  selectedBuckets,
  onToggle,
  counts
}: TemporalFiltersProps) {
  const allSelected = selectedBuckets.length === 0;

  // Handler to clear all selections
  const handleClearAll = () => {
    selectedBuckets.forEach(b => onToggle(b));
  };

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {/* All filter */}
      <button
        onClick={handleClearAll}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-all',
          allSelected
            ? 'bg-gray-900 text-white'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        )}
      >
        All
      </button>

      {availableBuckets.map(bucket => {
        const { label, icon: Icon } = TEMPORAL_LABELS[bucket];
        const isSelected = selectedBuckets.includes(bucket);
        const count = counts?.[bucket];

        return (
          <button
            key={bucket}
            onClick={() => onToggle(bucket)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-all',
              isSelected
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            <Icon className="w-3 h-3" />
            {label}
            {count !== undefined && count > 0 && (
              <span className={cn(
                'ml-0.5 text-[10px]',
                isSelected ? 'text-primary-200' : 'text-gray-400'
              )}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

interface SourceFiltersProps {
  availableSources: ActivitySource[];
  selectedSources: ActivitySource[];
  onToggle: (source: ActivitySource) => void;
  counts?: Record<ActivitySource, number>;
}

/**
 * Horizontal filter chips for source grouping
 */
export function SourceFilters({
  availableSources,
  selectedSources,
  onToggle,
  counts
}: SourceFiltersProps) {
  const allSelected = selectedSources.length === 0;

  // Handler to clear all selections
  const handleClearAll = () => {
    selectedSources.forEach(s => onToggle(s));
  };

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {/* All filter */}
      <button
        onClick={handleClearAll}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-all',
          allSelected
            ? 'bg-gray-900 text-white'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        )}
      >
        All Sources
      </button>

      {availableSources.map(source => {
        const sourceInfo = SUPPORTED_SOURCES[source as keyof typeof SUPPORTED_SOURCES];
        const Icon = SourceIcons[source];
        const isSelected = selectedSources.includes(source);
        const count = counts?.[source];
        const color = sourceInfo?.color || '#888';

        return (
          <button
            key={source}
            onClick={() => onToggle(source)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-all"
            style={{
              backgroundColor: isSelected ? color : undefined,
              color: isSelected ? 'white' : color,
              border: isSelected ? 'none' : `1px solid ${color}30`,
            }}
          >
            {Icon && <Icon className="w-3 h-3" />}
            {sourceInfo?.displayName || source}
            {count !== undefined && count > 0 && (
              <span className={cn(
                'ml-0.5 text-[10px]',
                isSelected ? 'opacity-70' : 'opacity-50'
              )}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// Story grouping method icons
const StoryMethodIcons: Record<StoryGroupingMethod, React.FC<{ className?: string }>> = {
  cluster: GitBranch,
  time: CalendarDays,
  manual: Calendar,
  ai: Clock,
};

// Role icons
const RoleIcons: Record<StoryDominantRole, React.FC<{ className?: string }>> = {
  Led: Star,
  Contributed: Users,
  Participated: Users,
};

interface StoryFiltersProps {
  availableMethods: StoryGroupingMethod[];
  selectedMethods: StoryGroupingMethod[];
  onToggle: (method: StoryGroupingMethod) => void;
  counts?: Record<StoryGroupingMethod, number>;
}

/**
 * Horizontal filter chips for story grouping method
 */
export function StoryFilters({
  availableMethods,
  selectedMethods,
  onToggle,
  counts
}: StoryFiltersProps) {
  const allSelected = selectedMethods.length === 0;

  // Handler to clear all selections
  const handleClearAll = () => {
    selectedMethods.forEach(m => onToggle(m));
  };

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {/* All filter */}
      <button
        onClick={handleClearAll}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-all',
          allSelected
            ? 'bg-gray-900 text-white'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        )}
      >
        All Stories
      </button>

      {availableMethods.map(method => {
        const { label } = STORY_GROUPING_LABELS[method];
        const Icon = StoryMethodIcons[method];
        const isSelected = selectedMethods.includes(method);
        const count = counts?.[method];
        const color = method === 'cluster' ? '#8B5CF6' : '#6B7280'; // Purple for cluster, gray for time

        return (
          <button
            key={method}
            onClick={() => onToggle(method)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-all"
            style={{
              backgroundColor: isSelected ? color : undefined,
              color: isSelected ? 'white' : color,
              border: isSelected ? 'none' : `1px solid ${color}30`,
            }}
          >
            <Icon className="w-3 h-3" />
            {label}
            {count !== undefined && count > 0 && (
              <span className={cn(
                'ml-0.5 text-[10px]',
                isSelected ? 'opacity-70' : 'opacity-50'
              )}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

interface RoleFiltersProps {
  availableRoles: StoryDominantRole[];
  selectedRoles: StoryDominantRole[];
  onToggle: (role: StoryDominantRole) => void;
  counts?: Record<StoryDominantRole, number>;
}

/**
 * Horizontal filter chips for role filtering (Led/Contributed/Participated)
 */
export function RoleFilters({
  availableRoles,
  selectedRoles,
  onToggle,
  counts
}: RoleFiltersProps) {
  const allSelected = selectedRoles.length === 0;

  // Handler to clear all selections
  const handleClearAll = () => {
    selectedRoles.forEach(r => onToggle(r));
  };

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {/* All filter */}
      <button
        onClick={handleClearAll}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-all',
          allSelected
            ? 'bg-gray-900 text-white'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        )}
      >
        All Roles
      </button>

      {availableRoles.map(role => {
        const { label, color, bgColor } = STORY_ROLE_LABELS[role];
        const Icon = RoleIcons[role];
        const isSelected = selectedRoles.includes(role);
        const count = counts?.[role];

        return (
          <button
            key={role}
            onClick={() => onToggle(role)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-all"
            style={{
              backgroundColor: isSelected ? color : bgColor,
              color: isSelected ? 'white' : color,
            }}
          >
            <Icon className="w-3 h-3" />
            {label}
            {count !== undefined && count > 0 && (
              <span className={cn(
                'ml-0.5 text-[10px]',
                isSelected ? 'opacity-70' : 'opacity-50'
              )}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
