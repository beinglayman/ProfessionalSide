/**
 * MCP Tool Transformers
 *
 * Factory for transforming MCP tool responses into ActivityInput format.
 */

import { ActivityInput } from '../../career-stories/activity-persistence.service';
import { transformGitHubActivity } from './github.transformer';
import { transformJiraActivity } from './jira.transformer';
import { transformOneDriveActivity } from './onedrive.transformer';
import { transformConfluenceActivity } from './confluence.transformer';

export type SupportedToolType = 'github' | 'jira' | 'confluence' | 'onedrive';

/**
 * Transform tool-specific data into unified ActivityInput array
 */
export function transformToolActivity(
  toolType: string,
  data: unknown
): ActivityInput[] {
  switch (toolType) {
    case 'github':
      return transformGitHubActivity(data);
    case 'jira':
      return transformJiraActivity(data);
    case 'confluence':
      return transformConfluenceActivity(data);
    case 'onedrive':
      return transformOneDriveActivity(data);
    default:
      console.warn(`[Transformer] No transformer for tool type: ${toolType}`);
      return [];
  }
}

export { transformGitHubActivity } from './github.transformer';
export { transformJiraActivity } from './jira.transformer';
export { transformConfluenceActivity } from './confluence.transformer';
export { transformOneDriveActivity } from './onedrive.transformer';
