/**
 * Jira Activity Transformer
 *
 * Transforms Jira MCP tool responses into ActivityInput format
 * for persistence to ToolActivity table.
 *
 * IMPORTANT: Output format must match mock-data.service.ts exactly
 * to ensure consistency between demo and live modes.
 * Mock data rawData structure: { key, status, priority, assignee, storyPoints, labels }
 *
 * CRITICAL FOR CLUSTERING: The description and rawData fields must contain
 * cross-tool references (e.g., Jira keys like "AUTH-123") so that
 * RefExtractorService can detect them and cluster related activities together.
 */

import { ActivityInput } from '../../career-stories/activity-persistence.service';

/**
 * Transform Jira activity data into ActivityInput array
 *
 * Format matches mock-data.service.ts:
 * - sourceId: issue key directly (e.g., 'AUTH-123')
 * - title: issue summary
 * - rawData: { key, status, priority, assignee, storyPoints, labels }
 */
export function transformJiraActivity(data: any): ActivityInput[] {
  const activities: ActivityInput[] = [];

  // Transform issues (primary activity type)
  if (data.issues?.length) {
    for (const issue of data.issues) {
      const description = issue.description?.trim() || '';
      const labelsStr = issue.labels?.length ? `Labels: ${issue.labels.join(', ')}` : '';
      const linksStr = issue.issueLinks?.length
        ? `Links: ${issue.issueLinks.map((l: any) => `${l.type} ${l.linkedIssueKey}`).join(', ')}`
        : '';

      const descParts = [description, labelsStr, linksStr].filter(Boolean);

      activities.push({
        source: 'jira',
        sourceId: issue.key,
        sourceUrl: issue.url,
        title: issue.summary,
        description: descParts.join('\n') || `${issue.status} - ${issue.issueType || 'Issue'}`,
        timestamp: new Date(issue.updated || issue.created),
        rawData: {
          // Match mock-data.service.ts rawData structure
          key: issue.key,
          status: issue.status,
          priority: issue.priority,
          assignee: issue.assignee,
          storyPoints: issue.timeEstimate ? Math.round(issue.timeEstimate / 3600) : undefined,
          labels: issue.labels || [],
          // Additional metadata
          statusCategory: issue.statusCategory,
          issueType: issue.issueType,
          reporter: issue.reporter,
          project: issue.project,
          timeSpent: issue.timeSpent,
          commentCount: issue.commentCount,
          issueLinks: issue.issueLinks || [],
        },
      });
    }
  }

  // Transform changelogs — only status transitions (most journal-relevant)
  if (data.changelogs?.length) {
    // Group status transitions by issue to avoid flooding with individual entries
    const statusTransitions = data.changelogs.filter(
      (c: any) => c.field === 'status'
    );

    for (const entry of statusTransitions) {
      activities.push({
        source: 'jira',
        sourceId: `changelog:${entry.issueKey}:${new Date(entry.timestamp).getTime()}`,
        sourceUrl: '', // Changelogs don't have direct URLs
        title: `${entry.issueKey}: ${entry.fromValue} → ${entry.toValue}`,
        description: `${entry.issueSummary || entry.issueKey} status changed from ${entry.fromValue} to ${entry.toValue} by ${entry.author}`,
        timestamp: new Date(entry.timestamp),
        rawData: {
          issueKey: entry.issueKey,
          field: entry.field,
          fromValue: entry.fromValue,
          toValue: entry.toValue,
          author: entry.author,
        },
      });
    }
  }

  // Transform worklogs
  if (data.worklogs?.length) {
    for (const worklog of data.worklogs) {
      const hours = Math.floor(worklog.timeSpentSeconds / 3600);
      const minutes = Math.floor((worklog.timeSpentSeconds % 3600) / 60);
      const timeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

      activities.push({
        source: 'jira',
        sourceId: `worklog:${worklog.issueKey}:${new Date(worklog.started).getTime()}`,
        sourceUrl: worklog.url || '',
        title: `Time logged on ${worklog.issueKey}: ${timeStr}`,
        // Worklog comments may contain cross-tool refs
        description: worklog.comment
          ? `${worklog.comment} (${timeStr} on ${worklog.issueSummary || worklog.issueKey})`
          : `${timeStr} logged on ${worklog.issueSummary || worklog.issueKey}`,
        timestamp: new Date(worklog.started),
        rawData: {
          issueKey: worklog.issueKey,
          timeSpentSeconds: worklog.timeSpentSeconds,
          author: worklog.author,
          comment: worklog.comment,
        },
      });
    }
  }

  // Transform released versions
  if (data.versions?.length) {
    const releasedVersions = data.versions.filter((v: any) => v.released);
    for (const version of releasedVersions) {
      activities.push({
        source: 'jira',
        sourceId: `version:${version.projectKey}:${version.name}`,
        sourceUrl: version.url || '',
        title: `${version.name} released`,
        // Release descriptions may contain cross-tool refs
        description: version.description
          ? `${version.projectKey} release: ${version.description}`
          : `${version.projectKey} release ${version.name}`,
        timestamp: version.releaseDate ? new Date(version.releaseDate) : new Date(),
        rawData: {
          versionId: version.id,
          name: version.name,
          projectKey: version.projectKey,
          released: version.released,
          releaseDate: version.releaseDate,
          description: version.description,
        },
      });
    }
  }

  return activities;
}
