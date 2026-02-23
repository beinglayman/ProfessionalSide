/**
 * Backend Tool Metadata — Single Source of Truth (backend)
 *
 * Mirrors the frontend's constants/tools.ts structure.
 * Used by the MCP controller to return tool names & descriptions
 * in the integration status API response.
 */

export interface ToolMeta {
  name: string;
  description: string;
}

export const TOOL_METADATA: Record<string, ToolMeta> = {
  github:           { name: 'GitHub',           description: 'Code contributions, pull requests, and repository activity' },
  jira:             { name: 'Jira',             description: 'Task completions, story points, and sprint activity' },
  confluence:       { name: 'Confluence',       description: 'Documentation updates, page edits, and knowledge base contributions' },
  outlook:          { name: 'Outlook',          description: 'Meeting notes, email summaries, and calendar events' },
  teams:            { name: 'Microsoft Teams',  description: 'Meeting notes, chat discussions, and collaboration activity' },
  onedrive:         { name: 'OneDrive',         description: 'OneDrive file changes and collaboration activity' },
  onenote:          { name: 'OneNote',          description: 'OneNote pages, notebooks, and note-taking activity' },
  sharepoint:       { name: 'SharePoint',       description: 'SharePoint site activity, documents, and list updates' },
  slack:            { name: 'Slack',            description: 'Messages, thread discussions, and team collaboration highlights' },
  figma:            { name: 'Figma',            description: 'Design contributions, file edits, and comments' },
  zoom:             { name: 'Zoom',             description: 'Meeting recordings, transcripts, and participant data' },
  google_workspace: { name: 'Google Workspace', description: 'Google Docs, Sheets, Slides, Drive files, and Meet recordings' },
};

/** All supported tool types (used to ensure every tool is represented in API responses). */
export const ALL_TOOL_TYPES = Object.keys(TOOL_METADATA);

/** Look up display name by tool key, with fallback to the raw key. */
export function getToolName(key: string): string {
  return TOOL_METADATA[key]?.name ?? key;
}
