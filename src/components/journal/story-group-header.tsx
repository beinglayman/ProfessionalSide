import React from 'react';
import { format } from 'date-fns';
import { ChevronDown, ChevronRight, BookOpen, Calendar, FileText, CheckCircle, Sparkles, Users, Star } from 'lucide-react';
import { StoryMetadata, StoryDominantRole } from '../../types/activity';
import { cn } from '../../lib/utils';

interface StoryGroupHeaderProps {
  storyMetadata: StoryMetadata;
  activityCount: number;
  isExpanded: boolean;
  onToggle: () => void;
}

/**
 * Role badge component
 */
function RoleBadge({ role }: { role: StoryDominantRole }) {
  const config = {
    Led: { bg: 'bg-amber-100', text: 'text-amber-700', icon: Star },
    Contributed: { bg: 'bg-blue-100', text: 'text-blue-700', icon: Users },
    Participated: { bg: 'bg-gray-100', text: 'text-gray-600', icon: Users },
  };

  const { bg, text, icon: Icon } = config[role];

  return (
    <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium', bg, text)}>
      <Icon className="w-3 h-3" />
      {role}
    </span>
  );
}

/**
 * Clean, compact header for a story group
 */
export function StoryGroupHeader({
  storyMetadata,
  activityCount,
  isExpanded,
  onToggle
}: StoryGroupHeaderProps) {
  const {
    title,
    description,
    timeRangeStart,
    timeRangeEnd,
    category,
    skills,
    isPublished,
    topics,
    impactHighlights,
    dominantRole
  } = storyMetadata;

  // Format date range
  const getDateRange = () => {
    if (!timeRangeStart && !timeRangeEnd) return null;
    const start = timeRangeStart ? format(new Date(timeRangeStart), 'MMM d') : '';
    const end = timeRangeEnd ? format(new Date(timeRangeEnd), 'MMM d') : '';
    if (start && end && start !== end) return `${start} - ${end}`;
    return start || end;
  };

  const dateRange = getDateRange();

  return (
    <button
      onClick={onToggle}
      className={cn(
        'w-full text-left rounded-lg transition-all duration-200',
        'bg-gradient-to-r from-purple-50 to-transparent',
        'hover:from-purple-100',
        'border-l-3 border-purple-500 pl-4 py-3 pr-3'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Expand/Collapse */}
        <div className="text-gray-400 mt-0.5">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-center gap-2 mb-0.5">
            <FileText className="w-4 h-4 text-purple-500 flex-shrink-0" />
            <h3 className="font-semibold text-gray-900 text-sm truncate">
              {title}
            </h3>
            {dominantRole && <RoleBadge role={dominantRole} />}
            {isPublished && (
              <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
            )}
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
            {dateRange && (
              <>
                <Calendar className="w-3 h-3" />
                <span>{dateRange}</span>
              </>
            )}
            {category && (
              <>
                {dateRange && <span className="text-gray-300">·</span>}
                <span className="capitalize">{category.replace('-', ' ')}</span>
              </>
            )}
            {/* Show topics if available, otherwise fall back to skills */}
            {topics && topics.length > 0 ? (
              <>
                <span className="text-gray-300">·</span>
                <Sparkles className="w-3 h-3 text-purple-400" />
                <span className="text-purple-500">{topics.slice(0, 2).join(', ')}</span>
                {topics.length > 2 && (
                  <span className="text-gray-400 text-xs">+{topics.length - 2} more</span>
                )}
              </>
            ) : skills.length > 0 && (
              <>
                <span className="text-gray-300">·</span>
                <span className="text-purple-500">{skills.slice(0, 2).join(', ')}</span>
                {skills.length > 2 && (
                  <span className="text-gray-400 text-xs">+{skills.length - 2} more</span>
                )}
              </>
            )}
          </div>

          {/* Description preview (show when collapsed) */}
          {!isExpanded && description && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-1">
              {description}
            </p>
          )}

          {/* Expanded details */}
          {isExpanded && (
            <div className="mt-2 space-y-2">
              {/* Full description */}
              {description && (
                <p className="text-xs text-gray-600">
                  {description}
                </p>
              )}

              {/* Impact highlights - max 2 visible */}
              {impactHighlights && impactHighlights.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {impactHighlights.slice(0, 2).map((highlight, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded max-w-xs truncate"
                    >
                      <Star className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{highlight}</span>
                    </span>
                  ))}
                  {impactHighlights.length > 2 && (
                    <span className="text-xs text-gray-400">
                      +{impactHighlights.length - 2} more
                    </span>
                  )}
                </div>
              )}

              {/* Skills - dimmer secondary display when topics are shown */}
              {skills.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {skills.map((skill, idx) => (
                    <span
                      key={idx}
                      className={cn(
                        "text-xs px-1.5 py-0.5 rounded",
                        topics && topics.length > 0
                          ? "bg-gray-50 text-gray-500" // Dimmer when topics shown
                          : "bg-purple-50 text-purple-600"
                      )}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Activity count */}
        <span className="text-xs font-medium text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full flex-shrink-0">
          {activityCount}
        </span>
      </div>
    </button>
  );
}

/**
 * Header for unassigned activities group
 */
export function UnassignedGroupHeader({
  activityCount,
  isExpanded,
  onToggle
}: {
  activityCount: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        'w-full text-left rounded-lg transition-all duration-200',
        'bg-gray-50 hover:bg-gray-100',
        'border-l-3 border-gray-300 border-dashed pl-4 py-3 pr-3'
      )}
    >
      <div className="flex items-center gap-3">
        {/* Expand/Collapse */}
        <div className="text-gray-400">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </div>

        {/* Icon & Label */}
        <BookOpen className="w-4 h-4 text-gray-400" />
        <div className="flex-1">
          <span className="text-sm font-medium text-gray-600">Unassigned</span>
          <span className="text-xs text-gray-400 ml-2">Not linked to a story yet</span>
        </div>

        {/* Activity count */}
        <span className="text-xs font-medium text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
          {activityCount}
        </span>
      </div>
    </button>
  );
}
