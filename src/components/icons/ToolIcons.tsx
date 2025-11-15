import React from 'react';
import { cn } from '../../lib/utils';

export type ToolType = 'github' | 'jira' | 'figma' | 'outlook' | 'confluence' | 'slack' | 'teams' | 'onedrive' | 'onenote' | 'sharepoint' | 'zoom' | 'google_workspace';

interface ToolIconProps {
  tool: ToolType;
  size?: number;
  disabled?: boolean;
  className?: string;
}

export function ToolIcon({ tool, size = 24, disabled = false, className }: ToolIconProps) {
  const iconClass = cn(
    'flex-shrink-0',
    disabled && 'opacity-50 grayscale',
    className
  );

  const icons: Record<ToolType, JSX.Element> = {
    github: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={iconClass}>
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"
          fill="#181717"
        />
      </svg>
    ),
    jira: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={iconClass}>
        <defs>
          <linearGradient id="jira-gradient" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#2684FF" />
            <stop offset="100%" stopColor="#0052CC" />
          </linearGradient>
        </defs>
        <path
          d="M11.53 2c0 2.4 1.97 4.35 4.35 4.35h1.78v1.7c0 2.4 1.94 4.34 4.34 4.34V2.84a.84.84 0 00-.84-.84h-9.63zm-5.32 5.32c0 2.4 1.97 4.35 4.35 4.35h1.78v1.7c0 2.4 1.94 4.34 4.34 4.34V8.16a.84.84 0 00-.84-.84H6.21zm-5.32 5.32c0 2.39 1.96 4.35 4.35 4.35h1.78v1.7c0 2.4 1.95 4.35 4.35 4.35V13.5a.84.84 0 00-.84-.85H.89z"
          fill="url(#jira-gradient)"
        />
      </svg>
    ),
    figma: (
      <svg width={size} height={size} viewBox="0 0 128 128" fill="none" className={iconClass}>
        <path fill="#0acf83" d="M45.5 129c11.9 0 21.5-9.6 21.5-21.5V86H45.5C33.6 86 24 95.6 24 107.5S33.6 129 45.5 129zm0 0"/>
        <path fill="#a259ff" d="M24 64.5C24 52.6 33.6 43 45.5 43H67v43H45.5C33.6 86 24 76.4 24 64.5zm0 0"/>
        <path fill="#f24e1e" d="M24 21.5C24 9.6 33.6 0 45.5 0H67v43H45.5C33.6 43 24 33.4 24 21.5zm0 0"/>
        <path fill="#ff7262" d="M67 0h21.5C100.4 0 110 9.6 110 21.5S100.4 43 88.5 43H67zm0 0"/>
        <path fill="#1abcfe" d="M110 64.5c0 11.9-9.6 21.5-21.5 21.5S67 76.4 67 64.5S76.6 43 88.5 43S110 52.6 110 64.5zm0 0"/>
      </svg>
    ),
    outlook: (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={iconClass}>
        <path fill="#0072c6" d="M19.484 7.937v5.477l1.916 1.205a.489.489 0 0 0 .21 0l8.238-5.554a1.174 1.174 0 0 0-.959-1.128Z"/>
        <path fill="#0072c6" d="m19.484 15.457l1.747 1.2a.522.522 0 0 0 .543 0c-.3.181 8.073-5.378 8.073-5.378v10.066a1.408 1.408 0 0 1-1.49 1.555h-8.874v-7.443Zm-9.044-2.525a1.609 1.609 0 0 0-1.42.838a4.131 4.131 0 0 0-.526 2.218A4.05 4.05 0 0 0 9.02 18.2a1.6 1.6 0 0 0 2.771.022a4.014 4.014 0 0 0 .515-2.2a4.369 4.369 0 0 0-.5-2.281a1.536 1.536 0 0 0-1.366-.809Z"/>
        <path fill="#0072c6" d="M2.153 5.155v21.427L18.453 30V2Zm10.908 14.336a3.231 3.231 0 0 1-2.7 1.361a3.19 3.19 0 0 1-2.64-1.318A5.459 5.459 0 0 1 6.706 16.1a5.868 5.868 0 0 1 1.036-3.616a3.267 3.267 0 0 1 2.744-1.384a3.116 3.116 0 0 1 2.61 1.321a5.639 5.639 0 0 1 1 3.484a5.763 5.763 0 0 1-1.035 3.586Z"/>
      </svg>
    ),
    confluence: (
      <svg width={size} height={size} viewBox="0 0 256 246" fill="none" className={iconClass}>
        <defs>
          <linearGradient id="logosConfluence0" x1="99.14%" x2="33.859%" y1="112.708%" y2="37.755%">
            <stop offset="18%" stopColor="#0052CC"/>
            <stop offset="100%" stopColor="#2684FF"/>
          </linearGradient>
          <linearGradient id="logosConfluence1" x1=".926%" x2="66.18%" y1="-12.582%" y2="62.306%">
            <stop offset="18%" stopColor="#0052CC"/>
            <stop offset="100%" stopColor="#2684FF"/>
          </linearGradient>
        </defs>
        <path fill="url(#logosConfluence0)" d="M9.26 187.33c-2.64 4.307-5.607 9.305-8.126 13.287a8.127 8.127 0 0 0 2.722 11.052l52.823 32.507a8.127 8.127 0 0 0 11.256-2.763c2.113-3.536 4.835-8.127 7.801-13.044c20.926-34.538 41.974-30.312 79.925-12.19l52.376 24.908a8.127 8.127 0 0 0 10.93-4.063l25.152-56.886a8.127 8.127 0 0 0-4.063-10.646c-11.052-5.201-33.034-15.562-52.823-25.111c-71.189-34.579-131.691-32.344-177.972 42.949Z"/>
        <path fill="url(#logosConfluence1)" d="M246.115 58.232c2.641-4.307 5.607-9.305 8.127-13.287a8.127 8.127 0 0 0-2.723-11.052L198.696 1.386a8.127 8.127 0 0 0-11.58 2.682c-2.113 3.535-4.835 8.127-7.802 13.043c-20.926 34.538-41.974 30.313-79.925 12.19L47.176 4.515a8.127 8.127 0 0 0-10.93 4.063L11.093 65.465a8.127 8.127 0 0 0 4.063 10.645c11.052 5.202 33.035 15.563 52.823 25.112c71.351 34.538 131.854 32.222 178.135-42.99Z"/>
      </svg>
    ),
    slack: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={iconClass}>
        <path
          d="M6 15a2 2 0 01-2 2 2 2 0 01-2-2 2 2 0 012-2h2v2zm1 0a2 2 0 012-2 2 2 0 012 2v5a2 2 0 01-2 2 2 2 0 01-2-2v-5z"
          fill="#E01E5A"
        />
        <path
          d="M9 6a2 2 0 01-2-2 2 2 0 012-2 2 2 0 012 2v2H9zm0 1a2 2 0 012 2 2 2 0 01-2 2H4a2 2 0 01-2-2 2 2 0 012-2h5z"
          fill="#36C5F0"
        />
        <path
          d="M18 9a2 2 0 012-2 2 2 0 012 2 2 2 0 01-2 2h-2V9zm-1 0a2 2 0 01-2 2 2 2 0 01-2-2V4a2 2 0 012-2 2 2 0 012 2v5z"
          fill="#2EB67D"
        />
        <path
          d="M15 18a2 2 0 012 2 2 2 0 01-2 2 2 2 0 01-2-2v-2h2zm0-1a2 2 0 01-2-2 2 2 0 012-2h5a2 2 0 012 2 2 2 0 01-2 2h-5z"
          fill="#ECB22E"
        />
      </svg>
    ),
    teams: (
      <svg width={size} height={size} viewBox="0 0 256 239" fill="none" className={iconClass}>
        <defs>
          <path id="logosMicrosoftTeams0" d="M136.93 64.476v12.8a32.674 32.674 0 0 1-5.953-.952a38.698 38.698 0 0 1-26.79-22.742h21.848c6.008.022 10.872 4.887 10.895 10.894Z" opacity=".2"/>
          <linearGradient id="logosMicrosoftTeams1" x1="17.372%" x2="82.628%" y1="-6.51%" y2="106.51%">
            <stop offset="0%" stopColor="#5A62C3"/>
            <stop offset="50%" stopColor="#4D55BD"/>
            <stop offset="100%" stopColor="#3940AB"/>
          </linearGradient>
        </defs>
        <path fill="#5059C9" d="M178.563 89.302h66.125c6.248 0 11.312 5.065 11.312 11.312v60.231c0 22.96-18.613 41.574-41.573 41.574h-.197c-22.96.003-41.576-18.607-41.579-41.568V95.215a5.912 5.912 0 0 1 5.912-5.913Z"/>
        <circle cx="223.256" cy="50.605" r="26.791" fill="#5059C9"/>
        <circle cx="139.907" cy="38.698" r="38.698" fill="#7B83EB"/>
        <path fill="#7B83EB" d="M191.506 89.302H82.355c-6.173.153-11.056 5.276-10.913 11.449v68.697c-.862 37.044 28.445 67.785 65.488 68.692c37.043-.907 66.35-31.648 65.489-68.692v-68.697c.143-6.173-4.74-11.296-10.913-11.449Z"/>
        <path fill="url(#logosMicrosoftTeams1)" d="M10.913 53.581h109.15c6.028 0 10.914 4.886 10.914 10.913v109.151c0 6.027-4.886 10.913-10.913 10.913H10.913C4.886 184.558 0 179.672 0 173.645V64.495C0 58.466 4.886 53.58 10.913 53.58Z"/>
        <path fill="#FFF" d="M94.208 95.125h-21.82v59.416H58.487V95.125H36.769V83.599h57.439z"/>
      </svg>
    ),
    onedrive: (
      <svg width={size} height={size} viewBox="0 0 256 193" fill="none" className={iconClass}>
        <defs>
          <linearGradient id="logosOnedrive0" x1="50%" x2="50%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#0364B8"/>
            <stop offset="50%" stopColor="#0078D4"/>
            <stop offset="100%" stopColor="#1490DF"/>
          </linearGradient>
          <linearGradient id="logosOnedrive1" x1="50%" x2="50%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#0078D4"/>
            <stop offset="100%" stopColor="#0A5EA8"/>
          </linearGradient>
        </defs>
        <path fill="url(#logosOnedrive0)" d="M93.41 146.483c0 23.856 19.334 43.19 43.19 43.19h84.645c19.174 0 34.718-15.544 34.718-34.718c0-19.174-15.544-34.717-34.718-34.717c-4.09 0-8.006.707-11.637 2.003a57.82 57.82 0 0 0-1.697-13.74a57.66 57.66 0 0 0-5.918-14.56a57.917 57.917 0 0 0-49.118-27.437a57.86 57.86 0 0 0-49.118 27.437a57.66 57.66 0 0 0-5.918 14.56a57.924 57.924 0 0 0-2.084 15.496a43.177 43.177 0 0 0-2.345-.066c-23.856 0-43.19 19.334-43.19 43.19c0 23.856 19.334 43.19 43.19 43.19z"/>
        <path fill="url(#logosOnedrive1)" d="M185.967 93.983a57.66 57.66 0 0 0-5.918-14.56a57.917 57.917 0 0 0-49.118-27.437a57.86 57.86 0 0 0-49.118 27.437a57.66 57.66 0 0 0-5.918 14.56c24.416 6.122 45.81 23.364 58.572 47.155c3.93 7.32 7.003 15.098 9.118 23.19h77.66c19.174 0 34.718-15.544 34.718-34.718c0-19.174-15.544-34.717-34.718-34.717c-4.09 0-8.006.707-11.637 2.003a57.82 57.82 0 0 0-1.697-13.74a57.66 57.66 0 0 0-5.918-14.56z"/>
        <path fill="#0078D4" d="M79.87 108.502a57.924 57.924 0 0 0-2.084 15.496a43.177 43.177 0 0 0-2.345-.066c-23.856 0-43.19 19.334-43.19 43.19c0 23.856 19.334 43.19 43.19 43.19H136.6c-23.856 0-43.19-19.334-43.19-43.19c0-20.77 14.66-38.134 34.192-42.324c-12.762-23.791-34.156-41.033-58.572-47.155a57.66 57.66 0 0 0-5.918 14.56a57.924 57.924 0 0 0-2.242 16.3z"/>
      </svg>
    ),
    onenote: (
      <svg width={size} height={size} viewBox="0 0 256 256" fill="none" className={iconClass}>
        <defs>
          <linearGradient id="logosOnenote0" x1="50%" x2="50%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#CA64EA"/>
            <stop offset="100%" stopColor="#7E4EB8"/>
          </linearGradient>
        </defs>
        <path fill="#7E4EB8" d="M126.667 21.333h-96A10.667 10.667 0 0 0 20 32v192a10.667 10.667 0 0 0 10.667 10.667h96a10.667 10.667 0 0 0 10.666-10.667V32a10.667 10.667 0 0 0-10.666-10.667Z"/>
        <path fill="url(#logosOnenote0)" d="M256 64v128a21.333 21.333 0 0 1-21.333 21.333H106.667V42.667h128A21.333 21.333 0 0 1 256 64Z"/>
        <path fill="#FFF" d="M106.667 128h64v21.333h-64zm0-42.667h64V107h-64zm0 85.334h64v21.333h-64z"/>
        <path fill="#FFF" d="M73.333 74.667L64 176h-8l-9.333-101.333h8L64 153.6l9.333-78.933z"/>
      </svg>
    ),
    sharepoint: (
      <svg width={size} height={size} viewBox="0 0 256 256" fill="none" className={iconClass}>
        <defs>
          <linearGradient id="logosSharepoint0" x1="50%" x2="50%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#03787C"/>
            <stop offset="100%" stopColor="#02585B"/>
          </linearGradient>
        </defs>
        <circle cx="128" cy="128" r="106.667" fill="url(#logosSharepoint0)"/>
        <path fill="#FFF" d="M168.747 158.4c-6.4 3.2-14.187 4.8-23.467 4.8c-6.613 0-12.373-1.173-17.28-3.52a26.88 26.88 0 0 1-11.413-10.027c-2.773-4.373-4.16-9.493-4.16-15.36c0-6.293 1.493-11.733 4.48-16.32c3.093-4.693 7.36-8.32 12.8-10.88c5.547-2.667 11.84-4 18.88-4c4.373 0 8.32.48 11.84 1.44c3.52.96 6.507 2.187 8.96 3.68l-4.16 13.76c-2.133-1.28-4.587-2.347-7.36-3.2c-2.667-.853-5.547-1.28-8.64-1.28c-5.547 0-9.92 1.547-13.12 4.64c-3.2 3.093-4.8 7.36-4.8 12.8c0 5.653 1.493 9.92 4.48 12.8c2.987 2.88 7.253 4.32 12.8 4.32c3.52 0 6.72-.427 9.6-1.28c2.987-.853 5.653-2.027 8-3.52l3.52 13.44zM178.667 96v-21.333h21.333V96h-21.333zm0 64v-42.667h21.333V160h-21.333z"/>
        <circle cx="81.92" cy="81.92" r="25.6" fill="#FFF"/>
        <path fill="#FFF" d="M56.32 139.947V160h21.333v-20.053c0-5.867 2.24-10.88 6.72-15.04c4.48-4.16 9.92-6.24 16.32-6.24v-21.334c-10.773 0-19.84 3.627-27.2 10.88c-7.36 7.253-11.04 16.213-11.04 26.88l-6.133 5.854z"/>
      </svg>
    ),
    zoom: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={iconClass}>
        <path
          d="M2 6a2 2 0 012-2h9a2 2 0 012 2v5.5l5-3v10l-5-3V18a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"
          fill="#2D8CFF"
        />
      </svg>
    ),
    google_workspace: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={iconClass}>
        <path
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          fill="#4285F4"
        />
        <path
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          fill="#34A853"
        />
        <path
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          fill="#FBBC05"
        />
        <path
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          fill="#EA4335"
        />
      </svg>
    ),
  };

  return icons[tool];
}

