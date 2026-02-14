import React, { useState } from 'react';
import {
  mockReducedProfile,
  TOOL_META,
  getInitials,
  getConfidenceLevel,
} from './mock-data';
import type {
  MockCareerStory,
  MockDraftStory,
  MockToolActivity,
  MockPlaybookItem,
  ConnectedTool,
} from './mock-data';
import { Card, CardContent } from '../ui/card';
import { cn } from '../../lib/utils';
import { ToolIcon, type ToolType } from '../icons/ToolIcons';
import {
  BookOpen,
  FileText,
  Activity,
  Calendar,
  Clock,
  Edit,
  Library,
  Mic,
  Share2,
  Target,
  TrendingUp,
  MessageSquare,
  Wrench,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  V21 — "Split Identity + Output (Enhanced)"                         */
/*  V17 base + Icon Row header + V18-style story cards                 */
/*  + Timeline Sync activity + Playbook tab                            */
/* ------------------------------------------------------------------ */

type Tab = 'published' | 'drafts' | 'activity' | 'playbook';

/* ── Status-based ring colors for Icon Row ── */
const STATUS_RING: Record<string, { ring: string; dotClass: string; label: string; pulse: boolean }> = {
  active: { ring: 'ring-emerald-500', dotClass: 'bg-emerald-500', label: 'Active', pulse: true },
  error: { ring: 'ring-red-500', dotClass: 'bg-red-500', label: 'Needs Fix', pulse: false },
  disconnected: { ring: 'ring-gray-300', dotClass: 'bg-gray-300', label: 'Not Connected', pulse: false },
};

/* ── Playbook type icons ── */
const PLAYBOOK_ICON_MAP: Record<string, React.ElementType> = {
  interview: Mic,
  linkedin: Share2,
  resume: FileText,
  promotion: TrendingUp,
  'self-assessment': Target,
  'team-share': MessageSquare,
};

const PLAYBOOK_COLOR_MAP: Record<string, { bg: string; text: string; border: string }> = {
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  sky: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  rose: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
};

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
  tools: MockToolActivity[];
  selectedId: ConnectedTool;
  onSelect: (id: ConnectedTool) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      {tools.map((ta) => {
        const meta = TOOL_META[ta.tool];
        const statusCfg = STATUS_RING[ta.status] ?? STATUS_RING.disconnected;
        const isSelected = ta.tool === selectedId;

        return (
          <button
            key={ta.tool}
            type="button"
            onClick={() => onSelect(ta.tool)}
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-full ring-2 transition-all',
              statusCfg.ring,
              isSelected ? 'scale-110 ring-[3px] shadow-md bg-white' : 'hover:scale-105',
              !isSelected && (ta.status === 'disconnected' ? 'bg-white/10' : 'bg-white/90'),
            )}
            title={meta.label}
          >
            <ToolIcon
              tool={ta.tool as ToolType}
              size={20}
              disabled={ta.status === 'disconnected'}
            />
          </button>
        );
      })}
    </div>
  );
}

