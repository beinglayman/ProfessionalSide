import React from 'react';
import {
  GitPullRequest,
  GitCommit,
  GitBranch,
  FileCode,
  Plus,
  Minus,
  Users,
  Tag,
  MessageSquare,
  CheckCircle2,
  Clock,
  AlertCircle,
  Circle,
} from 'lucide-react';
import { ActivityRawData } from '../../types/activity';
import { cn } from '../../lib/utils';
import { SimpleMarkdown } from '../ui/simple-markdown';

interface GitHubPRDetailsProps {
  rawData: ActivityRawData;
  description?: string | null;
  className?: string;
}

/**
 * State badge colors and icons for GitHub PR states
 */
const STATE_CONFIG: Record<string, { icon: React.ElementType; color: string; bgColor: string; label: string }> = {
  merged: { icon: CheckCircle2, color: '#8250df', bgColor: '#f3e8ff', label: 'Merged' },
  open: { icon: Circle, color: '#1a7f37', bgColor: '#dafbe1', label: 'Open' },
  closed: { icon: AlertCircle, color: '#cf222e', bgColor: '#ffebe9', label: 'Closed' },
  approved: { icon: CheckCircle2, color: '#1a7f37', bgColor: '#dafbe1', label: 'Approved' },
  changes_requested: { icon: AlertCircle, color: '#bf8700', bgColor: '#fff8c5', label: 'Changes Requested' },
  review_required: { icon: Clock, color: '#6e7781', bgColor: '#f6f8fa', label: 'Review Required' },
};

/**
 * Format diff stats with colors
 */
function DiffStats({ additions, deletions }: { additions?: number; deletions?: number }) {
  if (additions === undefined && deletions === undefined) return null;

  return (
    <div className="flex items-center gap-2 text-xs font-mono">
      {additions !== undefined && additions > 0 && (
        <span className="flex items-center gap-0.5 text-green-600">
          <Plus className="w-3 h-3" />
          {additions.toLocaleString()}
        </span>
      )}
      {deletions !== undefined && deletions > 0 && (
        <span className="flex items-center gap-0.5 text-red-500">
          <Minus className="w-3 h-3" />
          {deletions.toLocaleString()}
        </span>
      )}
    </div>
  );
}

/**
 * Branch flow visualization (head → base)
 */
function BranchFlow({ headRef, baseRef }: { headRef?: string; baseRef?: string }) {
  if (!headRef && !baseRef) return null;

  return (
    <div className="flex items-center gap-1.5 text-xs">
      <GitBranch className="w-3 h-3 text-gray-400" />
      <span className="font-mono text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
        {headRef || 'unknown'}
      </span>
      <span className="text-gray-400">→</span>
      <span className="font-mono text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
        {baseRef || 'main'}
      </span>
    </div>
  );
}

/**
 * Comprehensive GitHub PR details renderer.
 * Displays all available PR metadata in a structured, scannable format.
 */
