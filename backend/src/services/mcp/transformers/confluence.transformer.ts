/**
 * Confluence Activity Transformer
 *
 * Transforms Confluence MCP tool responses into ActivityInput format
 * for persistence to ToolActivity table.
 *
 * IMPORTANT: Output format must match mock-data.service.ts exactly
 * to ensure consistency between demo and live modes.
 * Mock data rawData structure: { space, version, lastModifiedBy, excerpt, labels }
 *
 * CRITICAL FOR CLUSTERING: The description and rawData fields must contain
 * cross-tool references so that RefExtractorService can detect them and
 * cluster related activities together.
 * RefExtractor pattern for confluence: /(?:confluence[:\s]*)(\d{5,})/gi
 */

import { ActivityInput } from '../../career-stories/activity-persistence.service';

/**
 * Transform Confluence activity data into ActivityInput array
 *
 * Format matches mock-data.service.ts:
 * - sourceId: page id directly (e.g., '987654')
 * - title: page title
 * - rawData: { space, version, lastModifiedBy, excerpt, labels }
 */
export function transformConfluenceActivity(data: any): ActivityInput[] {
  const activities: ActivityInput[] = [];

  // Transform pages (primary activity type)
  if (data.pages?.length) {
    for (const page of data.pages) {
      const labelsStr = page.labels?.length ? `Labels: ${page.labels.join(', ')}` : '';
      const excerptStr = page.excerpt?.trim() || '';

      const descParts = [excerptStr, labelsStr].filter(Boolean);

      activities.push({
        source: 'confluence',
        sourceId: String(page.id),
        sourceUrl: page.url || '',
        title: page.title,
        description: descParts.join('\n') || `Page in ${page.space?.name || page.space?.key || 'unknown space'}`,
        timestamp: new Date(page.lastModified || page.created),
        rawData: {
          // Match mock-data.service.ts rawData structure
          space: page.space?.name || page.space?.key || '',
          version: page.version || 1,
          lastModifiedBy: page.lastModifiedBy || page.author || '',
          excerpt: page.excerpt || '',
          labels: page.labels || [],
        },
      });
    }
  }

  // Transform blog posts
  if (data.blogPosts?.length) {
    for (const post of data.blogPosts) {
      const labelsStr = post.labels?.length ? `Labels: ${post.labels.join(', ')}` : '';
      const excerptStr = post.excerpt?.trim() || '';

      const descParts = [excerptStr, labelsStr].filter(Boolean);

      activities.push({
        source: 'confluence',
        sourceId: `blog:${post.id}`,
        sourceUrl: post.url || '',
        title: post.title,
        description: descParts.join('\n') || `Blog post by ${post.author || 'unknown'}`,
        timestamp: new Date(post.publishedDate || post.created),
        rawData: {
          space: post.space?.name || post.space?.key || '',
          version: post.version || 1,
          author: post.author || '',
          excerpt: post.excerpt || '',
          labels: post.labels || [],
          publishedDate: post.publishedDate,
        },
      });
    }
  }

  // Transform comments (useful for cross-tool ref extraction)
  if (data.comments?.length) {
    for (const comment of data.comments) {
      activities.push({
        source: 'confluence',
        sourceId: `comment:${comment.id}`,
        sourceUrl: comment.url || '',
        title: `Comment on ${comment.pageTitle || 'page'}`,
        description: comment.body || comment.excerpt || `Comment by ${comment.author || 'unknown'}`,
        timestamp: new Date(comment.created),
        rawData: {
          pageId: comment.pageId,
          pageTitle: comment.pageTitle,
          author: comment.author || '',
          type: comment.type || 'footer',
        },
      });
    }
  }

  return activities;
}
