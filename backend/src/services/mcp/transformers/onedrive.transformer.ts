/**
 * OneDrive Activity Transformer
 *
 * Transforms OneDrive MCP tool responses into ActivityInput format
 * for persistence to ToolActivity table.
 *
 * Note: Using 'any' for input since the actual OneDrive API returns more fields
 * than the minimal OneDriveActivity type definition.
 */

import { ActivityInput } from '../../career-stories/activity-persistence.service';

/**
 * Transform OneDrive activity data into ActivityInput array
 */
export function transformOneDriveActivity(data: any): ActivityInput[] {
  const activities: ActivityInput[] = [];

  // Transform recent files
  if (data.recentFiles?.length) {
    for (const file of data.recentFiles) {
      activities.push({
        source: 'onedrive',
        sourceId: `file:${file.id}`,
        sourceUrl: file.webUrl,
        title: `Modified file: ${file.name}`,
        description: file.parentPath ? `In folder: ${file.parentPath}` : undefined,
        timestamp: new Date(file.lastModifiedDateTime || file.createdDateTime || new Date()),
        rawData: {
          type: 'recent_file',
          id: file.id,
          name: file.name,
          fileType: file.fileType || file.mimeType,
          size: file.size,
          parentPath: file.parentPath,
          lastModifiedBy: file.lastModifiedBy,
        },
      });
    }
  }

  // Transform shared files
  if (data.sharedFiles?.length) {
    for (const file of data.sharedFiles) {
      activities.push({
        source: 'onedrive',
        sourceId: `shared:${file.id}`,
        sourceUrl: file.webUrl,
        title: `Shared file: ${file.name}`,
        description: file.sharedWith?.length ? `Shared with: ${file.sharedWith.join(', ')}` : undefined,
        timestamp: new Date(file.sharedDateTime || file.lastModifiedDateTime || new Date()),
        rawData: {
          type: 'shared_file',
          id: file.id,
          name: file.name,
          fileType: file.fileType || file.mimeType,
          sharedWith: file.sharedWith,
          sharedDateTime: file.sharedDateTime,
          permissions: file.permissions,
        },
      });
    }
  }

  // Transform folder activity (if significant)
  if (data.folders?.length) {
    for (const folder of data.folders) {
      // Only include folders with recent activity
      const itemCount = folder.childCount || folder.itemCount || 0;
      if (itemCount > 0) {
        activities.push({
          source: 'onedrive',
          sourceId: `folder:${folder.id}`,
          sourceUrl: folder.webUrl,
          title: `Active folder: ${folder.name}`,
          description: `${itemCount} items`,
          timestamp: new Date(folder.lastModifiedDateTime || folder.createdDateTime || new Date()),
          rawData: {
            type: 'folder',
            id: folder.id,
            name: folder.name,
            itemCount: itemCount,
          },
        });
      }
    }
  }

  return activities;
}
