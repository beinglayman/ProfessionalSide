import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { cn } from '../../lib/utils';
import { useProfile } from '../../hooks/useProfile';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { getAvatarUrl, handleAvatarError } from '../../utils/avatar';
import { useListCareerStories, useActivities } from '../../hooks/useCareerStories';
import { useMCPIntegrations, useMCPIntegrationValidation, useMCPOAuth } from '../../hooks/useMCP';
import { MCPToolType } from '../../services/mcp.service';
import { useSingleDerivations, usePackets } from '../../hooks/useCareerStories';
import { ToolIcon, type ToolType as IconToolType } from '../../components/icons/ToolIcons';
import {
  NARRATIVE_FRAMEWORKS,
} from '../../components/career-stories/constants';
import type { CareerStory, ToolActivity, StoryDerivation } from '../../types/career-stories';
import {
  BookOpen,
  FileText,
  Activity,
  Calendar,
  Clock,
  Library,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  AlertTriangle,
  Plug,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Profile Page — V21 "Split Identity + Output (Enhanced)" Design     */
/* ------------------------------------------------------------------ */

type Tab = 'published' | 'drafts' | 'activity' | 'playbook';

/* ── All MCP tool types for the icon row ── */
const ALL_TOOLS: MCPToolType[] = [
  MCPToolType.GITHUB,
  MCPToolType.JIRA,
  MCPToolType.CONFLUENCE,
  MCPToolType.SLACK,
  MCPToolType.OUTLOOK,
  MCPToolType.FIGMA,
  MCPToolType.TEAMS,
  MCPToolType.ONEDRIVE,
  MCPToolType.ONENOTE,
  MCPToolType.SHAREPOINT,
];

/* ── Map MCPToolType to ToolIcon's ToolType ── */
const MCP_TO_ICON: Record<string, IconToolType> = {
  github: 'github',
  jira: 'jira',
  confluence: 'confluence',
  slack: 'slack',
  outlook: 'outlook',
  figma: 'figma',
  teams: 'teams',
  onedrive: 'onedrive',
  onenote: 'onenote',
  sharepoint: 'sharepoint',
};

/* ── Tool display names ── */
const TOOL_LABELS: Record<string, string> = {
  github: 'GitHub',
  jira: 'Jira',
  confluence: 'Confluence',
  slack: 'Slack',
  outlook: 'Outlook',
  figma: 'Figma',
  teams: 'Teams',
  onedrive: 'OneDrive',
  onenote: 'OneNote',
  sharepoint: 'SharePoint',
};

/* ── Status ring colors ── */
type IntegrationStatus = 'active' | 'error' | 'disconnected';

const STATUS_RING: Record<IntegrationStatus, { ring: string; dotClass: string; label: string; pulse: boolean }> = {
  active: { ring: 'ring-emerald-500', dotClass: 'bg-emerald-500', label: 'Active', pulse: true },
  error: { ring: 'ring-red-500', dotClass: 'bg-red-500', label: 'Needs Fix', pulse: false },
  disconnected: { ring: 'ring-gray-300', dotClass: 'bg-gray-300', label: 'Not Connected', pulse: false },
};

/* ── Resolved tool info for the icon row ── */
interface ResolvedTool {
  toolType: MCPToolType;
  iconType: IconToolType;
  label: string;
  status: IntegrationStatus;
}

/* ── Timeline time grouping ── */
function getTimeGroup(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const hours = diff / 3_600_000;
  if (hours < 1) return 'just-now';
  if (hours < 24) return 'today';
  if (hours < 168) return 'this-week';
  return 'older';
}

const TIME_GROUP_LABELS: Record<string, string> = {
  'just-now': 'Just now',
  today: 'Today',
  'this-week': 'This week',
  older: 'Older',
};

const TIME_GROUP_ORDER = ['just-now', 'today', 'this-week', 'older'];

function formatRelativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

/* ── Sub-components ── */

function ToolIconRow({
  tools,
  selectedId,
  onSelect,
}: {
  tools: ResolvedTool[];
  selectedId: MCPToolType;
  onSelect: (id: MCPToolType) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      {tools.map((t) => {
        const statusCfg = STATUS_RING[t.status];
        const isSelected = t.toolType === selectedId;

        return (
          <button
            key={t.toolType}
            type="button"
            onClick={() => onSelect(t.toolType)}
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-full ring-2 transition-all bg-white',
              statusCfg.ring,
              isSelected ? 'scale-110 ring-[3px] shadow-md' : 'hover:scale-105',
            )}
            title={t.label}
          >
            <ToolIcon
              tool={t.iconType}
              size={20}
              disabled={t.status === 'disconnected'}
            />
          </button>
        );
      })}
    </div>
  );
}

