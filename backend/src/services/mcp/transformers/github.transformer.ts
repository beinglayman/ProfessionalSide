/**
 * GitHub Activity Transformer
 *
 * Transforms GitHub MCP tool responses into ActivityInput format
 * for persistence to ToolActivity table.
 *
 * IMPORTANT: Output format must match mock-data.service.ts exactly
 * to ensure consistency between demo and live modes.
 *
 * CRITICAL FOR CLUSTERING: The description and rawData fields must contain
 * cross-tool references (e.g., "Closes AUTH-123", "Fixes PERF-456") so that
 * RefExtractorService can detect them and cluster related activities together.
 */

import { ActivityInput } from '../../career-stories/activity-persistence.service';

/**
 * Transform GitHub activity data into ActivityInput array
 *
 * Format matches mock-data.service.ts:
 * - sourceId: 'repo/name#number' for PRs, 'commit:sha' for commits
 * - title: PR/commit message directly (not prefixed)
 * - rawData: matches mock structure (number, state, additions, deletions, etc.)
 * - description: MUST include PR body for cross-tool ref extraction
 *
 * Note: Using 'any' for input since the actual GitHub API returns more fields
 * than the minimal GitHubActivity type definition.
 */
export function transformGitHubActivity(data: any): ActivityInput[] {
  const activities: ActivityInput[] = [];

  // Transform commits
  if (data.commits?.length) {
    for (const commit of data.commits) {
      activities.push({
        source: 'github',
        sourceId: `commit:${commit.sha?.substring(0, 7) || commit.sha}`,
        sourceUrl: commit.url,
        title: commit.message?.split('\n')[0] || 'No message',
        // Full commit message may contain Jira refs like "AUTH-123: Fix login"
        description: commit.message,
        timestamp: new Date(commit.timestamp),
        rawData: {
          sha: commit.sha,
          author: commit.author,
          repository: commit.repository,
          additions: commit.stats?.additions || 0,
          deletions: commit.stats?.deletions || 0,
          filesChanged: commit.stats?.filesChanged || 0,
          // Include full message in rawData for ref extraction
          message: commit.message,
        },
      });
    }
  }

  // Transform pull requests (format matches mock-data.service.ts)
  if (data.pullRequests?.length) {
    for (const pr of data.pullRequests) {
      // Build description that includes PR body for cross-tool ref extraction
      // This is CRITICAL - PR bodies contain "Closes AUTH-123", "Fixes PERF-456", etc.
      const statsLine = `${pr.additions || 0}+ ${pr.deletions || 0}- across ${pr.filesChanged || 0} files.`;
      const prBody = pr.body?.trim() || '';

      // Include the PR body in description so RefExtractor can find Jira refs
      let description: string;
      if (pr.isReviewed) {
        description = prBody
          ? `Reviewed PR. ${statsLine}\n\n${prBody}`
          : `Reviewed PR. ${statsLine}`;
      } else {
        description = prBody
          ? `${prBody}\n\n${statsLine}`
          : statsLine;
      }

      activities.push({
        source: 'github',
        // Match mock format: 'acme/backend#42'
        sourceId: `${pr.repository}#${pr.id}`,
        sourceUrl: pr.url,
        // Title is the PR title directly (not prefixed)
        title: pr.title,
        // Description now includes PR body for cross-tool reference extraction
        description,
        timestamp: new Date(pr.updatedAt || pr.createdAt),
        rawData: {
          // Match mock-data.service.ts rawData structure
          number: pr.id,
          state: pr.reviewStatus || pr.state,
          additions: pr.additions || 0,
          deletions: pr.deletions || 0,
          changedFiles: pr.filesChanged || 0,
          reviews: pr.reviewers?.length || 0,
          commits: pr.commits || 0,
          // Additional useful metadata
          author: pr.author,
          labels: pr.labels || [],
          isDraft: pr.isDraft || false,
          isReviewed: pr.isReviewed || false,
          reviewers: pr.reviewers || [],
          // CRITICAL: Include body in rawData for RefExtractor
          // This is where "Closes AUTH-123", "Fixes PERF-456" live
          body: prBody,
          headRef: pr.headRef,
          baseRef: pr.baseRef,
        },
      });
    }
  }

  // Transform issues
  if (data.issues?.length) {
    for (const issue of data.issues) {
      // Issue body may also contain cross-tool refs
      const issueBody = issue.body?.trim() || '';
      const statusLine = `${issue.state} - ${issue.commentsCount || 0} comments`;

      activities.push({
        source: 'github',
        // Match format: 'repo#number'
        sourceId: `${issue.repository}#${issue.id}`,
        sourceUrl: issue.url,
        title: issue.title,
        // Include issue body for cross-tool ref extraction
        description: issueBody
          ? `${issueBody}\n\n${statusLine}`
          : statusLine,
        timestamp: new Date(issue.updatedAt || issue.createdAt),
        rawData: {
          number: issue.id,
          state: issue.state,
          author: issue.author,
          labels: issue.labels || [],
          commentsCount: issue.commentsCount || 0,
          // Include body in rawData for RefExtractor
          body: issueBody,
        },
      });
    }
  }

  return activities;
}
