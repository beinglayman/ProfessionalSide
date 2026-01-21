// Types for Workspace Journal Auto-Creation Subscription

export type Frequency = 'daily' | 'alternate' | 'weekdays' | 'weekly' | 'fortnightly' | 'monthly' | 'custom';

export type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface JournalSubscription {
  id: string;
  userId: string;
  workspaceId: string;
  isActive: boolean;

  // Schedule
  frequency: Frequency;
  selectedDays: DayOfWeek[];
  generationTime: string; // HH:mm format
  timezone: string; // IANA timezone

  // Tool selection
  selectedTools: string[];

  // Customization
  customPrompt: string | null;
  defaultCategory: string | null;
  defaultTags: string[];

  // Tracking
  lastRunAt: string | null;
  nextRunAt: string | null;
  createdAt: string;
  updatedAt: string;

  // Relations (optional, included when fetched)
  workspace?: {
    id: string;
    name: string;
  };
}

export interface CreateSubscriptionInput {
  frequency: Frequency;
  selectedDays: DayOfWeek[];
  generationTime: string;
  timezone: string;
  selectedTools: string[];
  customPrompt?: string | null;
  defaultCategory?: string | null;
  defaultTags?: string[];
}

export interface UpdateSubscriptionInput {
  isActive?: boolean;
  frequency?: Frequency;
  selectedDays?: DayOfWeek[];
  generationTime?: string;
  timezone?: string;
  selectedTools?: string[];
  customPrompt?: string | null;
  defaultCategory?: string | null;
  defaultTags?: string[];
}

export interface ToggleSubscriptionInput {
  isActive: boolean;
}

export interface ConnectedTool {
  toolType: string;
  isConnected: boolean;
  connectedAt: string | null;
  lastUsedAt: string | null;
}

export interface ConnectedToolsResponse {
  tools: ConnectedTool[];
}

// Frequency display labels
export const FREQUENCY_LABELS: Record<Frequency, string> = {
  daily: 'Daily',
  alternate: 'Alternate days',
  weekdays: 'Weekdays (Mon-Fri)',
  weekly: 'Weekly',
  fortnightly: 'Fortnightly',
  monthly: 'Monthly',
  custom: 'Custom'
};

// Day of week display labels
export const DAY_LABELS: Record<DayOfWeek, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday'
};

// Short day labels for UI
export const DAY_SHORT_LABELS: Record<DayOfWeek, string> = {
  mon: 'M',
  tue: 'T',
  wed: 'W',
  thu: 'T',
  fri: 'F',
  sat: 'S',
  sun: 'S'
};

// Supported tools with display names and icons
export const SUPPORTED_TOOLS: { id: string; name: string; icon: string }[] = [
  { id: 'github', name: 'GitHub', icon: 'github' },
  { id: 'jira', name: 'Jira', icon: 'jira' },
  { id: 'figma', name: 'Figma', icon: 'figma' },
  { id: 'confluence', name: 'Confluence', icon: 'confluence' },
  { id: 'slack', name: 'Slack', icon: 'slack' },
  { id: 'teams', name: 'Microsoft Teams', icon: 'teams' },
  { id: 'outlook', name: 'Outlook', icon: 'outlook' },
  { id: 'zoom', name: 'Zoom', icon: 'zoom' },
  { id: 'linear', name: 'Linear', icon: 'linear' },
  { id: 'notion', name: 'Notion', icon: 'notion' },
  { id: 'asana', name: 'Asana', icon: 'asana' },
  { id: 'trello', name: 'Trello', icon: 'trello' }
];

// Common time options for generation time dropdown
export const GENERATION_TIME_OPTIONS = [
  { value: '06:00', label: '6:00 AM' },
  { value: '07:00', label: '7:00 AM' },
  { value: '08:00', label: '8:00 AM' },
  { value: '09:00', label: '9:00 AM' },
  { value: '12:00', label: '12:00 PM' },
  { value: '17:00', label: '5:00 PM' },
  { value: '18:00', label: '6:00 PM' },
  { value: '19:00', label: '7:00 PM' },
  { value: '20:00', label: '8:00 PM' },
  { value: '21:00', label: '9:00 PM' }
];

// Common timezone options
export const TIMEZONE_OPTIONS = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Asia/Kolkata', label: 'India (IST)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
  { value: 'Pacific/Auckland', label: 'Auckland (NZST/NZDT)' }
];

// Helper to get user's timezone
export function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

// Helper to check if frequency requires day selection
export function requiresDaySelection(frequency: Frequency): boolean {
  return ['weekly', 'fortnightly', 'monthly', 'custom'].includes(frequency);
}

// Helper to check if frequency requires single day selection
export function requiresSingleDay(frequency: Frequency): boolean {
  return ['weekly', 'fortnightly', 'monthly'].includes(frequency);
}
