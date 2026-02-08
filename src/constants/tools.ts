/**
 * Unified Tool Metadata — Single Source of Truth
 *
 * Every tool's name, color, and description lives here.
 * Icon renderers (ToolIcons, career-stories/ToolIcon, source-icons) stay separate
 * but import metadata from this file instead of maintaining local maps.
 *
 * Key convention:
 *   MCP layer uses underscores:  google_workspace
 *   Activity layer uses hyphens: google-calendar, google-docs, etc.
 *   Both are valid keys in this registry.
 */

export interface ToolMeta {
  /** Display name (e.g. "GitHub", "Google Calendar") */
  name: string;
  /** Brand color hex */
  color: string;
  /** Short description for settings/selectors */
  description: string;
}

export const TOOL_METADATA = {
  // ── Dev Tools ──────────────────────────────────────────────────────────
  github: {
    name: 'GitHub',
    color: '#24292E',
    description: 'Code contributions, pull requests, and repository activity',
  },

  // ── Atlassian ──────────────────────────────────────────────────────────
  jira: {
    name: 'Jira',
    color: '#0052CC',
    description: 'Task completions, story points, and sprint activity',
  },
  confluence: {
    name: 'Confluence',
    color: '#172B4D',
    description: 'Documentation updates, page edits, and knowledge base contributions',
  },

  // ── Microsoft 365 ──────────────────────────────────────────────────────
  teams: {
    name: 'Microsoft Teams',
    color: '#6264A7',
    description: 'Meeting notes, chat discussions, and collaboration activity',
  },
  outlook: {
    name: 'Outlook',
    color: '#0078D4',
    description: 'Meeting notes, email summaries, and calendar events',
  },
  onedrive: {
    name: 'OneDrive',
    color: '#0078D4',
    description: 'OneDrive file changes and collaboration activity',
  },
  onenote: {
    name: 'OneNote',
    color: '#7719AA',
    description: 'OneNote pages, notebooks, and note-taking activity',
  },
  sharepoint: {
    name: 'SharePoint',
    color: '#036C70',
    description: 'SharePoint site activity, documents, and list updates',
  },

  // ── Communication ──────────────────────────────────────────────────────
  slack: {
    name: 'Slack',
    color: '#4A154B',
    description: 'Messages, thread discussions, and team collaboration highlights',
  },

  // ── Design ─────────────────────────────────────────────────────────────
  figma: {
    name: 'Figma',
    color: '#F24E1E',
    description: 'Design contributions, file edits, and comments',
  },

  // ── Video ──────────────────────────────────────────────────────────────
  zoom: {
    name: 'Zoom',
    color: '#2D8CFF',
    description: 'Meeting recordings, transcripts, and participant data',
  },

  // ── Google Workspace (MCP aggregate key) ───────────────────────────────
  google_workspace: {
    name: 'Google Workspace',
    color: '#4285F4',
    description: 'Google Docs, Sheets, Slides, Drive files, and Meet recordings',
  },

  // ── Google Workspace (granular activity keys) ──────────────────────────
  google: {
    name: 'Google',
    color: '#4285F4',
    description: 'Google Workspace activity',
  },
  'google-calendar': {
    name: 'Google Calendar',
    color: '#4285F4',
    description: 'Calendar events and meetings',
  },
  'google-docs': {
    name: 'Google Docs',
    color: '#4285F4',
    description: 'Document edits and collaboration',
  },
  'google-drive': {
    name: 'Google Drive',
    color: '#0F9D58',
    description: 'File uploads, shares, and organization',
  },
  'google-meet': {
    name: 'Google Meet',
    color: '#00897B',
    description: 'Video meetings and recordings',
  },
  'google-sheets': {
    name: 'Google Sheets',
    color: '#0F9D58',
    description: 'Spreadsheet edits and collaboration',
  },

  // ── Fallback ───────────────────────────────────────────────────────────
  generic: {
    name: 'Other',
    color: '#6B7280',
    description: 'Other activity',
  },
} as const satisfies Record<string, ToolMeta>;

/** All valid tool keys */
export type ToolKey = keyof typeof TOOL_METADATA;

/** Look up display name by string key, with fallback to the raw key. */
export function getToolName(key: string): string {
  return (TOOL_METADATA as Record<string, ToolMeta>)[key]?.name ?? key;
}
