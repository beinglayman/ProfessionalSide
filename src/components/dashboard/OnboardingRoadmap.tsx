import { useState, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Check, Circle, ArrowRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useMCPIntegrations } from '../../hooks/useMCP';
import { useListCareerStories, usePackets, useSingleDerivations } from '../../hooks/useCareerStories';
import { isDemoMode } from '../../services/demo-mode.service';

// ─── Types ──────────────────────────────────────────────────────────────────

interface NodeDef {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  route: string;
  /** SVG coords (set in layout) */
  cx: number;
  cy: number;
}

interface TooltipContent {
  title: string;
  status: 'completed' | 'current' | 'future';
  subtitle?: string;
  /** Connection groups for the Tools node */
  groups?: { name: string; tools: string[]; since: string }[];
  /** Recent entries to highlight (stories, exports, playbooks) */
  recent?: { title: string; meta: string }[];
  /** Small inline count text, e.g. "3 published · 2 drafts" */
  countLine?: string;
  items?: { label: string; done: boolean }[];
  cta?: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const STORAGE_KEY = 'onboarding-roadmap-minimized';

const TOOL_DISPLAY_NAMES: Record<string, string> = {
  github: 'GitHub', jira: 'Jira', confluence: 'Confluence', slack: 'Slack',
  figma: 'Figma', outlook: 'Outlook', teams: 'Teams',
  google_workspace: 'Google Workspace', onedrive: 'OneDrive', onenote: 'OneNote', zoom: 'Zoom',
};

function formatRelativeDate(iso: string | null): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days < 1) return 'today';
  if (days === 1) return '1 day ago';
  if (days < 7) return `${days} days ago`;
  if (days < 14) return '1 week ago';
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 60) return '1 month ago';
  return `${Math.floor(days / 30)} months ago`;
}

function truncate(str: string, max = 20): string {
  return str.length > max ? str.slice(0, max).trimEnd() + '…' : str;
}

/** Demo account creation: ~1 month ago */
const DEMO_ACCOUNT_CREATED = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

/** Integration connection groups — one OAuth per group */
const CONNECTION_GROUPS = [
  { name: 'GitHub', tools: ['github'] },
  { name: 'Atlassian', tools: ['jira', 'confluence'] },
  { name: 'Google', tools: ['google_workspace'] },
  { name: 'Microsoft', tools: ['outlook', 'teams', 'onedrive', 'onenote', 'sharepoint'] },
  { name: 'Slack', tools: ['slack'] },
  { name: 'Figma', tools: ['figma'] },
] as const;

// ─── SVG Layout ─────────────────────────────────────────────────────────────
//
//  Zig-zag S-path (2 nodes per row, alternating direction):
//
//  Row 1 (L→R):  Sign Up ──────────── Connect Tools
//                                          │
//  Row 2 (R→L):  Publish ←──────── Your Stories
//                   │
//  Row 3 (L→R):  Share ────────────── Build Playbook

const SVG_W = 600;
const SVG_H = 180;

const LEFT_X = 80;
const RIGHT_X = 520;
const ROW_YS = [28, 90, 152]; // row 1, 2, 3

// ─── Component ──────────────────────────────────────────────────────────────

