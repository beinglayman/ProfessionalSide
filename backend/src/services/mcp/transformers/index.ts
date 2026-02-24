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
import { transformOutlookActivity } from './outlook.transformer';
import { transformTeamsActivity } from './teams.transformer';
import { transformOneNoteActivity } from './onenote.transformer';

export type SupportedToolType = 'github' | 'jira' | 'confluence' | 'onedrive' | 'outlook' | 'teams' | 'onenote';

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
    case 'outlook':
      return transformOutlookActivity(data);
    case 'teams':
      return transformTeamsActivity(data);
    case 'onenote':
      return transformOneNoteActivity(data);
    default:
      console.warn(`[Transformer] No transformer for tool type: ${toolType}`);
      return [];
  }
}

export { transformGitHubActivity } from './github.transformer';
export { transformJiraActivity } from './jira.transformer';
export { transformConfluenceActivity } from './confluence.transformer';
export { transformOneDriveActivity } from './onedrive.transformer';
export { transformOutlookActivity } from './outlook.transformer';
export { transformTeamsActivity } from './teams.transformer';
export { transformOneNoteActivity } from './onenote.transformer';
