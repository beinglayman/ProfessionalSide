import { useState, useEffect } from 'react';
import { Badge } from '../ui/badge';
import { mockTools, mockStories, SYNC_DELAY, CONNECT_DELAY, totalActivityCount } from './mock-data';
import type { ToolId } from './mock-data';
import {
  GitBranch,
  KanbanSquare,
  FileText,
  Hash,
  Figma,
  Video,
  Loader2,
  Check,
  CheckCircle2,
  GitMerge,
  FolderOpen,
  Plus,
  Minus,
} from 'lucide-react';

const TOOL_ICONS: Record<string, React.ReactNode> = {
  github: <GitBranch className="w-3.5 h-3.5" />,
  jira: <KanbanSquare className="w-3.5 h-3.5" />,
  confluence: <FileText className="w-3.5 h-3.5" />,
  slack: <Hash className="w-3.5 h-3.5" />,
  figma: <Figma className="w-3.5 h-3.5" />,
  'google-meet': <Video className="w-3.5 h-3.5" />,
};

const story = mockStories[0];

// Placeholder generic review text (red lines — deletions)
const GENERIC_LINES = [
  'Led multiple projects and delivered results on time.',
  'Collaborated with team members to achieve goals.',
  'Demonstrated strong technical skills throughout the year.',
  'Participated in all required meetings and standups.',
  'Resolved various issues and bugs as they arose.',
  'Wrote code and reviewed pull requests as assigned.',
  'Contributed to team documentation when needed.',
  'Showed initiative and took ownership of work.',
];

// Evidence-backed lines (green lines — additions), built from story sections
const buildAdditions = () => {
  const lines: string[] = [];
  story.sections.forEach((section) => {
    lines.push(`[${section.label.toUpperCase()}] ${section.text}`);
    lines.push(`  Evidence: ${section.evidenceCount} signals across connected tools`);
  });
  return lines;
};

const ADDITION_LINES = buildAdditions();

const WORD_COUNT_GENERIC = GENERIC_LINES.join(' ').split(' ').length;
const WORD_COUNT_ADDED = ADDITION_LINES.join(' ').split(' ').length;

type Step = 'select' | 'connecting' | 'syncing' | 'diff';