export function OnboardingRoadmap() {
  const navigate = useNavigate();
  const [minimized, setMinimized] = useState(() =>
    localStorage.getItem(STORAGE_KEY) === 'true',
  );
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);

  const { data: integrationsData } = useMCPIntegrations();
  const { data: storiesResult } = useListCareerStories();
  const { data: packets } = usePackets();
  const { data: derivations } = useSingleDerivations();

  const stories = (storiesResult as any)?.stories ?? (Array.isArray(storiesResult) ? storiesResult : []);
  const integrations = integrationsData?.integrations ?? [];
  const isDemo = isDemoMode();

  // ── Derived stats ───────────────────────────────────────────────────────

  const connectedIntegrations = integrations.filter((i) => i.isConnected);
  const connectedTools = connectedIntegrations.map((i) => i.toolType);

  const hasGithub = integrations.some((i) => i.toolType === 'github' && i.isConnected);
  const hasAtlassian = integrations.some((i) => ['jira', 'confluence'].includes(i.toolType) && i.isConnected);
  const hasGoogle = integrations.some((i) => i.toolType === 'google_workspace' && i.isConnected);
  const hasMicrosoft = integrations.some((i) => ['outlook', 'teams', 'sharepoint', 'onedrive', 'onenote'].includes(i.toolType) && i.isConnected);
  const hasAllTools = hasGithub && hasAtlassian && (hasGoogle || hasMicrosoft);
  const hasConnection = connectedTools.length > 0;

  const totalStories = stories.length;
  const publishedStories = stories.filter((s: any) => s.isPublished);
  const publishedCount = publishedStories.length;
  const draftCount = totalStories - publishedCount;
  const hasPublished = publishedCount > 0;

  // Visibility breakdown
  const networkCount = publishedStories.filter((s: any) => s.visibility === 'network').length;
  const workspaceCount = publishedStories.filter((s: any) => s.visibility === 'workspace').length;
  const privateCount = publishedStories.filter((s: any) => !s.visibility || s.visibility === 'private').length;

  const exportCount = derivations?.length ?? 0;
  const playbookCount = packets?.length ?? 0;
  const hasShared = exportCount > 0;
  const hasPlaybook = playbookCount > 0;

  // ── Node definitions ────────────────────────────────────────────────────

  const toolsCompleted = isDemo ? hasAllTools : hasConnection;

  const nodes: NodeDef[] = useMemo(() => [
    // Row 1 (L→R)
    { id: 'signup', label: 'Sign Up', description: 'Account created', completed: true, route: '/', cx: LEFT_X, cy: ROW_YS[0] },
    { id: 'tools', label: isDemo ? 'Tools Connected' : 'Connect Tools', description: 'Link your work tools', completed: toolsCompleted, route: '/settings?tab=integrations', cx: RIGHT_X, cy: ROW_YS[0] },
    // Row 2 (R→L)
    { id: 'stories', label: 'Your Stories', description: 'Create career stories from your work', completed: totalStories > 0, route: '/stories', cx: RIGHT_X, cy: ROW_YS[1] },
    { id: 'publish', label: 'Publish', description: 'Share to your professional network', completed: hasPublished, route: '/stories', cx: LEFT_X, cy: ROW_YS[1] },
    // Row 3 (L→R)
    { id: 'share', label: 'Share', description: 'Send for review, recruiter, or 1:1', completed: hasShared, route: '/stories', cx: LEFT_X, cy: ROW_YS[2] },
    { id: 'playbook', label: 'Build Playbook', description: 'Combine stories into a career playbook', completed: hasPlaybook, route: '/stories', cx: RIGHT_X, cy: ROW_YS[2] },
  ], [isDemo, toolsCompleted, totalStories, hasPublished, hasShared, hasPlaybook]);

  // Current step = first incomplete node in sequence
  const currentNodeId = useMemo(() => {
    const order = ['signup', 'tools', 'stories', 'publish', 'share', 'playbook'];
    for (const id of order) {
      const n = nodes.find((nd) => nd.id === id);
      if (n && !n.completed) return id;
    }
    return null;
  }, [nodes]);

  const completedCount = nodes.filter((n) => n.completed).length;
  const allDone = completedCount === nodes.length;

  // ── Tooltip content builder ─────────────────────────────────────────────

  // Build connection groups with per-group "since" dates
  const connectedGroups = useMemo(() => {
    return CONNECTION_GROUPS
      .map((g) => {
        const groupIntegrations = integrations.filter((i) => g.tools.includes(i.toolType) && i.isConnected);
        if (groupIntegrations.length === 0) return null;
        const earliest = groupIntegrations
          .map((i) => i.connectedAt ?? i.createdAt)
          .filter(Boolean)
          .sort()[0] ?? null;
        return { name: g.name, tools: groupIntegrations.map((i) => TOOL_DISPLAY_NAMES[i.toolType] ?? i.toolType), since: formatRelativeDate(earliest) };
      })
      .filter(Boolean) as { name: string; tools: string[]; since: string }[];
  }, [integrations]);

  // Recent stories (sorted by updatedAt descending, take 2)
  const recentStories = useMemo(() => {
    return [...stories]
      .sort((a: any, b: any) => new Date(b.updatedAt ?? b.createdAt ?? 0).getTime() - new Date(a.updatedAt ?? a.createdAt ?? 0).getTime())
      .slice(0, 2)
      .map((s: any) => ({ title: s.title, meta: formatRelativeDate(s.updatedAt ?? s.createdAt) }));
  }, [stories]);

  // Recent published stories (take 2)
  const recentPublished = useMemo(() => {
    return [...publishedStories]
      .sort((a: any, b: any) => new Date(b.publishedAt ?? b.updatedAt ?? 0).getTime() - new Date(a.publishedAt ?? a.updatedAt ?? 0).getTime())
      .slice(0, 2)
      .map((s: any) => ({ title: s.title, meta: formatRelativeDate(s.publishedAt ?? s.updatedAt) }));
  }, [publishedStories]);

  // Recent exports (take 2) — include story title
  const recentExports = useMemo(() => {
    const EXPORT_TYPE_LABELS: Record<string, string> = {
      interview: 'Interview answer', linkedin: 'LinkedIn post', resume: 'Resume bullet',
      'one-on-one': '1:1 talking points', 'self-assessment': 'Self-assessment', 'team-share': 'Team share',
    };
    return [...(derivations ?? [])]
      .sort((a: any, b: any) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
      .slice(0, 2)
      .map((d: any) => {
        const typeLabel = EXPORT_TYPE_LABELS[d.type] ?? d.type;
        const storyTitle = d.storySnapshots?.[0]?.title;
        const title = storyTitle ? `${typeLabel}: ${truncate(storyTitle)}` : typeLabel;
        return { title, meta: formatRelativeDate(d.createdAt) };
      });
  }, [derivations]);

  // Recent playbooks (take 2) — include story titles
  const recentPlaybooks = useMemo(() => {
    const PACKET_TYPE_LABELS: Record<string, string> = {
      promotion: 'Promotion case', 'annual-review': 'Annual review', 'skip-level': 'Skip-level prep',
      'portfolio-brief': 'Portfolio brief', 'self-assessment': 'Self-assessment', 'one-on-one': '1:1 prep',
    };
    return [...(packets ?? [])]
      .sort((a: any, b: any) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
      .slice(0, 2)
      .map((p: any) => {
        const typeLabel = PACKET_TYPE_LABELS[p.type] ?? p.type;
        const storyTitle = p.storySnapshots?.[0]?.title;
        const title = storyTitle ? `${typeLabel}: ${truncate(storyTitle)}` : typeLabel;
        return { title, meta: formatRelativeDate(p.createdAt) };
      });
  }, [packets]);

  const getTooltipContent = useCallback((nodeId: string): TooltipContent => {
    const node = nodes.find((n) => n.id === nodeId)!;
    const status = node.completed ? 'completed' : nodeId === currentNodeId ? 'current' : 'future';

    switch (nodeId) {
      case 'signup':
        return {
          title: 'Account Created',
          status,
          subtitle: `Joined ${formatRelativeDate(isDemo ? DEMO_ACCOUNT_CREATED : DEMO_ACCOUNT_CREATED)}`,
          items: [{ label: 'InChronicle account active', done: true }],
        };

      case 'tools': {
        if (connectedGroups.length > 0) {
          return {
            title: 'Tools Connected',
            status,
            countLine: `${connectedTools.length} tools across ${connectedGroups.length} integrations`,
            groups: connectedGroups,
          };
        }
        return {
          title: 'Connect Tools',
          status,
          items: [
            { label: 'GitHub', done: hasGithub },
            { label: 'Atlassian (Jira/Confluence)', done: hasAtlassian },
            { label: 'Google or Microsoft', done: hasGoogle || hasMicrosoft },
          ],
          cta: 'Go to Integrations',
        };
      }

      case 'stories':
        return {
          title: 'Your Stories',
          status,
          countLine: totalStories > 0 ? `${publishedCount} published · ${draftCount} drafts` : undefined,
          recent: recentStories.length > 0 ? recentStories : undefined,
          cta: totalStories === 0 ? 'Create your first story' : undefined,
        };

      case 'publish':
        return {
          title: 'Publish',
          status,
          subtitle: 'Share to your professional network',
          countLine: publishedCount > 0 ? `${networkCount} network · ${workspaceCount} workspace · ${privateCount} private` : undefined,
          recent: recentPublished.length > 0 ? recentPublished : undefined,
          cta: !hasPublished ? 'Publish your first story' : undefined,
        };

      case 'share':
        return {
          title: 'Share',
          status,
          subtitle: 'Interview prep, recruiter pitch, 1:1 review',
          countLine: exportCount > 0 ? `${exportCount} exports created` : undefined,
          recent: recentExports.length > 0 ? recentExports : undefined,
          items: exportCount === 0 ? [
            { label: 'Interview answer', done: false },
            { label: 'LinkedIn post', done: false },
            { label: 'Resume bullet', done: false },
            { label: '1:1 talking points', done: false },
          ] : undefined,
          cta: !hasShared ? 'Export a story for any context' : undefined,
        };

      case 'playbook':
        return {
          title: 'Build Playbook',
          status,
          subtitle: 'Combine stories into a career playbook',
          countLine: playbookCount > 0 ? `${playbookCount} playbook${playbookCount !== 1 ? 's' : ''} created` : undefined,
          recent: recentPlaybooks.length > 0 ? recentPlaybooks : undefined,
          items: !hasPlaybook ? [
            { label: `${totalStories}/2 stories needed`, done: totalStories >= 2 },
          ] : undefined,
          cta: !hasPlaybook ? (totalStories >= 2 ? 'Create your first playbook' : 'Need 2+ stories first') : undefined,
        };

      default:
        return { title: node.label, status, items: [] };
    }
  }, [nodes, currentNodeId, isDemo, connectedTools, connectedGroups, hasGithub, hasAtlassian, hasGoogle, hasMicrosoft, totalStories, publishedCount, draftCount, networkCount, workspaceCount, privateCount, exportCount, recentStories, recentPublished, recentExports, recentPlaybooks, playbookCount, hasPublished, hasShared, hasPlaybook]);

  // ── Hover handling ──────────────────────────────────────────────────────

  const handleNodeHover = useCallback((nodeId: string, cx: number, cy: number) => {
    if (!svgContainerRef.current) return;
    const rect = svgContainerRef.current.getBoundingClientRect();
    const svg = svgContainerRef.current.querySelector('svg');
    if (!svg) return;
    const svgRect = svg.getBoundingClientRect();
    const scaleX = svgRect.width / SVG_W;
    const scaleY = svgRect.height / SVG_H;
    const pixelX = svgRect.left - rect.left + cx * scaleX;
    const pixelY = svgRect.top - rect.top + cy * scaleY;
    setHoveredNode(nodeId);
    setTooltipPos({ x: pixelX, y: pixelY });
  }, []);

  // ── Minimize / allDone ──────────────────────────────────────────────────

  const toggleMinimized = (value: boolean) => {
    setMinimized(value);
    localStorage.setItem(STORAGE_KEY, String(value));
  };

  if (allDone) return null;

  if (minimized) {
    return (
      <div className="overflow-hidden rounded-xl bg-gradient-to-br from-[#4C1D95] via-[#5B21B6] to-[#7C3AED] shadow-lg">
        <div className="flex items-center justify-between px-4 py-2.5">
          <span className="text-xs text-white/70">Getting Started: {completedCount}/{nodes.length} completed</span>
          <button onClick={() => toggleMinimized(false)} className="text-xs text-white/80 hover:text-white font-medium">Expand</button>
        </div>
      </div>
    );
  }

  // Current CTA target — first incomplete node
  const currentNode = currentNodeId ? nodes.find((n) => n.id === currentNodeId) : null;

  // ── Helpers for SVG edges ───────────────────────────────────────────────

  const strokeStyle = (completed: boolean) => ({
    stroke: completed ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.15)',
    strokeWidth: 1.5,
    strokeDasharray: completed ? 'none' : '6 4',
    strokeLinecap: 'round' as const,
  });

  // Zig-zag segments: 3 horizontal lines + 2 vertical curves
  const segments = [
    // 1. Row 1 horizontal: Sign Up → Connect Tools
    { type: 'h' as const, y: ROW_YS[0], x1: LEFT_X, x2: RIGHT_X, completed: nodes[0].completed },
    // 2. Right vertical curve: Connect Tools ↓ Your Stories
    { type: 'v' as const, x: RIGHT_X, y1: ROW_YS[0], y2: ROW_YS[1], completed: nodes[1].completed },
    // 3. Row 2 horizontal: Your Stories → Publish (R→L)
    { type: 'h' as const, y: ROW_YS[1], x1: RIGHT_X, x2: LEFT_X, completed: nodes[2].completed },
    // 4. Left vertical curve: Publish ↓ Share
    { type: 'v' as const, x: LEFT_X, y1: ROW_YS[1], y2: ROW_YS[2], completed: nodes[3].completed },
    // 5. Row 3 horizontal: Share → Build Playbook
    { type: 'h' as const, y: ROW_YS[2], x1: LEFT_X, x2: RIGHT_X, completed: nodes[4].completed },
  ];

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className={cn(
      'rounded-xl bg-gradient-to-br from-[#4C1D95] via-[#5B21B6] to-[#7C3AED] shadow-lg',
      hoveredNode ? 'overflow-visible' : 'overflow-hidden',
    )}>
      {/* Header */}
      <div className="flex items-center justify-between py-2 px-4">
        <h3 className="text-sm font-semibold text-white">Getting Started</h3>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-white/50">{completedCount}/{nodes.length}</span>
          <button onClick={() => toggleMinimized(true)} className="rounded p-1 text-white/40 hover:bg-white/10 hover:text-white/70 transition-colors" aria-label="Minimize roadmap">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* SVG + Tooltip */}
      <div className="px-2 pb-1 relative" ref={svgContainerRef}>
        <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full" preserveAspectRatio="xMidYMid meet" onMouseLeave={() => setHoveredNode(null)}>

          {/* Zig-zag path segments */}
          {segments.map((seg, i) => {
            const style = strokeStyle(seg.completed);
            if (seg.type === 'h') {
              return <line key={`seg-${i}`} x1={seg.x1} y1={seg.y} x2={seg.x2} y2={seg.y} {...style} />;
            }
            // Vertical curve (smooth bend)
            const midY = (seg.y1 + seg.y2) / 2;
            return <path key={`seg-${i}`} d={`M${seg.x},${seg.y1} C${seg.x},${midY} ${seg.x},${midY} ${seg.x},${seg.y2}`} fill="none" {...style} />;
          })}

          {/* Nodes */}
          {nodes.map((node) => {
            const isCompleted = node.completed;
            const isCurrent = node.id === currentNodeId;
            const isFuture = !isCompleted && !isCurrent;
            const r = 3.5;

            return (
              <g
                key={node.id}
                className="cursor-pointer"
                onClick={() => navigate(node.route)}
                onMouseEnter={() => handleNodeHover(node.id, node.cx, node.cy)}
                onMouseLeave={() => setHoveredNode(null)}
              >
                {/* Hit area */}
                <circle cx={node.cx} cy={node.cy} r={12} fill="transparent" />

                {/* Pulsing ring for current */}
                {isCurrent && (
                  <circle cx={node.cx} cy={node.cy} r={r + 4} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={1} className="animate-ping" style={{ transformOrigin: `${node.cx}px ${node.cy}px` }} />
                )}

                {/* Node circle */}
                <circle
                  cx={node.cx} cy={node.cy} r={r}
                  fill={isFuture ? 'rgba(255,255,255,0.1)' : 'white'}
                  stroke={isFuture ? 'rgba(255,255,255,0.25)' : isCompleted ? 'rgba(91,33,182,0.5)' : 'transparent'}
                  strokeWidth={1}
                />

                {/* Checkmark / flag */}
                {isCompleted && (
                  <text x={node.cx} y={node.cy + 1.5} textAnchor="middle" fill="#5B21B6" fontSize={r * 1.2} fontWeight="bold">&#10003;</text>
                )}
                {isCurrent && (
                  <text x={node.cx} y={node.cy + 1.5} textAnchor="middle" fill="#5B21B6" fontSize={r * 1.2}>&#9873;</text>
                )}

                {/* Label */}
                <text
                  x={node.cx} y={node.cy - 8}
                  textAnchor="middle"
                  fill={isCompleted ? 'rgba(255,255,255,0.85)' : isCurrent ? 'white' : 'rgba(255,255,255,0.35)'}
                  fontSize={5.5}
                  fontWeight={isCurrent ? 600 : 500}
                  className="select-none"
                >
                  {node.label}
                </text>

                {/* Story stats below label */}
                {node.id === 'stories' && totalStories > 0 && (
                  <text x={node.cx} y={node.cy + 10} textAnchor="middle" fill="rgba(255,255,255,0.45)" fontSize={4}>
                    {totalStories} {totalStories === 1 ? 'story' : 'stories'} · {publishedCount} published
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* ── HTML Tooltip ─────────────────────────────────────────────── */}
        {hoveredNode && tooltipPos && (() => {
          const content = getTooltipContent(hoveredNode);
          const doneCount = content.items?.filter((i) => i.done).length ?? 0;
          const totalItems = content.items?.length ?? 0;
          const progressPct = totalItems > 1 ? (doneCount / totalItems) * 100 : 0;
          const showProgress = totalItems > 1;

          return (
            <div
              className="absolute z-50 pointer-events-none animate-in fade-in zoom-in-95 duration-100"
              style={{ left: tooltipPos.x, top: tooltipPos.y + 20, transform: 'translateX(-50%)' }}
            >
              <div className="rounded-lg bg-gray-900 text-white shadow-xl min-w-[200px] max-w-[280px] overflow-hidden">
                {/* Header */}
                <div className="px-3 pt-2.5 pb-1.5 border-b border-gray-700/60">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[12px] font-semibold">{content.title}</p>
                    <span className={cn(
                      'text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0',
                      content.status === 'completed' && 'bg-emerald-500/20 text-emerald-400',
                      content.status === 'current' && 'bg-amber-500/20 text-amber-400',
                      content.status === 'future' && 'bg-gray-700 text-gray-400',
                    )}>
                      {content.status === 'completed' ? 'Done' : content.status === 'current' ? 'Now' : 'Next'}
                    </span>
                  </div>
                  {content.subtitle && (
                    <p className="text-[10px] text-gray-400 mt-0.5">{content.subtitle}</p>
                  )}
                  {content.countLine && (
                    <p className="text-[10px] text-gray-500 mt-0.5">{content.countLine}</p>
                  )}
                </div>

                <div className="px-3 py-2">
                  {/* Connection groups (Tools node) */}
                  {content.groups && content.groups.length > 0 && (
                    <div className="space-y-1.5 mb-2">
                      {content.groups.map((g) => (
                        <div key={g.name} className="flex items-start gap-2">
                          <div className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/20 shrink-0 mt-px">
                            <Check className="h-2.5 w-2.5 text-emerald-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline justify-between gap-1">
                              <span className="text-[11px] text-gray-200 font-medium truncate">{g.name}</span>
                              <span className="text-[9px] text-gray-500 shrink-0">{g.since}</span>
                            </div>
                            {g.tools.length > 1 && (
                              <p className="text-[9px] text-gray-500 truncate">{g.tools.join(', ')}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Recent entries (stories, exports, playbooks) */}
                  {content.recent && content.recent.length > 0 && (
                    <div className="space-y-1.5 mb-2">
                      {content.recent.map((entry, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <div className="w-1 h-3.5 rounded-full bg-primary-500/60 shrink-0 mt-px" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-gray-200 leading-tight truncate">{entry.title}</p>
                            <p className="text-[9px] text-gray-500">{entry.meta}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Progress bar */}
                  {showProgress && (
                    <div className="mb-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-gray-400">{doneCount}/{totalItems} complete</span>
                      </div>
                      <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all duration-500',
                            progressPct === 100 ? 'bg-emerald-500' : 'bg-primary-500',
                          )}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Checklist items */}
                  {content.items && content.items.length > 0 && (
                    <div className="space-y-1.5">
                      {content.items.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          {item.done ? (
                            <div className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500/20 shrink-0">
                              <Check className="h-2 w-2 text-emerald-400" />
                            </div>
                          ) : (
                            <div className="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-gray-600 shrink-0">
                              <Circle className="h-1.5 w-1.5 text-gray-500" />
                            </div>
                          )}
                          <span className={cn(
                            'text-[11px] leading-tight',
                            item.done ? 'text-gray-200' : 'text-gray-400',
                          )}>
                            {item.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* CTA */}
                  {content.cta && (
                    <div className="mt-2 pt-2 border-t border-gray-700/60 flex items-center gap-2">
                      <ArrowRight className="h-3 w-3 text-primary-400 shrink-0" />
                      <span className="text-[11px] text-primary-400 font-medium">{content.cta}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* CTA bar */}
      {currentNode && (
        <div className="pb-2 flex items-center justify-end gap-2 px-4">
          <p className="text-xs text-white/70">
            <span className="font-medium text-white">Next:</span> {currentNode.description}
          </p>
          <button
            onClick={() => navigate(currentNode.route)}
            className={cn(
              'text-[11px] font-medium text-white/90 hover:text-white shrink-0',
              'bg-white/10 hover:bg-white/20 rounded-full px-3 py-0.5 transition-colors',
            )}
          >
            {currentNode.label} &rarr;
          </button>
        </div>
      )}
    </div>
  );
}
