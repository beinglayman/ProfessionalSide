/**
 * UseAsDropdown — unified "Use As" dropdown for both Stories page and story detail.
 *
 * Shows all derivation/packet types grouped by context (Reviews, Meetings, Opportunities, Sharing).
 * Each type shows ready/empty state. Clicking triggers the appropriate generation or preview flow.
 *
 * scope="page"  → shows only multi-story (packet) types
 * scope="story" → shows all types (single-story + multi-story)
 */

import React, { useMemo } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
  Sparkles,
  TrendingUp,
  Clock,
  ArrowUpRight,
  FileText,
  Target,
  Users,
  Mic,
  Share2,
  MessageSquare,
  ChevronDown,
  Check,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import type { StoryDerivation } from '../../types/career-stories';

// ---------------------------------------------------------------------------
// Unified type registry
// ---------------------------------------------------------------------------

export type UseAsTypeKey =
  // Multi-story (packet) types
  | 'promotion'
  | 'annual-review'
  | 'skip-level'
  | 'portfolio-brief'
  | 'self-assessment'
  | 'one-on-one'
  // Single-story types
  | 'interview'
  | 'linkedin'
  | 'resume'
  | 'team-share';

export interface UseAsTypeMeta {
  key: UseAsTypeKey;
  label: string;
  description: string;
  Icon: React.FC<{ className?: string }>;
  bg: string;
  text: string;
  iconText: string;
  kind: 'single' | 'packet';
  group: 'reviews' | 'meetings' | 'opportunities' | 'sharing';
}

export const TYPE_REGISTRY: UseAsTypeMeta[] = [
  // FOR REVIEWS
  { key: 'promotion', label: 'Promotion Case', description: 'Promotion-ready document', Icon: TrendingUp, bg: 'bg-emerald-50', text: 'text-emerald-700', iconText: 'text-emerald-500', kind: 'packet', group: 'reviews' },
  { key: 'self-assessment', label: 'Self-Assessment', description: 'Evidence-backed perf review', Icon: Target, bg: 'bg-rose-50', text: 'text-rose-700', iconText: 'text-rose-500', kind: 'packet', group: 'reviews' },
  { key: 'annual-review', label: 'Annual Review', description: 'Impact summary for review period', Icon: Clock, bg: 'bg-blue-50', text: 'text-blue-700', iconText: 'text-blue-500', kind: 'packet', group: 'reviews' },
  // FOR MEETINGS
  { key: 'one-on-one', label: '1:1 Talking Points', description: 'Walk in with receipts', Icon: Users, bg: 'bg-amber-50', text: 'text-amber-700', iconText: 'text-amber-500', kind: 'packet', group: 'meetings' },
  { key: 'skip-level', label: 'Skip-Level Brief', description: 'Strategic themes for director/VP', Icon: ArrowUpRight, bg: 'bg-purple-50', text: 'text-purple-700', iconText: 'text-purple-500', kind: 'packet', group: 'meetings' },
  // FOR OPPORTUNITIES
  { key: 'interview', label: 'Interview Answer', description: 'Ready to rehearse, ~90 sec', Icon: Mic, bg: 'bg-indigo-50', text: 'text-indigo-700', iconText: 'text-indigo-500', kind: 'single', group: 'opportunities' },
  { key: 'resume', label: 'Resume Bullet', description: 'Metric-driven, drop into any resume', Icon: FileText, bg: 'bg-emerald-50', text: 'text-emerald-700', iconText: 'text-emerald-500', kind: 'single', group: 'opportunities' },
  { key: 'portfolio-brief', label: 'Portfolio Brief', description: 'External-facing 1-pager', Icon: FileText, bg: 'bg-indigo-50', text: 'text-indigo-700', iconText: 'text-indigo-500', kind: 'packet', group: 'opportunities' },
  // FOR SHARING
  { key: 'linkedin', label: 'LinkedIn Post', description: 'Paste, post, done', Icon: Share2, bg: 'bg-sky-50', text: 'text-sky-700', iconText: 'text-sky-500', kind: 'single', group: 'sharing' },
  { key: 'team-share', label: 'Team Update', description: 'Ship to Slack, celebrate the win', Icon: MessageSquare, bg: 'bg-violet-50', text: 'text-violet-700', iconText: 'text-violet-500', kind: 'single', group: 'sharing' },
];

