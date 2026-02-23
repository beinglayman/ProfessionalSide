/**
 * Tool Integration Groups — Single Source of Truth
 *
 * Defines how tools are grouped for OAuth (one auth per group),
 * which tools are standalone, and how to map individual tools
 * back to their group. Used by both onboarding and settings.
 */

import { MCPToolType } from '../services/mcp.service';
import { ToolType } from '../components/icons/ToolIcons';
import { TOOL_METADATA } from './tools';

// ── Group Type ─────────────────────────────────────────────────────────────

export type IntegrationGroupId = 'atlassian' | 'microsoft';

export interface IntegrationGroup {
  id: IntegrationGroupId;
  /** Display name (e.g. "Atlassian Suite") */
  name: string;
  /** Short description for UI context */
  description: string;
  /** OAuth provider label (e.g. "Atlassian") */
  providerName: string;
  /** Tools authorized via this group's single OAuth flow */
  tools: MCPToolType[];
  /** Primary icon to represent the group (first tool in the group) */
  iconTool: ToolType;
  /** Human-readable sub-tool labels for chips/tags */
  subToolLabels: string[];
}

// ── Groups ─────────────────────────────────────────────────────────────────

export const INTEGRATION_GROUPS: IntegrationGroup[] = [
  {
    id: 'atlassian',
    name: 'Atlassian',
    description: 'Jira issues, sprints, and Confluence docs',
    providerName: 'Atlassian',
    tools: ['jira', 'confluence'],
    iconTool: 'jira',
    subToolLabels: ['Jira', 'Confluence'],
  },
  {
    id: 'microsoft',
    name: 'Microsoft 365',
    description: 'Outlook calendar, Teams messages, OneDrive files, and OneNote',
    providerName: 'Microsoft',
    tools: ['outlook', 'teams', 'onedrive', 'onenote'],
    iconTool: 'outlook',
    subToolLabels: ['Outlook', 'Teams', 'OneDrive', 'OneNote'],
  },
];

// ── Standalone Tools ───────────────────────────────────────────────────────

export interface StandaloneTool {
  toolType: MCPToolType;
  /** Display name */
  name: string;
  /** Short description */
  description: string;
  /** Icon key for ToolIcon component */
  iconTool: ToolType;
}

export const STANDALONE_TOOLS: StandaloneTool[] = [
  {
    toolType: 'github',
    name: TOOL_METADATA.github.name,
    description: 'Pull requests, commits, code reviews, and releases',
    iconTool: 'github',
  },
  {
    toolType: 'google_workspace',
    name: TOOL_METADATA.google_workspace.name,
    description: 'Calendar events and Google Drive activity',
    iconTool: 'google_workspace',
  },
  {
    toolType: 'figma',
    name: TOOL_METADATA.figma.name,
    description: TOOL_METADATA.figma.description,
    iconTool: 'figma',
  },
  {
    toolType: 'slack',
    name: TOOL_METADATA.slack.name,
    description: TOOL_METADATA.slack.description,
    iconTool: 'slack',
  },
  {
    toolType: 'zoom',
    name: TOOL_METADATA.zoom.name,
    description: TOOL_METADATA.zoom.description,
    iconTool: 'zoom',
  },
];

// ── Lookup Helpers ──────────────────────────────────────────────────────────

/** Map of groupId → IntegrationGroup for O(1) lookup */
export const INTEGRATION_GROUP_MAP = Object.fromEntries(
  INTEGRATION_GROUPS.map(g => [g.id, g])
) as Record<IntegrationGroupId, IntegrationGroup>;

/**
 * Map individual tool type → group ID (or null for standalone).
 * Built once at module load from INTEGRATION_GROUPS.
 */
const _toolToGroup = new Map<string, IntegrationGroupId>();
for (const group of INTEGRATION_GROUPS) {
  for (const tool of group.tools) {
    _toolToGroup.set(tool, group.id);
  }
}

/** Returns the group ID a tool belongs to, or null if standalone. */
export function getToolGroupId(toolType: string): IntegrationGroupId | null {
  return _toolToGroup.get(toolType) ?? null;
}

/** All tool types that belong to any group. */
export const ALL_GROUPED_TOOLS: MCPToolType[] = INTEGRATION_GROUPS.flatMap(g => g.tools);

/** All standalone tool types. */
export const ALL_STANDALONE_TOOL_TYPES: MCPToolType[] = STANDALONE_TOOLS.map(t => t.toolType);

/**
 * Onboarding bucket config — groups + standalone tools unified into
 * a single list for the "Connect your work tools" step.
 */
export interface OnboardingBucket {
  id: string;
  name: string;
  description: string;
  iconTool: ToolType;
  toolType?: MCPToolType;
  groupId?: IntegrationGroupId;
  subToolLabels: string[];
  comingSoon?: boolean;
}

/** Buckets shown during onboarding (subset of all tools, grouped). */
export const ONBOARDING_BUCKETS: OnboardingBucket[] = [
  // Standalone tools as individual buckets
  ...STANDALONE_TOOLS
    .filter(t => ['github', 'google_workspace'].includes(t.toolType))
    .map(t => ({
      id: t.toolType,
      name: t.name,
      description: t.description,
      iconTool: t.iconTool,
      toolType: t.toolType as MCPToolType,
      subToolLabels: t.toolType === 'github'
        ? ['PRs', 'Commits', 'Reviews']
        : ['Calendar', 'Drive'],
    })),
  // Groups as buckets
  ...INTEGRATION_GROUPS.map(g => ({
    id: g.id,
    name: g.name,
    description: g.description,
    iconTool: g.iconTool,
    groupId: g.id,
    subToolLabels: g.subToolLabels,
  })),
].sort((a, b) => {
  // Stable order: github, atlassian, microsoft, google
  const order = ['github', 'atlassian', 'microsoft', 'google_workspace'];
  return order.indexOf(a.id) - order.indexOf(b.id);
});

/**
 * Maps any tool type to its onboarding bucket ID.
 * Standalone tools map to themselves; grouped tools map to their group.
 */
export function getOnboardingBucketId(toolType: string): string | null {
  const groupId = getToolGroupId(toolType);
  if (groupId) return groupId;
  // Standalone tools in onboarding use their toolType as bucket ID
  if (ONBOARDING_BUCKETS.some(b => b.id === toolType)) return toolType;
  return null;
}
