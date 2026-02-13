// Mock data for timeline header prototype designs
// Self-contained — no imports from real app services

import React from 'react';
import { GitBranch, SquareKanban, Hash, FileText, Figma, Video } from 'lucide-react';

export type ActivitySource = 'github' | 'jira' | 'slack' | 'confluence' | 'figma' | 'google-meet';

export interface HeaderData {
  activityCount: number;
  toolSources: ActivitySource[];
  draftCount: number;
  promotedCount: number;
  isEnhancing: boolean;
  isSyncing: boolean;
  lastSyncAt: string;
  bannerText: string;
  userName: string;
}

export const SOURCE_META: Record<ActivitySource, { name: string; color: string }> = {
  github: { name: 'GitHub', color: '#24292E' },
  jira: { name: 'Jira', color: '#0052CC' },
  slack: { name: 'Slack', color: '#4A154B' },
  confluence: { name: 'Confluence', color: '#172B4D' },
  figma: { name: 'Figma', color: '#F24E1E' },
  'google-meet': { name: 'Google Meet', color: '#00897B' },
};

export const mockHeaderData: HeaderData = {
  activityCount: 324,
  toolSources: ['github', 'jira', 'slack', 'confluence'],
  draftCount: 5,
  promotedCount: 3,
  isEnhancing: false,
  isSyncing: false,
  lastSyncAt: new Date(Date.now() - 12 * 60000).toISOString(),
  bannerText:
    'Activities are individual work items from your tools. Draft Stories group related activities into narratives you can promote to Career Stories.',
  userName: 'Honey',
};

// Source icon component — maps tool source to lucide icon
export function SourceIcon({ source, className }: { source: ActivitySource; className?: string }) {
  const icons: Record<ActivitySource, React.ReactNode> = {
    github: <GitBranch className={className} />,
    jira: <SquareKanban className={className} />,
    slack: <Hash className={className} />,
    confluence: <FileText className={className} />,
    figma: <Figma className={className} />,
    'google-meet': <Video className={className} />,
  };
  return <>{icons[source]}</>;
}

// Format relative time from ISO string
export function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
