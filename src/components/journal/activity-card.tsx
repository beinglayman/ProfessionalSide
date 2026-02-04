import React, { useState } from 'react';
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns';
import { ExternalLink, ChevronDown, ChevronRight, BookOpen } from 'lucide-react';
import {
  Activity,
  SUPPORTED_SOURCES,
  ActivitySource,
  ActivityRawData,
  ActivityStoryEdge,
  ACTIVITY_EDGE_LABELS
} from '../../types/activity';
import { cn } from '../../lib/utils';
import { SourceIcons } from './source-icons';
import {
  FALLBACK_SOURCE_COLOR,
  MAX_COMMENTS_DISPLAY,
  MAX_ATTENDEES_DISPLAY,
  MAX_REACTIONS_DISPLAY,
  MAX_COMMENT_BODY_LENGTH,
  getRefType,
  getUniqueRefs,
  getMetadataSummary,
  safeParseTimestamp,
  truncateText,
  resolveGoogleSource,
} from './activity-card-utils';
import { SimpleMarkdown } from '../ui/simple-markdown';
import { GitHubPRDetails, GitHubCommitDetails, GitHubIssueDetails } from './github-pr-details';

interface ActivityCardProps {
  activity: Activity;
  showStoryBadge?: boolean;
  /** Show full source icon (32x32) or minimal color bar. Default true. Set false when source is clear from context (e.g., By Source tab) */
  showSourceIcon?: boolean;
  compact?: boolean;
  className?: string;
  /** Edge context when displaying activity within a story */
  edge?: ActivityStoryEdge;
}

/**
 * Get expanded detail sections from rawData.
 * Only includes information NOT shown in the collapsed summary.
 */
function getExpandedDetails(
  source: string,
  rawData?: ActivityRawData | null,
  description?: string | null,
  sourceId?: string
): React.ReactNode[] {
  const sections: React.ReactNode[] = [];

  // GitHub gets special treatment with dedicated components
  if (source === 'github' && rawData) {
    const isCommit = sourceId?.startsWith('commit:');
    // PRs have commits count or changedFiles; Issues don't
    const isPR = rawData.commits !== undefined || rawData.changedFiles !== undefined || rawData.headRef !== undefined;

    if (isCommit) {
      sections.push(
        <GitHubCommitDetails key="github-commit" rawData={rawData} />
      );
    } else if (isPR) {
      sections.push(
        <GitHubPRDetails key="github-pr" rawData={rawData} description={description} />
      );
    } else {
      sections.push(
        <GitHubIssueDetails key="github-issue" rawData={rawData} description={description} />
      );
    }
    return sections;
  }

  // Non-GitHub sources: render description as plain text
  if (description) {
    sections.push(
      <div key="description" className="text-xs text-gray-600">
        {description}
      </div>
    );
  }

  if (!rawData) return sections;

  switch (source) {
    case 'github': {
      // Handled above with dedicated component
      break;
    }

    case 'jira': {
      if (rawData.labels && rawData.labels.length > 0) {
        sections.push(
          <div key="labels" className="flex items-center gap-1.5 flex-wrap">
            {rawData.labels.map((label, i) => (
              <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">
                {label}
              </span>
            ))}
          </div>
        );
      }
      if (rawData.assignee) {
        sections.push(
          <div key="assignee" className="text-xs text-gray-500">
            Assigned to: {rawData.assignee}
          </div>
        );
      }
      break;
    }

    case 'confluence': {
      if (rawData.lastModifiedBy) {
        sections.push(
          <div key="editor" className="text-xs text-gray-500">
            Last edited by: {rawData.lastModifiedBy}
          </div>
        );
      }
      break;
    }

    case 'slack': {
      if (rawData.reactions && rawData.reactions.length > 0) {
        sections.push(
          <div key="reactions" className="flex items-center gap-2 text-xs">
            {rawData.reactions.slice(0, MAX_REACTIONS_DISPLAY).map((r, i) => (
              <span key={i} className="px-1.5 py-0.5 rounded bg-gray-100">
                :{r.name}: {r.count}
              </span>
            ))}
          </div>
        );
      }
      break;
    }

    // Calendar/meeting sources (Microsoft + Google)
    case 'outlook':
    case 'teams':
    case 'google-calendar':
    case 'google-meet': {
      if (Array.isArray(rawData.attendees) && rawData.attendees.length > 0) {
        const displayAttendees = rawData.attendees.slice(0, MAX_ATTENDEES_DISPLAY);
        const remaining = rawData.attendees.length - MAX_ATTENDEES_DISPLAY;
        sections.push(
          <div key="attendees" className="text-xs text-gray-500">
            Attendees: {displayAttendees.join(', ')}
            {remaining > 0 && ` +${remaining} more`}
          </div>
        );
      }
      if (rawData.organizer) {
        sections.push(
          <div key="organizer" className="text-xs text-gray-500">
            Organized by: {rawData.organizer}
          </div>
        );
      }
      break;
    }

    // Microsoft file storage
    case 'onedrive':
    case 'sharepoint':
    // Google Workspace docs
    case 'google-docs':
    case 'google-sheets':
    case 'google-drive': {
      if (rawData.lastModifiedBy) {
        sections.push(
          <div key="editor" className="text-xs text-gray-500">
            Last edited by: {rawData.lastModifiedBy}
          </div>
        );
      }
      break;
    }

    case 'figma': {
      if (rawData.commenters && rawData.commenters.length > 0) {
        sections.push(
          <div key="commenters" className="text-xs text-gray-500">
            Comments from: {rawData.commenters.join(', ')}
          </div>
        );
      }
      break;
    }
  }

  // Comments section (common to all sources)
  if (rawData.comments && rawData.comments.length > 0) {
    sections.push(
      <div key="comments" className="space-y-1.5 pt-1 border-t border-gray-100">
        {rawData.comments.slice(0, MAX_COMMENTS_DISPLAY).map((c, i) => (
          <div key={i} className="text-xs">
            <span className="font-medium text-gray-700">{c.author}:</span>{' '}
            <span className="text-gray-500">
              {truncateText(c.body, MAX_COMMENT_BODY_LENGTH)}
            </span>
          </div>
        ))}
        {rawData.comments.length > MAX_COMMENTS_DISPLAY && (
          <div className="text-[10px] text-gray-400">
            +{rawData.comments.length - MAX_COMMENTS_DISPLAY} more comments
          </div>
        )}
      </div>
    );
  }

  return sections;
}

