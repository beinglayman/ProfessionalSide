/**
 * MCP Tool Transformers
 *
 * Factory for transforming MCP tool responses into ActivityInput format.
 */

import { ActivityInput } from '../../career-stories/activity-persistence.service';
import { transformGitHubActivity } from './github.transformer';
import { transformOneDriveActivity } from './onedrive.transformer';

export type SupportedToolType = 'github' | 'onedrive';

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
    case 'onedrive':
      return transformOneDriveActivity(data);
    default:
      console.warn(`[Transformer] No transformer for tool type: ${toolType}`);
      return [];
  }
}

export { transformGitHubActivity } from './github.transformer';
export { transformOneDriveActivity } from './onedrive.transformer';
