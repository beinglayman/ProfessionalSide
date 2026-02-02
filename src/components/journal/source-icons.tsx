import React from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  // Brand icons
  GithubIcon,
  SlackIcon,
  FigmaIcon,
  GoogleDocIcon,
  GoogleSheetIcon,
  GoogleDriveIcon,
  // Generic icons for services without brand icons
  Calendar01Icon,
  Mail01Icon,
  Video01Icon,
  CloudIcon,
  FileAttachmentIcon,
  Folder01Icon,
  Link01Icon,
} from '@hugeicons/core-free-icons';

interface IconProps {
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Source icons for activity cards using Hugeicons
 * - Brand icons where available (GitHub, Slack, Figma, Google, Microsoft)
 * - Semantic icons for specific services (calendar, mail, video)
 */
export const SourceIcons: Record<string, React.FC<IconProps>> = {
  // Dev tools - brand icons
  github: ({ className, style }) => (
    <HugeiconsIcon icon={GithubIcon} className={className} style={style} />
  ),

  // Atlassian - use link/document icons (no brand icons in free tier)
  jira: ({ className, style }) => (
    <HugeiconsIcon icon={Link01Icon} className={className} style={style} />
  ),
  confluence: ({ className, style }) => (
    <HugeiconsIcon icon={FileAttachmentIcon} className={className} style={style} />
  ),

  // Microsoft 365 - Microsoft brand + semantic icons
  teams: ({ className, style }) => (
    <HugeiconsIcon icon={Video01Icon} className={className} style={style} />
  ),
  outlook: ({ className, style }) => (
    <HugeiconsIcon icon={Mail01Icon} className={className} style={style} />
  ),
  onedrive: ({ className, style }) => (
    <HugeiconsIcon icon={CloudIcon} className={className} style={style} />
  ),
  sharepoint: ({ className, style }) => (
    <HugeiconsIcon icon={Folder01Icon} className={className} style={style} />
  ),

  // Communication
  slack: ({ className, style }) => (
    <HugeiconsIcon icon={SlackIcon} className={className} style={style} />
  ),

  // Design
  figma: ({ className, style }) => (
    <HugeiconsIcon icon={FigmaIcon} className={className} style={style} />
  ),

  // Google Workspace
  'google-calendar': ({ className, style }) => (
    <HugeiconsIcon icon={Calendar01Icon} className={className} style={style} />
  ),
  'google-docs': ({ className, style }) => (
    <HugeiconsIcon icon={GoogleDocIcon} className={className} style={style} />
  ),
  'google-sheets': ({ className, style }) => (
    <HugeiconsIcon icon={GoogleSheetIcon} className={className} style={style} />
  ),
  'google-drive': ({ className, style }) => (
    <HugeiconsIcon icon={GoogleDriveIcon} className={className} style={style} />
  ),
  'google-meet': ({ className, style }) => (
    <HugeiconsIcon icon={Video01Icon} className={className} style={style} />
  ),
};