function ToolDetailPanel({
  tool,
  activities,
  onConnect,
  isConnecting,
}: {
  tool: ResolvedTool;
  activities: ToolActivity[];
  onConnect: (toolType: MCPToolType) => void;
  isConnecting: boolean;
}) {
  const statusCfg = STATUS_RING[tool.status];
  const navigate = useNavigate();
  const recentItems = activities.slice(0, 3);

  return (
    <div className="mt-3 rounded-xl border border-white/20 bg-white/10 px-4 py-3 transition-all">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ToolIcon tool={tool.iconType} size={24} disabled={tool.status === 'disconnected'} />
          <div>
            <h4 className="text-sm font-semibold text-white">{tool.label}</h4>
            <div className="mt-0.5 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                {statusCfg.pulse && (
                  <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-75', statusCfg.dotClass)} />
                )}
                <span className={cn('relative inline-flex h-2 w-2 rounded-full', statusCfg.dotClass)} />
              </span>
              <span className="text-xs text-white/70">{statusCfg.label}</span>
              {tool.status === 'active' && recentItems.length > 0 && (
                <span className="text-xs text-white/50">
                  &middot; Synced {formatRelativeTime(recentItems[0].timestamp)}
                </span>
              )}
            </div>
          </div>
        </div>
        {tool.status === 'active' && (
          <div className="text-right">
            <p className="text-lg font-bold text-white">{activities.length}</p>
            <p className="text-[10px] text-white/50">activities</p>
          </div>
        )}
      </div>

      {/* Active: recent items */}
      {tool.status === 'active' && recentItems.length > 0 && (
        <ul className="mt-2 space-y-1 border-t border-white/20 pt-2">
          {recentItems.map((item, idx) => (
            <li key={idx} className="flex items-baseline justify-between gap-2 text-xs">
              <span className="truncate text-white/80">{item.title}</span>
              <span className="shrink-0 text-white/50">
                {formatRelativeTime(item.timestamp)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Disconnected: Connect CTA */}
      {tool.status === 'disconnected' && (
        <div className="mt-3 border-t border-white/20 pt-3">
          <p className="text-xs text-white/40 mb-2">
            Connect this tool to start capturing activities.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="border-white/30 bg-white/10 text-white hover:bg-white/20"
            onClick={() => onConnect(tool.toolType)}
            disabled={isConnecting}
          >
            <Plug className="h-3.5 w-3.5 mr-1.5" />
            {isConnecting ? 'Connecting...' : 'Connect'}
          </Button>
        </div>
      )}

      {/* Error: Fix CTA */}
      {tool.status === 'error' && (
        <div className="mt-3 border-t border-white/20 pt-3">
          <p className="text-xs text-red-300 mb-2">
            Sync issue detected. Reconnect to resume activity capture.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="border-red-400/40 bg-red-500/10 text-white hover:bg-red-500/20"
            onClick={() => navigate('/settings/integrations')}
          >
            <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
            Fix Connection
          </Button>
        </div>
      )}
    </div>
  );
}

function StoryCard({ story }: { story: CareerStory }) {
  const [expanded, setExpanded] = useState(false);
  const frameworkMeta = NARRATIVE_FRAMEWORKS[story.framework];
  const sectionKeys = frameworkMeta?.sections ?? Object.keys(story.sections);
  const firstSection = sectionKeys[0] ? story.sections[sectionKeys[0]] : null;
  const preview = firstSection?.summary ?? '';

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <Card
      className={cn(
        'shadow-sm transition-shadow cursor-pointer',
        expanded ? 'shadow-md border-gray-300' : 'hover:shadow-md',
      )}
      onClick={() => setExpanded((prev) => !prev)}
    >
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-bold text-gray-900">{story.title}</h3>
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
          )}
        </div>

        {/* Badges */}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
            {story.framework}
          </span>
          {story.archetype && (
            <span className="rounded bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700 capitalize">
              {story.archetype}
            </span>
          )}
          {story.role && (
            <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 capitalize">
              {story.role}
            </span>
          )}
        </div>

        {/* Collapsed preview */}
        {!expanded && (
          <>
            {preview && (
              <p className="text-xs text-gray-600 line-clamp-2 mt-2">{preview}</p>
            )}
            {story.publishedAt && (
              <p className="text-xs text-gray-400 mt-2">
                Published {formatDate(story.publishedAt)}
              </p>
            )}
          </>
        )}

        {/* Expanded sections */}
        {expanded && (
          <div className="mt-4 space-y-3" onClick={(e) => e.stopPropagation()}>
            {sectionKeys.map((sectionKey) => {
              const section = story.sections[sectionKey];
              if (!section) return null;
              return (
                <div key={sectionKey}>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    {sectionKey}
                  </h4>
                  <p className="mt-1 text-sm leading-relaxed text-gray-700">
                    {section.summary}
                  </p>
                </div>
              );
            })}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              {story.publishedAt && (
                <p className="text-xs text-gray-400">
                  Published {formatDate(story.publishedAt)}
                </p>
              )}
              <Link
                to="/stories"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700"
                onClick={(e) => e.stopPropagation()}
              >
                View in Stories <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DraftCard({ story }: { story: CareerStory }) {
  const sectionKeys = Object.keys(story.sections);
  const filledSections = sectionKeys.filter((k) => story.sections[k]?.summary?.trim());
  const completionPercent = sectionKeys.length > 0
    ? Math.round((filledSections.length / sectionKeys.length) * 100)
    : 0;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <Card className="shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-gray-900">{story.title}</p>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                {story.framework}
              </span>
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Calendar className="h-3 w-3" />
                Updated {formatDate(story.updatedAt ?? story.generatedAt)}
              </span>
            </div>
          </div>
          <span className="shrink-0 text-sm font-bold text-gray-600">
            {completionPercent}%
          </span>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className={cn(
              'h-1.5 rounded-full transition-all',
              completionPercent >= 60
                ? 'bg-emerald-400'
                : completionPercent >= 30
                  ? 'bg-amber-400'
                  : 'bg-gray-300',
            )}
            style={{ width: `${completionPercent}%` }}
          />
        </div>

        {/* Action */}
        <div className="mt-3 text-right">
          <Link
            to="/stories"
            className="text-xs font-medium text-primary-600 hover:text-primary-700"
          >
            Continue editing &rarr;
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function ActivityTimeline({ activities }: { activities: ToolActivity[] }) {
  // Group by time bucket
  const grouped = new Map<string, ToolActivity[]>();
  for (const item of activities) {
    const group = getTimeGroup(item.timestamp);
    if (!grouped.has(group)) grouped.set(group, []);
    grouped.get(group)!.push(item);
  }

  const sortedGroups = TIME_GROUP_ORDER.filter((g) => grouped.has(g));

  if (sortedGroups.length === 0) {
    return (
      <div className="py-12 text-center">
        <Activity className="mx-auto h-8 w-8 text-gray-300" />
        <p className="mt-2 text-sm text-gray-400">
          No activities yet. Connect your tools to start capturing work.
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Vertical timeline line */}
      <div className="absolute bottom-0 left-[15px] top-0 w-0.5 bg-primary-200" />

      {sortedGroups.map((groupKey) => {
        const items = grouped.get(groupKey)!;
        return (
          <div key={groupKey} className="relative mb-5 last:mb-0">
            {/* Group header */}
            <div className="relative mb-3 flex items-center gap-2 pl-10">
              <Clock className="h-3 w-3 text-gray-400" />
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                {TIME_GROUP_LABELS[groupKey]}
              </h4>
              <div className="flex-1 border-b border-dashed border-gray-200" />
            </div>

            {/* Events */}
            <div className="space-y-2">
              {items.map((item, idx) => {
                const iconTool = MCP_TO_ICON[item.source] ?? undefined;
                return (
                  <div key={`${item.id}-${idx}`} className="relative flex gap-4 pb-1">
                    {/* Timeline dot */}
                    <div className="relative flex flex-col items-center">
                      <div className="z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 border-white bg-white shadow-sm">
                        {iconTool ? (
                          <ToolIcon tool={iconTool} size={16} />
                        ) : (
                          <Activity className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1 pt-1">
                      <p className="text-sm text-gray-800">{item.title}</p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                          {TOOL_LABELS[item.source] ?? item.source}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatRelativeTime(item.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PlaybookCard({ derivation }: { derivation: StoryDerivation }) {
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const sourceTitle = derivation.storySnapshots?.[0]?.title ?? 'Unknown story';
  const typeLabel = derivation.type
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <Card className="shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50">
            <FileText className="h-4 w-4 text-primary-700" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-primary-700">{typeLabel}</span>
              {derivation.kind === 'packet' && (
                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                  Packet
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-gray-400 line-clamp-1">
              From: {sourceTitle}
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-gray-700 line-clamp-2">
              {derivation.text.slice(0, 200)}
            </p>
            <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
              <span>{derivation.wordCount} words</span>
              <span>{formatDate(derivation.createdAt)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Main Component ── */

export function ProfileViewPage() {
  useDocumentTitle('Profile');

  const { profile, isLoading: profileLoading, error: profileError, refetch } = useProfile();
  const { data: storiesData } = useListCareerStories();
  const { data: integrationsData } = useMCPIntegrations();
  const { data: validationData } = useMCPIntegrationValidation();
  const { data: activitiesData } = useActivities({ limit: 100 });
  const { data: singleDerivations } = useSingleDerivations();
  const { data: packets } = usePackets();
  const oauthMutation = useMCPOAuth();

  const [activeTab, setActiveTab] = useState<Tab>('published');
  const [selectedTool, setSelectedTool] = useState<MCPToolType>(MCPToolType.GITHUB);

  // Resolve tool statuses from MCP integration data
  const resolvedTools: ResolvedTool[] = useMemo(() => {
    const integrations = integrationsData?.integrations ?? [];
    const validations = validationData?.validations ?? {};

    return ALL_TOOLS.map((toolType) => {
      const integration = integrations.find((i) => i.toolType === toolType);
      let status: IntegrationStatus = 'disconnected';

      if (integration?.isActive) {
        const validation = validations[toolType];
        status = validation?.status === 'valid' || !validation ? 'active' : 'error';
      }

      return {
        toolType,
        iconType: MCP_TO_ICON[toolType] ?? 'github',
        label: TOOL_LABELS[toolType] ?? toolType,
        status,
      };
    });
  }, [integrationsData, validationData]);

  // Get the currently selected tool's resolved info
  const currentTool = resolvedTools.find((t) => t.toolType === selectedTool) ?? resolvedTools[0];

  // Filter activities for the selected tool
  const toolActivities = useMemo(() => {
    const all = activitiesData?.activities ?? [];
    return all.filter((a) => a.source === selectedTool);
  }, [activitiesData, selectedTool]);

  // Split stories into published/drafts
  const allStories: CareerStory[] = storiesData?.stories ?? [];
  const publishedStories = useMemo(() => allStories.filter((s) => s.isPublished), [allStories]);
  const draftStories = useMemo(() => allStories.filter((s) => !s.isPublished), [allStories]);

  // All activities for the activity tab
  const allActivities = activitiesData?.activities ?? [];

  // Playbook items (derivations + packets)
  const playbook: StoryDerivation[] = useMemo(() => {
    const singles = singleDerivations ?? [];
    const packs = packets ?? [];
    return [...singles, ...packs].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [singleDerivations, packets]);

  // Tabs config
  const tabs: { key: Tab; label: string; icon: React.ElementType; count: number }[] = [
    { key: 'published', label: 'Published', icon: BookOpen, count: publishedStories.length },
    { key: 'drafts', label: 'Draft Stories', icon: FileText, count: draftStories.length },
    { key: 'activity', label: 'Activity', icon: Activity, count: allActivities.length },
    { key: 'playbook', label: 'Playbook', icon: Library, count: playbook.length },
  ];

  const handleConnect = (toolType: MCPToolType) => {
    oauthMutation.mutate({ toolType });
  };

  // Loading state
  if (profileLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  // Error state
  if (profileError) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <p className="text-red-600">Failed to load profile: {profileError}</p>
        <Button onClick={refetch}>Try Again</Button>
      </div>
    );
  }

  // No profile — nudge to onboarding
  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-semibold text-gray-900">Complete Your Profile</h1>
        <p className="text-gray-600 max-w-md text-center">
          Your professional profile is not yet set up. Complete onboarding to get started.
        </p>
        <Button asChild className="bg-purple-600 hover:bg-purple-700 text-white">
          <Link to="/onboarding">Get Started</Link>
        </Button>
      </div>
    );
  }

  const avatarUrl = getAvatarUrl(profile.avatar);
  const initials = profile.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() ?? '';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Hero Band ── */}
      <div className="bg-gradient-to-br from-primary-700 via-primary-800 to-gray-900">
        <div className="mx-auto flex max-w-4xl flex-col items-center px-4 py-10">
          {/* Avatar */}
          {avatarUrl && avatarUrl !== '/default-avatar.svg' ? (
            <img
              src={avatarUrl}
              alt={profile.name}
              className="h-20 w-20 rounded-full object-cover ring-4 ring-white/20"
              onError={handleAvatarError}
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/20 text-white">
              <span className="text-2xl font-bold">{initials}</span>
            </div>
          )}

          {/* Name */}
          <h1 className="mt-4 text-2xl font-bold text-white">{profile.name}</h1>

          {/* Title + Company */}
          <p className="mt-1 text-sm text-white/80">
            {profile.title}
            {profile.company && <> at {profile.company}</>}
          </p>

          {/* Icon Row — all integrations */}
          <div className="mt-5">
            <ToolIconRow
              tools={resolvedTools}
              selectedId={selectedTool}
              onSelect={setSelectedTool}
            />
          </div>

          {/* Detail Panel — selected tool */}
          <div className="mt-3 w-full">
            <ToolDetailPanel
              tool={currentTool}
              activities={toolActivities}
              onConnect={handleConnect}
              isConnecting={oauthMutation.isPending}
            />
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="mx-auto max-w-4xl px-4">
        <div className="flex border-b border-gray-200">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex items-center gap-1.5 border-b-2 px-5 py-3 text-sm font-medium transition-colors',
                  isActive
                    ? 'border-primary-600 text-primary-700'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                <span
                  className={cn(
                    'ml-1 rounded-full px-1.5 py-0.5 text-xs',
                    isActive
                      ? 'bg-primary-100 text-primary-700'
                      : 'bg-gray-100 text-gray-500',
                  )}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Tab Content ── */}
        <div className="py-6">
          {/* Published Stories */}
          {activeTab === 'published' && (
            publishedStories.length === 0 ? (
              <div className="py-12 text-center">
                <BookOpen className="mx-auto h-8 w-8 text-gray-300" />
                <p className="mt-2 text-sm text-gray-400">
                  No published stories yet.{' '}
                  <Link to="/stories" className="text-primary-600 hover:text-primary-700 font-medium">
                    Create your first story
                  </Link>
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {publishedStories.map((story) => (
                  <StoryCard key={story.id} story={story} />
                ))}
              </div>
            )
          )}

          {/* Draft Stories */}
          {activeTab === 'drafts' && (
            draftStories.length === 0 ? (
              <div className="py-12 text-center">
                <FileText className="mx-auto h-8 w-8 text-gray-300" />
                <p className="mt-2 text-sm text-gray-400">
                  No draft stories. Stories in progress will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {draftStories.map((story) => (
                  <DraftCard key={story.id} story={story} />
                ))}
              </div>
            )
          )}

          {/* Activity Timeline */}
          {activeTab === 'activity' && (
            <ActivityTimeline activities={allActivities} />
          )}

          {/* Playbook */}
          {activeTab === 'playbook' && (
            playbook.length === 0 ? (
              <div className="py-12 text-center">
                <Library className="mx-auto h-8 w-8 text-gray-300" />
                <p className="mt-2 text-sm text-gray-400">
                  Your playbook is empty. Publish a story to generate interview answers, resume bullets, and more.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {playbook.map((derivation) => (
                  <PlaybookCard key={derivation.id} derivation={derivation} />
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