export function OnboardingV20() {
  const [step, setStep] = useState<Step>('select');
  const [selectedTools, setSelectedTools] = useState<Set<ToolId>>(new Set());
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncLabel, setSyncLabel] = useState('Connecting...');
  const [visibleAdditions, setVisibleAdditions] = useState(0);
  const [approved, setApproved] = useState(false);

  const isRevealed = step === 'diff';

  useEffect(() => {
    if (step !== 'syncing') return;
    setSyncProgress(0);
    const selectedArr = Array.from(selectedTools);
    let elapsed = 0;
    const interval = 80;
    const total = SYNC_DELAY;
    let labelIndex = 0;

    const ticker = setInterval(() => {
      elapsed += interval;
      const pct = Math.min((elapsed / total) * 100, 100);
      setSyncProgress(pct);
      const labelStep = Math.floor((elapsed / total) * selectedArr.length);
      if (labelStep !== labelIndex && labelStep < selectedArr.length) {
        labelIndex = labelStep;
        const tool = mockTools.find((t) => t.id === selectedArr[labelIndex]);
        if (tool) setSyncLabel(`Analyzing ${tool.name}...`);
      }
      if (elapsed >= total) {
        clearInterval(ticker);
        setSyncLabel('Changes ready');
        setTimeout(() => {
          setStep('diff');
          // Animate additions appearing line by line
          ADDITION_LINES.forEach((_, i) => {
            setTimeout(() => {
              setVisibleAdditions(i + 1);
            }, i * 120);
          });
        }, 300);
      }
    }, interval);

    return () => clearInterval(ticker);
  }, [step, selectedTools]);

  const toggleTool = (id: ToolId) => {
    setSelectedTools((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  const handleConnect = () => {
    setStep('connecting');
    setTimeout(() => setStep('syncing'), CONNECT_DELAY);
  };

  const handleApprove = () => {
    setApproved(true);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center py-10 px-4 font-mono">
      <div className="w-full max-w-3xl space-y-4">

        {/* IDE-style window chrome */}
        <div className="bg-gray-800 rounded-t-lg border border-gray-700 px-4 py-2 flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500" />
          <span className="w-3 h-3 rounded-full bg-yellow-500" />
          <span className="w-3 h-3 rounded-full bg-green-500" />
          <span className="ml-4 text-gray-400 text-xs flex items-center gap-1.5">
            <GitMerge className="w-3.5 h-3.5" />
            Pull Request: Generate performance review from evidence
          </span>
          {isRevealed && (
            <span className="ml-auto text-xs text-emerald-400">
              +{WORD_COUNT_ADDED} additions, -{WORD_COUNT_GENERIC} deletions
            </span>
          )}
        </div>

        {/* File tree + diff pane */}
        <div className="bg-gray-900 border border-t-0 border-gray-700 rounded-b-lg flex overflow-hidden min-h-[500px]">

          {/* File tree sidebar */}
          <div className="w-44 bg-gray-850 border-r border-gray-700 flex flex-col shrink-0" style={{ backgroundColor: '#1a1f2e' }}>
            <div className="px-3 py-2.5 text-xs text-gray-500 uppercase tracking-widest font-bold border-b border-gray-700">
              Explorer
            </div>
            <div className="px-2 py-2 space-y-0.5">
              <div className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400">
                <FolderOpen className="w-3 h-3 text-amber-400" />
                <span>review-2025-q4</span>
              </div>
              <div
                className={[
                  'flex items-center gap-1 px-3 py-1.5 rounded text-xs transition-colors',
                  isRevealed
                    ? 'bg-primary-900/40 text-primary-300 border border-primary-800/40'
                    : 'text-gray-500',
                ].join(' ')}
              >
                <FileText className="w-3 h-3 shrink-0" />
                <span className="truncate">review-2025-q4.md</span>
              </div>
              <div className="flex items-center gap-1 px-3 py-1 text-xs text-gray-600">
                <FileText className="w-3 h-3" />
                <span>template.md</span>
              </div>
              <div className="flex items-center gap-1 px-3 py-1 text-xs text-gray-600">
                <FileText className="w-3 h-3" />
                <span>goals-2025.md</span>
              </div>
            </div>

            {/* Diff stats (shown after reveal) */}
            {isRevealed && (
              <div className="mt-auto px-3 py-3 border-t border-gray-700 space-y-1">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1.5">Changes</div>
                <div className="flex items-center gap-1.5 text-xs">
                  <Plus className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">{WORD_COUNT_ADDED} words</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <Minus className="w-3 h-3 text-red-400" />
                  <span className="text-red-400">{WORD_COUNT_GENERIC} words</span>
                </div>
              </div>
            )}
          </div>

          {/* Diff content pane */}
          <div className="flex-1 overflow-x-auto">

            {/* File header */}
            <div className="border-b border-gray-700 px-4 py-2 flex items-center gap-2 bg-gray-800/50">
              <FileText className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-xs text-gray-400">review-2025-q4.md</span>
              {isRevealed ? (
                <Badge className="ml-2 text-xs bg-emerald-900/40 text-emerald-400 border-emerald-800/40">modified</Badge>
              ) : (
                <Badge className="ml-2 text-xs bg-gray-700 text-gray-400 border-0">empty template</Badge>
              )}
            </div>

            {/* Tool selection (shown when not yet connecting) */}
            {step === 'select' && (
              <div className="p-6 space-y-4">
                <div className="text-gray-400 text-xs">
                  <span className="text-gray-600">##</span> Your review template is empty. Connect your tools to generate evidence-backed content.
                </div>

                {/* Empty template preview (all red lines) */}
                <div className="border border-gray-700 rounded-lg overflow-hidden">
                  <div className="bg-gray-800 px-3 py-1.5 text-xs text-gray-500">review-2025-q4.md — template (empty)</div>
                  <div className="text-xs">
                    {GENERIC_LINES.map((line, i) => (
                      <div key={i} className="flex bg-red-950/40 border-l-2 border-red-500/40 hover:bg-red-950/60 transition-colors">
                        <span className="w-10 text-center text-red-800 select-none py-1 border-r border-red-900/40 shrink-0 text-xs">
                          {i + 1}
                        </span>
                        <span className="px-3 py-1 text-red-300/70 line-through decoration-red-500/40 leading-relaxed">
                          {line}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <p className="text-xs text-gray-500 text-center">Connect your tools to replace generic text with evidence-backed content</p>

                <div className="grid grid-cols-2 gap-1.5">
                  {mockTools.map((tool) => {
                    const isSel = selectedTools.has(tool.id);
                    return (
                      <button
                        key={tool.id}
                        onClick={() => toggleTool(tool.id)}
                        className={[
                          'flex items-center gap-2 px-3 py-2 rounded border text-xs font-medium transition-all text-left',
                          isSel
                            ? 'border-primary-500/60 bg-primary-900/20 text-primary-300'
                            : 'border-gray-700 text-gray-500 hover:border-gray-600 hover:text-gray-400',
                        ].join(' ')}
                      >
                        <span className="w-4 h-4 rounded flex items-center justify-center text-white shrink-0" style={{ backgroundColor: mockTools.find((t) => t.id === tool.id)!.color }}>
                          {TOOL_ICONS[tool.id]}
                        </span>
                        {tool.name}
                        {isSel && <Check className="w-3 h-3 text-primary-400 ml-auto" />}
                      </button>
                    );
                  })}
                </div>

                <button
                  disabled={selectedTools.size < 1}
                  onClick={handleConnect}
                  className={[
                    'w-full py-2.5 rounded text-sm font-semibold transition-all flex items-center justify-center gap-2',
                    selectedTools.size >= 1
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'bg-gray-800 text-gray-600 cursor-not-allowed border border-gray-700',
                  ].join(' ')}
                >
                  {selectedTools.size >= 1 ? (
                    <><GitMerge className="w-4 h-4" /> Generate diff</>
                  ) : (
                    'Select tools to generate'
                  )}
                </button>
              </div>
            )}

            {/* Syncing state */}
            {(step === 'connecting' || step === 'syncing') && (
              <div className="p-6 flex flex-col items-center gap-5">
                <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                <div className="text-center">
                  <p className="text-sm text-emerald-300 font-medium">{syncLabel}</p>
                  <p className="text-xs text-gray-500 mt-1">Scanning {totalActivityCount}+ activities across {selectedTools.size} tool{selectedTools.size > 1 ? 's' : ''}...</p>
                </div>
                {step === 'syncing' && (
                  <div className="w-full max-w-xs">
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-150"
                        style={{ width: `${syncProgress}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-gray-600">Analyzing...</span>
                      <span className="text-xs text-gray-500">{Math.round(syncProgress)}%</span>
                    </div>
                  </div>
                )}
                {/* Skeleton red lines while loading */}
                <div className="w-full border border-gray-700 rounded-lg overflow-hidden opacity-40">
                  {GENERIC_LINES.slice(0, 4).map((line, i) => (
                    <div key={i} className="flex bg-red-950/40 border-l-2 border-red-500/40">
                      <span className="w-10 text-center text-red-800 select-none py-1 border-r border-red-900/40 text-xs">{i + 1}</span>
                      <span className="px-3 py-1 text-red-300/50 line-through text-xs">{line}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Diff view — revealed */}
            {step === 'diff' && (
              <div className="text-xs">
                {/* Diff header hunk */}
                <div className="flex bg-gray-800/80 px-3 py-1 text-gray-500 border-b border-gray-700">
                  <span>@@ -1,{GENERIC_LINES.length} +1,{ADDITION_LINES.length} @@ Performance Review Q4 2025</span>
                </div>

                {/* Red deletion lines */}
                {GENERIC_LINES.map((line, i) => (
                  <div
                    key={`del-${i}`}
                    className="flex bg-red-950/50 border-l-2 border-red-500/60 hover:bg-red-950/70 transition-colors group"
                  >
                    <span className="w-10 text-center text-red-800 select-none py-1.5 border-r border-red-900/40 shrink-0">
                      {i + 1}
                    </span>
                    <span className="w-10 text-center text-gray-700 select-none py-1.5 border-r border-gray-800 shrink-0">
                    </span>
                    <span className="px-1 py-1.5 text-red-400 select-none shrink-0">-</span>
                    <span className="px-2 py-1.5 text-red-300/70 line-through decoration-red-500/40 leading-relaxed flex-1">
                      {line}
                    </span>
                  </div>
                ))}

                {/* Green addition lines — animate in */}
                {ADDITION_LINES.map((line, i) => (
                  <div
                    key={`add-${i}`}
                    className={[
                      'flex border-l-2 border-emerald-500/60 hover:bg-emerald-950/50 transition-all duration-300',
                      i < visibleAdditions ? 'opacity-100 bg-emerald-950/40' : 'opacity-0 bg-transparent',
                    ].join(' ')}
                  >
                    <span className="w-10 text-center text-gray-700 select-none py-1.5 border-r border-gray-800 shrink-0">
                    </span>
                    <span className="w-10 text-center text-emerald-800 select-none py-1.5 border-r border-emerald-900/40 shrink-0">
                      {GENERIC_LINES.length + i + 1}
                    </span>
                    <span className="px-1 py-1.5 text-emerald-400 select-none shrink-0">+</span>
                    <span className={[
                      'px-2 py-1.5 leading-relaxed flex-1 transition-all duration-300',
                      line.startsWith('[') ? 'text-emerald-300 font-semibold' : 'text-emerald-200/80 pl-4',
                    ].join(' ')}>
                      {line}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bottom bar */}
        {step === 'diff' && (
          <div className="bg-gray-800 border border-gray-700 rounded-xl px-5 py-4 flex items-center gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 text-sm font-semibold">{visibleAdditions < ADDITION_LINES.length ? visibleAdditions : WORD_COUNT_ADDED} additions</span>
              </div>
              <span className="text-gray-600">·</span>
              <div className="flex items-center gap-1.5">
                <Minus className="w-3.5 h-3.5 text-red-400" />
                <span className="text-red-400 text-sm font-semibold">{WORD_COUNT_GENERIC} deletions</span>
              </div>
              <Badge className="ml-2 bg-primary-900/30 text-primary-300 border-primary-800/40 text-xs">
                {story.dateRange}
              </Badge>
            </div>
            <button
              onClick={handleApprove}
              disabled={approved}
              className={[
                'flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all',
                approved
                  ? 'bg-emerald-700 text-white cursor-default'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20',
              ].join(' ')}
            >
              {approved ? (
                <><CheckCircle2 className="w-4 h-4" /> Changes approved</>
              ) : (
                <><GitMerge className="w-4 h-4" /> Approve changes</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