/**
 * Activity card with click-to-expand details.
 * Displays activity information in a scannable format with expandable details.
 */
export function ActivityCard({
  activity,
  showStoryBadge = true,
  showSourceIcon = true,
  compact = false,
  className,
  edge
}: ActivityCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Resolve Google source to specific product (calendar, docs, sheets, meet, drive)
  const resolvedSource = resolveGoogleSource(activity.source, activity.sourceId, activity.sourceUrl);
  const sourceInfo = SUPPORTED_SOURCES[resolvedSource as ActivitySource] || SUPPORTED_SOURCES[activity.source as ActivitySource];
  const SourceIcon = SourceIcons[resolvedSource] || SourceIcons[activity.source] || SourceIcons.github;
  const sourceColor = sourceInfo?.color || FALLBACK_SOURCE_COLOR;

  // Safely parse timestamp with fallback
  const timestamp = safeParseTimestamp(activity.timestamp);
  const timestampDisplay = timestamp
    ? (() => {
        if (isToday(timestamp)) return format(timestamp, 'h:mm a');
        if (isYesterday(timestamp)) return 'Yesterday';
        return formatDistanceToNow(timestamp, { addSuffix: false }).replace('about ', '');
      })()
    : 'Unknown';
  const timestampTitle = timestamp ? format(timestamp, 'PPpp') : activity.timestamp;

  // Filter out refs that duplicate the sourceId
  const uniqueRefs = getUniqueRefs(activity.crossToolRefs, activity.sourceId);

  // Get expanded details
  const expandedDetails = getExpandedDetails(activity.source, activity.rawData, activity.description, activity.sourceId);
  const hasExpandableContent = expandedDetails.length > 0 || uniqueRefs.length > 0;

  // Get metadata summary for collapsed view
  const metadataSummary = getMetadataSummary(activity.source, activity.rawData);

  const handleClick = () => {
    if (hasExpandableContent) {
      setIsExpanded(!isExpanded);
    }
  };

  const handleExternalLinkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // Compact mode: single-line card
  if (compact) {
    return (
      <article
        className={cn(
          'group flex items-center gap-3 py-2.5 px-3 rounded-lg',
          'hover:bg-gray-50 transition-colors',
          hasExpandableContent && 'cursor-pointer',
          className
        )}
        onClick={handleClick}
      >
        <div
          className="w-0.5 h-8 rounded-full flex-shrink-0"
          style={{ backgroundColor: sourceColor }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <SourceIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: sourceColor }} />
            <span className="font-medium text-sm text-gray-900 truncate">{activity.title}</span>
            <span className="text-xs text-gray-400 flex-shrink-0">{timestampDisplay}</span>
          </div>
        </div>
        {activity.sourceUrl && (
          <a
            href={activity.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleExternalLinkClick}
            className="p-1 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </article>
    );
  }

  // Full mode: expandable card
  return (
    <article
      className={cn(
        'group relative border-b border-gray-100 last:border-0',
        'transition-colors rounded-lg -mx-1',
        isExpanded ? 'bg-gray-50/80' : 'hover:bg-gray-50/50',
        hasExpandableContent && 'cursor-pointer',
        className
      )}
      onClick={handleClick}
    >
      {/* Outer flex container for color bar + content */}
      <div className="flex">
        {/* Color bar - extends full height when not showing icon */}
        {!showSourceIcon && (
          <div
            className="flex-shrink-0 w-1 rounded-l-lg"
            style={{ backgroundColor: sourceColor }}
          />
        )}

        {/* Main content area */}
        <div className="flex-1 min-w-0">
          {/* Main row */}
          <div className={cn("flex gap-3 py-3.5", showSourceIcon ? "px-3" : "px-3 pl-2.5")}>
            {/* Source icon (only when showSourceIcon is true) */}
            {showSourceIcon && (
              <div
                className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-white"
                style={{ backgroundColor: sourceColor }}
              >
                <SourceIcon className="w-4 h-4" />
              </div>
            )}

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Title row */}
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-medium text-gray-900 text-sm leading-snug line-clamp-1">
                  {activity.title}
                </h3>
                <span
                  className="text-[11px] text-gray-500 font-medium whitespace-nowrap flex-shrink-0 pt-0.5"
                  title={timestampTitle}
                >
                  {timestampDisplay}
                </span>
              </div>

              {/* Metadata row - sourceId + metadata only (source name is redundant - icon or group header shows it) */}
              <div className="flex items-center gap-1.5 text-[11px] mt-0.5">
                <span className="font-mono text-gray-400 truncate">
                  {activity.sourceId}
                </span>
                {metadataSummary && (
                  <>
                    <span className="text-gray-300">·</span>
                    <span className="text-gray-500 truncate">{metadataSummary}</span>
                  </>
                )}
              </div>

              {/* Edge badge when activity is shown within a story context */}
              {edge && (
                <div className="flex items-center gap-1.5 mt-1.5 text-xs">
                  <span
                    className="font-medium px-1.5 py-0.5 rounded"
                    style={{
                      color: ACTIVITY_EDGE_LABELS[edge.type].color,
                      backgroundColor: ACTIVITY_EDGE_LABELS[edge.type].bgColor
                    }}
                  >
                    {ACTIVITY_EDGE_LABELS[edge.type].label}
                  </span>
                  <span className="text-gray-500 italic line-clamp-1">{edge.message}</span>
                </div>
              )}

              {/* Collapsed: Show story badge only */}
              {!isExpanded && showStoryBadge && activity.storyId && activity.storyTitle && (
                <div className="mt-1.5">
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-purple-50 text-purple-600">
                    <BookOpen className="w-2.5 h-2.5" />
                    {activity.storyTitle}
                  </span>
                </div>
              )}
            </div>

            {/* Expand indicator + external link */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {hasExpandableContent && (
                <div className="p-1 text-gray-300">
                  {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </div>
              )}
              {activity.sourceUrl && (
                <a
                  href={activity.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleExternalLinkClick}
                  className="p-1 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Open in source"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>

          {/* Expanded details */}
          {isExpanded && (
            <div className={cn("pb-3.5 space-y-2", showSourceIcon ? "px-3 pl-14" : "px-3 pl-2.5")}>
          {/* Cross-tool references */}
          {uniqueRefs.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {uniqueRefs.map((ref, i) => {
                const refType = getRefType(ref);
                const RefIcon = refType ? SourceIcons[refType] : null;
                const refColor = refType ? SUPPORTED_SOURCES[refType]?.color : undefined;

                return (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 text-[10px] font-mono font-medium text-gray-600 bg-white border border-gray-200 px-1.5 py-0.5 rounded"
                  >
                    {RefIcon && <RefIcon className="w-2.5 h-2.5" style={{ color: refColor }} />}
                    {ref}
                  </span>
                );
              })}
            </div>
          )}

          {/* Detail sections */}
          {expandedDetails}

          {/* Story badge in expanded view */}
          {showStoryBadge && activity.storyId && activity.storyTitle && (
            <div className="pt-1">
              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-purple-50 text-purple-600">
                <BookOpen className="w-2.5 h-2.5" />
                {activity.storyTitle}
              </span>
            </div>
          )}
        </div>
      )}
        </div>
      </div>
    </article>
  );
}