// Individual icon component exports for direct use
export const GithubIcon: React.FC<{ className?: string }> = ({ className }) => (
  <ToolIcon tool="github" className={className} />
);

export const JiraIcon: React.FC<{ className?: string }> = ({ className }) => (
  <ToolIcon tool="jira" className={className} />
);

export const FigmaIcon: React.FC<{ className?: string }> = ({ className }) => (
  <ToolIcon tool="figma" className={className} />
);

export const SlackIcon: React.FC<{ className?: string }> = ({ className }) => (
  <ToolIcon tool="slack" className={className} />
);

export const TeamsIcon: React.FC<{ className?: string }> = ({ className }) => (
  <ToolIcon tool="teams" className={className} />
);

export const ConfluenceIcon: React.FC<{ className?: string }> = ({ className }) => (
  <ToolIcon tool="confluence" className={className} />
);

// Helper to get tool display name
export function getToolDisplayName(tool: ToolType): string {
  const names: Record<ToolType, string> = {
    github: 'GitHub',
    jira: 'Jira',
    figma: 'Figma',
    outlook: 'Outlook',
    confluence: 'Confluence',
    slack: 'Slack',
    teams: 'Microsoft Teams',
    onedrive: 'OneDrive',
    onenote: 'OneNote',
    sharepoint: 'SharePoint',
    zoom: 'Zoom',
    google_workspace: 'Google Workspace',
  };
  return names[tool];
}

// Helper to get tool description
export function getToolDescription(tool: ToolType): string {
  const descriptions: Record<ToolType, string> = {
    github: 'Code contributions and repositories',
    jira: 'Task completions and sprint activity',
    figma: 'Design contributions and projects',
    outlook: 'Meeting notes and calendar events',
    confluence: 'Documentation updates',
    slack: 'Important messages and discussions',
    teams: 'Meeting notes and chat discussions',
    onedrive: 'OneDrive file changes and collaboration',
    onenote: 'OneNote pages, notebooks, and notes',
    sharepoint: 'SharePoint site activity and documents',
    zoom: 'Meeting recordings, transcripts, and participant data',
    google_workspace: 'Google Docs, Sheets, Slides, Drive files, and Meet recordings',
  };
  return descriptions[tool];
}
