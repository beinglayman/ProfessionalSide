import React from 'react';

/**
 * Source Icons Registry
 *
 * Centralized icon configuration for all supported MCP activity sources.
 * Uses react-icons library with brand-specific icons where available.
 *
 * Sources supported:
 * - Dev tools: GitHub
 * - Atlassian: Jira, Confluence
 * - Communication: Slack
 * - Design: Figma
 * - Google Workspace: Calendar, Docs, Sheets, Drive, Meet
 * - Microsoft 365: Teams, Outlook, OneDrive, SharePoint
 */

// Simple Icons - official brand logos (most complete coverage)
import {
  SiGithub,
  SiJira,
  SiConfluence,
  SiSlack,
  SiFigma,
  SiGooglecalendar,
  SiGoogledocs,
  SiGooglesheets,
  SiGoogledrive,
  SiGooglemeet,
} from 'react-icons/si';

// Bootstrap Icons - Microsoft Teams logo
import { BsMicrosoftTeams } from 'react-icons/bs';

// Phosphor Icons - Microsoft Outlook logo
import { PiMicrosoftOutlookLogoFill } from 'react-icons/pi';

// Devicons - OneDrive logo
import { DiOnedrive } from 'react-icons/di';

// Lucide - fallback for SharePoint (no brand icon available)
import { LuFolder } from 'react-icons/lu';

interface IconProps {
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Source icons for activity cards
 *
 * Uses official brand logos from react-icons where available.
 * Icon sizing controlled via className (e.g., "w-4 h-4")
 * Color set via style={{ color }} or className text color utilities.
 */
export const SourceIcons: Record<string, React.FC<IconProps>> = {
  // ═══════════════════════════════════════════════════════════════
  // DEV TOOLS
  // ═══════════════════════════════════════════════════════════════
  github: ({ className, style }) => <SiGithub className={className} style={style} />,

  // ═══════════════════════════════════════════════════════════════
  // ATLASSIAN
  // ═══════════════════════════════════════════════════════════════
  jira: ({ className, style }) => <SiJira className={className} style={style} />,
  confluence: ({ className, style }) => <SiConfluence className={className} style={style} />,

  // ═══════════════════════════════════════════════════════════════
  // COMMUNICATION
  // ═══════════════════════════════════════════════════════════════
  slack: ({ className, style }) => <SiSlack className={className} style={style} />,

  // ═══════════════════════════════════════════════════════════════
  // DESIGN
  // ═══════════════════════════════════════════════════════════════
  figma: ({ className, style }) => <SiFigma className={className} style={style} />,

  // ═══════════════════════════════════════════════════════════════
  // GOOGLE WORKSPACE (all have official Simple Icons)
  // ═══════════════════════════════════════════════════════════════
  'google-calendar': ({ className, style }) => <SiGooglecalendar className={className} style={style} />,
  'google-docs': ({ className, style }) => <SiGoogledocs className={className} style={style} />,
  'google-sheets': ({ className, style }) => <SiGooglesheets className={className} style={style} />,
  'google-drive': ({ className, style }) => <SiGoogledrive className={className} style={style} />,
  'google-meet': ({ className, style }) => <SiGooglemeet className={className} style={style} />,

  // ═══════════════════════════════════════════════════════════════
  // MICROSOFT 365
  // Brand icons from various react-icons packages
  // ═══════════════════════════════════════════════════════════════
  teams: ({ className, style }) => <BsMicrosoftTeams className={className} style={style} />,
  outlook: ({ className, style }) => <PiMicrosoftOutlookLogoFill className={className} style={style} />,
  onedrive: ({ className, style }) => <DiOnedrive className={className} style={style} />,
  sharepoint: ({ className, style }) => <LuFolder className={className} style={style} />, // No brand icon available
};

/**
 * Get icon component for a source, with fallback to GitHub icon
 */
export function getSourceIcon(source: string): React.FC<IconProps> {
  return SourceIcons[source] || SourceIcons.github;
}

/**
 * Check if a source has a brand icon (vs generic fallback)
 */
export function hasBrandIcon(source: string): boolean {
  const genericFallbacks = ['sharepoint'];
  return source in SourceIcons && !genericFallbacks.includes(source);
}