export function GitHubPRDetails({ rawData, description, className }: GitHubPRDetailsProps) {
  const state = rawData.state || (rawData.isReviewed ? 'approved' : undefined);
  const stateConfig = state ? STATE_CONFIG[state] : undefined;
  const StateIcon = stateConfig?.icon;

  return (
    <div className={cn('space-y-3', className)}>
      {/* Row 1: State + Branch Flow + Draft badge */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* State badge */}
        {stateConfig && StateIcon && (
          <span
            className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full"
            style={{ color: stateConfig.color, backgroundColor: stateConfig.bgColor }}
          >
            <StateIcon className="w-3 h-3" />
            {stateConfig.label}
          </span>
        )}

        {/* Draft badge */}
        {rawData.isDraft && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
            <Clock className="w-3 h-3" />
            Draft
          </span>
        )}

        {/* Branch flow */}
        <BranchFlow headRef={rawData.headRef} baseRef={rawData.baseRef} />
      </div>

      {/* Row 2: Stats grid (files, commits, diff) */}
      <div className="flex items-center gap-4 text-xs text-gray-600">
        {/* Files changed */}
        {rawData.changedFiles !== undefined && rawData.changedFiles > 0 && (
          <div className="flex items-center gap-1">
            <FileCode className="w-3.5 h-3.5 text-gray-400" />
            <span>{rawData.changedFiles} {rawData.changedFiles === 1 ? 'file' : 'files'}</span>
          </div>
        )}

        {/* Commits */}
        {rawData.commits !== undefined && rawData.commits > 0 && (
          <div className="flex items-center gap-1">
            <GitCommit className="w-3.5 h-3.5 text-gray-400" />
            <span>{rawData.commits} {rawData.commits === 1 ? 'commit' : 'commits'}</span>
          </div>
        )}

        {/* Diff stats */}
        <DiffStats additions={rawData.additions} deletions={rawData.deletions} />

        {/* Comments count */}
        {rawData.commentsCount !== undefined && rawData.commentsCount > 0 && (
          <div className="flex items-center gap-1">
            <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
            <span>{rawData.commentsCount}</span>
          </div>
        )}
      </div>

      {/* Row 3: Labels */}
      {rawData.labels && rawData.labels.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <Tag className="w-3 h-3 text-gray-400" />
          {rawData.labels.map((label, i) => (
            <span
              key={i}
              className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200"
            >
              {label}
            </span>
          ))}
        </div>
      )}

      {/* Row 4: Reviewers */}
      {rawData.reviewers && rawData.reviewers.length > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <Users className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-gray-500">Reviewers:</span>
          <span className="font-medium">{rawData.reviewers.join(', ')}</span>
        </div>
      )}

      {/* Row 5: Author */}
      {rawData.author && (
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <GitPullRequest className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-gray-500">Author:</span>
          <span className="font-medium">{rawData.author}</span>
        </div>
      )}

      {/* Row 6: PR Description (markdown) */}
      {description && (
        <div className="pt-2 border-t border-gray-100">
          <SimpleMarkdown content={description} className="text-xs" maxLines={10} />
        </div>
      )}

      {/* Row 7: Comments (if available in rawData) */}
      {rawData.comments && rawData.comments.length > 0 && (
        <div className="pt-2 border-t border-gray-100 space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <MessageSquare className="w-3 h-3" />
            <span>Comments ({rawData.comments.length})</span>
          </div>
          {rawData.comments.slice(0, 3).map((comment, i) => (
            <div key={i} className="text-xs pl-4 border-l-2 border-gray-200">
              <span className="font-medium text-gray-700">{comment.author}:</span>{' '}
              <span className="text-gray-600">{comment.body.slice(0, 150)}{comment.body.length > 150 ? '...' : ''}</span>
            </div>
          ))}
          {rawData.comments.length > 3 && (
            <div className="text-[10px] text-gray-400 pl-4">
              +{rawData.comments.length - 3} more comments
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Issue state badge colors (different from PR states)
 */
const ISSUE_STATE_CONFIG: Record<string, { icon: React.ElementType; color: string; bgColor: string; label: string }> = {
  open: { icon: Circle, color: '#1a7f37', bgColor: '#dafbe1', label: 'Open' },
  closed: { icon: CheckCircle2, color: '#8250df', bgColor: '#f3e8ff', label: 'Closed' },
};

/**
 * GitHub Issue details renderer.
 * For issue activities (has commentsCount, no commits/changedFiles)
 */
export function GitHubIssueDetails({ rawData, description, className }: GitHubPRDetailsProps) {
  const stateConfig = rawData.state ? ISSUE_STATE_CONFIG[rawData.state] : undefined;
  const StateIcon = stateConfig?.icon;

  return (
    <div className={cn('space-y-3', className)}>
      {/* Row 1: State + Author */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* State badge */}
        {stateConfig && StateIcon && (
          <span
            className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full"
            style={{ color: stateConfig.color, backgroundColor: stateConfig.bgColor }}
          >
            <StateIcon className="w-3 h-3" />
            {stateConfig.label}
          </span>
        )}

        {/* Author */}
        {rawData.author && (
          <span className="text-xs text-gray-600">
            by <span className="font-medium">{rawData.author}</span>
          </span>
        )}

        {/* Comments count */}
        {rawData.commentsCount !== undefined && rawData.commentsCount > 0 && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{rawData.commentsCount} {rawData.commentsCount === 1 ? 'comment' : 'comments'}</span>
          </div>
        )}
      </div>

      {/* Row 2: Labels */}
      {rawData.labels && rawData.labels.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <Tag className="w-3 h-3 text-gray-400" />
          {rawData.labels.map((label, i) => (
            <span
              key={i}
              className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200"
            >
              {label}
            </span>
          ))}
        </div>
      )}

      {/* Row 3: Issue Body (markdown) */}
      {description && (
        <div className="pt-2 border-t border-gray-100">
          <SimpleMarkdown content={description} className="text-xs" maxLines={10} />
        </div>
      )}

      {/* Row 4: Comments (if available in rawData) */}
      {rawData.comments && rawData.comments.length > 0 && (
        <div className="pt-2 border-t border-gray-100 space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <MessageSquare className="w-3 h-3" />
            <span>Comments ({rawData.comments.length})</span>
          </div>
          {rawData.comments.slice(0, 3).map((comment, i) => (
            <div key={i} className="text-xs pl-4 border-l-2 border-gray-200">
              <span className="font-medium text-gray-700">{comment.author}:</span>{' '}
              <span className="text-gray-600">{comment.body.slice(0, 150)}{comment.body.length > 150 ? '...' : ''}</span>
            </div>
          ))}
          {rawData.comments.length > 3 && (
            <div className="text-[10px] text-gray-400 pl-4">
              +{rawData.comments.length - 3} more comments
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * GitHub Commit details renderer.
 * For commit activities (sourceId starts with 'commit:')
 */
export function GitHubCommitDetails({ rawData, className }: { rawData: ActivityRawData; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {/* Commit stats */}
      <div className="flex items-center gap-4 text-xs text-gray-600">
        {rawData.sha && (
          <div className="flex items-center gap-1">
            <GitCommit className="w-3.5 h-3.5 text-gray-400" />
            <span className="font-mono text-gray-500">{rawData.sha.substring(0, 7)}</span>
          </div>
        )}

        {rawData.changedFiles !== undefined && rawData.changedFiles > 0 && (
          <div className="flex items-center gap-1">
            <FileCode className="w-3.5 h-3.5 text-gray-400" />
            <span>{rawData.changedFiles} {rawData.changedFiles === 1 ? 'file' : 'files'}</span>
          </div>
        )}

        <DiffStats additions={rawData.additions} deletions={rawData.deletions} />
      </div>

      {/* Author */}
      {rawData.author && (
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <Users className="w-3.5 h-3.5 text-gray-400" />
          <span className="font-medium">{rawData.author}</span>
        </div>
      )}

      {/* Full commit message */}
      {rawData.message && rawData.message.includes('\n') && (
        <div className="pt-2 border-t border-gray-100">
          <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono bg-gray-50 p-2 rounded">
            {rawData.message}
          </pre>
        </div>
      )}
    </div>
  );
}