function ToolDetailPanel({ tool }: { tool: MockToolActivity }) {
  const meta = TOOL_META[tool.tool];
  const statusCfg = STATUS_RING[tool.status] ?? STATUS_RING.disconnected;

  return (
    <div className="mt-3 rounded-xl border border-white/20 bg-white/10 px-4 py-3 transition-all">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ToolIcon tool={tool.tool as ToolType} size={24} disabled={tool.status === 'disconnected'} />
          <div>
            <h4 className="text-sm font-semibold text-white">{meta.label}</h4>
            <div className="mt-0.5 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                {statusCfg.pulse && (
                  <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-75', statusCfg.dotClass)} />
                )}
                <span className={cn('relative inline-flex h-2 w-2 rounded-full', statusCfg.dotClass)} />
              </span>
              <span className="text-xs text-white/70">{statusCfg.label}</span>
              {tool.status === 'active' && tool.recentItems.length > 0 && (
                <span className="text-xs text-white/50">
                  &middot; Synced {formatRelativeTime(tool.recentItems[0].date)}
                </span>
              )}
            </div>
          </div>
        </div>
        {tool.activityCount > 0 && (
          <div className="text-right">
            <p className="text-lg font-bold text-white">{tool.activityCount}</p>
            <p className="text-[10px] text-white/50">activities</p>
          </div>
        )}
      </div>

      {/* Recent items preview */}
      {tool.recentItems.length > 0 && (
        <ul className="mt-2 space-y-1 border-t border-white/20 pt-2">
          {tool.recentItems.slice(0, 3).map((item, idx) => (
            <li key={idx} className="flex items-baseline justify-between gap-2 text-xs">
              <span className="truncate text-white/80">{item.title}</span>
              <span className="shrink-0 text-white/50">
                {formatRelativeTime(item.date)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Disconnected state */}
      {tool.status === 'disconnected' && (
        <p className="mt-2 text-xs text-white/40">
          Connect this tool to start capturing activities.
        </p>
      )}

      {/* Error state */}
      {tool.status === 'error' && (
        <p className="mt-2 text-xs text-red-300">
          Sync issue detected. Reconnect to resume activity capture.
        </p>
      )}
    </div>
  );
}

function StoryDetailCard({ story }: { story: MockCareerStory }) {
  const confidence = getConfidenceLevel(story.overallConfidence);
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  return (
    <Card className="shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="p-5">
        {/* Title row */}
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-base font-bold text-gray-900">{story.title}</h3>
          <span className="flex shrink-0 items-center gap-1 text-xs text-gray-400">
            <Calendar className="h-3 w-3" />
            {formatDate(story.publishedAt)}
          </span>
        </div>

        {/* Badges */}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
            {story.framework}
          </span>
          <span className="rounded bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">
            {story.archetype}
          </span>
          <span
            className={cn(
              'rounded px-2 py-0.5 text-xs font-medium',
              confidence.bgColor,
              confidence.color,
            )}
          >
            {confidence.label} ({Math.round(story.overallConfidence * 100)}%)
          </span>
        </div>

        {/* All sections */}
        <div className="mt-4 space-y-3">
          {story.sections.map((section) => (
            <div key={section.key}>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                {section.key.toUpperCase()}
              </h4>
              <p className="mt-1 text-sm leading-relaxed text-gray-700">
                {section.text}
              </p>
            </div>
          ))}
        </div>

        {/* Tool sources */}
        <div className="mt-4 flex items-center gap-2 border-t border-gray-100 pt-3">
          <Wrench className="h-3.5 w-3.5 text-gray-400" />
          <span className="text-xs text-gray-400">Sources:</span>
          {story.tools.map((tool) => (
            <span
              key={tool}
              className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600"
            >
              {tool}
            </span>
          ))}
        </div>

        {/* Confidence bar */}
        <div className="mt-3 flex items-center gap-3">
          <span className="text-xs text-gray-400">Confidence</span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
            <div
              className={cn(
                'h-1.5 rounded-full',
                story.overallConfidence >= 0.8
                  ? 'bg-emerald-500'
                  : story.overallConfidence >= 0.6
                    ? 'bg-amber-500'
                    : 'bg-red-500',
              )}
              style={{ width: `${story.overallConfidence * 100}%` }}
            />
          </div>
          <span className="text-xs font-medium text-gray-600">
            {Math.round(story.overallConfidence * 100)}%
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function DraftCard({ draft }: { draft: MockDraftStory }) {
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  return (
    <Card className="shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-gray-900">{draft.title}</p>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                {draft.framework}
              </span>
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Calendar className="h-3 w-3" />
                Updated {formatDate(draft.updatedAt)}
              </span>
            </div>
          </div>
          <span className="shrink-0 text-sm font-bold text-gray-600">
            {draft.completionPercent}%
          </span>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className={cn(
              'h-1.5 rounded-full transition-all',
              draft.completionPercent >= 60
                ? 'bg-emerald-400'
                : draft.completionPercent >= 30
                  ? 'bg-amber-400'
                  : 'bg-gray-300',
            )}
            style={{ width: `${draft.completionPercent}%` }}
          />
        </div>

        {/* Action */}
        <div className="mt-3 text-right">
          <button className="text-xs font-medium text-primary-600 hover:text-primary-700">
            Continue editing &rarr;
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

function ActivityTimeline({ tools }: { tools: MockToolActivity[] }) {
  // Flatten all recent items with tool info
  const allItems = tools.flatMap((ta) =>
    ta.recentItems.map((item) => ({
      ...item,
      tool: ta.tool,
      toolLabel: TOOL_META[ta.tool].label,
    })),
  );

  // Group by time bucket
  const grouped = new Map<string, typeof allItems>();
  for (const item of allItems) {
    const group = getTimeGroup(item.date);
    if (!grouped.has(group)) grouped.set(group, []);
    grouped.get(group)!.push(item);
  }

  // Sort groups
  const sortedGroups = TIME_GROUP_ORDER.filter((g) => grouped.has(g));

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
                const meta = TOOL_META[item.tool as ConnectedTool];
                return (
                  <div key={`${item.tool}-${idx}`} className="relative flex gap-4 pb-1">
                    {/* Timeline dot */}
                    <div className="relative flex flex-col items-center">
                      <div className="z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 border-white bg-white shadow-sm">
                        <ToolIcon tool={item.tool as ToolType} size={16} />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1 pt-1">
                      <p className="text-sm text-gray-800">{item.title}</p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span
                          className={cn(
                            'rounded px-1.5 py-0.5 text-[10px] font-medium',
                            meta.bgColor,
                            meta.color,
                          )}
                        >
                          {item.toolLabel}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatRelativeTime(item.date)}
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

function PlaybookCard({ item }: { item: MockPlaybookItem }) {
  const colors = PLAYBOOK_COLOR_MAP[item.typeColor] ?? PLAYBOOK_COLOR_MAP.indigo;
  const Icon = PLAYBOOK_ICON_MAP[item.type] ?? FileText;
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });

  return (
    <Card className="shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex gap-3">
          {/* Type icon */}
          <div
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
              colors.bg,
            )}
          >
            <Icon className={cn('h-4 w-4', colors.text)} />
          </div>

          <div className="min-w-0 flex-1">
            {/* Type label + kind badge */}
            <div className="flex items-center gap-2">
              <span className={cn('text-xs font-semibold', colors.text)}>
                {item.typeLabel}
              </span>
              {item.kind === 'packet' && (
                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                  Packet
                </span>
              )}
            </div>

            {/* Source story */}
            <p className="mt-0.5 text-xs text-gray-400 line-clamp-1">
              From: {item.sourceStoryTitle}
            </p>

            {/* Preview */}
            <p className="mt-1.5 text-sm leading-relaxed text-gray-700 line-clamp-2">
              {item.preview}
            </p>

            {/* Meta row */}
            <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
              <span>{item.wordCount} words</span>
              <span>{formatDate(item.createdAt)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Main Component ── */

export function ProfileV21() {
  const p = mockReducedProfile;
  const initials = getInitials(p.name);
  const [activeTab, setActiveTab] = useState<Tab>('published');
  const [selectedToolId, setSelectedToolId] = useState<ConnectedTool>(
    p.connectedTools[0]?.tool ?? 'github',
  );

  const selectedTool = p.allIntegrations.find((t) => t.tool === selectedToolId) ?? p.allIntegrations[0];

  const tabs: { key: Tab; label: string; icon: React.ElementType; count: number }[] = [
    { key: 'published', label: 'Published', icon: BookOpen, count: p.publishedStories.length },
    { key: 'drafts', label: 'Drafts', icon: FileText, count: p.draftStories.length },
    { key: 'activity', label: 'Activity', icon: Activity, count: p.connectedTools.reduce((s, t) => s + t.recentItems.length, 0) },
    { key: 'playbook', label: 'Playbook', icon: Library, count: p.playbook.length },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Hero Band ── */}
      <div className="bg-gradient-to-br from-primary-700 via-primary-800 to-gray-900">
        <div className="mx-auto flex max-w-4xl flex-col items-center px-4 py-10">
          {/* Avatar */}
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/20 text-white">
            <span className="text-2xl font-bold">{initials}</span>
          </div>

          {/* Name */}
          <h1 className="mt-4 text-2xl font-bold text-white">{p.name}</h1>

          {/* Role + Title */}
          <p className="mt-1 text-sm text-white/80">
            {p.role} &middot; {p.title} at {p.company}
          </p>

          {/* Icon Row — all integrations */}
          <div className="mt-5">
            <ToolIconRow
              tools={p.allIntegrations}
              selectedId={selectedToolId}
              onSelect={setSelectedToolId}
            />
          </div>

          {/* Detail Panel — selected tool */}
          <div className="mt-1 w-full max-w-md">
            <ToolDetailPanel tool={selectedTool} />
          </div>

          {/* Stats + Edit */}
          <div className="mt-4 flex items-center gap-4">
            <p className="text-sm text-white/60">
              {p.publishedStories.length} stories &middot; {p.totalActivities} activities
            </p>
            <button className="inline-flex items-center gap-1.5 rounded-md border border-white/20 bg-white/15 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/25">
              <Edit className="h-3.5 w-3.5" />
              Edit
            </button>
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
          {/* Published tab — V18-style rich cards */}
          {activeTab === 'published' && (
            <div className="space-y-4">
              {p.publishedStories.map((story: MockCareerStory) => (
                <StoryDetailCard key={story.id} story={story} />
              ))}
            </div>
          )}

          {/* Drafts tab — enhanced cards */}
          {activeTab === 'drafts' && (
            <div className="space-y-3">
              {p.draftStories.map((draft: MockDraftStory) => (
                <DraftCard key={draft.id} draft={draft} />
              ))}
            </div>
          )}

          {/* Activity tab — Timeline Sync style */}
          {activeTab === 'activity' && (
            <ActivityTimeline tools={p.connectedTools} />
          )}

          {/* Playbook tab */}
          {activeTab === 'playbook' && (
            <div className="space-y-3">
              {p.playbook.length === 0 ? (
                <div className="py-12 text-center">
                  <Library className="mx-auto h-8 w-8 text-gray-300" />
                  <p className="mt-2 text-sm text-gray-400">
                    Your playbook is empty. Publish a story to generate interview answers, resume bullets, and more.
                  </p>
                </div>
              ) : (
                p.playbook.map((item: MockPlaybookItem) => (
                  <PlaybookCard key={item.id} item={item} />
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
