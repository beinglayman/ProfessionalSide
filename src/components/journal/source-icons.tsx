import React from 'react';
// Simple Icons - official brand logos
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
// Lucide icons - consistent style for services without brand icons
import {
  LuMail,
  LuVideo,
  LuCloud,
  LuFolder,
} from 'react-icons/lu';

interface IconProps {
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Source icons for activity cards
 *
 * Uses Simple Icons (react-icons/si) for official brand logos where available.
 * Falls back to Lucide icons (react-icons/lu) for consistent style when
 * brand icons aren't available (Microsoft services).
 *
 * Icon sizing should be controlled via className (e.g., "w-4 h-4" or "text-base")
 * Color can be set via style={{ color }} or className text color utilities.
 */
export const SourceIcons: Record<string, React.FC<IconProps>> = {
  // Dev tools
  github: ({ className, style }) => <SiGithub className={className} style={style} />,

  // Atlassian
  jira: ({ className, style }) => <SiJira className={className} style={style} />,
  confluence: ({ className, style }) => <SiConfluence className={className} style={style} />,

  // Communication
  slack: ({ className, style }) => <SiSlack className={className} style={style} />,

  // Design
  figma: ({ className, style }) => <SiFigma className={className} style={style} />,

  // Google Workspace - all have brand icons
  'google-calendar': ({ className, style }) => <SiGooglecalendar className={className} style={style} />,
  'google-docs': ({ className, style }) => <SiGoogledocs className={className} style={style} />,
  'google-sheets': ({ className, style }) => <SiGooglesheets className={className} style={style} />,
  'google-drive': ({ className, style }) => <SiGoogledrive className={className} style={style} />,
  'google-meet': ({ className, style }) => <SiGooglemeet className={className} style={style} />,

  // Microsoft 365 - use Lucide fallbacks (no brand icons in Simple Icons)
  teams: ({ className, style }) => <LuVideo className={className} style={style} />,
  outlook: ({ className, style }) => <LuMail className={className} style={style} />,
  onedrive: ({ className, style }) => <LuCloud className={className} style={style} />,
  sharepoint: ({ className, style }) => <LuFolder className={className} style={style} />,
};

/**
 * Get icon component for a source, with fallback to GitHub icon
 */
export function getSourceIcon(source: string): React.FC<IconProps> {
  return SourceIcons[source] || SourceIcons.github;
}
