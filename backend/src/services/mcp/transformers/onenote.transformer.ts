/**
 * OneNote Activity Transformer
 *
 * Transforms OneNote MCP tool responses into ActivityInput format
 * for persistence to ToolActivity table.
 *
 * Handles two activity types:
 * - Pages — meeting notes, design docs, retro notes (highest value)
 * - Sections — recently modified sections signal area-of-activity
 *
 * Notebooks are NOT transformed (too high-level, no actionable timestamp).
 */

import { ActivityInput } from '../../career-stories/activity-persistence.service';

/**
 * Transform OneNote activity data into ActivityInput array
 */
export function transformOneNoteActivity(data: any): ActivityInput[] {
  const activities: ActivityInput[] = [];

  // Transform pages (highest story value — contain meeting notes, design thinking)
  if (data.pages?.length) {
    for (const page of data.pages) {
      const title = page.title || page.displayName || 'Untitled Page';
      const sectionName = page.sectionName || page.parentSection?.displayName || '';
      const notebookName = page.notebookName || page.parentNotebook?.displayName || '';
      const context = [sectionName, notebookName].filter(Boolean).join(' / ');

      activities.push({
        source: 'onenote',
        sourceId: `page:${page.id}`,
        sourceUrl: page.webUrl || page.links?.oneNoteWebUrl?.href || null,
        title: `Note: ${title}`,
        description: [
          page.contentPreview || null,
          context ? `[${context}]` : null,
        ]
          .filter(Boolean)
          .join(' '),
        timestamp: new Date(
          page.lastModifiedDateTime || page.createdDateTime || new Date()
        ),
        rawData: {
          type: 'page',
          title,
          sectionName,
          notebookName,
          contentPreview: page.contentPreview,
        },
      });
    }
  }

  // Transform sections (low-medium value — signals activity in an area)
  if (data.sections?.length) {
    for (const section of data.sections) {
      const displayName = section.displayName || 'Untitled Section';
      const notebookName =
        section.notebookName || section.parentNotebook?.displayName || '';
      const pageCount = section.pageCount || 0;

      activities.push({
        source: 'onenote',
        sourceId: `section:${section.id}`,
        sourceUrl: section.webUrl || section.links?.oneNoteWebUrl?.href || null,
        title: `OneNote section: ${displayName}${notebookName ? ` (${notebookName})` : ''}`,
        description: `${pageCount} page${pageCount !== 1 ? 's' : ''}`,
        timestamp: new Date(
          section.lastModifiedDateTime || section.createdDateTime || new Date()
        ),
        rawData: {
          type: 'section',
          notebookName,
          pageCount,
        },
      });
    }
  }

  return activities;
}