const GROUP_LABELS: Record<string, string> = {
  reviews: 'For Reviews',
  meetings: 'For Meetings',
  opportunities: 'For Opportunities',
  sharing: 'For Sharing',
};

const GROUP_ORDER = ['reviews', 'meetings', 'opportunities', 'sharing'] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface UseAsDropdownProps {
  /** "page" shows only packet types; "story" shows all types */
  scope: 'page' | 'story';
  /** Saved single-story derivations (for story scope) */
  singleDerivations?: StoryDerivation[];
  /** Saved multi-story packets */
  packets?: StoryDerivation[];
  /** Called when user clicks any type — opens the modal at that type for generation or version browsing */
  onSelect: (typeKey: UseAsTypeKey, kind: 'single' | 'packet') => void;
}

export function UseAsDropdown({
  scope,
  singleDerivations = [],
  packets = [],
  onSelect,
}: UseAsDropdownProps) {
  // Build lookup: typeKey → all saved derivations (newest first)
  const savedByType = useMemo(() => {
    const map = new Map<string, StoryDerivation[]>();
    for (const d of [...singleDerivations, ...packets]) {
      const list = map.get(d.type) || [];
      list.push(d);
      map.set(d.type, list);
    }
    // Sort each list newest-first
    for (const [, list] of map) {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return map;
  }, [singleDerivations, packets]);

  // Filter types by scope: page → packets only, story → singles only
  const visibleTypes = useMemo(() => {
    if (scope === 'page') return TYPE_REGISTRY.filter(t => t.kind === 'packet');
    return TYPE_REGISTRY.filter(t => t.kind === 'single');
  }, [scope]);

  // Group them
  const grouped = useMemo(() => {
    const groups: Record<string, UseAsTypeMeta[]> = {};
    for (const t of visibleTypes) {
      if (!groups[t.group]) groups[t.group] = [];
      groups[t.group].push(t);
    }
    return groups;
  }, [visibleTypes]);

  // Count total saved versions across all visible types
  const readyCount = visibleTypes.reduce((sum, t) => sum + (savedByType.get(t.key)?.length || 0), 0);

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-150',
            'bg-primary-600 text-white hover:bg-primary-700 shadow-sm',
          )}
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>Use As</span>
          {readyCount > 0 && (
            <span className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none bg-white/20">
              {readyCount}
            </span>
          )}
          <ChevronDown className="h-3 w-3 opacity-70" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="w-[280px] rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl z-50 animate-in fade-in slide-in-from-top-1 duration-150"
          align="end"
          sideOffset={6}
        >
          {GROUP_ORDER.map((groupKey) => {
            const items = grouped[groupKey];
            if (!items || items.length === 0) return null;

            return (
              <React.Fragment key={groupKey}>
                <DropdownMenu.Label className="px-2.5 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  {GROUP_LABELS[groupKey]}
                </DropdownMenu.Label>
                {items.map((type) => {
                  const versions = savedByType.get(type.key) || [];
                  const latest = versions[0]; // newest first
                  const versionCount = versions.length;
                  const TypeIcon = type.Icon;

                  return (
                    <DropdownMenu.Item
                      key={type.key}
                      className="flex items-center gap-2.5 px-2.5 py-2 text-sm rounded-lg cursor-pointer outline-none transition-colors hover:bg-gray-50 focus:bg-gray-50"
                      onSelect={() => onSelect(type.key, type.kind)}
                    >
                      {/* Icon */}
                      <span className={cn('flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0', type.bg)}>
                        <TypeIcon className={cn('w-3.5 h-3.5', type.iconText)} />
                      </span>

                      {/* Label + description */}
                      <div className="flex-1 min-w-0">
                        <span className={cn('font-medium text-gray-800 block truncate text-[13px]')}>
                          {type.label}
                        </span>
                        <span className="text-[11px] text-gray-400 block truncate">
                          {latest
                            ? `${new Date(latest.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · ${latest.wordCount} words`
                            : type.description}
                        </span>
                      </div>

                      {/* Status indicator */}
                      {latest ? (
                        <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600 flex-shrink-0">
                          <Check className="w-3 h-3" />
                          {versionCount > 1 ? `${versionCount} saved` : 'Ready'}
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-300 flex-shrink-0">&mdash;</span>
                      )}
                    </DropdownMenu.Item>
                  );
                })}
              </React.Fragment>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
